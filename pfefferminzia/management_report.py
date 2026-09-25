"""Small, privacy-preserving snapshot for the final workshop report.

Only aggregate counts enter the report payload. Message bodies, names,
addresses, credentials and individual tickets never enter this artifact.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from .constants import ROOT
from .util import utc_now


REPORT_SNAPSHOT = Path(".data/management-report.json")


def aggregate_report(db: sqlite3.Connection, source_checkpoint: str) -> dict[str, Any]:
    db.row_factory = sqlite3.Row
    tickets = db.execute(
        """SELECT product_line, status, is_demo, COUNT(*) AS count
        FROM tickets GROUP BY product_line, status, is_demo"""
    ).fetchall()
    events = db.execute(
        """SELECT e.type,
        CASE WHEN e.actor = 'auto-send-worker' THEN 'automatic' ELSE 'other' END AS mode,
        COUNT(*) AS count FROM ticket_events e
        JOIN tickets t ON t.id = e.ticket_id WHERE t.is_demo = 0
        GROUP BY e.type, mode"""
    ).fetchall()
    ticket_rows = [
        {"productLine": row["product_line"], "status": row["status"],
         "demo": bool(row["is_demo"]), "count": int(row["count"])}
        for row in tickets
    ]
    event_rows = [
        {"type": row["type"], "mode": row["mode"], "count": int(row["count"])}
        for row in events
        if row["type"] in {"draft_approved", "draft_rejected", "schedule_cancelled", "queue_removed", "reply_sent"}
    ]
    return {
        "scope": "Eine lokale, synthetische Workshop-Instanz; keine Unternehmenskennzahlen",
        "sourceCheckpoint": source_checkpoint,
        "capturedAt": utc_now(),
        "tickets": ticket_rows,
        "events": event_rows,
        "limitations": "Demo-Fälle und echte Workshop-Mail-Tickets sind getrennt markiert. Kleine Fallzahlen; keine Wirksamkeits- oder Zeitersparnisbehauptung.",
    }


def capture_report_snapshot(
    source_root: Path, target_root: Path, source_checkpoint: str, source_database: Path | None = None
) -> Path:
    source = source_database or source_root / ".data" / "pfefferminzia.db"
    if not source.is_file():
        raise ValueError("Für den Report fehlt die lokale Workshop-Datenbank im bisherigen Arbeitsordner")
    with sqlite3.connect(f"file:{source}?mode=ro", uri=True) as db:
        snapshot = aggregate_report(db, source_checkpoint)
    destination = target_root / REPORT_SNAPSHOT
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    destination.chmod(0o600)
    return destination


def read_report_snapshot(root: Path = ROOT) -> dict[str, Any]:
    path = root / REPORT_SNAPSHOT
    if not path.is_file():
        raise ValueError("Report-Schnappschuss fehlt: Drill 12 aus dem Drill-11-Arbeitsstand laden")
    return json.loads(path.read_text(encoding="utf-8"))
