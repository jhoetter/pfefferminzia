"""What each drill shows and allows – nothing from later drills, everything a person must check."""

import pytest
from mcp import Client

import pfefferminzia.agentmail_service as agentmail_service
from pfefferminzia.agentmail_service import send_ticket_draft, sync_agentmail
from pfefferminzia.bestand import load_bestand
from pfefferminzia.checkpoints import activate_checkpoint
from pfefferminzia.mcp_server import create_mcp_server
from pfefferminzia.store import list_tickets, save_draft, update_classification
from pfefferminzia.workshop import ensure_workshop_fixtures
from tests.test_workshop_end_to_end import FakeAgentMail, imported_tickets


def test_sample_cases_step_aside_once_the_own_inbox_is_connected(monkeypatch, full_db):
    monkeypatch.delenv("WORKSHOP_CHECKPOINT", raising=False)
    activate_checkpoint("drill-9", full_db)
    ensure_workshop_fixtures(full_db)
    monkeypatch.delenv("AGENTMAIL_API_KEY", raising=False)
    assert any(ticket["isDemo"] for ticket in list_tickets(db=full_db))
    # With an inbox they would duplicate the instructor's scenario mails.
    monkeypatch.setenv("AGENTMAIL_API_KEY", "key")
    monkeypatch.setenv("AGENTMAIL_INBOX_ID", "inbox")
    assert not any(ticket["isDemo"] for ticket in list_tickets(db=full_db))


def test_drill_seven_sends_a_life_reply_without_the_drill_eight_approval(monkeypatch, full_db):
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-07-start")
    fake = FakeAgentMail()
    monkeypatch.setattr(agentmail_service, "_client", lambda: fake)
    monkeypatch.setenv("AGENTMAIL_API_KEY", "test-key")
    monkeypatch.setenv("AGENTMAIL_INBOX_ID", "inbox-participant")
    monkeypatch.setenv("WORKSHOP_ALLOWED_RECIPIENTS", "participant@example.test")
    sync_agentmail(full_db)
    life = next(ticket for ticket in imported_tickets(full_db) if ticket["subject"].startswith("Frage"))
    update_classification(life["ticketNumber"], "life", "coverage_question", "Life request", db=full_db)
    save_draft(life["ticketNumber"], "Antwort", "Tarif PL-2017", "mcp-agent", full_db)
    assert send_ticket_draft(life["ticketNumber"], "human", full_db)["status"] == "sent"


@pytest.mark.asyncio
@pytest.mark.parametrize(("checkpoint", "classify", "bestand"), [
    ("drill-06-start", False, False), ("drill-07-start", False, True), ("drill-08-start", True, True),
])
async def test_sparte_arrives_with_approval_and_the_bestand_with_drill_seven(monkeypatch, checkpoint, classify, bestand):
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", checkpoint)
    async with Client(create_mcp_server()) as client:
        names = {tool.name for tool in (await client.list_tools()).tools}
    assert ("classify_ticket" in names) is classify
    assert ("load_bestand" in names) is bestand


def test_loading_the_bestand_says_where_the_data_comes_from(monkeypatch, full_db):
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-07-start")
    result = load_bestand(full_db)
    assert "CSV" in result["source"] and "Montag" in result["source"]
    assert result["customers"] > 0 and result["contracts"] > 0 and result["tariffSheets"] == 28
    assert result["claims"] is None and result["cockpitUrl"].endswith("?view=bestand")
