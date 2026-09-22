import pytest

from pfefferminzia.claims import create_claim_task, get_claim, list_claims, propose_claim_action, review_claim_action
from pfefferminzia.crm import get_customer


def test_four_scenarios_link_to_exact_contracts_and_documents(full_db):
    claims = list_claims(db=full_db)
    assert sorted(claim["claimId"] for claim in claims) == ["SCH-00000118", "SCH-00000318", "SCH-00000810", "SCH-00000918"]
    assert get_claim("SCH-00000810", full_db)["policyDocumentIds"] == ["RW-HP-AHB-DE-2013"]
    assert "SCH-00000810" in [claim["claimId"] for claim in get_customer("PTR-00000008", full_db)["claims"]]
    assert any(item["id"] == "claim-SCH-00000810" for item in get_customer("PTR-00000008", full_db)["timeline"])
    assert all(claim["workshopExtension"] for claim in claims)


def test_blocked_denial_cannot_be_approved_and_rejection_is_idempotent(full_db):
    initial = get_claim("SCH-00000810", full_db)
    recommendation = initial["recommendations"][0]
    with pytest.raises(ValueError, match="blocked recommendation cannot be approved"):
        review_claim_action(claim_id=initial["claimId"], recommendation_id=recommendation["id"], decision="approve", note="Checked.", idempotency_key="pieper-approve-blocked", actor="test", db=full_db)
    rejected = review_claim_action(claim_id=initial["claimId"], recommendation_id=recommendation["id"], decision="reject", note="Source policy contradicts migration.", idempotency_key="pieper-reject-001", actor="test", db=full_db)
    assert rejected["status"] == "triage"
    event_count = len(rejected["events"])
    replay = review_claim_action(claim_id=initial["claimId"], recommendation_id=recommendation["id"], decision="reject", note="Changed replay.", idempotency_key="pieper-reject-001", actor="test", db=full_db)
    assert len(replay["events"]) == event_count


def test_recommendations_require_human_review_and_tasks_are_idempotent(full_db):
    proposed = propose_claim_action(claim_id="SCH-00000918", action="REQUEST_INFORMATION", rationale="Obtain original evidence.", confidence=0.78, rule_version="test-v1", idempotency_key="grimm-proposal-001", actor="mcp-agent", db=full_db)
    assert proposed["status"] == "awaiting_human"
    assert proposed["recommendations"][0]["status"] == "pending_review"
    with_task = create_claim_task(claim_id=proposed["claimId"], task_type="EVIDENCE_REVIEW", description="Validate evidence.", idempotency_key="grimm-task-001", actor="mcp-agent", db=full_db)
    task_count = len(with_task["tasks"])
    replay = create_claim_task(claim_id=proposed["claimId"], task_type="EVIDENCE_REVIEW", description="Changed.", idempotency_key="grimm-task-001", actor="mcp-agent", db=full_db)
    assert len(replay["tasks"]) == task_count
