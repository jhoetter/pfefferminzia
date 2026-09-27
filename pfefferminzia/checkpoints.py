from __future__ import annotations

import os
import sqlite3
import sys
from typing import Any

from .database import get_database
from .util import utc_now


# Tuesday continues Falk's Monday drills 1–5. Each official checkpoint tag
# `checkpoint/<name>` contains the reference solution of every earlier build
# task; `drill-10-complete` also contains the Drill-10 report solution.
BASE_CAPABILITIES = ["core", "inbox", "todos"]
CHECKPOINTS: dict[str, dict[str, Any]] = {
    "drill-06-start": {
        "order": 6,
        "drill": 6,
        "title": "Die Kommandozentrale",
        "goal": "Eine selbst gesendete Testmail vom AgentMail-Postfach bis ins Cockpit und MCP verfolgen; daraus eine echte nächste Aufgabe ableiten.",
        "capabilities": BASE_CAPABILITIES,
        "successCriteria": [
            "Pfefferminzia läuft lokal und Claude sieht den Pfefferminzia-MCP-Server.",
            "Eine neue Testmail an die persönliche Inbox erscheint als dasselbe Ticket im Cockpit und über MCP.",
            "Ein ticketbezogenes Todo benennt den nächsten sinnvollen Schritt und wird erst nach Prüfung abgeschlossen.",
            "Ein eigener Codebeitrag am Eingangs-Workflow ist getestet und committet.",
        ],
    },
    "drill-07-start": {
        "order": 7,
        "drill": 7,
        "title": "Leben: Mensch bearbeitet, Agent bereitet vor",
        "goal": "Aus einer Lebensanfrage einen belegten Entwurf machen; die letzte Textänderung und den Versand bewusst beim Menschen halten.",
        "capabilities": [*BASE_CAPABILITIES, "knowledge", "draft", "manual_send"],
        "successCriteria": [
            "Ein Lebensfall ist Kunde, Vertrag und Tarifgeneration zugeordnet.",
            "Claude hat einen belegten Antwortentwurf vorbereitet.",
            "Ein Mensch hat den Entwurf im Cockpit bearbeitet und dort versendet.",
            "Ein eigener Codebeitrag an der Belegprüfung ist getestet und committet.",
        ],
    },
    "drill-08-start": {
        "order": 8,
        "drill": 8,
        "title": "Leben: Agent bearbeitet, Mensch gibt frei",
        "goal": "Agentische Vorbereitung von Lebensfällen erlauben, aber jede externe Wirkung an eine aktuelle menschliche Freigabe im Cockpit binden.",
        "capabilities": [*BASE_CAPABILITIES, "knowledge", "draft", "manual_send", "life_review", "claims"],
        "successCriteria": [
            "Mehrere Lebensfälle wurden vollständig vorbereitet.",
            "Ohne Freigabe im Cockpit konnte keine Antwort das System verlassen.",
            "Mindestens ein Vorschlag wurde abgelehnt und überarbeitet.",
            "Ein eigener Codebeitrag am Review-Pfad ist getestet und committet.",
        ],
    },
    "drill-09-start": {
        "order": 9,
        "drill": 9,
        "title": "Haftpflicht: Automatisch, solange niemand widerspricht",
        "goal": "Haftpflichtantworten durch ein sichtbares Eingriffsfenster steuern und den Gegensatz zur Pflichtfreigabe selbst erleben.",
        "capabilities": [
            *BASE_CAPABILITIES, "knowledge", "draft", "manual_send", "life_review", "claims",
            "router", "intervention_queue", "workshop_clock",
        ],
        "successCriteria": [
            "Router trennt Leben und Haftpflicht nachvollziehbar.",
            "Eine Haftpflichtantwort lief nach dem Zeitfenster automatisch durch.",
            "Eine zweite Antwort wurde im Zeitfenster bearbeitet, eine dritte aus der Queue genommen.",
            "Ein eigener Codebeitrag an Queue oder Timer ist getestet und committet.",
        ],
    },
    "drill-10-start": {
        "order": 10,
        "drill": 10,
        "title": "Management-Report: Was darf der Agent?",
        "goal": "Die erlebten Kontrollmuster als kurze, überprüfbare Management-Präsentation mit reveal.js und D3 erklären.",
        "capabilities": [
            *BASE_CAPABILITIES, "knowledge", "draft", "manual_send", "life_review", "claims",
            "router", "intervention_queue", "workshop_clock", "management_report",
        ],
        "successCriteria": [
            "Ein aggregierter Schnappschuss aus dem Drill-9-Arbeitsstand ist vorhanden.",
            "Eine D3-Grafik in einer reveal.js-Präsentation zeigt echte lokale Workshop-Zählwerte.",
            "Eine Management-Aussage nennt Beleg, Kontrollgrenze und Unsicherheit.",
            "Eigener Folien-/Chart-Code ist getestet und committet.",
        ],
    },
    "drill-10-complete": {
        "order": 11,
        "drill": 10,
        "title": "Management-Report abgeschlossen",
        "goal": "Referenzstand am Tagesende: alle Bauaufträge gelöst, Report präsentierbar.",
        "capabilities": [
            *BASE_CAPABILITIES, "knowledge", "draft", "manual_send", "life_review", "claims",
            "router", "intervention_queue", "workshop_clock", "management_report",
        ],
        "successCriteria": ["Der Bericht ist lokal präsentierbar und trennt Beobachtung, Interpretation und Empfehlung."],
    },
}

