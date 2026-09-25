from __future__ import annotations

import hashlib
import json
import os
import secrets
import shutil
import sqlite3
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from .checkpoints import normalize_checkpoint
from .constants import ROOT
from .management_report import capture_report_snapshot


PLAN_TTL_SECONDS = 15 * 60
LoadMode = Literal["official", "continue"]


def _recovery_base_name() -> str:
    return ROOT.name.split("-drill-", 1)[0]


def _git_output(*args: str, cwd: Path = ROOT) -> str:
    result = subprocess.run(
        ["git", *args], cwd=cwd, check=True, capture_output=True, text=True
    )
    return result.stdout.rstrip("\r\n")


def _run(command: list[str], cwd: Path, *, clean_checkpoint_environment: bool = False) -> None:
    environment = os.environ.copy()
    if clean_checkpoint_environment:
        # A running MCP server inherited the old worktree's .env. Let the
        # child's own .env select its checkpoint and fresh SQLite database.
        environment.pop("WORKSHOP_CHECKPOINT", None)
        environment.pop("PFEFFERMINZIA_DB_PATH", None)
        environment.pop("AUTO_SEND_ENABLED", None)
    subprocess.run(command, cwd=cwd, env=environment, check=True, capture_output=True, text=True)


def _plans_dir() -> Path:
    path = ROOT / ".data" / "checkpoint-plans"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _official_ref(checkpoint: str) -> tuple[str, str, bool]:
    tag = f"refs/tags/checkpoint/{checkpoint}"
    try:
        commit = _git_output("rev-parse", "--verify", f"{tag}^{{commit}}")
        return tag, commit, True
    except subprocess.CalledProcessError as error:
        raise ValueError(
            f"Official checkpoint tag {tag} is missing. Run `git fetch --tags` and prepare a new plan."
        ) from error


def _dirty_paths() -> list[str]:
    output = _git_output("status", "--porcelain=v1", "--untracked-files=all")
    return [line[3:] for line in output.splitlines() if len(line) > 3]


def _untracked_files() -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", "--others", "--exclude-standard", "-z"], cwd=ROOT,
        check=True, capture_output=True,
    )
    return [Path(os.fsdecode(item)) for item in result.stdout.split(b"\0") if item]


def _participant_content_fingerprint() -> str:
    patch = subprocess.run(
        ["git", "diff", "--binary", "HEAD"], cwd=ROOT, check=True, capture_output=True,
    ).stdout
    digest = hashlib.sha256(patch)
    for relative in _untracked_files():
        path = ROOT / relative
        if path.is_symlink() or not path.is_file():
            raise ValueError(f"Untracked path needs manual review before continuing: {relative}")
        digest.update(os.fsencode(relative))
        digest.update(path.read_bytes())
    return digest.hexdigest()


def _carry_participant_changes(target: Path) -> None:
    patch = subprocess.run(
        ["git", "diff", "--binary", "HEAD"], cwd=ROOT, check=True, capture_output=True,
    ).stdout
    if patch:
        subprocess.run(["git", "apply", "--binary", "-"], cwd=target, input=patch, check=True, capture_output=True)
    for relative in _untracked_files():
        source = ROOT / relative
        destination = target / relative
        if source.is_symlink() or not source.is_file() or not destination.resolve().is_relative_to(target.resolve()):
            raise ValueError(f"Untracked path needs manual review before continuing: {relative}")
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)


def _copy_database(source: Path, target: Path) -> None:
    if not source.is_file():
        raise ValueError("Die bisherige Workshop-Datenbank fehlt; für Mitnehmen den alten Drill zuerst starten")
    destination = target / ".data" / "pfefferminzia.db"
    destination.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(f"file:{source}?mode=ro", uri=True) as source_db:
        with sqlite3.connect(destination) as target_db:
            source_db.backup(target_db)


