from __future__ import annotations

import json
from dataclasses import dataclass

import pytest

import pfefferminzia.agentmail_service as agentmail_service
from pfefferminzia.agentmail_service import dispatch_due_replies, send_ticket_draft, sync_agentmail
from pfefferminzia.decisions import propose_decision
from pfefferminzia.store import (
    approve_draft,
    get_ticket,
    reject_draft,
    remove_from_send_queue,
    save_draft,
    submit_draft,
    update_classification,
)
from pfefferminzia.todos import create_todo, list_todos
from pfefferminzia.workshop_clock import advance_workshop_clock


@dataclass
class FakeMessages:
    replies: list[tuple[str, str, str]]
    attachments: list = None

    def __post_init__(self):
        self.attachments = []

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

    def reply(self, inbox_id: str, message_id: str, *, text: str, html: str, attachments=None):
        assert inbox_id == "inbox-participant"
        assert html and text
        self.replies.append((inbox_id, message_id, text))
        self.attachments.append(attachments or [])
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
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-09-start")
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
    # A life case approves the decision, not the wording (Drill 8 on).
    propose_decision(life["ticketNumber"], "nachfordern", "PL-2017, Abschnitt 4", "Unterlagen fehlen noch.", db=full_db)
    save_draft(life["ticketNumber"], "Vorbereitete Lebensantwort", "Tarif PL-2017", "mcp-agent", full_db)
    reviewed = get_ticket(life["ticketNumber"], full_db)
    assert reviewed["status"] == "awaiting_human"
    assert any(todo["kind"] == "review" and todo["ticketNumber"] == life["ticketNumber"] for todo in list_todos(db=full_db))
    with pytest.raises(ValueError, match="explicit human approval"):
        send_ticket_draft(life["ticketNumber"], "mcp-agent", full_db)

    rejected = reject_draft(life["ticketNumber"], "Bitte genauer belegen.", "human", full_db)
    assert rejected["status"] == "in_progress"
    propose_decision(life["ticketNumber"], "anerkannt", "PL-2017, Abschnitt 4", "Belegt durch Vertrag und Tarif.", 5000, "CHF", db=full_db)
    approve_draft(life["ticketNumber"], "human", full_db)
    # Editing the letter after approval keeps the approval; the sealed decision goes along.
    save_draft(life["ticketNumber"], "Überarbeitete Lebensantwort", "Tarif PL-2017, Abschnitt 4", "human", full_db)
    assert get_ticket(life["ticketNumber"], full_db)["humanApprovedAt"]
    sent_life = send_ticket_draft(life["ticketNumber"], "human", full_db)
    assert sent_life["status"] == "sent"
    assert fake.inboxes.messages.attachments[-1][0]["filename"].startswith("Entscheidung-")

    liability = next(ticket for ticket in imported_tickets(full_db) if ticket["subject"].startswith("E-Bike"))
    update_classification(liability["ticketNumber"], "liability", "claim", "Liability request", db=full_db)
    save_draft(liability["ticketNumber"], "Vorbereitete Haftpflichtantwort", "Tarif", "mcp-agent", full_db)
    scheduled = submit_draft(liability["ticketNumber"], "mcp-agent", 24, full_db)
    assert scheduled["status"] == "scheduled"
    assert dispatch_due_replies(full_db)["sent"] == 0
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-08-start")
    assert dispatch_due_replies(full_db) == {"enabled": False, "sent": 0, "skipped": 0}
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-09-start")

    removed = remove_from_send_queue(liability["ticketNumber"], "Bewusster Eingriff", "human", full_db)
    assert removed["status"] == "in_progress"
    submit_draft(liability["ticketNumber"], "mcp-agent", 24, full_db)
    advance_workshop_clock(24, "instructor", full_db)
    result = dispatch_due_replies(full_db)
    assert result == {"enabled": True, "sent": 1, "skipped": 0}
    assert get_ticket(liability["ticketNumber"], full_db)["status"] == "sent"
    assert len(fake.inboxes.messages.replies) == 2


def test_sending_a_reply_completes_its_reply_task(monkeypatch, full_db):
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-06-start")
    monkeypatch.setattr(agentmail_service, "_client", lambda: FakeAgentMail())
    monkeypatch.setenv("AGENTMAIL_API_KEY", "test-key")
    monkeypatch.setenv("AGENTMAIL_INBOX_ID", "inbox-participant")
    monkeypatch.setenv("WORKSHOP_ALLOWED_RECIPIENTS", "participant@example.test")
    sync_agentmail(full_db)
    number = imported_tickets(full_db)[0]["ticketNumber"]
    manual = create_todo("Rückruf planen", ticket_number=number, db=full_db)
    save_draft(number, "Danke für Ihre Nachricht.", "Kurz", "mcp-agent", full_db)
    send_ticket_draft(number, "human-ui", full_db)

    todos = {todo["id"]: todo for todo in list_todos(db=full_db) if todo["ticketNumber"] == number}
    assert [todo["status"] for todo in todos.values() if todo["kind"] == "reply"] == ["completed"]
    assert todos[manual["id"]]["status"] == "open"