ALIASES = {
    **{str(drill): f"drill-{drill:02d}-start" for drill in range(6, 11)},
    **{f"drill-{drill}": f"drill-{drill:02d}-start" for drill in range(6, 11)},
    **{f"drill-{drill:02d}": f"drill-{drill:02d}-start" for drill in range(6, 11)},
    "complete": "drill-10-complete",
}

# Where the reference solution of each build task lives. Claude shows it only
# in rescue mode or on explicit request (see CLAUDE.md).
REFERENCE_TAGS = {6: "drill-07-start", 7: "drill-08-start", 8: "drill-09-start", 9: "drill-10-start", 10: "drill-10-complete"}

DRILL_BRIEFS: dict[int, dict[str, Any]] = {
    6: {
        "learningObjective": "Verstehen, dass eine externe Mail als lokales Ticket in Cockpit und MCP denselben Zustand hat.",
        "mission": "Sende eine Mail an deine persönliche Workshop-Adresse, synchronisiere, finde die neue Ticket-ID im Cockpit und über Claude/MCP, lies Absender und Betreff und lege dann ein konkretes Todo zu diesem Ticket an. Schließe es erst nach der Prüfung ab.",
        "buildTaskShort": "Beim Import automatisch genau ein „Eingang prüfen“-Todo pro Ticket anlegen – auch nach zwei Syncs.",
        "buildTask": "Wenn sync_agentmail ein neues Ticket anlegt, soll automatisch genau ein verknüpftes Todo „PF-…: Eingang prüfen“ entstehen. Ein zweiter Sync darf kein Duplikat erzeugen; ein manuell angelegtes Todo bleibt separat. Erst den Test schreiben (tests/test_workshop_end_to_end.py hat einen Fake-AgentMail-Client), dann implementieren. Einstieg: sync_agentmail in pfefferminzia/agentmail_service.py und create_todo (Parameter idempotency_key) in pfefferminzia/todos.py.",
        "dialogueSteps": [
            {"phase": "Inbox verbinden", "askClaude": "Was fehlt noch für Drill 6? Hilf mir, meine persönliche Workshop-Inbox einzurichten – nur den nächsten Schritt.", "yourMove": "Die drei persönlichen Inbox-Werte eintragen lassen; die externe Inbox-Prüfung ausdrücklich erlauben."},
            {"phase": "Eingang verfolgen", "askClaude": "Ich habe eine Mail an meine Workshop-Adresse geschickt. Synchronisiere und zeig mir Betreff, Absender und die Ticket-ID.", "yourMove": "Vorher die Mail selbst senden. Danach dieselbe Ticket-ID im Cockpit finden und dort ein konkretes Todo zum Ticket anlegen."},
            {"phase": "Selbst bauen", "askClaude": "Wo wird ein neues Ticket importiert? Schreib mit mir zuerst einen Test für genau ein automatisches Prüfen-Todo pro Ticket.", "yourMove": "Test lesen, dann die Implementierung mit Claude bauen; dein manuelles Todo bleibt separat."},
            {"phase": "Beleg zeigen", "askClaude": "Prüfe zwei Syncs und den Todo-Status. Was ist belegt, was noch nicht? Dann hilf mir beim Commit.", "yourMove": "Grünen Test und Ticket im Cockpit zeigen, Diff ansehen, committen. Nichts versenden."},
        ],
        "timeboxMinutes": {"startUndEingang": 15, "erkunden": 5, "selbstBauen": 25, "nachweisen": 10, "reflexion": 5},
        "doneWhen": "Neue Mail mit derselben Ticket-ID in Cockpit und MCP; ein sinnvolles Todo geprüft und abgeschlossen; eigene Codeänderung mit grünem Test committet.",
    },
    7: {
        "learningObjective": "Kontext und Quellen gegen den Nachrichtentext prüfen, bevor ein Mensch eine Antwort verschickt.",
        "mission": "Bearbeite die neue Lebensanfrage aus deiner Inbox: Person, Police und gültige Tarifgeneration bestätigen; Claude entwirft mit Beleg, du änderst den Wortlaut im Cockpit und sendest dort selbst.",
        "buildTaskShort": "Einen Entwurf abweisen, der eine falsche Tarifgeneration zitiert.",
        "buildTask": "Beim Speichern eines Entwurfs soll eine Belegprüfung greifen: Nennt Text oder Begründung eine bekannte Tarifgeneration (z. B. PL-2017), die nicht zum verknüpften Vertrag passt, wird der Entwurf mit klarer Meldung abgelehnt („zitiert PL-2012, Vertrag VTR-… hat PL-2017“). Zitiert ein Lebensentwurf eine Tarifgeneration ohne verknüpften Vertrag, ebenfalls abweisen. Ein korrekt zitierender Entwurf bleibt erlaubt. Erst Tests in tests/test_workflow.py, dann save_draft in pfefferminzia/store.py ergänzen (bekannte Generationen stehen in der Tabelle documents).",
        "dialogueSteps": [
            {"phase": "Quelle finden", "askClaude": "Welche Person, Police und Tarifgeneration passen zu der neuen Lebensanfrage? Zeig mir die Belege; noch keinen Entwurf.", "yourMove": "Zuordnung und exakte Tarifgeneration selbst bestätigen; bei Unklarheit nachfragen."},
            {"phase": "Entwurf prüfen", "askClaude": "Erstelle jetzt einen begründeten Antwortentwurf mit Fundstelle. Nicht versenden – das mache ich im Cockpit.", "yourMove": "Text und Empfänger im Cockpit prüfen, selbst ändern, speichern und bewusst senden."},
            {"phase": "Selbst bauen", "askClaude": "Hilf mir mit einem fehlschlagenden Test: Ein Entwurf, der die falsche Tarifgeneration zitiert, muss abgewiesen werden.", "yourMove": "Test und Schutzregel mit Claude bauen; einen korrekten Gegenfall mittesten."},
            {"phase": "Beleg zeigen", "askClaude": "Zeig mir Quelle, menschliche Textänderung, Versandereignis und Testergebnis. Was fehlt noch? Dann hilf mir beim Commit.", "yourMove": "Activity Log und grünen Test kontrollieren; keinen zweiten Versand auslösen; committen."},
        ],
        "timeboxMinutes": {"fallUndQuellen": 15, "entwurfUndMensch": 15, "selbstBauen": 20, "nachweisen": 5, "reflexion": 5},
        "doneWhen": "Ein belegter Lebensentwurf wurde vom Menschen im Cockpit verändert und gesendet; die Tarif-Belegprüfung ist getestet und committet.",
    },
    8: {
        "learningObjective": "Erleben, dass Agentenarbeit vollständig sein darf, aber nur eine aktuelle menschliche Freigabe im Cockpit die externe Wirkung öffnet.",
        "mission": "Lass Claude zwei neue Lebensfälle bis zur Review-Vorlage bearbeiten. Gib im Cockpit einen frei und lehne einen begründet ab. Ändere danach testweise einen freigegebenen Text und beobachte, dass die Freigabe verfällt.",
        "buildTaskShort": "Ablehnungsgrund und erloschene Freigabe im Cockpit sichtbar machen.",
        "buildTask": "get_ticket soll ein Feld controlNotice liefern, wenn das letzte Kontrollereignis eine Ablehnung (draft_rejected, mit Begründung) oder eine erloschene Freigabe (review_invalidated) ist; das Cockpit zeigt es als Hinweis über dem Entwurf. Erst Test in tests/test_workflow.py (ablehnen → controlNotice mit Begründung; neu vorlegen → Hinweis weg), dann pfefferminzia/store.py und web/workshop.js (Funktion draftArea). Kein Build-Tool nötig.",
        "dialogueSteps": [
            {"phase": "Fälle vorbereiten", "askClaude": "Bereite die zwei neuen Lebensfälle mit Belegen und Antwort bis zur Review-Vorlage vor. Freigeben kann nur ich im Cockpit.", "yourMove": "Beide Vorlagen und Fundstellen im Cockpit unter „Freigaben“ prüfen."},
            {"phase": "Mensch entscheidet", "askClaude": "Welche Folgen haben Freigabe und Ablehnung bei diesen beiden Fällen?", "yourMove": "Im Cockpit einen Fall freigeben und senden, den anderen mit Begründung ablehnen. Claude überarbeitet ihn danach."},
            {"phase": "Selbst bauen", "askClaude": "Wie zeigen wir Ablehnungsgrund oder erloschene Freigabe im Cockpit klarer? Hilf mir zuerst mit einem Test.", "yourMove": "Die kleine Review-Verbesserung mit Claude umsetzen und im Browser prüfen."},
            {"phase": "Beleg zeigen", "askClaude": "Prüfe im Audit Freigabe und Ablehnung. Was passiert, wenn ich einen freigegebenen Text ändere? Dann hilf mir beim Commit.", "yourMove": "Freigabeverlust nach Edit im Cockpit sehen; Test grün; committen."},
        ],
        "timeboxMinutes": {"faelleVorbereiten": 15, "freigabeUndAblehnung": 15, "selbstBauen": 20, "nachweisen": 5, "reflexion": 5},
        "doneWhen": "Eine Freigabe und eine Ablehnung im Audit; eine Änderung entwertet die alte Freigabe; eigene Review-Verbesserung getestet und committet.",
    },
    9: {
        "learningObjective": "Den Unterschied zwischen Pflichtfreigabe und automatischem Versand nach einer sichtbaren Eingriffsfrist beurteilen.",
        "mission": "Route drei neue Haftpflichtfälle und plane Antworten ein: einen laufen lassen, einen im Fenster ändern, einen aus der Queue nehmen. Spule die Workshop-Uhr im Cockpit vor und prüfe Versand und Audit.",
        "buildTaskShort": "Gestoppte Termine sichtbar machen und Doppelversand ausschließen.",
        "buildTask": "Erweitere controlNotice in get_ticket um schedule_cancelled (Text im Fenster geändert) und queue_removed (mit Begründung), damit das Cockpit gestoppte Termine erklärt. Teste in tests/test_workshop_end_to_end.py: Ein geänderter Termin wird nach dem Zeitsprung nicht gesendet, und zweimal dispatch_due_replies versendet den unveränderten Fall genau einmal. Einstieg: pfefferminzia/store.py, dispatch_due_replies in pfefferminzia/agentmail_service.py, web/workshop.js.",
        "dialogueSteps": [
            {"phase": "Routing prüfen", "askClaude": "Ordne die drei neuen Fälle nachvollziehbar zu. Welche sind Haftpflicht, und ist der Empfänger für Antworten erlaubt? Noch nichts einplanen.", "yourMove": "Sparte, Quellen und erlaubten Empfänger selbst prüfen."},
            {"phase": "Queue erleben", "askClaude": "Bereite belegte Antworten vor und plane sie ins 24-Stunden-Fenster ein.", "yourMove": "Im Cockpit unter „Eingriffsfenster“: einen Text ändern, einen mit Begründung aus der Queue nehmen, einen laufen lassen."},
            {"phase": "Selbst bauen", "askClaude": "Wie machen wir gestoppte Termine und Duplikatschutz überprüfbar? Zeig mir zuerst einen kleinen Test.", "yourMove": "Die Queue-Verbesserung mit Claude umsetzen."},
            {"phase": "Wirkung belegen", "askClaude": "Was würde nach dem Zeitsprung automatisch rausgehen? Danach prüfe Versand und Audit mit mir und hilf mir beim Commit.", "yourMove": "Im Cockpit „Workshop-Zeit +24 h“ drücken; genau einen Auto-Versand prüfen; committen."},
        ],
        "timeboxMinutes": {"routeUndQueue": 15, "eingreifen": 15, "selbstBauen": 15, "versandNachweis": 10, "reflexion": 5},
        "doneWhen": "Ein Auto-Versand, ein Edit und ein Stopp sind im Audit nachvollziehbar; eigene Queue-Verbesserung getestet und committet.",
    },
    10: {
        "learningObjective": "Aus operativen Ereignissen einen knappen, belegten Management-Befund machen – ohne aus einer lokalen Simulation Unternehmens-KPIs abzuleiten.",
        "mission": "Nimm den aggregierten Schnappschuss aus Drill 9 und baue mit reveal.js und D3 einen Report mit höchstens vier Folien: Beobachtung, Grafik, Empfehlung, Grenze der Aussage.",
        "buildTaskShort": "Eine zweite, beschriftete D3-Grafik und eine eigene belegte Empfehlung bauen.",
        "buildTask": "Ergänze in slides/management.js eine zweite D3-Ansicht (z. B. Kontrollereignisse: Freigaben, Ablehnungen, Stopps, Auto-Versände) mit Achsen/Beschriftung und Nullfall, und ersetze den Empfehlungs-Platzhalter durch deine eigene begründete Empfehlung mit Grenze. Nur /api/management-report verwenden; keine Mailtexte, Namen, Secrets oder erfundenen KPIs. Test: tests/test_management_report.py.",
        "dialogueSteps": [
            {"phase": "Befund wählen", "askClaude": "Welche Beobachtungen aus unserem Drill-9-Schnappschuss sind wirklich belegt? Bitte keine Management-Aussage erfinden.", "yourMove": "Eine Aussage und ihre Grenze selbst wählen; Demo- und Inbox-Fälle unterscheiden."},
            {"phase": "Visualisieren", "askClaude": "Zeig mir für diese Aussage erst Datenform und Skizze einer D3-Grafik in slides/management.js, dann den Code.", "yourMove": "Grafik mit Claude bauen; Achsen, Beschriftung und Nullfälle im Browser prüfen."},
            {"phase": "Entscheidung formulieren", "askClaude": "Hilf mir, meine Empfehlung mit Beleg, Kontrollregel und Unsicherheit auf eine Folie zu verdichten.", "yourMove": "Empfehlung und Einschränkung selbst formulieren; höchstens vier Folien."},
            {"phase": "Vorführen", "askClaude": "Prüfe, ob die Folien lokal laufen, die Zahlen zum Snapshot passen und keine persönlichen Daten enthalten. Dann hilf mir beim Commit.", "yourMove": "Report zwei Minuten zeigen, Test ausführen, committen."},
        ],
        "timeboxMinutes": {"snapshotUndFrage": 5, "selbstBauen": 20, "interpretation": 10, "nachweisen": 5, "reflexion": 5},
        "doneWhen": "Höchstens vier präsentierbare Folien; D3-Grafik mit lokalen Zählwerten; belegte Empfehlung mit Grenze; eigener Commit.",
    },
}

