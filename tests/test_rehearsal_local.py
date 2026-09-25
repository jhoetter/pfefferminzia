from __future__ import annotations

import asyncio
import importlib

from fastapi.testclient import TestClient

import pfefferminzia.agentmail_service as mail
from pfefferminzia.app import create_app, initialize_application
from pfefferminzia.store import get_ticket
from pfefferminzia.agentmail_service import send_ticket_draft
from pfefferminzia.checkpoints import current_checkpoint
from pfefferminzia.database import close_database


class FakeMessages:
    def __init__(self):
        self.available = []
        self.sent = []
        self.sender = "learner@example.test"

    def list(self, inbox_id, **kwargs):
        assert inbox_id == "inbox-rehearsal"
        assert kwargs["ascending"] is False
        return {"messages": [{"message_id": mid} for mid in self.available]}

    def get(self, inbox_id, message_id):
        assert inbox_id == "inbox-rehearsal"
        return {
            "message_id": message_id,
            "thread_id": "thread-" + message_id,
            "from": f"Learner <{self.sender}>",
            "to": ["participant@agentmail.to"],
            "subject": message_id,
            "text": "Synthetic request: " + message_id,
            "timestamp": "2026-09-29T08:00:00Z",
            "attachments": [],
        }

    def reply(self, inbox_id, message_id, *, text, html):
        assert inbox_id == "inbox-rehearsal"
        self.sent.append((message_id, text))
        return {"message_id": f"sent-{len(self.sent)}"}


class FakeMail:
    def __init__(self):
        self.inboxes = self
        self.messages = FakeMessages()

    def list(self, **kwargs):
        return {"inboxes": [{"inbox_id": "inbox-rehearsal", "email": "participant@agentmail.to"}]}


