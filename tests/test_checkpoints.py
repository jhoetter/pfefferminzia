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
    assert sum(first_hint["timeboxMinutes"].values()) == 75
    assert "Tarifgeneration" in first_hint["buildTask"]
    assert first_hint["advanceTask"] is None
    assert "Review-Zustand" in drill_guide(0, full_db, include_advance_task=True)["advanceTask"]


def test_drill_eight_guide_starts_with_a_real_inbox_mission(monkeypatch, full_db):
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-08-start")
    guide = drill_guide(0, full_db)
    assert guide["hint"] is None
    assert "Ticket-ID" in guide["mission"]
    assert "zweimal synchronisiert" in guide["buildTask"]
    assert "guided" in guide["learningPath"]
    assert sum(guide["timeboxMinutes"].values()) == 75


def test_each_drill_guides_separate_claude_questions_and_human_stops(monkeypatch, full_db):
    for drill in (8, 9, 10, 11):
        monkeypatch.setenv("WORKSHOP_CHECKPOINT", f"drill-{drill:02d}-start")
        guide = drill_guide(0, full_db)
        steps = guide["dialogueSteps"]
        assert len(steps) == 4
        assert all(set(step) == {"phase", "askClaude", "yourMove"} for step in steps)
        assert all(step["askClaude"] and step["yourMove"] for step in steps)
        assert "vier Dialogetappen" in guide["instruction"]
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-11-start")
    assert "nicht vorspulen" in drill_guide(0, full_db)["dialogueSteps"][1]["askClaude"]


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
