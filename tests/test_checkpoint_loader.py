from __future__ import annotations

import json
import sqlite3
import subprocess
from pathlib import Path
from types import SimpleNamespace

import pytest

import pfefferminzia.checkpoint_loader as loader
from pfefferminzia.database import create_database
from pfefferminzia.management_report import read_report_snapshot


def _git(folder: Path, *args: str) -> str:
    return subprocess.run(["git", *args], cwd=folder, check=True, capture_output=True, text=True).stdout.strip()


@pytest.fixture
def workshop_folder(monkeypatch, tmp_path):
    """A participant folder on Drill 6 with own work, cases and an official Drill-7 tag."""
    folder = tmp_path / "pfefferminzia"
    folder.mkdir()
    _git(folder, "init", "-b", "workshop/mein-tag")
    _git(folder, "config", "user.name", "Workshop Test")
    _git(folder, "config", "user.email", "workshop@example.invalid")
    (folder / ".gitignore").write_text(".env\n.data/\n", encoding="utf-8")
    (folder / "own.txt").write_text("first\n", encoding="utf-8")
    _git(folder, "add", ".gitignore", "own.txt")
    _git(folder, "commit", "-m", "base")
    _git(folder, "switch", "-q", "-c", "reference")
    (folder / "solution.txt").write_text("official drill 6 solution\n", encoding="utf-8")
    _git(folder, "add", "solution.txt")
    _git(folder, "commit", "-m", "Reference drill-07-start")
    _git(folder, "tag", "checkpoint/drill-07-start")
    _git(folder, "switch", "-q", "workshop/mein-tag")
    (folder / "own.txt").write_text("improved\n", encoding="utf-8")
    (folder / "new.txt").write_text("untracked work\n", encoding="utf-8")
    (folder / ".env").write_text("AGENTMAIL_API_KEY=secret\nPFEFFERMINZIA_DB_PATH=.data/pfefferminzia.db\n", encoding="utf-8")
    db = create_database(folder / ".data" / "pfefferminzia.db")
    db.execute(
        """INSERT INTO tickets (ticket_number, source, customer_email, subject, product_line, created_at, updated_at, last_message_at)
        VALUES ('PF-OWN', 'agentmail', 'own@example.invalid', 'Own case', 'liability', '2026-09-29', '2026-09-29', '2026-09-29')"""
    )
    db.close()
    monkeypatch.setattr(loader, "ROOT", folder)
    monkeypatch.setattr(loader, "STATE_ROOT", folder)
    monkeypatch.setattr(loader, "_current_checkpoint", lambda: "drill-06-start")
    monkeypatch.setattr(loader, "_stop_running_app", lambda: None)
    monkeypatch.delenv("PFEFFERMINZIA_DB_PATH", raising=False)
    commands: list[tuple[list[str], bool]] = []
    real_run = loader._run

    def run(command: list[str], cwd: Path, *, clean_checkpoint_environment: bool = False) -> None:
        commands.append((command, clean_checkpoint_environment))
        if command[0] == "git" and "submodule" not in command:
            real_run(command, cwd, clean_checkpoint_environment=clean_checkpoint_environment)

    monkeypatch.setattr(loader, "_run", run)
    return SimpleNamespace(path=folder, commands=commands)


