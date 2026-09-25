from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

import pfefferminzia.checkpoint_loader as loader
from pfefferminzia.database import create_database
from pfefferminzia.management_report import read_report_snapshot


def test_checkpoint_loader_preserves_source_and_builds_separate_worktree(monkeypatch, tmp_path):
    source = tmp_path / "pfefferminzia"
    source.mkdir()
    (source / ".env").write_text(
        "AGENTMAIL_API_KEY=secret\nPFEFFERMINZIA_DB_PATH=/tmp/shared.db\nWORKSHOP_CHECKPOINT=drill-08-start\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(loader, "ROOT", source)
    monkeypatch.setattr(loader, "_plans_dir", lambda: source / ".data" / "checkpoint-plans")
    monkeypatch.setattr(loader, "_official_ref", lambda checkpoint: (f"refs/tags/checkpoint/{checkpoint}", "abc123", True))
    monkeypatch.setattr(loader, "_dirty_paths", lambda: ["participant.py"])
    monkeypatch.setattr(loader, "_git_output", lambda *args, **kwargs: "source456")

    commands = []

    def fake_run(command: list[str], cwd: Path, *, clean_checkpoint_environment: bool = False):
        commands.append((command, cwd, clean_checkpoint_environment))
        if command[:3] == ["git", "worktree", "add"]:
            Path(command[-2]).mkdir(parents=True)

    monkeypatch.setattr(loader, "_run", fake_run)

    plan = loader.plan_checkpoint_load("drill-10")
    assert plan["participantChangesDetected"] is True
    assert plan["participantChangesPreserved"] is True
    assert plan["officialTagAvailable"] is True
    assert plan["commit"] == "abc123"
    result = loader.apply_checkpoint_load(plan["confirmationToken"])

    target = Path(result["worktreePath"])
    assert target != source
    assert source.exists()
    environment = (target / ".env").read_text(encoding="utf-8")
    assert "AGENTMAIL_API_KEY=secret" in environment
    assert "PFEFFERMINZIA_DB_PATH" not in environment
    assert "WORKSHOP_CHECKPOINT=drill-10-start" in environment
    assert "AUTO_SEND_ENABLED=false" in environment
    assert commands[0][0][:3] == ["git", "worktree", "add"]
    assert commands[0][0][3] == "-b"
    assert result["branch"].startswith("workshop/drill-10-start-")
    assert commands[0][0][-1] == "abc123"
    assert commands[-1][0][-2:] == ["drill-10-start", "--confirm-checkpoint-reset"]
    assert commands[-1][2] is True
    assert not (source / ".data" / "checkpoint-plans" / f"{plan['confirmationToken']}.json").exists()


def test_checkpoint_worktree_is_a_pushable_branch(monkeypatch, tmp_path):
    source = tmp_path / "pfefferminzia"
    source.mkdir()

    def git(*args: str, cwd: Path = source) -> str:
        return subprocess.run(
            ["git", *args], cwd=cwd, check=True, capture_output=True, text=True
        ).stdout.strip()

    git("init", "-b", "main")
    git("config", "user.name", "Workshop Test")
    git("config", "user.email", "workshop@example.invalid")
    (source / ".gitignore").write_text(".env\n.data/\n", encoding="utf-8")
    git("add", ".gitignore")
    git("commit", "-m", "initial")
    git("tag", "checkpoint/drill-09-start")
    (source / ".env").write_text("WORKSHOP_CHECKPOINT=drill-08-start\n", encoding="utf-8")

    monkeypatch.setattr(loader, "ROOT", source)
    monkeypatch.setattr(loader, "_plans_dir", lambda: source / ".data" / "checkpoint-plans")
    monkeypatch.setattr(loader, "_git_output", lambda *args, **kwargs: git(*args))
    real_run = loader._run

    def run_without_app_setup(command: list[str], cwd: Path, *, clean_checkpoint_environment: bool = False):
        if command[:2] == ["git", "worktree"]:
            real_run(command, cwd, clean_checkpoint_environment=clean_checkpoint_environment)

    monkeypatch.setattr(loader, "_run", run_without_app_setup)
    plan = loader.plan_checkpoint_load("drill-09-start")
    result = loader.apply_checkpoint_load(plan["confirmationToken"])
    target = Path(result["worktreePath"])
    assert git("branch", "--show-current", cwd=target) == result["branch"]
    assert git("rev-parse", "HEAD", cwd=target) == plan["commit"]
    assert git("branch", "--show-current") == "main"
    assert (source / ".env").read_text(encoding="utf-8") == "WORKSHOP_CHECKPOINT=drill-08-start\n"


def test_report_checkpoint_carries_counts_without_source_database(monkeypatch, tmp_path):
    source = tmp_path / "pfefferminzia"
    source.mkdir()
    (source / ".env").write_text("WORKSHOP_CHECKPOINT=drill-11-start\nAUTO_SEND_ENABLED=true\n", encoding="utf-8")
    db = create_database(source / ".data" / "pfefferminzia.db")
    db.execute(
        """INSERT INTO tickets (ticket_number, source, customer_email, subject, product_line,
        created_at, updated_at, last_message_at) VALUES ('PF-PRIVATE', 'agentmail',
        'private@example.invalid', 'Private', 'liability', '2026-09-29', '2026-09-29', '2026-09-29')"""
    )
    db.close()
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-11-start")
    monkeypatch.setattr(loader, "ROOT", source)
    monkeypatch.setattr(loader, "_plans_dir", lambda: source / ".data" / "checkpoint-plans")
    monkeypatch.setattr(loader, "_official_ref", lambda checkpoint: (f"refs/tags/checkpoint/{checkpoint}", "abc123", True))
    monkeypatch.setattr(loader, "_dirty_paths", lambda: [])
    monkeypatch.setattr(loader, "_git_output", lambda *args, **kwargs: "source456")

    def fake_run(command: list[str], cwd: Path, *, clean_checkpoint_environment: bool = False):
        if command[:3] == ["git", "worktree", "add"]:
            Path(command[-2]).mkdir(parents=True)

    monkeypatch.setattr(loader, "_run", fake_run)
    plan = loader.plan_checkpoint_load("drill-12-start")
    assert plan["reportSourceDatabasePresent"] is True
    assert plan["aggregateReportWillBeCopied"] is True
    result = loader.apply_checkpoint_load(plan["confirmationToken"])
    report = read_report_snapshot(Path(result["worktreePath"]))
    assert report["sourceCheckpoint"] == "drill-11-start"
    assert report["tickets"][0]["count"] == 1
    assert "PF-PRIVATE" not in (Path(result["worktreePath"]) / ".data" / "management-report.json").read_text()
    assert "AUTO_SEND_ENABLED=false" in (Path(result["worktreePath"]) / ".env").read_text()
    assert (source / ".data" / "pfefferminzia.db").is_file()


def test_checkpoint_loader_rejects_changed_source(monkeypatch, tmp_path):
    source = tmp_path / "pfefferminzia"
    source.mkdir()
    monkeypatch.setattr(loader, "ROOT", source)
    monkeypatch.setattr(loader, "_plans_dir", lambda: source / ".data" / "checkpoint-plans")
    monkeypatch.setattr(loader, "_official_ref", lambda checkpoint: (f"refs/tags/checkpoint/{checkpoint}", "target123", True))
    dirty = [[]]
    monkeypatch.setattr(loader, "_dirty_paths", lambda: dirty[-1])
    monkeypatch.setattr(loader, "_git_output", lambda *args, **kwargs: "abc123")
    plan = loader.plan_checkpoint_load("drill-8")
    dirty.append(["changed.py"])
    with pytest.raises(ValueError, match="changed after the plan"):
        loader.apply_checkpoint_load(plan["confirmationToken"])
    stored = json.loads((source / ".data" / "checkpoint-plans" / f"{plan['confirmationToken']}.json").read_text())
    assert stored["checkpoint"] == "drill-08-start"


def test_recovery_worktree_names_do_not_grow_across_drills(monkeypatch, tmp_path):
    recovery = tmp_path / "pfefferminzia-drill-09-start-20260922-token"
    recovery.mkdir()
    monkeypatch.setattr(loader, "ROOT", recovery)
    monkeypatch.setattr(loader, "_plans_dir", lambda: recovery / ".data" / "checkpoint-plans")
    monkeypatch.setattr(loader, "_official_ref", lambda checkpoint: (f"refs/tags/checkpoint/{checkpoint}", "target123", True))
    monkeypatch.setattr(loader, "_dirty_paths", lambda: [])
    plan = loader.plan_checkpoint_load("drill-10-start")
    assert Path(plan["targetPath"]).name.startswith("pfefferminzia-drill-10-start-")
    assert "drill-09-start" not in Path(plan["targetPath"]).name


def test_checkpoint_loader_requires_official_tag(monkeypatch):
    def missing_tag(*args, **kwargs):
        raise loader.subprocess.CalledProcessError(128, ["git", "rev-parse"])

    monkeypatch.setattr(loader, "_git_output", missing_tag)
    with pytest.raises(ValueError, match="git fetch --tags"):
        loader._official_ref("drill-08-start")


def test_child_checkpoint_activation_drops_old_worktree_environment(monkeypatch, tmp_path):
    captured = {}
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-08-start")
    monkeypatch.setenv("PFEFFERMINZIA_DB_PATH", "/tmp/old-worktree.db")
    monkeypatch.setenv("AUTO_SEND_ENABLED", "false")
    monkeypatch.setattr(loader.subprocess, "run", lambda command, **kwargs: captured.update(kwargs))
    loader._run(["uv", "run", "pfefferminzia", "checkpoint", "activate"], tmp_path, clean_checkpoint_environment=True)
    assert "WORKSHOP_CHECKPOINT" not in captured["env"]
    assert "PFEFFERMINZIA_DB_PATH" not in captured["env"]
    assert "AUTO_SEND_ENABLED" not in captured["env"]


@pytest.mark.parametrize(
    ("checkpoint", "expected"),
    [("drill-08-start", "false"), ("drill-09-start", "false"), ("drill-10-start", "false"),
     ("drill-11-start", "true"), ("drill-11-complete", "true"),
     ("drill-12-start", "false"), ("drill-12-complete", "false")],
)
def test_recovery_sets_automatic_dispatch_for_its_stage(monkeypatch, tmp_path, checkpoint, expected):
    source = tmp_path / "pfefferminzia"
    target = tmp_path / "recovered"
    source.mkdir()
    target.mkdir()
    (source / ".env").write_text(
        "AGENTMAIL_API_KEY=workshop-scoped-key\nAUTO_SEND_ENABLED=true\nWORKSHOP_CHECKPOINT=drill-08-start\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(loader, "ROOT", source)
    loader._write_checkpoint_environment(target, checkpoint)
    lines = (target / ".env").read_text(encoding="utf-8").splitlines()
    assert f"AUTO_SEND_ENABLED={expected}" in lines
    assert sum(line.startswith("AUTO_SEND_ENABLED=") for line in lines) == 1
    assert f"WORKSHOP_CHECKPOINT={checkpoint}" in lines