def _liability_ticket(db, number):
    stamp = "2026-09-29T08:00:00Z"
    cursor = db.execute(
        """INSERT INTO tickets
        (ticket_number, source, source_inbox_id, source_thread_id, customer_email, subject, status, product_line,
         category, priority, is_demo, created_at, updated_at, last_message_at)
        VALUES (?, 'agentmail', 'inbox-participant', ?, 'participant@example.test', ?, 'in_progress', 'liability',
        'claim', 'normal', 0, ?, ?, ?)""",
        (number, f"thread-{number}", number, stamp, stamp, stamp),
    )
    db.execute(
        """INSERT INTO messages
        (ticket_id, external_message_id, direction, sender, recipients_json, subject, text_body, sent_at, created_at)
        VALUES (?, ?, 'inbound', 'participant@example.test', '[]', ?, 'Schaden', ?, ?)""",
        (cursor.lastrowid, f"{number}-in", number, stamp, stamp),
    )
    save_draft(number, f"Antwort {number}", "Tarif", "mcp-agent", db)
    submit_draft(number, "mcp-agent", 24, db)


def test_queue_explains_stops_and_never_sends_twice(monkeypatch, full_db):
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-09-start")
    fake = FakeAgentMail()
    monkeypatch.setattr(agentmail_service, "_client", lambda: fake)
    monkeypatch.setenv("AGENTMAIL_API_KEY", "test-key")
    monkeypatch.setenv("AGENTMAIL_INBOX_ID", "inbox-participant")
    monkeypatch.setenv("WORKSHOP_ALLOWED_RECIPIENTS", "participant@example.test")
    monkeypatch.setenv("AUTO_SEND_ENABLED", "true")
    for number in ("PF-RUN", "PF-EDIT", "PF-STOP"):
        _liability_ticket(full_db, number)

    edited = save_draft("PF-EDIT", "Im Fenster geändert", "Tarif", "human-ui", full_db)
    assert edited["controlNotice"]["kind"] == "schedule_cancelled"
    stopped = remove_from_send_queue("PF-STOP", "Beschwerde braucht Prüfung", "human-ui", full_db)
    assert stopped["controlNotice"]["text"].endswith("Beschwerde braucht Prüfung")

    advance_workshop_clock(24, "human-ui", full_db)
    assert dispatch_due_replies(full_db)["sent"] == 1
    assert dispatch_due_replies(full_db)["sent"] == 0
    assert [ticket_status(full_db, n) for n in ("PF-RUN", "PF-EDIT", "PF-STOP")] == ["sent", "in_progress", "in_progress"]
    assert len(fake.inboxes.messages.replies) == 1
    assert get_ticket("PF-RUN", full_db)["controlNotice"] is None


def ticket_status(db, number):
    return get_ticket(number, db)["status"]


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


class AnsweredThreadMessages(FakeMessages):
    """An inbox that still holds a reply from an earlier workshop run (newest first)."""

    def list(self, inbox_id: str, **_: object):
        return {"messages": [{"message_id": "old-reply"}, {"message_id": "welcome-in"}]}

    def get(self, inbox_id: str, message_id: str):
        common = {"thread_id": "thread-welcome", "subject": "Willkommen", "attachments": [], "to": []}
        if message_id == "old-reply":
            return {**common, "message_id": message_id, "from": "participant@agentmail.to",
                    "timestamp": "2026-09-27T09:05:00Z", "text": "Antwort aus dem letzten Durchlauf"}
        return {**common, "message_id": message_id, "from": "Johannes <teacher@example.test>",
                "timestamp": "2026-09-27T09:00:00Z", "text": "Was möchten Sie heute lernen?"}


def test_reply_from_an_earlier_run_shows_the_case_as_answered(monkeypatch, full_db):
    from pfefferminzia.checkpoints import case_evidence

    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-06-start")
    fake = FakeAgentMail()
    fake.inboxes.messages = AnsweredThreadMessages([])
    monkeypatch.setattr(agentmail_service, "_client", lambda: fake)
    monkeypatch.setenv("AGENTMAIL_API_KEY", "test-key")
    monkeypatch.setenv("AGENTMAIL_INBOX_ID", "inbox-participant")
    monkeypatch.setenv("WORKSHOP_ALLOWED_RECIPIENTS", "teacher@example.test")

    imported = sync_agentmail(full_db)
    assert imported == {**imported, "importedTickets": 1, "importedMessages": 2}
    ticket = imported_tickets(full_db)[0]
    # One sync, consistent state: the old reply is visible and the case is answered.
    assert [message["direction"] for message in ticket["messages"]] == ["inbound", "outbound"]
    assert ticket["status"] == "sent"
    assert all(todo["status"] == "completed" for todo in list_todos(db=full_db) if todo["ticketNumber"] == ticket["ticketNumber"])
    # A reply from an earlier run is no evidence for today's drill.
    assert case_evidence(6, full_db)["complete"] is False
    assert sync_agentmail(full_db)["importedMessages"] == 0


@pytest.mark.asyncio
async def test_inbox_fetch_reports_mail_the_cockpit_already_fetched(monkeypatch, full_db):
    from mcp import Client

    import pfefferminzia.database as database
    from pfefferminzia.mcp_server import create_mcp_server

    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-08-start")
    fake = FakeAgentMail()
    monkeypatch.setattr(agentmail_service, "_client", lambda: fake)
    monkeypatch.setenv("AGENTMAIL_API_KEY", "test-key")
    monkeypatch.setenv("AGENTMAIL_INBOX_ID", "inbox-participant")
    monkeypatch.setenv("WORKSHOP_ALLOWED_RECIPIENTS", "participant@example.test")
    monkeypatch.setattr(database, "_singleton", full_db)
    sync_agentmail(full_db)  # the cockpit's own 30-second fetch got there first
    async with Client(create_mcp_server()) as client:
        result = await client.call_tool("sync_agentmail", {})
    answer = json.loads(result.content[0].text)
    assert answer["importedTickets"] == 0
    assert len(answer["waitingCases"]) == 2 and "2 offene Fälle" in answer["summary"]
