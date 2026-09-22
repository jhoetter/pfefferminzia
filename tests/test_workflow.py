from datetime import datetime, timedelta, timezone

import pytest

from pfefferminzia.agentmail_service import send_ticket_draft
from pfefferminzia.database import create_database
from pfefferminzia.seed import ensure_seed_data
from pfefferminzia.store import get_ticket, list_tariffs, list_tickets, save_draft, submit_draft, update_classification
from pfefferminzia.util import utc_now


def seeded_database():
    db = create_database(":memory:")
    ensure_seed_data(db)
    stamp = utc_now()
    insert = """INSERT INTO tickets
      (ticket_number, source, customer_email, subject, status, product_line, category, priority, is_demo, created_at, updated_at, last_message_at)
      VALUES (?, ?, ?, ?, ?, ?, 'unknown', 'normal', ?, ?, ?, ?)"""
    db.execute(insert, ("PF-9001", "manual", "liability@test.invalid", "Test liability", "new", "liability", 0, stamp, stamp, stamp))
    db.execute(insert, ("PF-9002", "manual", "life@test.invalid", "Test life", "new", "life", 0, stamp, stamp, stamp))
    db.execute(insert, ("PF-9003", "manual", "scheduled@test.invalid", "Test scheduled", "scheduled", "liability", 0, stamp, stamp, stamp))
    db.execute(insert, ("PF-9004", "demo", "blocked@test.invalid", "Test blocked", "in_progress", "liability", 1, stamp, stamp, stamp))
    scheduled_id = db.execute("SELECT id FROM tickets WHERE ticket_number = 'PF-9003'").fetchone()["id"]
    db.execute("""INSERT INTO reply_drafts (ticket_id, body, rationale, status, scheduled_for, created_at, updated_at)
      VALUES (?, 'Scheduled test response', 'Test rationale', 'scheduled', ?, ?, ?)""", (scheduled_id, (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(), stamp, stamp))
    return db


def test_controlled_reply_workflows():
    db = seeded_database()
    assert len(list_tickets(db=db)) == 4
    assert len(list_tariffs(db)) == 28
    save_draft("PF-9001", "Vielen Dank. Wir prüfen den Schaden.", "Tariff", "test", db)
    liability = submit_draft("PF-9001", "test", 24, db)
    assert liability["status"] == "scheduled"
    save_draft("PF-9002", "Unser Beileid. Wir prüfen.", "Tariff", "test", db)
    life = submit_draft("PF-9002", "test", 24, db)
    assert life["status"] == "awaiting_human"
    assert life["events"][0]["type"] == "human_review_required"
    changed = save_draft("PF-9003", "Überarbeitete Antwort.", "Manuell", "human-ui", db)
    assert changed["status"] == "in_progress"
    assert any(event["type"] == "schedule_cancelled" for event in changed["events"])
    result = update_classification("PF-9001", "liability", "claim", "Notebook-Schaden.", "urgent", 0.92, "mcp-agent", db)
    assert result["classificationSource"] == "mcp-agent"
    save_draft("PF-9004", "Blocked demo response", "Test", "test", db)
    with pytest.raises(ValueError, match="Demo tickets"):
        send_ticket_draft("PF-9004", "test", db)
    db.close()
