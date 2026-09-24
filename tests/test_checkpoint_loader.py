from __future__ import annotations

import json
from pathlib import Path

import pytest

import pfefferminzia.checkpoint_loader as loader


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
            Path(command[4]).mkdir(parents=True)

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
    assert commands[0][0][-1] == "abc123"
    assert commands[-1][0][-2:] == ["drill-10-start", "--confirm-checkpoint-reset"]
    assert commands[-1][2] is True
    assert not (source / ".data" / "checkpoint-plans" / f"{plan['confirmationToken']}.json").exists()


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
     ("drill-11-start", "true"), ("drill-11-complete", "true")],
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
