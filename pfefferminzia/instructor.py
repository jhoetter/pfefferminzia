"""Instructor tooling: provision participant inboxes, hand out values, send scenarios, watch progress.

Everything instructor-specific lives in the Git-ignored `.instructor/` folder:

- `.instructor/.env`       INSTRUCTOR_AGENTMAIL_API_KEY and INSTRUCTOR_INBOX_ID (the scenario sender)
- `.instructor/roster.csv` one row per participant slot (written by `provision`, names editable)
- `.instructor/sent.jsonl` log of sent scenarios, so a repeated `send` never mails twice
- `.instructor/handouts/`  one paste-ready text per participant

Commands that create inboxes or send mail only act with `--yes`; without it they print the plan.
"""

from __future__ import annotations

import csv
import io
import json
import os
import re
import time
from pathlib import Path
from typing import Any, Callable

from dotenv import dotenv_values

from .agentmail_service import _mapping, _value
from .constants import ROOT
from .scenarios import Scenario, scenarios_for
from .util import utc_now

INSTRUCTOR_DIR = ROOT / ".instructor"
ROSTER_FIELDS = ["slot", "name", "email", "inbox_id", "api_key"]
DEFAULT_REPO_URL = "https://github.com/jhoetter/pfefferminzia"


def _config(directory: Path) -> dict[str, str]:
    values = {key: value or "" for key, value in dotenv_values(directory / ".env").items()}
    for key in ("INSTRUCTOR_AGENTMAIL_API_KEY", "INSTRUCTOR_INBOX_ID", "INSTRUCTOR_REPO_URL"):
        values[key] = os.getenv(key) or values.get(key, "")
    if not values["INSTRUCTOR_AGENTMAIL_API_KEY"] or not values["INSTRUCTOR_INBOX_ID"]:
        raise ValueError(
            f"Bitte {directory / '.env'} mit INSTRUCTOR_AGENTMAIL_API_KEY (Organisationsschlüssel) "
            "und INSTRUCTOR_INBOX_ID (Szenario-Absender-Inbox) anlegen."
        )
    return values


def _client(directory: Path) -> Any:
    from agentmail import AgentMail

    return AgentMail(api_key=_config(directory)["INSTRUCTOR_AGENTMAIL_API_KEY"])


def participant_addresses(directory: Path = INSTRUCTOR_DIR) -> str:
    """All participant inbox addresses, comma-separated, e.g. for the BCC field of one demo mail."""
    return ", ".join(row["email"] for row in read_roster(directory) if row["email"])


def _write_private(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.parent.chmod(0o700)
    path.write_text(content, encoding="utf-8")
    path.chmod(0o600)


def read_roster(directory: Path = INSTRUCTOR_DIR) -> list[dict[str, str]]:
    path = directory / "roster.csv"
    if not path.is_file():
        return []
    with path.open(encoding="utf-8", newline="") as handle:
        return [{field: row.get(field) or "" for field in ROSTER_FIELDS} for row in csv.DictReader(handle)]


TITLES = {"dr.", "prof.", "dr.-ing.", "prof.dr.", "med.", "phil."}


def roster_preview(directory: Path = INSTRUCTOR_DIR) -> list[dict[str, str]]:
    """First names and the start of each key for the setup slide – read locally, never committed.

    All keys share a long common start, so we show it plus four characters: enough to
    match a person to their slip, far too little to use the key.
    """
    rows = read_roster(directory)
    keys = [row.get("api_key", "") for row in rows if row.get("api_key")]
    shared = len(os.path.commonprefix(keys)) if len(keys) > 1 else 6
    preview = []
    for row in rows:
        words = [word for word in row.get("name", "").split() if word.lower() not in TITLES]
        first = words[0] if words else f"Platz {row.get('slot', '')}"
        key = row.get("api_key", "")
        preview.append({"slot": row.get("slot", ""), "firstName": first, "keyStart": f"{key[:shared + 4]}…" if key else "–"})
    return preview


def write_roster(rows: list[dict[str, str]], directory: Path = INSTRUCTOR_DIR) -> Path:
    path = directory / "roster.csv"
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=ROSTER_FIELDS, lineterminator="\n")
    writer.writeheader()
    writer.writerows(sorted(rows, key=lambda row: int(row["slot"])))
    _write_private(path, buffer.getvalue())
    return path


