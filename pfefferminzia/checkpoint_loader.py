from __future__ import annotations

import hashlib
import json
import os
import secrets
import shutil
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .checkpoints import normalize_checkpoint
from .constants import ROOT


PLAN_TTL_SECONDS = 15 * 60


def _git_output(*args: str, cwd: Path = ROOT) -> str:
    result = subprocess.run(
        ["git", *args], cwd=cwd, check=True, capture_output=True, text=True
    )
    return result.stdout.rstrip("\r\n")


def _run(command: list[str], cwd: Path) -> None:
    subprocess.run(command, cwd=cwd, check=True, capture_output=True, text=True)


def _plans_dir() -> Path:
    path = ROOT / ".data" / "checkpoint-plans"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _official_ref(checkpoint: str) -> tuple[str, str, bool]:
    tag = f"refs/tags/checkpoint/{checkpoint}"
    try:
        commit = _git_output("rev-parse", "--verify", f"{tag}^{{commit}}")
        return tag, commit, True
    except subprocess.CalledProcessError:
        commit = _git_output("rev-parse", "HEAD")
        return "HEAD", commit, False


def _dirty_paths() -> list[str]:
    output = _git_output("status", "--porcelain=v1", "--untracked-files=all")
    return [line[3:] for line in output.splitlines() if len(line) > 3]


def plan_checkpoint_load(target_checkpoint: str) -> dict[str, Any]:
    checkpoint = normalize_checkpoint(target_checkpoint)
    reference, commit, official_tag = _official_ref(checkpoint)
    dirty_paths = _dirty_paths()
    token = secrets.token_urlsafe(24)
    suffix = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    target = ROOT.parent / f"{ROOT.name}-{checkpoint}-{suffix}-{token[:6]}"
    plan = {
        "token": token,
        "checkpoint": checkpoint,
        "reference": reference,
        "commit": commit,
        "officialTag": official_tag,
        "sourcePath": str(ROOT),
        "targetPath": str(target),
        "dirtyPaths": dirty_paths,
        "createdAtEpoch": time.time(),
        "sourceFingerprint": _source_fingerprint(commit, dirty_paths),
    }
    plans_dir = _plans_dir()
    plans_dir.mkdir(parents=True, exist_ok=True)
    plan_path = plans_dir / f"{token}.json"
    plan_path.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    plan_path.chmod(0o600)
    return {
        "checkpoint": checkpoint,
        "officialReference": reference,
        "officialTagAvailable": official_tag,
        "commit": commit,
        "sourcePath": str(ROOT),
        "targetPath": str(target),
        "participantChangesDetected": bool(dirty_paths),
        "participantChangePaths": dirty_paths[:30],
        "participantChangesPreserved": True,
        "environmentCopied": (ROOT / ".env").exists(),
        "confirmationToken": token,
        "expiresInSeconds": PLAN_TTL_SECONDS,
        "confirmationQuestion": (
            f"Soll ich den offiziellen Zustand {checkpoint} jetzt in {target} vorbereiten? "
            "Dein aktuelles Arbeitsverzeichnis bleibt unverändert."
        ),
        "warning": None if official_tag else "Official checkpoint tag is not available yet; this development plan uses current HEAD.",
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

    target = Path(plan["targetPath"]).resolve()
    expected_parent = ROOT.parent.resolve()
    expected_prefix = f"{ROOT.name}-{plan['checkpoint']}-"
    if target.parent != expected_parent or not target.name.startswith(expected_prefix):
        raise ValueError("Checkpoint target path failed the safety check")
    if target.exists():
        raise ValueError(f"Checkpoint target already exists: {target}")

    _run(["git", "worktree", "add", "--detach", str(target), plan["commit"]], ROOT)
    _run(["git", "submodule", "update", "--init", "--recursive"], target)
    _write_checkpoint_environment(target, plan["checkpoint"])
    _run(["uv", "sync", "--frozen"], target)
    _run(
        [
            "uv", "run", "pfefferminzia", "checkpoint", "activate", plan["checkpoint"],
            "--confirm-checkpoint-reset",
        ],
        target,
    )
    plan_path.unlink(missing_ok=True)
    return {
        "checkpoint": plan["checkpoint"],
        "sourcePath": str(ROOT),
        "worktreePath": str(target),
        "sourceUntouched": True,
        "participantChangesPreserved": True,
        "nextCommands": [f"cd {target}", "claude"],
        "message": "Official checkpoint prepared in a separate worktree. Restart Claude from that directory.",
    }


def _source_fingerprint(commit: str, dirty_paths: list[str]) -> str:
    return hashlib.sha256(json.dumps([commit, dirty_paths], ensure_ascii=False).encode()).hexdigest()


def _write_checkpoint_environment(target: Path, checkpoint: str) -> None:
    source = ROOT / ".env"
    lines = source.read_text(encoding="utf-8").splitlines() if source.exists() else []
    retained = [
        line
        for line in lines
        if not line.startswith("WORKSHOP_CHECKPOINT=") and not line.startswith("PFEFFERMINZIA_DB_PATH=")
    ]
    retained.append(f"WORKSHOP_CHECKPOINT={checkpoint}")
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
