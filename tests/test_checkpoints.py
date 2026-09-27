import re

from pfefferminzia.checkpoints import DRILL_BRIEFS, activate_checkpoint, adopt_checkpoint, checkpoint_profile, drill_guide, verify_checkpoint
from pfefferminzia.workshop import ensure_workshop_fixtures


def test_checkpoint_activation_resets_clock_and_guides_without_spoilers(monkeypatch, full_db):
    monkeypatch.delenv("WORKSHOP_CHECKPOINT", raising=False)
    ensure_workshop_fixtures(full_db)
    profile = activate_checkpoint("drill-7", full_db)
    assert profile["name"] == "drill-07-start"
    assert checkpoint_profile(full_db)["capabilities"] == ["core", "inbox", "todos", "draft", "manual_send", "knowledge"]
    first_hint = drill_guide(1, full_db)
    assert first_hint["hintLevel"] == 1
    assert "24" not in first_hint["hint"]
    assert sum(first_hint["timeboxMinutes"].values()) == 60
    assert "Tarifgeneration" in first_hint["buildTask"]
    assert first_hint["extensions"] is None and "extension" not in first_hint
    locked = drill_guide(0, full_db, include_extensions=True)
    assert locked["caseEvidence"]["complete"] is False
    assert locked["extensions"] == {"unlocked": False, "missing": locked["caseEvidence"]["missing"]}
    life = full_db.execute("SELECT id FROM tickets WHERE product_line = 'life' LIMIT 1").fetchone()["id"]
    full_db.execute(
        "INSERT INTO ticket_events (ticket_id, type, actor, created_at) VALUES (?, 'reply_sent', 'cockpit-user', '2026-09-29T10:00:00Z')",
        (life,),
    )
    opened = drill_guide(0, full_db, include_extensions=True)
    assert opened["caseEvidence"] == {"complete": True, "missing": []}
    extensions = opened["extensions"]
    assert extensions["unlocked"] and len(extensions["specQuestions"]) == 6
    # Fast participants extend their own system; they never start the next drill's build task.
    assert extensions["recommended"]["title"] == "Beleg-Kasten im Cockpit"
    assert "controlNotice" not in str(extensions)
    assert opened["referenceSolution"]["tag"] == "checkpoint/drill-08-start"


def test_drill_six_guide_starts_with_a_real_inbox_mission(monkeypatch, full_db):
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-06-start")
    guide = drill_guide(0, full_db)
    assert guide["hint"] is None
    assert "Antworten" in guide["mission"] and "Cockpit" in guide["mission"]
    assert "reply" in guide["buildTask"]
    assert "erledigen" in guide["buildTaskShort"]
    assert "guided" in guide["learningPath"]
    assert sum(guide["timeboxMinutes"].values()) == 60


def test_adopt_checkpoint_keeps_cases_and_clock(monkeypatch, full_db):
    monkeypatch.delenv("WORKSHOP_CHECKPOINT", raising=False)
    ensure_workshop_fixtures(full_db)
    full_db.execute("UPDATE workshop_state SET clock_offset_seconds = 3600 WHERE id = 1")
    before = full_db.execute("SELECT COUNT(*) FROM tickets").fetchone()[0]
    profile = adopt_checkpoint("drill-08-start", full_db)
    assert profile["name"] == "drill-08-start"
    assert full_db.execute("SELECT clock_offset_seconds FROM workshop_state WHERE id = 1").fetchone()[0] == 3600
    assert full_db.execute("SELECT COUNT(*) FROM tickets").fetchone()[0] == before


def test_each_drill_guides_separate_claude_questions_and_human_stops(monkeypatch, full_db):
    for drill in (6, 7, 8, 9, 10):
        monkeypatch.setenv("WORKSHOP_CHECKPOINT", f"drill-{drill:02d}-start")
        guide = drill_guide(0, full_db)
        steps = guide["dialogueSteps"]
        assert len(steps) == 4
        assert all(set(step) == {"phase", "askClaude", "decision", "yourMove"} for step in steps)
        # Every step asks the participant for a judgement, not just a go-ahead.
        assert all(step["askClaude"] and step["yourMove"] and step["decision"].rstrip().endswith("?") for step in steps)
        assert len(guide["learningGoals"]) == 3 and guide["reflection"].endswith("?")
        assert "decision" in guide["instruction"] and "reflection" in guide["instruction"]
        assert guide["bridge"] and set(guide["focusBlocks"]) <= set(guide["buildingBlocks"])
        extension = DRILL_BRIEFS[drill]["extension"]
        assert extension["decision"].endswith("?") and extension["prepares"] and extension["inspiration"]
        # Early finishers get open questions to think with, not a finished solution.
        assert extension["designQuestion"].endswith("?")
        assert len(guide["thinkingPrompts"]) == 3 and all(t.endswith("?") for t in guide["thinkingPrompts"])
        assert "thinkingPrompts" in guide["instruction"]
        # Participants think in scenarios; red/green test jargon stays with Claude.
        spoken = " ".join(step[field] for step in steps for field in ("askClaude", "decision", "yourMove"))
        assert not re.search(r"\bTest|rot oder grün|fehlschlagend", spoken)
        assert "Szenarien" in guide["instruction"] and "ohne IT-Hintergrund" in guide["instruction"]
        # Everything a participant may read or hear stays in everyday words.
        extension = DRILL_BRIEFS[drill]["extension"]
        heard = [guide["mission"], guide["buildTaskShort"], guide["doneWhen"], guide["bridge"], guide["reflection"],
                 *guide["learningGoals"], *guide["thinkingPrompts"], *guide["checkpoint"]["successCriteria"],
                 *(step[field] for step in steps for field in ("askClaude", "decision", "yourMove")),
                 extension["title"], extension["designQuestion"], extension["prepares"], extension["decision"],
                 *extension["inspiration"]]
        jargon = re.compile(r"`|_|\.py\b|\.js\b|\b(Review|Audit|Queue|Commit|committ\w*|Diff|D3|reveal|Snapshot|MCP|Router|Branch|Sync|Code\w*)\b", re.I)
        assert not [text for text in heard if jargon.search(text)]
        assert extension["block"] in {*guide["buildingBlocks"], "alle"}
        assert "vier Dialogetappen" in guide["instruction"]
        assert sum(guide["timeboxMinutes"].values()) == (45 if drill == 10 else 60)
        assert "Cockpit" in guide["instruction"]
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-09-start")
    assert "Cockpit" in drill_guide(0, full_db)["dialogueSteps"][3]["yourMove"]


def test_checkpoint_verifier_reports_actionable_preflight(monkeypatch, full_db):
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-09-start")
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

    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-10-start")
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


def test_extensions_wait_for_the_auto_send_edit_and_stop_in_drill_nine(monkeypatch, full_db):
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-09-start")
    ensure_workshop_fixtures(full_db)
    ticket = full_db.execute("SELECT id FROM tickets LIMIT 1").fetchone()["id"]
    for kind, actor in (("reply_sent", "auto-send-worker"), ("schedule_cancelled", "cockpit-user")):
        full_db.execute(
            "INSERT INTO ticket_events (ticket_id, type, actor, created_at) VALUES (?, ?, ?, '2026-09-29T10:00:00Z')",
            (ticket, kind, actor),
        )
    guide = drill_guide(0, full_db, include_extensions=True)
    assert guide["caseEvidence"]["missing"] == ["Bei einer Antwort wurde der Versand mit Begründung gestoppt."]
    assert guide["extensions"]["unlocked"] is False and "recommended" not in guide["extensions"]