def provision(count: int, prefix: str, domain: str | None = None, *, execute: bool = False,
              directory: Path = INSTRUCTOR_DIR, client: Any = None) -> dict[str, Any]:
    """Create one inbox plus one inbox-scoped key per slot. Idempotent: existing slots are kept."""
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,30}", prefix):
        raise ValueError("Prefix: nur Kleinbuchstaben, Ziffern und Bindestriche")
    roster = {row["slot"]: row for row in read_roster(directory)}
    planned = [f"{slot:02d}" for slot in range(1, count + 1) if not roster.get(f"{slot:02d}", {}).get("api_key")]
    if not execute:
        return {"execute": False, "existingSlots": sorted(roster), "slotsToCreate": planned,
                "note": "Legt pro Platz eine Inbox und einen nur dafür gültigen Schlüssel an. Mit --yes ausführen."}
    client = client or _client(directory)
    created: list[str] = []
    for slot in planned:
        username = f"{prefix}-{slot}"
        request: dict[str, Any] = {"username": username, "display_name": f"Pfefferminzia {slot}", "client_id": username}
        if domain:
            request["domain"] = domain
        try:
            inbox = _mapping(client.inboxes.create(request=request))
        except Exception as error:  # the SDK raises ApiError; only a plan limit is expected here
            if "limit_exceeded" not in str(error):
                raise
            return {"execute": True, "created": created, "limitReached": True,
                    "missingSlots": planned[len(created):], "roster": str(directory / "roster.csv"),
                    "note": "AgentMail-Inbox-Limit erreicht: Limit in der Konsole erhöhen und erneut ausführen; es geht bei den fehlenden Plätzen weiter."}
        inbox_id = str(_value(inbox, "inbox_id", "inboxId"))
        key = _mapping(client.inboxes.api_keys.create(inbox_id, name=f"{username}-workshop"))
        row = roster.get(slot, {"slot": slot, "name": ""})
        roster[slot] = {**row, "slot": slot, "email": str(_value(inbox, "email", default=inbox_id)),
                        "inbox_id": inbox_id, "api_key": str(_value(key, "api_key", "apiKey"))}
        write_roster(list(roster.values()), directory)  # persist after every slot: keys are shown only once
        created.append(slot)
    return {"execute": True, "created": created, "roster": str(directory / "roster.csv"), "slots": len(roster)}


def handouts(directory: Path = INSTRUCTOR_DIR) -> dict[str, Any]:
    config = _config(directory)
    repo = config.get("INSTRUCTOR_REPO_URL") or DEFAULT_REPO_URL
    rows = [row for row in read_roster(directory) if row["api_key"]]
    if not rows:
        raise ValueError("Roster ist leer: zuerst `instructor provision` ausführen")
    texts = []
    for row in rows:
        name = f" · {row['name']}" if row["name"] else ""
        text = (
            f"PFEFFERMINZIA – DEIN ZUGANG (Platz {row['slot']}{name})\n\n"
            "Dein Workshop-Schlüssel (nur für dich, nur für diesen Workshop):\n"
            f"  {row['api_key']}\n\n"
            f"Deine Workshop-Mailadresse: {row['email']}\n\n"
            "So startest du:\n"
            "  1. Claude-App öffnen → Code → neue Sitzung mit deinem Benutzerordner.\n"
            "  2. Schreiben:\n"
            f"     Klone {repo} flach (nur den neuesten Stand) auf den Schreibtisch in den\n"
            "     Ordner pfefferminzia-2, richte alles nach der README ein und starte die\n"
            "     Kommandozentrale. Ich bin in Drill 6.\n"
            "  3. Wenn Claude nach deinem Schlüssel fragt: die Zeile oben einfügen.\n\n"
            "Nicht in Gruppenchats teilen. Kein Terminal nötig – Claude erledigt die Technik.\n"
        )
        _write_private(directory / "handouts" / f"platz-{row['slot']}.txt", text)
        texts.append(text)
    _write_private(directory / "handouts" / "alle-zum-ausdrucken.txt", "\n\f\n".join(texts))
    return {"handouts": len(texts), "folder": str(directory / "handouts")}


