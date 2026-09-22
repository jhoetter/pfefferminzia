from pfefferminzia.checkpoints import activate_checkpoint, checkpoint_profile, drill_guide, verify_checkpoint
from pfefferminzia.workshop import ensure_workshop_fixtures


def test_checkpoint_activation_resets_clock_and_guides_without_spoilers(monkeypatch, full_db):
    monkeypatch.delenv("WORKSHOP_CHECKPOINT", raising=False)
    ensure_workshop_fixtures(full_db)
    profile = activate_checkpoint("drill-9", full_db)
    assert profile["name"] == "drill-09-start"
    assert checkpoint_profile(full_db)["capabilities"] == ["core", "inbox", "todos", "knowledge", "draft", "manual_send"]
    first_hint = drill_guide(1, full_db)
    assert first_hint["hintLevel"] == 1
    assert "24" not in first_hint["hint"]


def test_checkpoint_verifier_reports_actionable_preflight(monkeypatch, full_db):
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-11-start")
    monkeypatch.setenv("AGENTMAIL_API_KEY", "")
    monkeypatch.setenv("AUTO_SEND_ENABLED", "false")
    ensure_workshop_fixtures(full_db)
    result = verify_checkpoint(False, full_db)
    assert result["ok"] is False
    assert result["nextAction"].startswith("Configure API key")
    names = {item["name"] for item in result["checks"]}
    assert {"life-scenario", "liability-scenarios", "automatic-dispatch"} <= names
