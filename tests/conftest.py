from __future__ import annotations

import os
import sqlite3

# A participant's folder has a connected inbox and, after a drill switch, a
# drill in .env. Tests must not inherit either: set them empty before any
# module loads .env (python-dotenv never overrides a variable that exists).
for _key in ("AGENTMAIL_API_KEY", "AGENTMAIL_INBOX_ID", "WORKSHOP_ALLOWED_RECIPIENTS",
             "WORKSHOP_CHECKPOINT", "AUTO_SEND_ENABLED", "PFEFFERMINZIA_DB_PATH"):
    os.environ[_key] = ""

import pytest

from pfefferminzia.claims import ensure_workshop_claims
from pfefferminzia.database import create_database
from pfefferminzia.seed import ensure_seed_data
from pfefferminzia.upstream import import_falk_dataset


@pytest.fixture
def full_db() -> sqlite3.Connection:
    db = create_database(":memory:")
    import_falk_dataset(db, force=True)
    ensure_seed_data(db)
    ensure_workshop_claims(db)
    yield db
    db.close()


@pytest.fixture(autouse=True)
def isolated_env_file(monkeypatch, tmp_path_factory):
    """Tests never read the developer's real .env (it may hold live AgentMail keys)."""
    from pfefferminzia import runtime_config

    monkeypatch.setattr(runtime_config, "ENV_PATH", tmp_path_factory.mktemp("env") / ".env")
    monkeypatch.setattr(runtime_config, "_last_signature", None)
    monkeypatch.setattr(runtime_config, "_last_file_keys", set())
