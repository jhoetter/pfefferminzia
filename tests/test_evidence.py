import pytest

from pfefferminzia.checkpoints import activate_checkpoint, require_capability
from pfefferminzia.evidence import ticket_evidence
from pfefferminzia.workshop import ensure_workshop_fixtures


def _on(drill: str, monkeypatch, db) -> None:
    monkeypatch.delenv("WORKSHOP_CHECKPOINT", raising=False)
    activate_checkpoint(drill, db)
    ensure_workshop_fixtures(db)


def test_drill_seven_shows_the_person_what_claude_checks(monkeypatch, full_db):
    _on("drill-7", monkeypatch, full_db)
    evidence = ticket_evidence("PF-10002", full_db)
    # A sample case says so, so nobody takes it for the drill's own mail.
    assert evidence["isSample"] is True
    assert evidence["customers"][0]["name"] == "Simone Niederberger"
    contract = evidence["contracts"][0]
    assert contract["contractId"] == "VTR-00000102" and contract["tariffGenerationId"] == "PL-2017"
    assert {"name": "Reto Niederberger", "share": 50.0} in contract["beneficiaries"]
    assert any(document["url"].endswith("?inline=1") for document in contract["documents"])
    assert contract["claims"] is None and evidence["claimsVisible"] is False


def test_drill_nine_adds_modules_and_the_claim_in_german(monkeypatch, full_db):
    _on("drill-9", monkeypatch, full_db)
    contract = ticket_evidence("PF-10008", full_db)["contracts"][0]
    assert "Hundehalter" in contract["modules"]
    claim = next(item for item in contract["claims"] if item["claimId"] == "SCH-00000810")
    assert claim["title"] == "Hundebiss bei Radfahrer"
    assert claim["recommendation"]["action"] == "ablehnen" and claim["recommendation"]["status"] == "gestoppt"


def test_drill_six_has_no_customer_sources_yet(monkeypatch, full_db):
    _on("drill-6", monkeypatch, full_db)
    with pytest.raises(ValueError, match="knowledge"):
        require_capability("knowledge", full_db)
