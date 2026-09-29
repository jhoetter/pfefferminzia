"""Switch a participant's folder to another drill – in place, in the same Claude session.

Two modes, both reversible and never destructive:

- continue ("Eigenen Stand mitnehmen"): code and cases stay; only the drill
  changes.
- official ("Frischen offiziellen Stand laden"): the participant's code is
  saved as a commit on their current branch, the official checkpoint is
  checked out on a new branch, and the cases move to a backup database.

Earlier versions created a separate worktree per drill. Participants then had
to open a new Claude session in that folder, and the Claude app may run a
session in its own copy of the main folder, so the new session saw the old
drill and offered the switch again. Everything now happens in this folder.
"""

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
from typing import Any, Literal

from .checkpoints import CHECKPOINTS, current_checkpoint, normalize_checkpoint
from .constants import ROOT, STATE_ROOT
from .management_report import capture_report_snapshot


PLAN_TTL_SECONDS = 15 * 60
LoadMode = Literal["official", "continue"]
MODE_LABELS = {"continue": "Eigenen Stand mitnehmen", "official": "Frischen offiziellen Stand laden"}


def _current_checkpoint() -> str | None:
    try:
        return current_checkpoint()
    except Exception:  # noqa: BLE001 - no readable state means no guard to apply
        return None


def _git_output(*args: str, cwd: Path | None = None) -> str:
    result = subprocess.run(["git", *args], cwd=cwd or ROOT, check=True, capture_output=True, text=True)
    return result.stdout.rstrip("\r\n")


def _run(command: list[str], cwd: Path, *, clean_checkpoint_environment: bool = False) -> None:
    environment = os.environ.copy()
    if clean_checkpoint_environment:
        # Let the command read the drill and database from the freshly written .env.
        environment.pop("WORKSHOP_CHECKPOINT", None)
        environment.pop("PFEFFERMINZIA_DB_PATH", None)
        environment.pop("AUTO_SEND_ENABLED", None)
    subprocess.run(command, cwd=cwd, env=environment, check=True, capture_output=True, text=True)


def _plans_dir() -> Path:
    path = STATE_ROOT / ".data" / "checkpoint-plans"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _fetch_checkpoint_tag(tag: str) -> None:
    """Fetch the newest official tag; a shallow clone (`--depth 1`) has no tags yet. Offline is fine."""
    shallow = subprocess.run(["git", "rev-parse", "--is-shallow-repository"], cwd=ROOT, capture_output=True, text=True).stdout.strip() == "true"
    command = ["git", "fetch", "--quiet", "--force", *(["--depth", "1"] if shallow else []), "origin", f"+{tag}:{tag}"]
    try:
        subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=180)
    except (OSError, subprocess.SubprocessError):
        pass


def _official_ref(checkpoint: str) -> tuple[str, str, bool]:
    tag = f"refs/tags/checkpoint/{checkpoint}"
    _fetch_checkpoint_tag(tag)
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


def _database_path() -> Path:
    configured = os.getenv("PFEFFERMINZIA_DB_PATH")
    return (STATE_ROOT / configured).resolve() if configured else STATE_ROOT / ".data" / "pfefferminzia.db"


def _branch_exists(name: str) -> bool:
    return subprocess.run(
        ["git", "rev-parse", "--verify", "--quiet", f"refs/heads/{name}"], cwd=ROOT, capture_output=True
    ).returncode == 0


def _new_branch_name(checkpoint: str) -> str:
    drill = CHECKPOINTS[checkpoint]["drill"]
    stem = f"workshop/drill-{drill:02d}" + ("-loesung" if checkpoint == "drill-10-complete" else "")
    name, number = stem, 2
    while _branch_exists(name):
        name, number = f"{stem}-{number}", number + 1
    return name


def _source_fingerprint(commit: str, dirty_paths: list[str]) -> str:
    """Commit, changed paths and their content: the plan the person agreed to must still match."""
    digest = hashlib.sha256(json.dumps([commit, dirty_paths], ensure_ascii=False).encode())
    for relative in dirty_paths:
        path = ROOT / relative
        if path.is_file() and not path.is_symlink():
            digest.update(os.fsencode(relative))
            digest.update(path.read_bytes())
    return digest.hexdigest()


