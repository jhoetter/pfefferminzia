from __future__ import annotations

import os
import sqlite3
import sys
from typing import Any

from .database import get_database
from .util import utc_now


CHECKPOINTS: dict[str, dict[str, Any]] = {
    "drill-08-start": {
        "order": 8,
        "drill": 8,
        "title": "Die Kommandozentrale",
        "goal": "Lokales System, MCP und persönliche Inbox verbinden; Todos und Eingang verstehen.",
        "capabilities": ["core", "inbox", "todos"],
        "successCriteria": [
            "Pfefferminzia läuft lokal.",
            "Claude sieht den Pfefferminzia-MCP-Server.",
            "Genau eine persönliche AgentMail-Inbox ist konfiguriert.",
            "Ein Todo wurde mit Claude angelegt und abgeschlossen.",
        ],
    },
    "drill-09-start": {
        "order": 9,
        "drill": 9,
        "title": "Leben: Mensch bearbeitet, Agent bereitet vor",
        "goal": "Kunden-, Vertrags- und Tarifkontext ermitteln; Entwurf vorbereiten, menschlich bearbeiten und senden.",
        "capabilities": ["core", "inbox", "todos", "knowledge", "draft", "manual_send"],
        "successCriteria": [
            "Ein Lebensfall ist Kunde, Vertrag und Tarifgeneration zugeordnet.",
            "Claude hat einen belegten Antwortentwurf vorbereitet.",
            "Ein Mensch hat den Entwurf bearbeitet und den Versand ausdrücklich ausgelöst.",
        ],
    },
    "drill-10-start": {
        "order": 10,
        "drill": 10,
        "title": "Leben: Agent bearbeitet, Mensch gibt frei",
        "goal": "Agentische Entscheidung und Antwort vollständig vorbereiten; Mensch gibt frei, lehnt ab oder bearbeitet.",
        "capabilities": [
            "core", "inbox", "todos", "knowledge", "draft", "manual_send", "life_review", "claims"
        ],
        "successCriteria": [
            "Mehrere Lebensfälle wurden vollständig vorbereitet.",
            "Ohne explizite Freigabe konnte weder Entscheidung noch Kommunikation das System verlassen.",
            "Mindestens ein Vorschlag wurde abgelehnt und überarbeitet.",
        ],
    },
    "drill-11-start": {
        "order": 11,
        "drill": 11,
        "title": "Haftpflicht: Automatisch, solange niemand widerspricht",
        "goal": "Router und sichtbares Eingriffsfenster mit Timer, Bearbeitung, Entfernung und automatischem Versand erleben.",
        "capabilities": [
            "core", "inbox", "todos", "knowledge", "draft", "manual_send", "life_review", "claims",
            "router", "intervention_queue", "workshop_clock"
        ],
        "successCriteria": [
            "Router trennt Leben und Haftpflicht nachvollziehbar.",
            "Eine Haftpflichtantwort lief nach dem Zeitfenster automatisch durch.",
            "Eine zweite Antwort wurde im Zeitfenster bearbeitet oder aus der Queue genommen.",
        ],
    },
    "drill-11-complete": {
        "order": 12,
        "drill": 11,
        "title": "Vollständiges Zielsystem",
        "goal": "Beide Kontrollmuster stehen integriert, sichtbar und verifizierbar nebeneinander.",
        "capabilities": [
            "core", "inbox", "todos", "knowledge", "draft", "manual_send", "life_review", "claims",
            "router", "intervention_queue", "workshop_clock"
        ],
        "successCriteria": [
            "Der vollständige End-to-End-Test für Leben und Haftpflicht ist grün.",
            "Kontrollregel, Eingriffe und externe Wirkung sind im Audit Log sichtbar.",
        ],
    },
}

