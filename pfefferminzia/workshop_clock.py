from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Any

from .database import get_database
from .util import utc_now


def workshop_now(db: sqlite3.Connection | None = None) -> datetime:
    db = db or get_database()
    row = db.execute("SELECT clock_offset_seconds FROM workshop_state WHERE id = 1").fetchone()
    offset = int(row["clock_offset_seconds"] if row else 0)
    return datetime.now(timezone.utc) + timedelta(seconds=offset)


def workshop_now_iso(db: sqlite3.Connection | None = None) -> str:
    return workshop_now(db).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def clock_status(db: sqlite3.Connection | None = None) -> dict[str, Any]:
    db = db or get_database()
    row = db.execute("SELECT clock_offset_seconds, updated_at FROM workshop_state WHERE id = 1").fetchone()
    offset = int(row["clock_offset_seconds"] if row else 0)
    return {"now": workshop_now_iso(db), "offsetSeconds": offset, "updatedAt": row["updated_at"] if row else None}


def advance_workshop_clock(hours: int, actor: str, db: sqlite3.Connection | None = None) -> dict[str, Any]:
    if hours < 1 or hours > 168:
        raise ValueError("Workshop clock can be advanced by 1 to 168 hours")
    db = db or get_database()
    db.execute(
        "UPDATE workshop_state SET clock_offset_seconds = clock_offset_seconds + ?, updated_at = ? WHERE id = 1",
        (hours * 3600, utc_now()),
    )
    status = clock_status(db)
    db.execute(
        "INSERT INTO workshop_events (type, actor, details_json, created_at) VALUES ('clock_advanced', ?, ?, ?)",
        (actor, json.dumps({"hours": hours, **status}), utc_now()),
    )
    return status
