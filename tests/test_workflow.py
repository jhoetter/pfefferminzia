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


def test_draft_must_cite_the_linked_contracts_tariff_generation(monkeypatch, full_db):
    from pfefferminzia.workshop import ensure_workshop_fixtures

    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-07-start")
    ensure_workshop_fixtures(full_db)
    assert [c["tariffGenerationId"] for c in get_ticket("PF-10002", full_db)["linkedContracts"]] == ["PL-2017"]
    with pytest.raises(ValueError, match="PL-2012.*VTR-00000102 hat PL-2017"):
        save_draft("PF-10002", "Nach Tarif PL-2012 benötigen wir ein Formular.", "Beleg", "mcp-agent", full_db)
    assert save_draft("PF-10002", "Nach Tarif PL-2017 benötigen wir ein Formular.", "PL-2017, Abschnitt 3", "mcp-agent", full_db)["draft"]
    assert save_draft("PF-10002", "Wir melden uns mit den Unterlagen.", None, "human", full_db)["draft"]


def test_control_notice_explains_rejection_and_lost_approval(monkeypatch, full_db):
    from pfefferminzia.decisions import propose_decision
    from pfefferminzia.store import approve_draft, reject_draft
    from pfefferminzia.workshop import ensure_workshop_fixtures

    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-08-start")
    ensure_workshop_fixtures(full_db)
    propose_decision("PF-10004", "anerkannt", "PZ-2025, Abschnitt 5", "Unterlagen belegen den Leistungsfall.", db=full_db)
    assert get_ticket("PF-10004", full_db)["controlNotice"] is None
    rejected = reject_draft("PF-10004", "Beleg fehlt", "human-ui", full_db)
    assert rejected["controlNotice"]["kind"] == "draft_rejected"
    assert "Beleg fehlt" in rejected["controlNotice"]["text"]
    # Editing the letter changes nothing; a new version of the decision clears the notice.
    assert save_draft("PF-10004", "Überarbeitet", "PZ-2025", "mcp-agent", full_db)["controlNotice"]["kind"] == "draft_rejected"
    propose_decision("PF-10004", "anerkannt", "PZ-2025, Abschnitt 5", "Mit Arztbericht belegt.", db=full_db)
    assert get_ticket("PF-10004", full_db)["controlNotice"] is None
    approve_draft("PF-10004", "human-ui", full_db)
    changed = propose_decision("PF-10004", "abgelehnt", "PZ-2025, Abschnitt 6", "Nach Freigabe geändert.", db=full_db)
    ticket = get_ticket("PF-10004", full_db)
    assert changed["approvedAt"] is None and ticket["humanApprovedAt"] is None
    assert ticket["controlNotice"]["kind"] == "review_invalidated"
    assert "Entscheidung" in ticket["controlNotice"]["text"]