ALIASES = {
    "8": "drill-08-start", "drill-8": "drill-08-start", "drill-08": "drill-08-start",
    "9": "drill-09-start", "drill-9": "drill-09-start", "drill-09": "drill-09-start",
    "10": "drill-10-start", "drill-10": "drill-10-start",
    "11": "drill-11-start", "drill-11": "drill-11-start",
    "complete": "drill-11-complete", "drill-11-complete": "drill-11-complete",
}


def normalize_checkpoint(value: str) -> str:
    normalized = value.strip().lower().replace("_", "-")
    checkpoint = ALIASES.get(normalized, normalized)
    if checkpoint not in CHECKPOINTS:
        raise ValueError(f"Unknown workshop checkpoint: {value}")
    return checkpoint


def current_checkpoint(db: sqlite3.Connection | None = None) -> str:
    configured = os.getenv("WORKSHOP_CHECKPOINT")
    if configured:
        return normalize_checkpoint(configured)
    db = db or get_database()
    row = db.execute("SELECT checkpoint FROM workshop_state WHERE id = 1").fetchone()
    return normalize_checkpoint(row["checkpoint"] if row else "drill-11-complete")


def checkpoint_profile(db: sqlite3.Connection | None = None) -> dict[str, Any]:
    name = current_checkpoint(db)
    return {"name": name, **CHECKPOINTS[name]}


def capability_enabled(capability: str, db: sqlite3.Connection | None = None) -> bool:
    return capability in checkpoint_profile(db)["capabilities"]


def require_capability(capability: str, db: sqlite3.Connection | None = None) -> None:
    if not capability_enabled(capability, db):
        profile = checkpoint_profile(db)
        raise ValueError(
            f"Capability '{capability}' is intentionally unavailable in {profile['name']} ({profile['title']})"
        )


def activate_checkpoint(name: str, db: sqlite3.Connection | None = None) -> dict[str, Any]:
    checkpoint = normalize_checkpoint(name)
    if os.getenv("WORKSHOP_CHECKPOINT"):
        configured = normalize_checkpoint(os.environ["WORKSHOP_CHECKPOINT"])
        if configured != checkpoint:
            raise ValueError(
                f"WORKSHOP_CHECKPOINT fixes this worktree to {configured}; change its .env instead of mutating the database"
            )
    db = db or get_database()
    db.execute(
        "UPDATE workshop_state SET checkpoint = ?, clock_offset_seconds = 0, updated_at = ? WHERE id = 1",
        (checkpoint, utc_now()),
    )
    db.execute(
        "INSERT INTO workshop_events (type, actor, details_json, created_at) VALUES ('checkpoint_activated', 'checkpoint-loader', ?, ?)",
        (f'{{"checkpoint":"{checkpoint}"}}', utc_now()),
    )
    return checkpoint_profile(db)


def available_checkpoints() -> list[dict[str, Any]]:
    return [{"name": name, **profile} for name, profile in CHECKPOINTS.items()]


def drill_guide(hint_level: int = 0, db: sqlite3.Connection | None = None) -> dict[str, Any]:
    profile = checkpoint_profile(db)
    hints = {
        8: [
            "Starte mit `uv sync --frozen` und `uv run pfefferminzia serve`.",
            "Prüfe `.env`, `.mcp.json` und den Workshop-Status; lege dann ein kleines Todo über MCP an.",
            "Nutze `verify_checkpoint` und behebe genau die fehlgeschlagenen Preflight-Prüfungen.",
        ],
        9: [
            "Beginne beim Eingang und trenne Nachrichtentext konsequent von vertrauenswürdigen Tarifquellen.",
            "Suche den Kunden, bestätige den Vertrag und lies die exakt passende Tarifgeneration vor dem Entwurf.",
            "Erzeuge einen begründeten Entwurf, ändere ihn als Mensch und löse den Versand ausdrücklich selbst aus.",
        ],
        10: [
            "Beobachte, an welcher Stelle eine externe Wirkung technisch blockiert bleibt.",
            "Reiche den exakten Entwurf zur Prüfung ein; teste Freigabe, Ablehnung und erneute Bearbeitung.",
            "Nach jeder Textänderung muss eine alte Freigabe ungültig sein. Prüfe das Audit Log.",
        ],
        11: [
            "Route zuerst nach Sparte und mache dann die unterschiedliche Kontrollregel sichtbar.",
            "Plane Haftpflichtantworten ein und beobachte Countdown sowie Queue-Aktionen.",
            "Lass einen Fall laufen, bearbeite einen zweiten, entferne einen dritten und spule erst danach die Workshop-Uhr vor.",
        ],
    }
    bounded = max(0, min(hint_level, 3))
    return {
        "checkpoint": profile,
        "hintLevel": bounded,
        "hint": None if bounded == 0 else hints[profile["drill"]][bounded - 1],
        "instruction": "Gib zunächst nur den gewählten Hinweis. Liefere eine vollständige Lösung erst auf ausdrücklichen Wunsch.",
    }