def roster_email(to: str, *, execute: bool = False, slots: list[str] | None = None,
                 directory: Path = INSTRUCTOR_DIR, client: Any = None) -> dict[str, Any]:
    """Mail the slot → inbox → key assignment to the instructor (one message, from the instructor inbox)."""
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", to):
        raise ValueError("Ungültige Empfängeradresse")
    rows = [row for row in read_roster(directory) if row["api_key"] and (not slots or row["slot"] in slots)]
    if not rows:
        raise ValueError("Keine passenden Plätze mit Schlüssel im Roster")
    if not execute:
        return {"execute": False, "to": to, "participants": len(rows),
                "note": "Eine Mail mit Platz, Name, Inbox und Schlüssel je Person. Mit Bestätigung senden."}
    config = _config(directory)
    sender = config["INSTRUCTOR_INBOX_ID"]
    lines = ["Pfefferminzia – Zuordnung der Workshop-Inboxen (vertraulich, nur für die Verteilung)",
             "Teilnehmende brauchen nur ihren Schlüssel; Claude findet die Inbox dazu selbst.", ""]
    for row in rows:
        lines += [f"Platz {row['slot']}{' · ' + row['name'] if row['name'] else ''}",
                  f"  Adresse:   {row['email']}",
                  f"  Schlüssel: {row['api_key']}", ""]
    lines += ["Alle Inbox-Adressen (für BCC, um eine Mail an alle zu schicken):", participant_addresses(directory), "",
              "Die Schlüssel gelten nur für die jeweilige Inbox. Nach dem Workshop in AgentMail löschen."]
    client = client or _client(directory)
    response = _mapping(client.inboxes.messages.send(
        sender, to=[to], subject=f"Pfefferminzia: Inbox-Zuordnung für {len(rows)} Platz/Plätze", text="\n".join(lines),
    ))
    return {"execute": True, "to": to, "participants": len(rows), "messageId": str(_value(response, "message_id", "messageId"))}


def _sent_log(directory: Path) -> list[dict[str, Any]]:
    path = directory / "sent.jsonl"
    if not path.is_file():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def send_scenarios(drill: str, *, slots: list[str] | None = None, execute: bool = False, resend: bool = False,
                   pause_seconds: float = 2.0, directory: Path = INSTRUCTOR_DIR, client: Any = None,
                   sleep: Callable[[float], None] = time.sleep) -> dict[str, Any]:
    """Send one drill's scenario messages from the instructor inbox to every (or selected) participant."""
    scenarios: list[Scenario] = scenarios_for(drill)
    if not scenarios:
        raise ValueError("Unbekannter Drill: 6, 7, 8, 9 oder challenge")
    roster = [row for row in read_roster(directory) if row["email"] and (not slots or row["slot"] in slots)]
    if not roster:
        raise ValueError("Keine Empfänger: Roster leer oder Platz-Nummern passen nicht")
    already = {(entry["scenario"], entry["email"]) for entry in _sent_log(directory)}
    plan = [
        {"slot": row["slot"], "name": row["name"], "email": row["email"], "scenario": item["key"], "subject": item["subject"]}
        for row in roster for item in scenarios
        if resend or (item["key"], row["email"]) not in already
    ]
    skipped = len(roster) * len(scenarios) - len(plan)
    if not execute:
        return {"execute": False, "mails": len(plan), "skippedAlreadySent": skipped, "plan": plan,
                "note": "Nichts gesendet. Mit --yes wirklich versenden."}
    config = _config(directory)
    client = client or _client(directory)
    by_key = {item["key"]: item for item in scenarios}
    sent = []
    for index, entry in enumerate(plan):
        scenario = by_key[entry["scenario"]]
        idempotency = f"pfm-{entry['scenario']}-{entry['slot']}" + (f"-{int(time.time())}" if resend else "")
        response = _mapping(client.inboxes.messages.send(
            config["INSTRUCTOR_INBOX_ID"], to=[entry["email"]], subject=scenario["subject"],
            text=scenario["text"], idempotency_key=idempotency,
        ))
        record = {**entry, "messageId": str(_value(response, "message_id", "messageId")), "sentAt": utc_now()}
        with (directory / "sent.jsonl").open("a", encoding="utf-8") as log:
            log.write(json.dumps(record, ensure_ascii=False) + "\n")
        sent.append(record)
        if pause_seconds and index + 1 < len(plan):
            sleep(pause_seconds)
    return {"execute": True, "sent": len(sent), "skippedAlreadySent": skipped}