BONUS_TASK = (
    "Bonus mit restlichem Guthaben: ein 30–60-Sekunden-Video deiner Lösung mit Remotion bauen "
    "(docs/BONUS_VIDEO.md) und als letzte Folie in deinen Report einbinden."
)


def advance_task(drill: int) -> str:
    """The opt-in task for fast participants: the next drill's build task on their own branch."""
    if drill + 1 in DRILL_BRIEFS:
        return f"Vorausbauen im eigenen Branch: {DRILL_BRIEFS[drill + 1]['buildTask']}"
    return BONUS_TASK


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
    # A database from the earlier 8–12 numbering may hold a retired name.
    stored = row["checkpoint"] if row else None
    return normalize_checkpoint(stored if stored in CHECKPOINTS else "drill-06-start")


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


def adopt_checkpoint(name: str, db: sqlite3.Connection | None = None) -> dict[str, Any]:
    """Advance a copied worktree without resetting its cases or workshop clock."""
    checkpoint = normalize_checkpoint(name)
    configured = os.getenv("WORKSHOP_CHECKPOINT")
    if configured and normalize_checkpoint(configured) != checkpoint:
        raise ValueError(f"WORKSHOP_CHECKPOINT fixes this worktree to {configured}")
    db = db or get_database()
    db.execute(
        "UPDATE workshop_state SET checkpoint = ?, updated_at = ? WHERE id = 1",
        (checkpoint, utc_now()),
    )
    db.execute(
        "INSERT INTO workshop_events (type, actor, details_json, created_at) VALUES ('checkpoint_adopted', 'checkpoint-loader', ?, ?)",
        (f'{{"checkpoint":"{checkpoint}"}}', utc_now()),
    )
    return checkpoint_profile(db)


