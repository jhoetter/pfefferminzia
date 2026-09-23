from __future__ import annotations

from dataclasses import dataclass

import pytest

import pfefferminzia.agentmail_service as agentmail_service
from pfefferminzia.agentmail_service import dispatch_due_replies, send_ticket_draft, sync_agentmail
from pfefferminzia.store import (
    approve_draft,
    get_ticket,
    reject_draft,
    remove_from_send_queue,
    save_draft,
    submit_draft,
    update_classification,
)
from pfefferminzia.todos import list_todos
from pfefferminzia.workshop_clock import advance_workshop_clock


@dataclass
class FakeMessages:
    replies: list[tuple[str, str, str]]

    def list(self, inbox_id: str, **_: object):
        assert inbox_id == "inbox-participant"
        return {"messages": [{"message_id": "life-in"}, {"message_id": "liability-in"}]}

    def get(self, inbox_id: str, message_id: str):
        assert inbox_id == "inbox-participant"
        common = {
            "to": ["participant@agentmail.to"],
            "timestamp": "2026-09-29T08:00:00Z",
            "attachments": [],
        }
        if message_id == "life-in":
            return {
                **common,
                "message_id": message_id,
                "thread_id": "thread-life",
                "from": "Participant <participant@example.test>",
                "subject": "Frage zu VTR-00000102",
                "text": "Bitte prüfen Sie meine RisikoLeben-Anfrage.",
            }
        return {
            **common,
            "message_id": message_id,
            "thread_id": "thread-liability",
            "from": "Participant <participant@example.test>",
            "subject": "E-Bike beschädigt",
            "text": "Mein Kind hat das E-Bike des Nachbarn beschädigt.",
        }

    def reply(self, inbox_id: str, message_id: str, *, text: str, html: str):
        assert inbox_id == "inbox-participant"
        assert html and text
        self.replies.append((inbox_id, message_id, text))
        return {"message_id": f"sent-{len(self.replies)}"}


class FakeInboxes:
    def __init__(self):
        self.messages = FakeMessages([])

    def list(self, **_: object):
        return {
            "inboxes": [
                {"inbox_id": "inbox-other", "email": "other@agentmail.to"},
                {"inbox_id": "inbox-participant", "email": "participant@agentmail.to"},
            ]
        }


class FakeAgentMail:
    def __init__(self):
        self.inboxes = FakeInboxes()