def test_realistic_drills_8_to_11_without_network(monkeypatch, tmp_path, request):
    close_database()
    request.addfinalizer(close_database)
    monkeypatch.setenv("PFEFFERMINZIA_DB_PATH", str(tmp_path / "rehearsal.db"))
    monkeypatch.setenv("AGENTMAIL_API_KEY", "stub")
    monkeypatch.setenv("AGENTMAIL_INBOX_ID", "inbox-rehearsal")
    monkeypatch.setenv("WORKSHOP_ALLOWED_RECIPIENTS", "learner@example.test")
    monkeypatch.setenv("AUTO_SEND_ENABLED", "true")
    fake = FakeMail()
    monkeypatch.setattr(mail, "_client", lambda: fake)

    async def parked_background_task(seconds, function):
        del seconds, function
        await asyncio.Event().wait()

    monkeypatch.setattr(importlib.import_module("pfefferminzia.app"), "_periodic", parked_background_task)

    monkeypatch.delenv("WORKSHOP_CHECKPOINT", raising=False)
    initialize_application()
    assert current_checkpoint() == "drill-08-start"

    def client_for(stage):
        monkeypatch.setenv("WORKSHOP_CHECKPOINT", stage)
        initialize_application()
        return TestClient(create_app())

    def find(client, subject):
        return next(t for t in client.get("/api/tickets").json() if t["subject"] == subject)["ticketNumber"]

    def put_draft(client, number, text):
        response = client.put(f"/api/tickets/{number}/draft", json={"body": text, "rationale": "Synthetic evidence"})
        assert response.status_code == 200, response.text

    with client_for("drill-08-start") as client:
        fake.messages.sender = "personal-gmail@example.test"  # Inbound is not governed by the outbound allowlist.
        fake.messages.available = ["Drill 8 onboarding"]
        assert client.post("/api/sync").json()["importedTickets"] == 1
        assert client.get("/api/workshop").json()["lastInboxSync"]["importedMessages"] == 1
        number = find(client, "Drill 8 onboarding")
        status = client.get("/api/workshop").json()
        assert status["drillBrief"]["timeboxMinutes"]["selbstBauen"] == 25
        assert len(status["drillBrief"]["dialogueSteps"]) == 4
        todo = client.post("/api/todos", json={"title": "Absender und Anliegen prüfen", "ticketNumber": number})
        assert todo.status_code == 201
        assert todo.json()["ticketNumber"] == number
        done = client.patch(f"/api/todos/{todo.json()['id']}", json={"status": "completed"})
        assert done.json()["status"] == "completed"
        assert client.get("/api/tariffs").status_code == 400
        assert not any(t["productLine"] == "life" for t in client.get("/api/tickets").json())

    with client_for("drill-09-start") as client:
        fake.messages.sender = "learner@example.test"
        fake.messages.available = ["Drill 9 life"]
        assert client.post("/api/sync").json()["importedTickets"] == 1
        number = find(client, "Drill 9 life")
        classify = client.post(f"/api/tickets/{number}/classify", json={"productLine": "life", "category": "contract_change", "summary": "Life request"})
        assert classify.status_code == 200, classify.text
        put_draft(client, number, "Agent's first draft")
        put_draft(client, number, "Human-edited response")
        assert client.post(f"/api/tickets/{number}/submit", json={}).status_code == 400
        sent = client.post(f"/api/tickets/{number}/send", json={})
        assert sent.status_code == 200, sent.text
        assert sent.json()["status"] == "sent"
        assert fake.messages.sent[-1] == ("Drill 9 life", "Human-edited response")

    with client_for("drill-10-start") as client:
        fake.messages.available = ["Drill 10 approve", "Drill 10 reject"]
        assert client.post("/api/sync").json()["importedTickets"] == 2
        for subject in fake.messages.available:
            number = find(client, subject)
            client.post(f"/api/tickets/{number}/classify", json={"productLine": "life", "category": "claim", "summary": "Life claim"})
            put_draft(client, number, f"Prepared decision for {subject}")
            response = client.post(f"/api/tickets/{number}/submit", json={})
            assert response.json()["status"] == "awaiting_human", response.text
            assert response.json()["humanApprovedAt"] is None
        approved = find(client, "Drill 10 approve")
        rejected = find(client, "Drill 10 reject")
        try:
            send_ticket_draft(approved, "mcp-agent")
        except ValueError as error:
            assert "human approval" in str(error)
        else:
            raise AssertionError("Life reply escaped without human approval")
        blocked = client.post(f"/api/tickets/{approved}/send", json={})
        assert blocked.status_code == 400
        assert "Approve the life draft" in blocked.json()["error"]
        assert client.post(f"/api/tickets/{approved}/approve", json={}).status_code == 200
        sent = client.post(f"/api/tickets/{approved}/send", json={})
        assert sent.json()["status"] == "sent", sent.text
        assert client.post(f"/api/tickets/{rejected}/reject", json={"note": "Needs evidence"}).json()["status"] == "in_progress"
        put_draft(client, rejected, "Reworked decision")
        assert get_ticket(rejected)["humanApprovedAt"] is None
        assert client.post(f"/api/tickets/{rejected}/send", json={}).status_code == 400

    with client_for("drill-11-start") as client:
        fake.messages.available = ["Drill 11 run", "Drill 11 edit", "Drill 11 remove"]
        assert client.post("/api/sync").json()["importedTickets"] == 3
        numbers = {}
        for subject in fake.messages.available:
            number = find(client, subject)
            numbers[subject] = number
            routed = client.post(f"/api/tickets/{number}/route", json={"route": "liability_intervention_window", "category": "claim", "summary": "Liability request", "confidence": 0.9})
            assert routed.status_code == 200, routed.text
            put_draft(client, number, f"Liability response for {subject}")
            scheduled = client.post(f"/api/tickets/{number}/submit", json={"delayHours": 24})
            assert scheduled.json()["status"] == "scheduled", scheduled.text
        put_draft(client, numbers["Drill 11 edit"], "Human-edited liability reply")
        removed = client.request("DELETE", f"/api/tickets/{numbers['Drill 11 remove']}/schedule", json={"reason": "Human stopped it"})
        assert removed.json()["status"] == "in_progress", removed.text
        dispatched = client.post("/api/workshop/clock/advance", json={"hours": 24, "confirmAdvance": True})
        assert dispatched.status_code == 200, dispatched.text
        assert dispatched.json()["dispatch"]["sent"] == 1
        assert get_ticket(numbers["Drill 11 run"])["status"] == "sent"
        assert get_ticket(numbers["Drill 11 edit"])["status"] == "in_progress"
        assert get_ticket(numbers["Drill 11 remove"])["status"] == "in_progress"
        assert len(fake.messages.sent) == 3
