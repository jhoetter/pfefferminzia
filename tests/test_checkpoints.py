from pfefferminzia.checkpoints import activate_checkpoint, adopt_checkpoint, checkpoint_profile, drill_guide, verify_checkpoint
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
    assert sum(first_hint["timeboxMinutes"].values()) == 60
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
    assert sum(guide["timeboxMinutes"].values()) == 60


def test_adopt_checkpoint_keeps_cases_and_clock(monkeypatch, full_db):
    monkeypatch.delenv("WORKSHOP_CHECKPOINT", raising=False)
    ensure_workshop_fixtures(full_db)
    full_db.execute("UPDATE workshop_state SET clock_offset_seconds = 3600 WHERE id = 1")
    before = full_db.execute("SELECT COUNT(*) FROM tickets").fetchone()[0]
    profile = adopt_checkpoint("drill-10-start", full_db)
    assert profile["name"] == "drill-10-start"
    assert full_db.execute("SELECT clock_offset_seconds FROM workshop_state WHERE id = 1").fetchone()[0] == 3600
    assert full_db.execute("SELECT COUNT(*) FROM tickets").fetchone()[0] == before


def test_each_drill_guides_separate_claude_questions_and_human_stops(monkeypatch, full_db):
    for drill in (8, 9, 10, 11, 12):
        monkeypatch.setenv("WORKSHOP_CHECKPOINT", f"drill-{drill:02d}-start")
        guide = drill_guide(0, full_db)
        steps = guide["dialogueSteps"]
        assert len(steps) == 4
        assert all(set(step) == {"phase", "askClaude", "yourMove"} for step in steps)
        assert all(step["askClaude"] and step["yourMove"] for step in steps)
        assert "vier Dialogetappen" in guide["instruction"]
        assert sum(guide["timeboxMinutes"].values()) == (45 if drill == 12 else 60)
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


def test_report_checkpoint_needs_snapshot_but_not_live_inbox(monkeypatch, full_db, tmp_path):
    import pfefferminzia.constants as constants

    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-12-start")
    monkeypatch.setenv("AGENTMAIL_API_KEY", "")
    monkeypatch.setenv("AUTO_SEND_ENABLED", "false")
    monkeypatch.setattr(constants, "ROOT", tmp_path)
    ensure_workshop_fixtures(full_db)
    result = verify_checkpoint(False, full_db)
    assert result["ok"] is False
    assert any(item["name"] == "management-report-snapshot" and not item["passed"] for item in result["checks"])
    report = tmp_path / ".data" / "management-report.json"
    report.parent.mkdir()
    report.write_text('{"tickets":[],"events":[]}', encoding="utf-8")
    result = verify_checkpoint(False, full_db)
    assert result["ok"] is True
    assert next(item for item in result["checks"] if item["name"] == "agentmail-configuration")["required"] is False