def test_agentmail_life_and_liability_control_patterns(monkeypatch, full_db):
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-11-start")
    fake = FakeAgentMail()
    monkeypatch.setattr(agentmail_service, "_client", lambda: fake)
    monkeypatch.setenv("AGENTMAIL_API_KEY", "test-key")
    monkeypatch.setenv("AGENTMAIL_INBOX_ID", "inbox-participant")
    monkeypatch.setenv("WORKSHOP_ALLOWED_RECIPIENTS", "participant@example.test")
    monkeypatch.setenv("AUTO_SEND_ENABLED", "true")

    imported = sync_agentmail(full_db)
    assert imported["inboxes"] == ["participant@agentmail.to"]
    assert imported["importedTickets"] == 2

    life = next(ticket for ticket in imported_tickets(full_db) if ticket["subject"].startswith("Frage"))
    update_classification(life["ticketNumber"], "life", "coverage_question", "Life request", db=full_db)
    save_draft(life["ticketNumber"], "Vorbereitete Lebensantwort", "Tarif PL-2017", "mcp-agent", full_db)
    reviewed = submit_draft(life["ticketNumber"], "mcp-agent", db=full_db)
    assert reviewed["status"] == "awaiting_human"
    assert any(todo["kind"] == "review" and todo["ticketNumber"] == life["ticketNumber"] for todo in list_todos(db=full_db))
    with pytest.raises(ValueError, match="explicit human approval"):
        send_ticket_draft(life["ticketNumber"], "mcp-agent", full_db)

    rejected = reject_draft(life["ticketNumber"], "Bitte genauer belegen.", "human", full_db)
    assert rejected["status"] == "in_progress"
    save_draft(life["ticketNumber"], "Überarbeitete Lebensantwort", "Tarif PL-2017, Abschnitt 4", "mcp-agent", full_db)
    submit_draft(life["ticketNumber"], "mcp-agent", db=full_db)
    approve_draft(life["ticketNumber"], "human", full_db)
    sent_life = send_ticket_draft(life["ticketNumber"], "human", full_db)
    assert sent_life["status"] == "sent"

    liability = next(ticket for ticket in imported_tickets(full_db) if ticket["subject"].startswith("E-Bike"))
    update_classification(liability["ticketNumber"], "liability", "claim", "Liability request", db=full_db)
    save_draft(liability["ticketNumber"], "Vorbereitete Haftpflichtantwort", "Tarif", "mcp-agent", full_db)
    scheduled = submit_draft(liability["ticketNumber"], "mcp-agent", 24, full_db)
    assert scheduled["status"] == "scheduled"
    assert dispatch_due_replies(full_db)["sent"] == 0
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-10-start")
    assert dispatch_due_replies(full_db) == {"enabled": False, "sent": 0, "skipped": 0}
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-11-start")

    removed = remove_from_send_queue(liability["ticketNumber"], "Bewusster Eingriff", "human", full_db)
    assert removed["status"] == "in_progress"
    submit_draft(liability["ticketNumber"], "mcp-agent", 24, full_db)
    advance_workshop_clock(24, "instructor", full_db)
    result = dispatch_due_replies(full_db)
    assert result == {"enabled": True, "sent": 1, "skipped": 0}
    assert get_ticket(liability["ticketNumber"], full_db)["status"] == "sent"
    assert len(fake.inboxes.messages.replies) == 2


def imported_tickets(db):
    rows = db.execute("SELECT ticket_number FROM tickets WHERE source = 'agentmail' ORDER BY id").fetchall()
    return [get_ticket(row["ticket_number"], db) for row in rows]


def test_agentmail_fails_closed_without_inbox_or_allowlist(monkeypatch, full_db):
    monkeypatch.setenv("AGENTMAIL_API_KEY", "test-key")
    monkeypatch.delenv("AGENTMAIL_INBOX_ID", raising=False)
    with pytest.raises(RuntimeError, match="AGENTMAIL_INBOX_ID"):
        sync_agentmail(full_db)

    monkeypatch.setenv("AGENTMAIL_INBOX_ID", "inbox-participant")
    monkeypatch.delenv("WORKSHOP_ALLOWED_RECIPIENTS", raising=False)
    stamp = "2026-09-29T08:00:00Z"
    cursor = full_db.execute(
        """INSERT INTO tickets
        (ticket_number, source, source_inbox_id, source_thread_id, customer_email, subject, status, product_line,
         category, priority, is_demo, created_at, updated_at, last_message_at)
        VALUES ('PF-ALLOWLIST', 'agentmail', 'inbox-participant', 'thread', 'blocked@example.test', 'Blocked',
        'in_progress', 'liability', 'claim', 'normal', 0, ?, ?, ?)""",
        (stamp, stamp, stamp),
    )
    full_db.execute(
        """INSERT INTO messages
        (ticket_id, external_message_id, direction, sender, recipients_json, subject, text_body, sent_at, created_at)
        VALUES (?, 'blocked-in', 'inbound', 'blocked@example.test', '[]', 'Blocked', 'Body', ?, ?)""",
        (cursor.lastrowid, stamp, stamp),
    )
    save_draft("PF-ALLOWLIST", "Antwort", "Test", db=full_db)
    with pytest.raises(ValueError, match="WORKSHOP_ALLOWED_RECIPIENTS"):
        send_ticket_draft("PF-ALLOWLIST", db=full_db)