def plan_checkpoint_load(
    target_checkpoint: str, mode: LoadMode = "official", *, allow_same_drill: bool = False
) -> dict[str, Any]:
    if mode not in ("official", "continue"):
        raise ValueError("Mode must be 'official' or 'continue'")
    checkpoint = normalize_checkpoint(target_checkpoint)
    source_checkpoint = _current_checkpoint() or "drill-06-start"
    drill = CHECKPOINTS[checkpoint]["drill"]
    if checkpoint == source_checkpoint and not allow_same_drill:
        raise ValueError(
            f"Dieser Ordner ist schon auf Drill {drill}. Nichts laden – einfach mit Drill {drill} weitermachen. "
            "Nur wenn die Person ausdrücklich neu anfangen will: allowSameDrill."
        )
    reference, official_commit, official_tag = _official_ref(checkpoint)
    source_head = _git_output("rev-parse", "HEAD")
    source_branch = _git_output("branch", "--show-current")
    dirty_paths = _dirty_paths()
    database = _database_path()
    if mode == "continue" and not database.is_file():
        raise ValueError("Für 'Eigenen Stand mitnehmen' fehlt die bisherige Fall-Datenbank")
    report = checkpoint in ("drill-10-start", "drill-10-complete")
    branch = _new_branch_name(checkpoint) if mode == "official" else source_branch
    token = secrets.token_urlsafe(24)
    plan = {
        "token": token,
        "checkpoint": checkpoint,
        "mode": mode,
        "reference": reference,
        "officialCommit": official_commit,
        "sourceHead": source_head,
        "sourceBranch": source_branch,
        "sourceCheckpoint": source_checkpoint,
        "sourceDatabase": str(database),
        "branch": branch,
        "dirtyPaths": dirty_paths,
        "createdAtEpoch": time.time(),
        "sourceFingerprint": _source_fingerprint(source_head, dirty_paths),
    }
    plan_path = _plans_dir() / f"{token}.json"
    plan_path.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    plan_path.chmod(0o600)
    if mode == "continue":
        consequence = "Dein Code und deine bisherigen Fälle bleiben, wie sie sind; nur der Drill wird umgestellt."
    else:
        consequence = (
            "Dein bisheriger Code wird auf deinem Zweig gesichert"
            + (" (auch noch nicht Gespeichertes)" if dirty_paths else "")
            + f", der offizielle Stand kommt auf den neuen Zweig {branch}, und deine bisherigen Fälle wandern in eine "
            "Sicherungsdatei. Es geht nichts verloren."
        )
    return {
        "checkpoint": checkpoint,
        "drill": drill,
        "mode": mode,
        "modeLabel": MODE_LABELS[mode],
        "folder": str(ROOT),
        "sameFolderAndSession": True,
        "branch": branch,
        "officialReference": reference,
        "officialTagAvailable": official_tag,
        "participantChangesDetected": bool(dirty_paths),
        "participantChangePaths": dirty_paths[:30],
        "localCasesCarried": mode == "continue",
        "automaticDispatchWillBeEnabled": checkpoint == "drill-09-start",
        "aggregateReportWillBeCopied": report,
        "confirmationToken": token,
        "expiresInSeconds": PLAN_TTL_SECONDS,
        "confirmationQuestion": (
            f"Soll ich Drill {drill} hier in diesem Ordner laden ({MODE_LABELS[mode]})? {consequence} "
            "Du bleibst in dieser Sitzung."
            + (" In Drill 9 gehen Haftpflichtantworten nach dem sichtbaren Zeitfenster automatisch raus." if checkpoint == "drill-09-start" else "")
            + (" Für den Report werden nur gezählte Ereignisse übernommen, keine Namen oder Mailtexte." if report else "")
        ),
    }


