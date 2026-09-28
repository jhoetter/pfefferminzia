import pfefferminzia.agentmail_service as agentmail_service
from pfefferminzia.agentmail_service import sync_agentmail
from pfefferminzia.sorting import sort_unsorted
from pfefferminzia.store import get_ticket
from pfefferminzia.todos import list_todos
from pfefferminzia.util import utc_now
from tests.test_workshop_end_to_end import FakeAgentMail, imported_tickets


def test_incoming_mail_is_sorted_by_keyword_and_unclear_mail_stays_open(monkeypatch, full_db):
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-09-start")
    fake = FakeAgentMail()
    monkeypatch.setattr(agentmail_service, "_client", lambda: fake)
    monkeypatch.setenv("AGENTMAIL_API_KEY", "test-key")
    monkeypatch.setenv("AGENTMAIL_INBOX_ID", "inbox-participant")
    monkeypatch.setenv("WORKSHOP_ALLOWED_RECIPIENTS", "participant@example.test")
    result = sync_agentmail(full_db)
    lines = {ticket["subject"]: ticket for ticket in imported_tickets(full_db)}
    assert lines["E-Bike beschädigt"]["productLine"] == "liability"
    assert lines["E-Bike beschädigt"]["classificationSource"] == "auto-sort"
    assert lines["Frage zu VTR-00000102"]["productLine"] == "life"
    assert {case["line"] for case in result["sortedCases"]} == {"life", "liability"}

    stamp = utc_now()
    full_db.execute(
        """INSERT INTO tickets (ticket_number, source, customer_email, subject, created_at, updated_at, last_message_at)
        VALUES ('PF-9999', 'agentmail', 'x@example.test', 'Kurze Frage', ?, ?, ?)""", (stamp, stamp, stamp))
    sort_unsorted(full_db)
    assert get_ticket("PF-9999", full_db)["productLine"] == "unknown"
    assert any(todo["title"] == "Sparte zuordnen: Kurze Frage" for todo in list_todos(db=full_db))