def test_official_mode_switches_in_place_and_keeps_everything(workshop_folder):
    folder = workshop_folder.path
    plan = loader.plan_checkpoint_load("drill-07-start")
    assert plan["sameFolderAndSession"] is True and plan["folder"] == str(folder)
    assert plan["branch"] == "workshop/drill-07"
    assert "nichts verloren" in plan["confirmationQuestion"]
    result = loader.apply_checkpoint_load(plan["confirmationToken"])

    # Same folder, official code on a new branch.
    assert _git(folder, "branch", "--show-current") == "workshop/drill-07"
    assert (folder / "solution.txt").is_file()
    # The participant's work – changed and new files – is saved on their own branch.
    assert _git(folder, "show", "workshop/mein-tag:own.txt") == "improved"
    assert _git(folder, "show", "workshop/mein-tag:new.txt") == "untracked work"
    assert result["participantWorkSavedAs"] == _git(folder, "rev-parse", "workshop/mein-tag")
    # Cases move to a backup; the key stays, the drill is set.
    backup = Path(result["casesBackup"])
    assert backup.parent == folder / ".data" / "sicherung" and not (folder / ".data" / "pfefferminzia.db").exists()
    with sqlite3.connect(backup) as saved:
        assert saved.execute("SELECT subject FROM tickets").fetchone()[0] == "Own case"
    environment = (folder / ".env").read_text(encoding="utf-8")
    assert "AGENTMAIL_API_KEY=secret" in environment and "WORKSHOP_CHECKPOINT=drill-07-start" in environment
    assert "PFEFFERMINZIA_DB_PATH" not in environment
    activate, clean = workshop_folder.commands[-1]
    assert activate[-2:] == ["drill-07-start", "--confirm-checkpoint-reset"] and clean is True
    assert "neue Sitzung" in result["message"] and not list((folder / ".data" / "checkpoint-plans").glob("*.json"))


def test_continue_mode_keeps_code_and_cases_and_only_changes_the_drill(workshop_folder):
    folder = workshop_folder.path
    plan = loader.plan_checkpoint_load("drill-07-start", mode="continue")
    assert plan["localCasesCarried"] is True and plan["branch"] == "workshop/mein-tag"
    result = loader.apply_checkpoint_load(plan["confirmationToken"])
    assert _git(folder, "branch", "--show-current") == "workshop/mein-tag"
    assert (folder / "own.txt").read_text() == "improved\n" and (folder / "new.txt").is_file()
    assert (folder / ".data" / "pfefferminzia.db").is_file() and result["casesBackup"] is None
    assert "WORKSHOP_CHECKPOINT=drill-07-start" in (folder / ".env").read_text()
    assert workshop_folder.commands[-1][0][-2:] == ["drill-07-start", "--confirm-checkpoint-adopt"]


def test_a_failed_switch_puts_everything_back(workshop_folder, monkeypatch):
    folder = workshop_folder.path
    env_before = (folder / ".env").read_text()
    real_run = loader._run

    def failing_activation(command: list[str], cwd: Path, *, clean_checkpoint_environment: bool = False) -> None:
        if command[:2] == ["uv", "run"]:
            raise subprocess.CalledProcessError(1, command)
        real_run(command, cwd, clean_checkpoint_environment=clean_checkpoint_environment)

    monkeypatch.setattr(loader, "_run", failing_activation)
    plan = loader.plan_checkpoint_load("drill-07-start")
    with pytest.raises(subprocess.CalledProcessError):
        loader.apply_checkpoint_load(plan["confirmationToken"])
    assert _git(folder, "branch", "--show-current") == "workshop/mein-tag"
    assert "workshop/drill-07" not in _git(folder, "branch")
    assert (folder / "own.txt").read_text() == "improved\n" and (folder / "new.txt").is_file()
    assert _git(folder, "log", "-1", "--format=%s") == "base"
    assert (folder / ".data" / "pfefferminzia.db").is_file() and (folder / ".env").read_text() == env_before


def test_changes_after_the_plan_need_a_new_plan(workshop_folder):
    folder = workshop_folder.path
    plan = loader.plan_checkpoint_load("drill-07-start")
    (folder / "own.txt").write_text("changed after plan\n", encoding="utf-8")
    with pytest.raises(ValueError, match="changed after the plan"):
        loader.apply_checkpoint_load(plan["confirmationToken"])
    assert _git(folder, "branch", "--show-current") == "workshop/mein-tag"


