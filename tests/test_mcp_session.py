import json

import pytest
from mcp import Client

import pfefferminzia.mcp_session as session
from pfefferminzia.claims import ensure_workshop_claims
from pfefferminzia.database import create_database
from pfefferminzia.seed import ensure_seed_data
from pfefferminzia.upstream import import_falk_dataset


@pytest.mark.asyncio
async def test_one_session_follows_a_drill_switch_without_reconnecting(monkeypatch, tmp_path):
    env_file = tmp_path / ".env"
    database = tmp_path / "cases.db"
    monkeypatch.setattr(session, "ENV_FILE", env_file)
    monkeypatch.setattr(session, "_file_keys", set())
    for key in ("WORKSHOP_CHECKPOINT", "PFEFFERMINZIA_DB_PATH", "AUTO_SEND_ENABLED"):
        monkeypatch.delenv(key, raising=False)
    env_file.write_text(f"WORKSHOP_CHECKPOINT=drill-06-start\nPFEFFERMINZIA_DB_PATH={database}\n", encoding="utf-8")
    db = create_database(database)
    import_falk_dataset(db, force=True)
    ensure_seed_data(db)
    ensure_workshop_claims(db)
    db.close()

    async with Client(session.create_session_server()) as client:
        names = {tool.name for tool in (await client.list_tools()).tools}
        # One tool list for the whole day; the human-only actions never appear.
        assert {"list_claims", "route_ticket", "get_drill_guide"} <= names
        assert not {"approve_ticket_reply", "send_ticket_reply", "advance_workshop_clock"} & names

        guide = await client.call_tool("get_drill_guide", {})
        assert json.loads(guide.content[0].text)["checkpoint"]["drill"] == 6
        locked = await client.call_tool("list_claims", {})
        assert locked.is_error and "Drill 6" in locked.content[0].text

        # The drill switch writes .env; the same session sees it on the next call.
        env_file.write_text(f"WORKSHOP_CHECKPOINT=drill-08-start\nPFEFFERMINZIA_DB_PATH={database}\n", encoding="utf-8")
        guide = await client.call_tool("get_drill_guide", {})
        assert json.loads(guide.content[0].text)["checkpoint"]["drill"] == 8
        claims = await client.call_tool("list_claims", {})
        assert not claims.is_error, claims.content[0].text