def plan_checkpoint_load(target_checkpoint: str, mode: LoadMode = "official") -> dict[str, Any]:
    if mode not in ("official", "continue"):
        raise ValueError("Mode must be 'official' or 'continue'")
    checkpoint = normalize_checkpoint(target_checkpoint)
    automatic_dispatch = checkpoint in ("drill-11-start", "drill-11-complete")
    report_snapshot = checkpoint in ("drill-12-start", "drill-12-complete")
    configured_database = os.getenv("PFEFFERMINZIA_DB_PATH")
    source_database = (
        (ROOT / configured_database).resolve() if configured_database else ROOT / ".data" / "pfefferminzia.db"
    )
    reference, commit, official_tag = _official_ref(checkpoint)
    source_head = _git_output("rev-parse", "HEAD")
    dirty_paths = _dirty_paths()
    content_fingerprint = _participant_content_fingerprint() if mode == "continue" else None
    if mode == "continue" and not source_database.is_file():
        raise ValueError("Für 'continue' muss die bisherige Workshop-Datenbank vorhanden sein")
    token = secrets.token_urlsafe(24)
    suffix = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    target = ROOT.parent / f"{_recovery_base_name()}-{checkpoint}-{suffix}-{token[:6]}"
    branch = f"workshop/{checkpoint}-{suffix}-{token[:6]}"
    plan = {
        "token": token,
        "checkpoint": checkpoint,
        "mode": mode,
        "reference": reference,
        "commit": source_head if mode == "continue" else commit,
        "officialCommit": commit,
        "sourceHead": source_head,
        "officialTag": official_tag,
        "sourcePath": str(ROOT),
        "targetPath": str(target),
        "branch": branch,
        "dirtyPaths": dirty_paths,
        "createdAtEpoch": time.time(),
        "sourceFingerprint": _source_fingerprint(source_head, dirty_paths),
        "sourceContentFingerprint": content_fingerprint,
        "sourceCheckpoint": os.getenv("WORKSHOP_CHECKPOINT", "drill-08-start"),
        "sourceDatabase": str(source_database),
    }
    plans_dir = _plans_dir()
    plans_dir.mkdir(parents=True, exist_ok=True)
    plan_path = plans_dir / f"{token}.json"
    plan_path.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    plan_path.chmod(0o600)
    return {
        "checkpoint": checkpoint,
        "mode": mode,
        "modeLabel": "Eigenen Stand mitnehmen" if mode == "continue" else "Frischen offiziellen Stand laden",
        "officialReference": reference,
        "officialTagAvailable": official_tag,
        "commit": source_head if mode == "continue" else commit,
        "sourcePath": str(ROOT),
        "targetPath": str(target),
        "branch": branch,
        "participantChangesDetected": bool(dirty_paths),
        "participantChangePaths": dirty_paths[:30],
        "participantChangesPreserved": True,
        "participantChangesCarried": mode == "continue",
        "localCasesCarried": mode == "continue",
        "environmentCopied": (ROOT / ".env").exists(),
        "automaticDispatchWillBeEnabled": automatic_dispatch,
        "aggregateReportWillBeCopied": report_snapshot,
        "reportSourceDatabasePresent": source_database.is_file() if report_snapshot else None,
        "confirmationToken": token,
        "expiresInSeconds": PLAN_TTL_SECONDS,
        "confirmationQuestion": (
            f"Soll ich {checkpoint} als '{'Eigenen Stand mitnehmen' if mode == 'continue' else 'Frischen offiziellen Stand laden'}' in {target} vorbereiten? "
            "Dein aktuelles Arbeitsverzeichnis bleibt unverändert. "
            + ("Dein Code (auch uncommittierte Änderungen) und die bisherigen Fälle werden in den neuen Worktree kopiert. "
               if mode == "continue" else "Der neue Worktree erhält offiziellen Code und eine frische Fall-Datenbank; deine Änderungen bleiben nur im alten Ordner. ")
            + (
                " In Drill 11 wird Auto-Versand für später eingereichte Haftpflichtantworten nach dem sichtbaren Zeitfenster aktiviert."
                if automatic_dispatch else ""
            )
            + (
                " Für den Drill-12-Report werden nur aggregierte Zählwerte aus deiner bisherigen Datenbank übernommen; keine Mailtexte, Namen oder Schlüssel im Report. Die lokale .env wird wie bei jedem Checkpoint separat kopiert. Auto-Versand ist dort aus."
                if report_snapshot else ""
            )
        ),
        "warning": None,
    }