def verify_checkpoint(check_external_inbox: bool = False, db: sqlite3.Connection | None = None) -> dict[str, Any]:
    from .agentmail_service import agentmail_configuration
    from .store import list_tariffs, list_tickets

    db = db or get_database()
    profile = checkpoint_profile(db)
    agentmail = agentmail_configuration(probe=check_external_inbox)
    source = db.execute("SELECT upstream_commit FROM source_datasets LIMIT 1").fetchone()
    visible = list_tickets(db=db)
    checks: list[dict[str, Any]] = []

    def check(name: str, passed: bool, detail: str, *, required: bool = True) -> None:
        checks.append({"name": name, "passed": passed, "required": required, "detail": detail})

    check("python", sys.version_info >= (3, 12), f"Python {sys.version_info.major}.{sys.version_info.minor}")
    check("dataset", source is not None, "Pinned Falk dataset imported" if source else "Dataset import is missing")
    check(
        "agentmail-configuration",
        agentmail["ready"],
        "API key, one inbox ID and recipient allowlist configured" if agentmail["ready"] else "Configure API key, AGENTMAIL_INBOX_ID and WORKSHOP_ALLOWED_RECIPIENTS",
    )
    if check_external_inbox:
        check("agentmail-reachability", agentmail["reachable"] is True, "Configured inbox is reachable")
    check("checkpoint-profile", True, f"{profile['name']}: {profile['title']}")
    check("todo-storage", _table_exists(db, "workshop_todos"), "Todo storage available")

    if profile["order"] >= 9:
        life = [ticket for ticket in visible if ticket["productLine"] == "life"]
        check("life-scenario", bool(life), f"{len(life)} visible life scenario(s)")
        check("tariff-library", len(list_tariffs(db)) == 28, f"{len(list_tariffs(db))} indexed tariff documents")
    if profile["order"] >= 10:
        check("life-review-capability", "life_review" in profile["capabilities"], "Mandatory review capability active")
    if profile["order"] >= 11:
        liabilities = [ticket for ticket in visible if ticket["productLine"] == "liability"]
        check("liability-scenarios", len(liabilities) >= 3, f"{len(liabilities)} visible liability scenarios")
        check("intervention-queue", "intervention_queue" in profile["capabilities"], "Queue controls and workshop clock active")
        auto_send = os.getenv("AUTO_SEND_ENABLED", "").lower() == "true"
        check("automatic-dispatch", auto_send, "AUTO_SEND_ENABLED=true" if auto_send else "Set AUTO_SEND_ENABLED=true before Drill 11")

    failed = [item for item in checks if item["required"] and not item["passed"]]
    return {
        "ok": not failed,
        "checkpoint": profile["name"],
        "checkedExternalInbox": check_external_inbox,
        "checks": checks,
        "nextAction": None if not failed else failed[0]["detail"],
    }


def _table_exists(db: sqlite3.Connection, name: str) -> bool:
    return db.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", (name,)).fetchone() is not None
