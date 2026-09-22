from __future__ import annotations

import sqlite3

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