def _git_identity() -> list[str]:
    configured = subprocess.run(["git", "config", "user.email"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    return [] if configured else ["-c", "user.name=Pfefferminzia-Teilnehmer", "-c", "user.email=teilnehmer@pfefferminzia.invalid"]


def _write_checkpoint_environment(folder: Path, checkpoint: str) -> None:
    source = folder / ".env"
    lines = source.read_text(encoding="utf-8").splitlines() if source.exists() else []
    replaced = {"WORKSHOP_CHECKPOINT", "PFEFFERMINZIA_DB_PATH", "AUTO_SEND_ENABLED"}
    retained = [line for line in lines if line.partition("=")[0].strip() not in replaced]
    retained.append(f"WORKSHOP_CHECKPOINT={checkpoint}")
    retained.append(f"AUTO_SEND_ENABLED={'true' if checkpoint == 'drill-09-start' else 'false'}")
    destination = folder / ".env"
    destination.write_text("\n".join(retained) + "\n", encoding="utf-8")
    destination.chmod(0o600)


def _stop_running_app() -> None:
    # The cockpit holds the database open; Claude starts it again afterwards.
    from .cli import _stop_running_pfefferminzia

    try:
        _stop_running_pfefferminzia("127.0.0.1", 3004)
    except RuntimeError:
        pass


def apply_checkpoint_load(confirmation_token: str) -> dict[str, Any]:
    if not confirmation_token or any(character not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for character in confirmation_token):
        raise ValueError("Invalid checkpoint confirmation token")
    plan_path = _plans_dir() / f"{confirmation_token}.json"
    if not plan_path.exists():
        raise ValueError("Checkpoint plan not found or already used; prepare a new plan")
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    if time.time() - float(plan["createdAtEpoch"]) > PLAN_TTL_SECONDS:
        plan_path.unlink(missing_ok=True)
        raise ValueError("Checkpoint plan expired; prepare it again")
    if _source_fingerprint(_git_output("rev-parse", "HEAD"), _dirty_paths()) != plan["sourceFingerprint"]:
        raise ValueError("Participant files changed after the plan; inspect and prepare a new plan")

    checkpoint, mode = plan["checkpoint"], plan.get("mode", "official")
    env_file = STATE_ROOT / ".env"
    env_before = env_file.read_text(encoding="utf-8") if env_file.exists() else None
    database = Path(plan["sourceDatabase"])
    backup: Path | None = None
    switched = False
    saved_commit: str | None = None
    _stop_running_app()
    try:
        if checkpoint in ("drill-10-start", "drill-10-complete"):
            capture_report_snapshot(STATE_ROOT, STATE_ROOT, plan["sourceCheckpoint"], database)
        if mode == "official":
            if plan["dirtyPaths"]:
                _run(["git", *_git_identity(), "add", "-A"], ROOT)
                _run(["git", *_git_identity(), "commit", "-m", f"Stand vor Drill {CHECKPOINTS[checkpoint]['drill']} gesichert"], ROOT)
                saved_commit = _git_output("rev-parse", "HEAD")
            _run(["git", "switch", "-c", plan["branch"], plan["officialCommit"]], ROOT)
            switched = True
            _run(["git", "submodule", "update", "--init", "--recursive"], ROOT)
            if database.is_file():
                stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
                backup = STATE_ROOT / ".data" / "sicherung" / f"{plan['sourceCheckpoint']}-{stamp}.db"
                backup.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(database), backup)
        _write_checkpoint_environment(STATE_ROOT, checkpoint)
        _run(["uv", "sync", "--frozen"], ROOT)
        _run(
            ["uv", "run", "pfefferminzia", "checkpoint", "adopt" if mode == "continue" else "activate", checkpoint,
             "--confirm-checkpoint-adopt" if mode == "continue" else "--confirm-checkpoint-reset"],
            ROOT, clean_checkpoint_environment=True,
        )
    except Exception:
        # Put everything back as it was: branch, uncommitted work, cases, .env.
        if switched:
            _run(["git", "switch", "--force", plan["sourceBranch"] or plan["sourceHead"]], ROOT)
            _run(["git", "branch", "-D", plan["branch"]], ROOT)
        if saved_commit:
            _run(["git", "reset", "--soft", "HEAD~1"], ROOT)
        if backup and backup.exists():
            database.parent.mkdir(parents=True, exist_ok=True)
            if database.exists():
                database.unlink()
            shutil.move(str(backup), database)
        if env_before is None:
            env_file.unlink(missing_ok=True)
        else:
            env_file.write_text(env_before, encoding="utf-8")
        raise
    plan_path.unlink(missing_ok=True)
    drill = CHECKPOINTS[checkpoint]["drill"]
    return {
        "checkpoint": checkpoint,
        "drill": drill,
        "mode": mode,
        "folder": str(ROOT),
        "branch": plan["branch"],
        "previousBranch": plan["sourceBranch"],
        "participantWorkSavedAs": saved_commit,
        "casesBackup": str(backup) if backup else None,
        "sameFolderAndSession": True,
        "message": (
            f"Drill {drill}: {CHECKPOINTS[checkpoint]['title']} ist geladen – hier im selben Ordner, in derselben Sitzung. "
            "Starte die Kommandozentrale "
            "neu (uv run pfefferminzia serve --open im Hintergrund) und beginne mit der Orientierung aus "
            "get_drill_guide. Keine neue Sitzung, kein anderer Ordner."
        ),
    }


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