def test_a_second_official_load_gets_its_own_branch(workshop_folder):
    _git(workshop_folder.path, "branch", "workshop/drill-07", "checkpoint/drill-07-start")
    assert loader.plan_checkpoint_load("drill-07-start")["branch"] == "workshop/drill-07-2"


def test_a_folder_never_reloads_the_drill_it_is_already_on(workshop_folder, monkeypatch):
    monkeypatch.setattr(loader, "_current_checkpoint", lambda: "drill-07-start")
    # "weiter mit Drill 7" on Drill 7 must not loop back into a switch.
    with pytest.raises(ValueError, match="schon auf Drill 7"):
        loader.plan_checkpoint_load("drill-07-start")
    assert loader.plan_checkpoint_load("drill-07-start", allow_same_drill=True)["checkpoint"] == "drill-07-start"


def test_report_checkpoint_counts_cases_before_they_move(workshop_folder, monkeypatch):
    folder = workshop_folder.path
    monkeypatch.setattr(loader, "_current_checkpoint", lambda: "drill-09-start")
    monkeypatch.setattr(loader, "_official_ref", lambda checkpoint: ("refs/tags/checkpoint/drill-07-start", _git(folder, "rev-parse", "checkpoint/drill-07-start"), True))
    plan = loader.plan_checkpoint_load("drill-10-start")
    assert plan["aggregateReportWillBeCopied"] is True
    loader.apply_checkpoint_load(plan["confirmationToken"])
    report = read_report_snapshot(folder)
    assert report["sourceCheckpoint"] == "drill-09-start" and report["tickets"][0]["count"] == 1
    assert "PF-OWN" not in (folder / ".data" / "management-report.json").read_text()
    assert "AUTO_SEND_ENABLED=false" in (folder / ".env").read_text()


def test_checkpoint_loader_requires_official_tag(monkeypatch):
    def missing_tag(*args, **kwargs):
        raise loader.subprocess.CalledProcessError(128, ["git", "rev-parse"])

    monkeypatch.setattr(loader, "_git_output", missing_tag)
    with pytest.raises(ValueError, match="git fetch --tags"):
        loader._official_ref("drill-06-start")


def test_activation_reads_the_new_drill_from_env(monkeypatch, tmp_path):
    captured = {}
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-06-start")
    monkeypatch.setenv("PFEFFERMINZIA_DB_PATH", "/tmp/old.db")
    monkeypatch.setenv("AUTO_SEND_ENABLED", "false")
    monkeypatch.setattr(loader.subprocess, "run", lambda command, **kwargs: captured.update(kwargs))
    loader._run(["uv", "run", "pfefferminzia", "checkpoint", "activate"], tmp_path, clean_checkpoint_environment=True)
    assert not {"WORKSHOP_CHECKPOINT", "PFEFFERMINZIA_DB_PATH", "AUTO_SEND_ENABLED"} & set(captured["env"])


@pytest.mark.parametrize(
    ("checkpoint", "expected"),
    [("drill-06-start", "false"), ("drill-07-start", "false"), ("drill-08-start", "false"),
     ("drill-09-start", "true"), ("drill-10-start", "false"), ("drill-10-complete", "false")],
)
def test_each_drill_sets_automatic_dispatch_for_its_stage(tmp_path, checkpoint, expected):
    (tmp_path / ".env").write_text(
        "AGENTMAIL_API_KEY=workshop-scoped-key\nAUTO_SEND_ENABLED=true\nWORKSHOP_CHECKPOINT=drill-06-start\n",
        encoding="utf-8",
    )
    loader._write_checkpoint_environment(tmp_path, checkpoint)
    lines = (tmp_path / ".env").read_text(encoding="utf-8").splitlines()
    assert f"AUTO_SEND_ENABLED={expected}" in lines and f"WORKSHOP_CHECKPOINT={checkpoint}" in lines
    assert sum(line.startswith("AUTO_SEND_ENABLED=") for line in lines) == 1
    assert "AGENTMAIL_API_KEY=workshop-scoped-key" in lines
