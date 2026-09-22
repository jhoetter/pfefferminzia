import pytest

from pfefferminzia.agentmail_service import send_ticket_draft
from pfefferminzia.claims import get_claim, review_claim_action
from pfefferminzia.store import get_ticket, list_tickets
from pfefferminzia.workshop import ensure_workshop_fixtures, get_workshop_status, reset_workshop_fixtures


def test_participant_fixtures_are_linked_and_non_sendable(full_db):
    reset_workshop_fixtures(full_db)
    status = get_workshop_status(full_db)
    assert {key: status[key] for key in ("profile", "syntheticDataOnly", "demoTickets", "workshopClaims", "importedTruthTables")} == {
        "profile": "participant", "syntheticDataOnly": True, "demoTickets": 7, "workshopClaims": 4, "importedTruthTables": 0
    }
    pieper = get_ticket("PF-10008", full_db)
    assert pieper["isDemo"] is True
    assert pieper["parties"][0]["partnerId"] == "PTR-00000008"
    assert pieper["linkedContracts"][0]["contractId"] == "VTR-00000801"
    assert get_claim("SCH-00000810", full_db)["ticketNumber"] == "PF-10008"
    with pytest.raises(ValueError, match="Demo tickets"):
        send_ticket_draft("PF-10008", "test", full_db)


def test_reset_preserves_non_demo_records(full_db):
    reset_workshop_fixtures(full_db)
    stamp = "2026-09-04T00:00:00Z"
    full_db.execute("""INSERT INTO tickets
      (ticket_number, source, customer_email, subject, status, product_line, category, priority, is_demo, created_at, updated_at, last_message_at)
      VALUES ('PF-99999', 'manual', 'preserve@workshop.invalid', 'Preserve me', 'new', 'unknown', 'unknown', 'normal', 0, ?, ?, ?)""", (stamp, stamp, stamp))
    pieper = get_claim("SCH-00000810", full_db)
    review_claim_action(claim_id=pieper["claimId"], recommendation_id=pieper["recommendations"][0]["id"], decision="reject", note="Corrected.", idempotency_key="reset-test-pieper", actor="test", db=full_db)
    reset_workshop_fixtures(full_db)
    assert get_claim("SCH-00000810", full_db)["recommendations"][0]["status"] == "blocked"
    assert len(list_tickets(query="PF-99999", db=full_db)) == 1
    ensure_workshop_fixtures(full_db)
    assert len([ticket for ticket in list_tickets(db=full_db) if ticket["source"] == "demo"]) == 7