def progress(directory: Path = INSTRUCTOR_DIR, client: Any = None) -> dict[str, Any]:
    """Which participant has answered which scenario? Replies arrive in the instructor inbox."""
    config = _config(directory)
    client = client or _client(directory)
    roster = read_roster(directory)
    by_email = {row["email"].lower(): row for row in roster}
    messages: list[Any] = []
    page_token = None
    for _ in range(20):
        response = _mapping(client.inboxes.messages.list(config["INSTRUCTOR_INBOX_ID"], limit=100, page_token=page_token))
        messages.extend(_value(response, "messages", default=[]) or [])
        page_token = _value(response, "next_page_token", "nextPageToken")
        if not page_token:
            break
    replies: dict[str, set[str]] = {row["slot"]: set() for row in roster}
    from .scenarios import SCENARIOS

    subjects = {item["subject"]: item["key"] for item in SCENARIOS}
    for item in messages:
        message = _mapping(item)
        sender = str(_value(message, "from_", "from", "")).lower()
        address = sender.split("<")[-1].rstrip(">").strip()
        subject = re.sub(r"^(re|aw|antw):\s*", "", str(_value(message, "subject", default="")), flags=re.I).strip()
        row = by_email.get(address)
        if row and subject in subjects:
            replies[row["slot"]].add(subjects[subject])
    sent = _sent_log(directory)
    return {
        "participants": [
            {"slot": row["slot"], "name": row["name"],
             "received": sorted({entry["scenario"] for entry in sent if entry["email"] == row["email"]}),
             "answered": sorted(replies[row["slot"]])}
            for row in roster
        ]
    }


def format_progress(result: dict[str, Any]) -> str:
    from .scenarios import SCENARIOS

    keys = [item["key"] for item in SCENARIOS if item["drill"] in (6, 7, 8, 9)]
    header = "Platz  Name                  " + "  ".join(key.split("-", 1)[-1][:10].ljust(10) for key in keys)
    lines = [header, "-" * len(header)]
    for row in result["participants"]:
        cells = [("✔ Antwort" if key in row["answered"] else "· erhalten" if key in row["received"] else "").ljust(10) for key in keys]
        lines.append(f"{row['slot']:<6} {row['name'][:20]:<21} " + "  ".join(cells))
    return "\n".join(lines)


REFERENCE_SUBJECT = re.compile(r"^Reference (drill-\d\d-(?:start|complete)):")


def retag(base: str = "main", reference: str = "reference", *, execute: bool = False, root: Path = ROOT) -> dict[str, Any]:
    """Point every checkpoint tag at the right commit.

    `drill-06-start` is the tip of `base`. Each commit on `reference` (a linear
    branch on top of `base`) whose subject starts with `Reference drill-XX-…:`
    carries the solution of the previous build task and becomes that tag.
    After a change on `base`: `git rebase <base> <reference>`, then retag.
    """
    import subprocess

    def git(*args: str) -> str:
        return subprocess.run(["git", *args], cwd=root, check=True, capture_output=True, text=True).stdout.strip()

    tags = {"drill-06-start": git("rev-parse", base)}
    for line in git("log", "--reverse", "--format=%H %s", f"{base}..{reference}").splitlines():
        commit, _, subject = line.partition(" ")
        match = REFERENCE_SUBJECT.match(subject)
        if match:
            tags[match.group(1)] = commit
    from .checkpoints import CHECKPOINTS

    missing = sorted(set(CHECKPOINTS) - set(tags))
    plan = {name: commit[:10] for name, commit in tags.items()}
    if not execute or missing:
        return {"execute": False, "tags": plan, "missing": missing,
                "note": "Mit --yes setzen (nur wenn nichts fehlt). Danach: git push origin <base> <reference> && git push origin --tags --force"}
    for name, commit in tags.items():
        git("tag", "-f", "-a", f"checkpoint/{name}", commit, "-m", f"Pfefferminzia official {name} reference")
    return {"execute": True, "tags": plan,
            "next": f"git push origin {base} {reference} --force-with-lease && git push origin --tags --force"}
