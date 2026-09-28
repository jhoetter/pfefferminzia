"""Der Bestand: the insurer's customers, contracts and tariffs from Monday.

On Monday the group worked with Falk's dataset. From Drill 7 on, Claude may
look things up in it, and the cockpit shows it under "Bestand", so the
person sees where the data behind a case comes from – not from the mail.
"""

from __future__ import annotations

import sqlite3
from typing import Any

from .checkpoints import capability_enabled
from .database import get_database
from .upstream import import_falk_dataset
from .util import utc_now

SOURCE = "CSV-Dateien aus Falks Datensatz vom Montag (partner.csv, vertrag.csv, tarifgeneration.csv, …)"


def bestand_overview(db: sqlite3.Connection | None = None) -> dict[str, Any]:
    db = db or get_database()
    count = lambda sql: int(db.execute(sql).fetchone()[0])  # noqa: E731
    overview = {
        "source": SOURCE,
        "customers": count("SELECT COUNT(*) FROM core_partner"),
        "contracts": count("SELECT COUNT(*) FROM core_vertrag"),
        "tariffSheets": count("SELECT COUNT(*) FROM documents"),
        "claims": None,
    }
    if capability_enabled("claims", db):
        overview["claims"] = count("SELECT COUNT(*) FROM workshop_claims")
    return overview


def load_bestand(db: sqlite3.Connection | None = None) -> dict[str, Any]:
    """Read the Monday CSV files into the cockpit (a no-op if they are already in) and say what is there."""
    db = db or get_database()
    imported = import_falk_dataset(db)
    db.execute(
        "INSERT INTO workshop_events (type, actor, details_json, created_at) VALUES ('bestand_loaded', 'mcp-agent', '{}', ?)",
        (utc_now(),),
    )
    return {
        **bestand_overview(db),
        "freshlyImported": bool(imported.get("imported")),
        "cockpitUrl": "http://127.0.0.1:3004/?view=bestand",
        "sayToParticipant": (
            "Den Bestand von gestern habe ich eingelesen – das sind einfach die CSV-Dateien von Montag, du musst nichts tun. "
            "Du siehst ihn links unter „Bestand“."
        ),
    }
