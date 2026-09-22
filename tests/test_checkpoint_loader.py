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
    monkeypatch.setattr(loader, "_git_output", lambda *args, **kwargs: "abc123")

    commands = []

    def fake_run(command: list[str], cwd: Path):
        commands.append((command, cwd))
        if command[:3] == ["git", "worktree", "add"]:
            Path(command[4]).mkdir(parents=True)

    monkeypatch.setattr(loader, "_run", fake_run)

    plan = loader.plan_checkpoint_load("drill-10")
    assert plan["participantChangesDetected"] is True
    assert plan["participantChangesPreserved"] is True
    assert plan["officialTagAvailable"] is True
    result = loader.apply_checkpoint_load(plan["confirmationToken"])

    target = Path(result["worktreePath"])
    assert target != source
    assert source.exists()
    environment = (target / ".env").read_text(encoding="utf-8")
    assert "AGENTMAIL_API_KEY=secret" in environment
    assert "PFEFFERMINZIA_DB_PATH" not in environment
    assert "WORKSHOP_CHECKPOINT=drill-10-start" in environment
    assert commands[0][0][:3] == ["git", "worktree", "add"]
    assert commands[-1][0][-2:] == ["drill-10-start", "--confirm-checkpoint-reset"]
    assert not (source / ".data" / "checkpoint-plans" / f"{plan['confirmationToken']}.json").exists()


def test_checkpoint_loader_rejects_changed_source(monkeypatch, tmp_path):
    source = tmp_path / "pfefferminzia"
    source.mkdir()
    monkeypatch.setattr(loader, "ROOT", source)
    monkeypatch.setattr(loader, "_plans_dir", lambda: source / ".data" / "checkpoint-plans")
    monkeypatch.setattr(loader, "_official_ref", lambda checkpoint: ("HEAD", "abc123", False))
    dirty = [[]]
    monkeypatch.setattr(loader, "_dirty_paths", lambda: dirty[-1])
    monkeypatch.setattr(loader, "_git_output", lambda *args, **kwargs: "abc123")
    plan = loader.plan_checkpoint_load("drill-8")
    dirty.append(["changed.py"])
    with pytest.raises(ValueError, match="changed after the plan"):
        loader.apply_checkpoint_load(plan["confirmationToken"])
    stored = json.loads((source / ".data" / "checkpoint-plans" / f"{plan['confirmationToken']}.json").read_text())
    assert stored["checkpoint"] == "drill-08-start"