def available_checkpoints() -> list[dict[str, Any]]:
    return [{"name": name, **profile} for name, profile in CHECKPOINTS.items()]



HINTS = {
    6: [
        "Prüfe die vollständige Inbox-Adresse. Sende eine Mail, synchronisiere und vergleiche Sync-Zeit, Betreff und Ticket-ID in Cockpit und MCP. Die Empfänger-Allowlist filtert den Eingang nicht.",
        "Lege erst nach dem Lesen der neuen Nachricht ein Todo mit genau dieser Ticket-ID und einem konkreten nächsten Prüfschritt an. Schließe es nach der Prüfung ab.",
        "Für den Code: In sync_agentmail gibt es genau eine Stelle, an der ein neues Ticket entsteht. create_todo kennt schon einen idempotency_key – z. B. 'intake:PF-1001'.",
    ],
    7: [
        "Trenne Nachrichtentext (Behauptung) von vertrauenswürdigen Tarifquellen (Beleg).",
        "Suche den Kunden, verknüpfe den Vertrag und lies die exakt passende Tarifgeneration vor dem Entwurf (list_contract_documents).",
        "Für den Code: In save_draft sind Ticket und linkedContracts bekannt. Suche im Text nach den Generationen aus der Tabelle documents und vergleiche sie mit tariffGenerationId des Vertrags.",
    ],
    8: [
        "Beobachte, an welcher Stelle eine externe Wirkung technisch blockiert bleibt: Claude hat kein Freigabe- und kein Sende-Werkzeug.",
        "Claude legt mit submit_ticket_reply zur Prüfung vor; du entscheidest im Cockpit unter „Freigaben“. Nach einer Ablehnung überarbeitet Claude den Entwurf.",
        "Für den Code: Die Ereignisse draft_rejected und review_invalidated stehen schon in ticket['events']; controlNotice ist das jüngste davon, solange kein neueres Kontrollereignis folgt.",
    ],
    9: [
        "Route zuerst nach Sparte; die Kontrollregel folgt aus der Sparte.",
        "Claude plant mit submit_ticket_reply ein; Eingriffe (bearbeiten, aus Queue nehmen) und den Zeitsprung machst du im Cockpit.",
        "Für den Code: schedule_cancelled und queue_removed sind schon Ereignisse. Für den Duplikattest dispatch_due_replies zweimal aufrufen und die gesendeten Fake-Mails zählen.",
    ],
    10: [
        "Der Snapshot zählt nur lokale Workshop-Fälle; lies /api/management-report und unterscheide demo=true von echten Inbox-Tickets.",
        "Nutze die vorhandene reveal.js-/D3-Basis unter /slides/index.html?deck=management; ändere nur slides/management.js.",
        "Zeige Beobachtung, Kontrollgrenze, Empfehlung und Unsicherheit; ein schöner Chart ohne Beschriftung ist kein Management-Befund.",
    ],
}