def apply_checkpoint_load(confirmation_token: str) -> dict[str, Any]:
    if not confirmation_token or any(character not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for character in confirmation_token):
        raise ValueError("Invalid checkpoint confirmation token")
    plans_dir = _plans_dir()
    plans_dir.mkdir(parents=True, exist_ok=True)
    plan_path = plans_dir / f"{confirmation_token}.json"
    if not plan_path.exists():
        raise ValueError("Checkpoint plan not found or already used; prepare a new plan")
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    if time.time() - float(plan["createdAtEpoch"]) > PLAN_TTL_SECONDS:
        plan_path.unlink(missing_ok=True)
        raise ValueError("Checkpoint plan expired; prepare it again")

    current_commit = _git_output("rev-parse", "HEAD")
    current_dirty = _dirty_paths()
    if _source_fingerprint(current_commit, current_dirty) != plan["sourceFingerprint"]:
        raise ValueError("Repository changed after the plan was prepared; inspect and prepare a new plan")
    if plan.get("mode") == "continue" and _participant_content_fingerprint() != plan["sourceContentFingerprint"]:
        raise ValueError("Participant files changed after the plan; inspect and prepare a new plan")

    target = Path(plan["targetPath"]).resolve()
    expected_parent = ROOT.parent.resolve()
    expected_prefix = f"{_recovery_base_name()}-{plan['checkpoint']}-"
    if target.parent != expected_parent or not target.name.startswith(expected_prefix):
        raise ValueError("Checkpoint target path failed the safety check")
    if target.exists():
        raise ValueError(f"Checkpoint target already exists: {target}")

    _run(["git", "worktree", "add", "-b", plan["branch"], str(target), plan["commit"]], ROOT)
    try:
        _run(["git", "submodule", "update", "--init", "--recursive"], target)
        if plan.get("mode") == "continue":
            _carry_participant_changes(target)
        _write_checkpoint_environment(target, plan["checkpoint"])
        if plan.get("mode") == "continue":
            _copy_database(Path(plan["sourceDatabase"]), target)
        if plan["checkpoint"] in ("drill-12-start", "drill-12-complete"):
            capture_report_snapshot(ROOT, target, plan["sourceCheckpoint"], Path(plan["sourceDatabase"]))
        _run(["uv", "sync", "--frozen"], target)
        _run(
            [
                "uv", "run", "pfefferminzia", "checkpoint", "adopt" if plan.get("mode") == "continue" else "activate", plan["checkpoint"],
                "--confirm-checkpoint-adopt" if plan.get("mode") == "continue" else "--confirm-checkpoint-reset",
            ],
            target,
            clean_checkpoint_environment=True,
        )
    except Exception:
        # Only this unique, just-created worktree is removed. The participant's
        # source directory and plan remain untouched for a safe retry.
        _run(["git", "worktree", "remove", "--force", str(target)], ROOT)
        _run(["git", "branch", "-D", plan["branch"]], ROOT)
        raise
    plan_path.unlink(missing_ok=True)
    return {
        "checkpoint": plan["checkpoint"],
        "mode": plan.get("mode", "official"),
        "sourcePath": str(ROOT),
        "worktreePath": str(target),
        "branch": plan["branch"],
        "sourceUntouched": True,
        "participantChangesPreserved": True,
        "nextCommands": [f"cd {target}", "claude"],
        "message": "Checkpoint prepared on a new branch in a separate worktree. Restart app and Claude from that directory; the source remains untouched.",
    }


def _source_fingerprint(commit: str, dirty_paths: list[str]) -> str:
    return hashlib.sha256(json.dumps([commit, dirty_paths], ensure_ascii=False).encode()).hexdigest()


def _write_checkpoint_environment(target: Path, checkpoint: str) -> None:
    source = ROOT / ".env"
    lines = source.read_text(encoding="utf-8").splitlines() if source.exists() else []
    replaced = {"WORKSHOP_CHECKPOINT", "PFEFFERMINZIA_DB_PATH", "AUTO_SEND_ENABLED"}
    retained = [line for line in lines if line.partition("=")[0].strip() not in replaced]
    retained.append(f"WORKSHOP_CHECKPOINT={checkpoint}")
    retained.append(f"AUTO_SEND_ENABLED={'true' if checkpoint in ('drill-11-start', 'drill-11-complete') else 'false'}")
    destination = target / ".env"
    destination.write_text("\n".join(retained) + "\n", encoding="utf-8")
    destination.chmod(0o600)


def remove_expired_plans() -> int:
    removed = 0
    now = time.time()
    for path in _plans_dir().glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if now - float(data["createdAtEpoch"]) > PLAN_TTL_SECONDS:
                path.unlink()
                removed += 1
        except (OSError, ValueError, KeyError, json.JSONDecodeError):
            path.unlink(missing_ok=True)
            removed += 1
    return removed
