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
        "goal": "Eine selbst gesendete Testmail vom AgentMail-Postfach bis ins Cockpit und MCP verfolgen; daraus eine echte nächste Aufgabe ableiten.",
        "capabilities": ["core", "inbox", "todos"],
        "successCriteria": [
            "Pfefferminzia läuft lokal.",
            "Claude sieht den Pfefferminzia-MCP-Server.",
            "Eine neue Testmail an die persönliche Inbox erscheint als dasselbe Ticket im Cockpit und über MCP.",
            "Ein ticketbezogenes Todo benennt den nächsten sinnvollen Schritt und wird erst nach Prüfung abgeschlossen.",
            "Ein eigener Codebeitrag am Eingangs-Workflow ist getestet und im eigenen Fork gesichert.",
        ],
    },
    "drill-09-start": {
        "order": 9,
        "drill": 9,
        "title": "Leben: Mensch bearbeitet, Agent bereitet vor",
        "goal": "Aus einer Lebensanfrage einen belegten Entwurf machen; die letzte Textänderung und den Versand bewusst beim Menschen halten.",
        "capabilities": ["core", "inbox", "todos", "knowledge", "draft", "manual_send"],
        "successCriteria": [
            "Ein Lebensfall ist Kunde, Vertrag und Tarifgeneration zugeordnet.",
            "Claude hat einen belegten Antwortentwurf vorbereitet.",
            "Ein Mensch hat den Entwurf bearbeitet und den Versand ausdrücklich ausgelöst.",
            "Ein eigener Codebeitrag an der Belegprüfung ist getestet und im eigenen Fork gesichert.",
        ],
    },
    "drill-10-start": {
        "order": 10,
        "drill": 10,
        "title": "Leben: Agent bearbeitet, Mensch gibt frei",
        "goal": "Agentische Vorbereitung von Lebensfällen erlauben, aber jede externe Wirkung an eine aktuelle menschliche Freigabe binden.",
        "capabilities": [
            "core", "inbox", "todos", "knowledge", "draft", "manual_send", "life_review", "claims"
        ],
        "successCriteria": [
            "Mehrere Lebensfälle wurden vollständig vorbereitet.",
            "Ohne explizite Freigabe konnte weder Entscheidung noch Kommunikation das System verlassen.",
            "Mindestens ein Vorschlag wurde abgelehnt und überarbeitet.",
            "Ein eigener Codebeitrag am Review-Pfad ist getestet und im eigenen Fork gesichert.",
        ],
    },
    "drill-11-start": {
        "order": 11,
        "drill": 11,
        "title": "Haftpflicht: Automatisch, solange niemand widerspricht",
        "goal": "Haftpflichtantworten durch ein sichtbares Eingriffsfenster steuern und den Gegensatz zur Pflichtfreigabe selbst erleben.",
        "capabilities": [
            "core", "inbox", "todos", "knowledge", "draft", "manual_send", "life_review", "claims",
            "router", "intervention_queue", "workshop_clock"
        ],
        "successCriteria": [
            "Router trennt Leben und Haftpflicht nachvollziehbar.",
            "Eine Haftpflichtantwort lief nach dem Zeitfenster automatisch durch.",
            "Eine zweite Antwort wurde im Zeitfenster bearbeitet oder aus der Queue genommen.",
            "Ein eigener Codebeitrag an Queue oder Timer ist getestet und im eigenen Fork gesichert.",
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
    "drill-12-start": {
        "order": 13,
        "drill": 12,
        "title": "Management-Report: Was darf der Agent?",
        "goal": "Die erlebten Kontrollmuster als kurze, überprüfbare Management-Präsentation mit reveal.js und D3 erklären.",
        "capabilities": [
            "core", "inbox", "todos", "knowledge", "draft", "manual_send", "life_review", "claims",
            "router", "intervention_queue", "workshop_clock", "management_report"
        ],
        "successCriteria": [
            "Ein aggregierter Schnappschuss aus dem bisherigen Drill-11-Arbeitsstand ist vorhanden.",
            "Eine D3-Grafik in einer reveal.js-Präsentation zeigt echte lokale Workshop-Zählwerte.",
            "Eine Management-Aussage nennt Beleg, Kontrollgrenze und Unsicherheit.",
            "Eigener Folien-/Chart-Code ist getestet, committet und im Fork gepusht.",
        ],
    },
    "drill-12-complete": {
        "order": 14,
        "drill": 12,
        "title": "Management-Report abgeschlossen",
        "goal": "Report, Grenzen und Automation Contract sind bereit für die Whiteboard-Diskussion.",
        "capabilities": [
            "core", "inbox", "todos", "knowledge", "draft", "manual_send", "life_review", "claims",
            "router", "intervention_queue", "workshop_clock", "management_report"
        ],
        "successCriteria": ["Der Bericht ist lokal präsentierbar und trennt Beobachtung, Interpretation und Empfehlung."],
    },
}

ALIASES = {
    "8": "drill-08-start", "drill-8": "drill-08-start", "drill-08": "drill-08-start",
    "9": "drill-09-start", "drill-9": "drill-09-start", "drill-09": "drill-09-start",
    "10": "drill-10-start", "drill-10": "drill-10-start",
    "11": "drill-11-start", "drill-11": "drill-11-start",
    "12": "drill-12-start", "drill-12": "drill-12-start",
    "complete": "drill-12-complete", "drill-11-complete": "drill-11-complete",
    "drill-12-complete": "drill-12-complete",
}

DRILL_BRIEFS: dict[int, dict[str, Any]] = {
    8: {
        "learningObjective": "Verstehen, dass eine externe Mail als lokales Ticket in UI und MCP denselben Zustand hat.",
        "mission": "Sende eine fiktive Mail an die vollständige persönliche AgentMail-Adresse, synchronisiere, finde die neue Ticket-ID in UI und MCP, lies Absender/Betreff und lege erst dann ein konkretes ticketbezogenes Todo an. Schließe es nach der Prüfung ab.",
        "buildTask": "Vibe-code mit Claude eine vertikale Eingangs-Funktion: Beim Import eines neuen Tickets genau ein automatisch erzeugtes, verknüpftes 'Eingang prüfen'-Todo anlegen, auch wenn zweimal synchronisiert wird. Ein vorher manuell angelegtes Todo bleibt separat. Schreibe erst den Test, dann die Implementierung. Einstieg: pfefferminzia/agentmail_service.py und pfefferminzia/todos.py.",
        "dialogueSteps": [
            {"phase": "Start klären", "askClaude": "Was fehlt für Drill 8 noch? Hilf mir, App, MCP und meine persönliche Inbox zu prüfen – nur den nächsten Schritt.", "yourMove": "Persönliche Workshop-Werte nur im eigenen Chat oder lokal eintragen; externen Inbox-Test gesondert erlauben."},
            {"phase": "Eingang verfolgen", "askClaude": "Ich habe eine Testmail geschickt. Synchronisiere und zeig mir Betreff, Absender und dieselbe Ticket-ID in MCP und Cockpit.", "yourMove": "Vor dieser Frage die Mail selbst senden; danach Ticket lesen, konkretes Ticket-Todo anlegen und erst nach Prüfung abschließen."},
            {"phase": "Selbst bauen", "askClaude": "Wo wird ein neues Ticket importiert? Gib mir einen kleinen Test für genau ein automatisches Prüfen-Todo pro Ticket; ich ändere den Code mit dir.", "yourMove": "Import und Test selbst mit Claude bearbeiten; manuelles Todo bleibt separat."},
            {"phase": "Beleg zeigen", "askClaude": "Prüfe zwei Syncs und den Todo-Status. Was ist belegt, was noch nicht?", "yourMove": "Ticket-ID in UI/MCP und grünen Test zeigen; keine Antwort versenden."},
        ],
        "timeboxMinutes": {"setupUndEingang": 15, "erkunden": 5, "selbstBauen": 25, "nachweisen": 10, "reflexion": 5},
        "doneWhen": "Neue Mail und Ticket-ID in beiden Oberflächen identisch; sinnvoller nächster Schritt als Todo abgeschlossen; eigene kleine Codeänderung mit grünem Test.",
    },
    9: {
        "learningObjective": "Kontext und Quellen gegen den Nachrichtentext prüfen, bevor ein Mensch eine Antwort verschickt.",
        "mission": "Bearbeite eine neue Lebensanfrage: Person, Police und gültige Tarifgeneration bestätigen; Claude entwirft mit Beleg, du änderst den Wortlaut und sendest selbst.",
        "buildTask": "Vibe-code eine Belegkontrolle im Antwortpfad: Ein Test muss falsche oder fehlende Tarifgeneration sichtbar machen; implementiere Fehlermeldung oder Schutzregel und prüfe einen Gegenfall. Einstieg: pfefferminzia/store.py und tests/test_workflow.py.",
        "dialogueSteps": [
            {"phase": "Quelle finden", "askClaude": "Welche Person, Police und Tarifgeneration passen zu dieser neuen Lebensanfrage? Zeig mir die Belege; noch keinen Entwurf.", "yourMove": "Zuordnung und exakte Tarifgeneration selbst bestätigen; bei Unklarheit nachfragen."},
            {"phase": "Entwurf prüfen", "askClaude": "Erstelle jetzt einen begründeten Antwortentwurf mit Fundstellen. Nicht versenden.", "yourMove": "Text und Empfänger im Cockpit selbst prüfen, ändern und den Versand bewusst auslösen."},
            {"phase": "Selbst bauen", "askClaude": "Wo kann eine falsche oder fehlende Tarifgeneration auffallen? Hilf mir zuerst mit einem kleinen fehlschlagenden Test.", "yourMove": "Test und kleine Fehlermeldung oder Schutzregel mit Claude implementieren."},
            {"phase": "Beleg zeigen", "askClaude": "Zeig mir Quelle, menschliche Textänderung, Versandereignis und Testergebnis. Was fehlt noch?", "yourMove": "Activity Log und grünen Test kontrollieren; keinen zweiten Versand auslösen."},
        ],
        "timeboxMinutes": {"fallUndQuellen": 15, "entwurfUndMensch": 15, "selbstBauen": 20, "nachweisen": 5, "reflexion": 5},
        "doneWhen": "Ein belegter Lebensentwurf wurde vom Menschen verändert und bewusst gesendet; Tarifprüfung und eigene Änderung sind getestet.",
    },
    10: {
        "learningObjective": "Erleben, dass Agentenarbeit vollständig sein darf, aber eine aktuelle menschliche Freigabe die externe Wirkung sperrt.",
        "mission": "Lass zwei Lebensfälle bis zur Review-Vorlage bearbeiten. Genehmige einen, lehne einen begründet ab. Ändere testweise Text und beobachte, dass eine alte Freigabe verfällt.",
        "buildTask": "Vibe-code einen klaren Review-Zustand: Zeige Ablehnungsgrund und Verlust einer Freigabe nach Edit im Cockpit; sichere den Zustand mit einem Test ab. Einstieg: web/workshop.js und tests/test_workshop_end_to_end.py; kein Build-Tool nötig.",
        "dialogueSteps": [
            {"phase": "Fälle vorbereiten", "askClaude": "Bereite zwei neue Lebensfälle mit Entscheidung, Belegen und Antwort nur bis zur Review-Vorlage vor. Nichts freigeben oder senden.", "yourMove": "Beide Vorlagen und Fundstellen selbst prüfen; externe Wirkung bleibt gesperrt."},
            {"phase": "Mensch entscheidet", "askClaude": "Zeig mir beide Review-Optionen und ihre Folgen. Führe noch keine Entscheidung aus.", "yourMove": "Einen Fall ausdrücklich freigeben, den anderen begründet ablehnen; Versand ist nochmals separat zu bestätigen."},
            {"phase": "Selbst bauen", "askClaude": "Wo kann ich Ablehnungsgrund oder erloschene Freigabe klarer zeigen? Hilf mir zuerst mit einem Test.", "yourMove": "Eine kleine Review-Verbesserung selbst mit Claude umsetzen und testen."},
            {"phase": "Beleg zeigen", "askClaude": "Prüfe im Audit Freigabe und Ablehnung; was passiert, wenn ich den genehmigten Text ändere?", "yourMove": "Freigabeverlust nach Edit prüfen; keine alte Freigabe für neuen Text verwenden."},
        ],
        "timeboxMinutes": {"faelleVorbereiten": 15, "selbstBauen": 20, "freigabeUndAblehnung": 15, "nachweisen": 5, "reflexion": 5},
        "doneWhen": "Eine Freigabe und eine Ablehnung im Audit; Änderung entwertet die alte Freigabe; eigene UI- oder Teständerung ist gezeigt.",
    },
    11: {
        "learningObjective": "Den Unterschied zwischen Pflichtfreigabe und automatischem Versand nach einer sichtbaren Eingriffsfrist beurteilen.",
        "mission": "Route drei neue Haftpflichtfälle: einen laufen lassen, einen im Fenster ändern, einen entfernen. Spule die Workshop-Uhr erst nach deiner Bestätigung vor und prüfe Versand plus Audit.",
        "buildTask": "Vibe-code eine überprüfbare Queue-Verbesserung: Zeige einen abgebrochenen Termin deutlich an und teste, dass Edit und erneuter Versandlauf kein Duplikat erzeugen. Einstieg: pfefferminzia/store.py, web/workshop.js und tests/test_workshop_end_to_end.py.",
        "dialogueSteps": [
            {"phase": "Routing prüfen", "askClaude": "Ordne die drei neuen Fälle nachvollziehbar zu. Welche sind Haftpflicht, und welche Empfänger sind für Antworten erlaubt? Noch nichts einplanen.", "yourMove": "Sparte, Quellen und erlaubte Empfänger selbst prüfen."},
            {"phase": "Queue erleben", "askClaude": "Bereite belegte Antworten vor und zeig mir die +24-Stunden-Queue. Die Uhr nicht vorspulen.", "yourMove": "Countdown prüfen; einen Fall bearbeiten und einen anderen mit Begründung entfernen. Einer bleibt geplant."},
            {"phase": "Selbst bauen", "askClaude": "Wie machen wir Stopp oder Duplikatschutz in der Queue klarer? Zeig mir zuerst einen kleinen Test.", "yourMove": "Kleine Queue- oder Testverbesserung selbst mit Claude umsetzen."},
            {"phase": "Wirkung belegen", "askClaude": "Zeig mir vor dem Zeitsprung, was automatisch rausgehen würde. Spule erst nach meiner ausdrücklichen Bestätigung vor.", "yourMove": "Uhrsprung bestätigen und danach genau einen Auto-Versand, Edit, Stopp und Audit prüfen."},
        ],
        "timeboxMinutes": {"routeUndQueue": 15, "selbstBauen": 15, "eingreifen": 15, "versandNachweis": 10, "reflexion": 5},
        "doneWhen": "Ein Auto-Versand, ein Edit und ein Stopp sind nachvollziehbar; eigene Queue- oder Testverbesserung ist gezeigt.",
    },
    12: {
        "learningObjective": "Aus operativen Ereignissen einen knappen, belegten Management-Befund machen – ohne aus einer lokalen Simulation Unternehmens-KPIs abzuleiten.",
        "mission": "Lade den aggregierten Schnappschuss aus Drill 11, baue mit reveal.js und D3 einen maximal vierseitigen Management-Report und erkläre Kontrolle, Ergebnis und Grenze der Aussage.",
        "buildTask": "Vibe-code in slides/management.js eine zweite aussagekräftige D3-Ansicht oder verbessere die bestehende Grafik. Nutze nur /api/management-report mit aggregierten Zahlen; keine Mailtexte, Namen, Secrets oder erfundenen Wirkungs-KPIs.",
        "dialogueSteps": [
            {"phase": "Befund wählen", "askClaude": "Welche aggregierten Beobachtungen aus unserem Drill-11-Schnappschuss sind wirklich belegt? Bitte keine Management-Aussage erfinden.", "yourMove": "Eine Aussage und ihre Grenze selbst wählen; Demo- und echte Workshop-Tickets unterscheiden."},
            {"phase": "Visualisieren", "askClaude": "Zeig mir in slides/management.js eine kleine D3-Grafik für diese Aussage. Erst Datenform und Skizze, dann Code.", "yourMove": "Grafik selbst mit Claude bauen; Achsen, Beschriftung und Nullfälle prüfen."},
            {"phase": "Entscheidung formulieren", "askClaude": "Hilf mir, eine Management-Empfehlung mit Beleg, Kontrollregel und Unsicherheit auf eine Folie zu verdichten.", "yourMove": "Empfehlung und Einschränkung selbst verantworten; maximal vier Folien."},
            {"phase": "Vorführen", "askClaude": "Prüfe, ob die Folien lokal über den Python-Server ohne Node/CDN starten, die Zahlen zum Snapshot passen und keine persönlichen Daten enthalten.", "yourMove": "Report zeigen, Test ausführen, Diff prüfen, committen und in den eigenen Fork pushen."},
        ],
        "timeboxMinutes": {"snapshotUndFrage": 5, "selbstBauen": 20, "interpretation": 10, "nachweisen": 5, "reflexion": 5},
        "doneWhen": "Maximal vier präsentierbare Folien; D3-Grafik mit lokalen Zählwerten; belegte Empfehlung mit Limit; eigener getesteter Commit im Fork.",
    },
}

ADVANCE_TASKS = {
    8: "Drill 9 selbst vorbauen: Kunden-/Tarifkontext und belegten Lebensentwurf entwickeln; ein Mensch muss Text und Versand behalten.",
    9: "Drill 10 selbst vorbauen: Review-Zustand mit Freigabe, Ablehnung und Freigabeverlust nach Edit; ohne neue menschliche Freigabe keine Wirkung.",
    10: "Drill 11 selbst vorbauen: Haftpflicht-Routing und sichtbare Eingriffs-Queue mit Timer, Edit und Stopp; Auto-Versand nur im bestätigten Drill-11-Checkpoint.",
    11: "Drill 12 selbst vorbauen: aus aggregierten lokalen Workshop-Zahlen einen knappen reveal.js-/D3-Management-Report entwickeln; keine erfundenen KPIs.",
    12: "Für das Whiteboard einen begrenzten Event- oder Zeit-Trigger mit Rechten, Retry-Regel und menschlicher Stopplinie skizzieren; keinen Produktiv-Worker starten.",
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
    return normalize_checkpoint(row["checkpoint"] if row else "drill-08-start")


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


def drill_guide(
    hint_level: int = 0, db: sqlite3.Connection | None = None, *, include_advance_task: bool = False
) -> dict[str, Any]:
    profile = checkpoint_profile(db)
    hints = {
        8: [
            "Prüfe die vollständige Inbox-Adresse. Sende eine Testmail, synchronisiere und vergleiche letzte Sync-Zeit, Betreff und Ticket-ID in Cockpit und MCP. Die Empfänger-Allowlist filtert den Eingang nicht.",
            "Lege erst nach dem Lesen der neuen Nachricht ein Todo mit genau dieser Ticket-ID und einem konkreten nächsten Prüfschritt an. Schließe es nach der Prüfung ab.",
            "Für die kleine Codeänderung: Finde den Ticket-Import in `agentmail_service.py`, verknüpfe ein Todo nur beim ersten Import und teste zwei Syncs ohne Duplikat.",
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
        12: [
            "Der Snapshot zählt nur lokale Workshop-Fälle; lies /api/management-report und unterscheide demo=true von echten Workshop-Tickets.",
            "Nutze die vorhandene reveal.js-/D3-Basis in slides/index.html?deck=management; ändere den kleinen Einstieg in slides/management.js.",
            "Zeige Beobachtung, Kontrollgrenze, Empfehlung und Unsicherheit; ein schöner Chart ohne richtige Beschriftung ist kein Management-Befund.",
        ],
    }
    bounded = max(0, min(hint_level, 3))
    return {
        "checkpoint": profile,
        **DRILL_BRIEFS[profile["drill"]],
        "learningPath": {
            "commonEvidence": "Fall im Cockpit und MCP nachvollziehen, eigene Codeänderung testen, Diff prüfen und auf eigenem Branch committen/pushen.",
            "guided": "Nur nächsten Schritt, Dateistelle und kleinen Test zeigen; bei Bedarf offiziellen Checkpoint sicher laden.",
            "building": "Akzeptanzkriterien geben, Code in kleinen Iterationen mit der Person bauen und verifizieren.",
            "advance": "Erst nach aktuellem Fallnachweis und ausdrücklichem Opt-in anbieten; nächstes Ziel auf eigenem Branch, nicht ungefragt freischalten.",
        },
        "advanceTask": ADVANCE_TASKS[profile["drill"]] if include_advance_task else None,
        "hintLevel": bounded,
        "hint": None if bounded == 0 else hints[profile["drill"]][bounded - 1],
        "instruction": "Die vier Dialogetappen sind eine Landkarte, kein einzelner Copy-paste-Auftrag. Frage nach gewünschter Hilfstiefe (geführt, bauend, vorausbauend), beginne nur mit der aktuellen Etappe und warte an jedem 'yourMove'-Stopp. Ein Vorausbau ist erst nach aktuellem Fallnachweis und ausdrücklichem Wunsch erlaubt. Eigener Test, Diff, Commit und Push zum eigenen Fork gehören zum Abschluss; eine vollständige Lösung erst auf ausdrücklichen Wunsch.",
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
        required=profile["drill"] != 12,
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
        if profile["drill"] == 11:
            auto_send = os.getenv("AUTO_SEND_ENABLED", "").lower() == "true"
            check(
                "automatic-dispatch", auto_send,
                "Eingriffsfenster und automatischer Versand aktiv" if auto_send else
                "Der Auto-Versand ist aus: offiziellen Drill-11-Checkpoint neu laden oder Lehrperson fragen",
            )
    if profile["drill"] == 12:
        from .management_report import REPORT_SNAPSHOT
        from .constants import ROOT
        check("management-report-snapshot", (ROOT / REPORT_SNAPSHOT).is_file(), "Aggregierter Report-Schnappschuss vorhanden")

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