def drill_guide(
    hint_level: int = 0, db: sqlite3.Connection | None = None, *, include_advance_task: bool = False
) -> dict[str, Any]:
    profile = checkpoint_profile(db)
    drill = profile["drill"]
    bounded = max(0, min(hint_level, 3))
    reference = REFERENCE_TAGS[drill]
    previous = f"checkpoint/{profile['name']}" if profile["name"] != "drill-10-complete" else "checkpoint/drill-10-start"
    return {
        "checkpoint": profile,
        **DRILL_BRIEFS[drill],
        "learningPath": {
            "commonEvidence": "Fall im Cockpit und MCP nachvollziehen, eigene Codeänderung testen, Diff prüfen und auf eigenem Branch committen.",
            "guided": "Nur nächsten Schritt, Dateistelle und kleinen Test zeigen; bei Bedarf den offiziellen Checkpoint laden.",
            "building": "Akzeptanzkriterien geben, Code in kleinen Iterationen mit der Person bauen und verifizieren.",
            "advance": "Erst nach aktuellem Fallnachweis und ausdrücklichem Opt-in: nächsten Bauauftrag im eigenen Branch.",
        },
        "referenceSolution": {
            "tag": f"checkpoint/{reference}",
            "diff": f"git diff {previous} checkpoint/{reference}",
            "rule": "Nur im Rettungsmodus oder auf ausdrücklichen Wunsch zeigen; sonst nur als Orientierung für die Richtung nutzen.",
        },
        "advanceTask": advance_task(drill) if include_advance_task else None,
        "hintLevel": bounded,
        "hint": None if bounded == 0 else HINTS[drill][bounded - 1],
        "instruction": "Die vier Dialogetappen sind eine Landkarte, kein Copy-paste-Auftrag. Frage nach der gewünschten Hilfstiefe (geführt, bauend, vorausbauend), beginne mit der aktuellen Etappe und warte an jedem 'yourMove'. Freigeben, Senden und Zeitsprung macht der Mensch im Cockpit. Eigener Test, Diff und Commit gehören zum Abschluss; eine vollständige Lösung nur auf ausdrücklichen Wunsch.",
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
        required=profile["drill"] != 10,
    )
    if check_external_inbox:
        check("agentmail-reachability", agentmail["reachable"] is True, "Configured inbox is reachable")
    check("checkpoint-profile", True, f"{profile['name']}: {profile['title']}")
    check("todo-storage", _table_exists(db, "workshop_todos"), "Todo storage available")

    if profile["order"] >= 7:
        life = [ticket for ticket in visible if ticket["productLine"] == "life"]
        check("life-scenario", bool(life), f"{len(life)} visible life scenario(s)")
        check("tariff-library", len(list_tariffs(db)) == 28, f"{len(list_tariffs(db))} indexed tariff documents")
    if profile["order"] >= 8:
        check("life-review-capability", "life_review" in profile["capabilities"], "Mandatory review capability active")
    if profile["order"] >= 9:
        liabilities = [ticket for ticket in visible if ticket["productLine"] == "liability"]
        check("liability-scenarios", len(liabilities) >= 3, f"{len(liabilities)} visible liability scenarios")
        check("intervention-queue", "intervention_queue" in profile["capabilities"], "Queue controls and workshop clock active")
        if profile["drill"] == 9:
            auto_send = os.getenv("AUTO_SEND_ENABLED", "").lower() == "true"
            check(
                "automatic-dispatch", auto_send,
                "Eingriffsfenster und automatischer Versand aktiv" if auto_send else
                "Der Auto-Versand ist aus: offiziellen Drill-9-Checkpoint neu laden oder Lehrperson fragen",
            )
    if profile["drill"] == 10:
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
