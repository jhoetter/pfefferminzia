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
        "goal": "Eine Mail vom Postfach bis ins Cockpit verfolgen und sehen, was Claude damit tun kann und was nicht; daraus eine echte nächste Aufgabe ableiten.",
        "capabilities": [*BASE_CAPABILITIES, "draft", "manual_send"],
        "successCriteria": [
            "Die Kommandozentrale läuft, und Claude ist mit ihr verbunden.",
            "Die Mail der Lehrperson ist als Ticket mit Aufgabe „Antworten“ angekommen.",
            "Claude hat eine Antwort entworfen; der Mensch hat sie im Cockpit geprüft und gesendet.",
            "Ein eigener Beitrag ist geprüft und gespeichert.",
        ],
    },
    "drill-07-start": {
        "order": 7,
        "drill": 7,
        "title": "Leben: Mensch bearbeitet, Agent bereitet vor",
        "goal": "Aus einer Lebensanfrage einen belegten Entwurf machen; die letzte Textänderung und den Versand bewusst beim Menschen halten.",
        "capabilities": [*BASE_CAPABILITIES, "draft", "manual_send", "knowledge"],
        "successCriteria": [
            "Ein Lebensfall ist Kunde, Vertrag und Tarifgeneration zugeordnet.",
            "Claude hat einen belegten Antwortentwurf vorbereitet.",
            "Ein Mensch hat den Entwurf im Cockpit bearbeitet und dort versendet.",
            "Ein eigener Beitrag an der Belegprüfung ist geprüft und gespeichert.",
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
            "Ein eigener Beitrag an der Freigabe ist geprüft und gespeichert.",
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
            "Leben und Haftpflicht sind nachvollziehbar getrennt.",
            "Eine Haftpflichtantwort lief nach dem Zeitfenster automatisch durch.",
            "Eine zweite Antwort wurde im Zeitfenster geändert, bei einer dritten wurde der Versand gestoppt.",
            "Ein eigener Beitrag am Eingriffsfenster ist geprüft und gespeichert.",
        ],
    },
    "drill-10-start": {
        "order": 10,
        "drill": 10,
        "title": "Management-Report: Was darf der Agent?",
        "goal": "Die erlebten Kontrollmuster als kurze, überprüfbare Management-Präsentation erklären.",
        "capabilities": [
            *BASE_CAPABILITIES, "knowledge", "draft", "manual_send", "life_review", "claims",
            "router", "intervention_queue", "workshop_clock", "management_report",
        ],
        "successCriteria": [
            "Die gezählten Ereignisse aus Drill 9 sind übernommen.",
            "Eine Grafik in den Folien zeigt die echten gezählten Ereignisse aus dem Workshop.",
            "Eine Management-Aussage nennt Beleg, Kontrollgrenze und Unsicherheit.",
            "Eigene Folien und Grafik sind geprüft und gespeichert.",
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
        "learningObjective": "Erleben, wie aus einer echten Mail ein Fall mit Aufgabe wird – und dass Claude die Antwort vorbereitet, der Mensch sie aber sendet.",
        "learningGoals": [
            "Claude einen Auftrag mit Absicht, Grenze und Prüfung geben – statt „mach mal“.",
            "Erklären, warum Claude entwerfen, aber nicht senden kann: Die Kontrolle steckt im fehlenden Werkzeug, nicht in einer Bitte.",
            "Verstehen, warum man ein System an mehreren Szenarien prüft – auch an dem, was nie passieren darf –, bevor man ihm vertraut.",
        ],
        "mission": "In deinem Posteingang liegt die Mail der Lehrperson, dazu die Aufgabe „Antworten“. Bitte Claude, eine kurze Antwort zu entwerfen, und ändere sie im Cockpit. Bevor du sendest, baust du mit Claude, dass sich die Aufgabe beim Senden von selbst erledigt – dein eigenes Senden im Cockpit ist dann der Beweis.",
        "buildTaskShort": "Nach dem Senden soll sich die Antwort-Aufgabe von selbst erledigen.",
        "buildTask": "Beim Senden einer Antwort bleibt die Aufgabe „Antworten: …“ bisher offen. Sie soll automatisch als erledigt markiert werden – nur die Antwort-Aufgabe dieses Tickets, keine anderen (Gegenfall: eine zweite Aufgabe zum selben Fall, z. B. „Rückruf planen“, bleibt offen). Erst einen Test schreiben (tests/test_workshop_end_to_end.py hat einen Fake-Mailserver), dann umsetzen. Einstieg: send_ticket_draft in pfefferminzia/agentmail_service.py und complete_ticket_todos (Aufgabenart \"reply\") in pfefferminzia/todos.py.",
        "dialogueSteps": [
            {"phase": "Ankommen", "askClaude": "Was liegt in meinem Posteingang, und was ist meine erste Aufgabe?", "decision": "Was will die Absenderin von dir – und was möchtest du ihr in einem Satz antworten?", "yourMove": "Die Mail im Cockpit öffnen, lesen und Claude die eigene Kernaussage für die Antwort nennen."},
            {"phase": "Entwerfen", "askClaude": "Entwirf aus meiner Kernaussage eine kurze, freundliche Antwort. Noch nicht senden.", "decision": "Was änderst du am Entwurf, und warum? Und warum könnte Claude hier gar nicht senden, selbst wenn es wollte?", "yourMove": "Entwurf im Cockpit lesen, etwas Eigenes ändern und speichern – noch nicht senden."},
            {"phase": "Selbst bauen", "askClaude": "Bevor ich sende: Welche Szenarien müssen stimmen, damit ich mich darauf verlassen kann, dass sich die Aufgabe beim Senden erledigt? Hilf mir, sie aufzuschreiben, dann bauen wir es.", "decision": "Wie sollte das System wissen, welche Aufgabe mit dem Senden erledigt ist – und welche zweite Aufgabe legen wir als Gegenfall an, die offen bleiben muss?", "yourMove": "Mit Claude eine zweite Aufgabe zum Fall anlegen (z. B. „Rückruf planen“), die Szenarien in eigenen Worten festlegen – was soll passieren, was darf nie passieren –, dann Claude die kleine Änderung bauen lassen."},
            {"phase": "Senden und belegen", "askClaude": "Läuft die App mit meiner Änderung? Dann sende ich jetzt. Danach zeig mir: gesendete Antwort, Aufgaben, bestandene Szenarien – und hilf mir, meinen Stand zu speichern.", "decision": "Woran siehst du selbst, dass es funktioniert – ohne Claude zu glauben?", "yourMove": "Im Cockpit auf „Senden“ klicken; unter „Aufgaben“ prüfen: „Antworten“ erledigt, die zweite Aufgabe offen; Speichern freigeben."},
        ],
        "reflection": "Was hast du heute entschieden, und was hat Claude gemacht? Wo war eine Grenze eingebaut, statt nur erbeten?",
        "thinkingPrompts": [
            "Stell dir vor, Claude hätte heute ein Sende-Werkzeug gehabt: Was wäre mit deiner Antwort passiert – und wer hätte es gemerkt?",
            "Die Aufgabe „Antworten“ ist von selbst entstanden. Welche Aufgaben entstehen bei euch aus einer Mail – und welche davon dürfte ein Agent anlegen, welche nie?",
            "Woran merkst du bei einer neuen Kollegin, dass sie eine Mail nur überflogen hat – und woran würdest du es bei Claude merken?",
        ],
        "timeboxMinutes": {"startUndPosteingang": 15, "antworten": 10, "selbstBauen": 20, "nachweisen": 10, "reflexion": 5},
        "doneWhen": "Eine von dir geprüfte Antwort ist gesendet; die Antwort-Aufgabe erledigt sich beim Senden automatisch; eigene Änderung mit bestandenen Szenarien gespeichert.",
        "bridge": "Heute baust du an einer echten kleinen Kommandozentrale: Mails kommen herein, Claude bereitet vor, du entscheidest. Achte darauf, was Claude tun kann – und was nicht.",
        "focusBlocks": ["Eingänge", "Werkzeuge", "Oberfläche"],
        "extension": {
            "title": "Meine Mini-Wissensbasis",
            "block": "Wissen",
            "prepares": "In Drill 7 bekommt Claude die große Wissensbasis des Versicherers: Kunden, Verträge, Tarife. Wer hier schon eine kleine gebaut hat, erkennt dort dieselbe Idee im Großen.",
            "designQuestion": "Wenn Claude beim Antworten wissen soll, wer dir schreibt und wie du die Person ansprichst – wie würdest du das aufbauen: Wo liegen die Angaben, wie kommt Claude dran, und wer darf sie ändern?",
            "task": "Baue mit Claude eine kleine Wissensbasis, die dir beim Beantworten von Mails hilft – z. B. erfundene Kontakte mit Rolle, Anrede und Zuständigkeit oder deine Antwortregeln (Ton, Signatur, Standardsätze). Sie liegt als einfache Datei in deiner Kopie (z. B. wissen/kontakte.csv, erster Eintrag: die Absenderadresse der Lehrer-Mail); ein neues Werkzeug, das nur lesen darf, lässt Claude darin nachschlagen. Test: Ein hinterlegter Kontakt liefert seine Anrede, ein unbekannter Absender die Standardanrede, und das Werkzeug ist nur lesend. Ob Claude die Anrede im Entwurf nutzt, prüft die Person live in einer neuen Code-Sitzung. Gute Rückfrage: „Claude Code könnte die Datei hier auch direkt lesen – warum lohnt sich trotzdem ein Werkzeug?“ (Ein Agent im Betrieb bekommt nur, was ihm Werkzeuge geben, und das Werkzeug legt fest: nur lesen, nur diese Angaben.) Nur erfundene Daten, keine echten Kontakte. Etwa 20–25 Minuten mit Steckbrief.",
            "decision": "Welche drei, vier Angaben würden deine Antworten wirklich besser machen – und was darf auf keinen Fall hinein?",
            "inspiration": [
                "Werkzeuge: Claude darf selbst senden – ein neues Werkzeug. Welche Kontrolle gehört dann dazu (nur an die Antwort-Liste, nur nach deinem Ja, Eintrag im Protokoll)?",
                "Oberfläche: Im Cockpit sehen, wodurch eine Aufgabe erledigt wurde – durch Versand, von Hand oder durch Claude.",
                "Eingänge: Mails mit „dringend“ im Betreff bekommen eine markierte Aufgabe.",
                "Werkzeuge: Beim Abholen neuer Mails legt Claude eine Zusammenfassung in drei Zeilen als interne Notiz an.",
            ],
        },
    },
    7: {
        "learningObjective": "Kontext und Quellen gegen den Nachrichtentext prüfen, bevor ein Mensch eine Antwort verschickt.",
        "learningGoals": [
            "Erklären, woher ein Agent sein Wissen hat – nur aus den Quellen, die wir ihm als Werkzeug geben – und Behauptungen der Kundin davon trennen.",
            "Eine Fachregel so genau festlegen, dass sie prüfbar wird: was gilt als Fehler, was ausdrücklich nicht.",
            "Entscheiden, was eine automatische Prüfung der Sachbearbeitung sagen muss, damit sie hilft statt nervt.",
        ],
        "mission": "Bearbeite die neue Lebensanfrage aus deiner Inbox: Person, Police und gültige Tarifgeneration bestätigen; Claude entwirft mit Beleg, du änderst den Wortlaut im Cockpit und sendest dort selbst.",
        "buildTaskShort": "Einen Entwurf abweisen, der eine falsche Tarifgeneration zitiert.",
        "buildTask": "Beim Speichern eines Entwurfs soll eine Belegprüfung greifen: Nennt Text oder Begründung eine bekannte Tarifgeneration (z. B. PL-2017), die nicht zum verknüpften Vertrag passt, wird der Entwurf mit klarer Meldung abgelehnt („zitiert PL-2012, Vertrag VTR-… hat PL-2017“). Ein korrekt zitierender Entwurf und ein Entwurf ohne Tarifzitat bleiben erlaubt. Erst Tests in tests/test_workflow.py, dann save_draft in pfefferminzia/store.py ergänzen (bekannte Generationen stehen in der Tabelle documents).",
        "dialogueSteps": [
            {"phase": "Quelle finden", "askClaude": "Welche Person, Police und Tarifgeneration passen zu der neuen Lebensanfrage? Zeig mir die Belege; noch keinen Entwurf.", "decision": "Welche Aussage in der Mail ist nur Behauptung der Kundin, welche ist durch Vertrag und Tarif belegt? Stimmt die Zuordnung – woran machst du das fest?", "yourMove": "Zuordnung und exakte Tarifgeneration selbst bestätigen oder widersprechen."},
            {"phase": "Entwurf prüfen", "askClaude": "Erstelle jetzt einen begründeten Antwortentwurf mit Fundstelle. Nicht versenden – das mache ich im Cockpit.", "decision": "Welchen Satz im Entwurf würdest du so nicht unterschreiben, und wie lautet er besser?", "yourMove": "Text und Empfänger im Cockpit prüfen, den Satz selbst ändern, speichern und bewusst senden."},
            {"phase": "Selbst bauen", "askClaude": "Wir bauen eine Prüfung gegen falsch zitierte Tarifgenerationen. Frag mich zuerst nach der Regel und den Szenarien, die sie bestehen muss, dann bauen wir.", "decision": "Wann ist ein Tarifzitat für dich falsch – auch wenn gar keiner oder zwei genannt sind? Und wie soll die Meldung wörtlich lauten, damit die Sachbearbeitung sofort weiß, was zu tun ist?", "yourMove": "Beispieltabelle mit einem eigenen Gegenfall ergänzen, Meldungstext selbst formulieren, dann mit Claude bauen."},
            {"phase": "Beleg zeigen", "askClaude": "Zeig mir Quelle, menschliche Textänderung, Versandereignis und geprüfte Szenarien. Was fehlt noch? Dann hilf mir, meinen Stand zu speichern.", "decision": "Versuch die Prüfung auszutricksen: Welchen Entwurf schreibst du im Cockpit, damit sie greifen müsste?", "yourMove": "Im Cockpit einen falsch zitierenden Entwurf speichern und die eigene Meldung sehen; Protokoll prüfen; keinen zweiten Versand auslösen; Stand speichern."},
        ],
        "reflection": "Wo hast du heute einer Quelle mehr geglaubt als der Mail – und würde die Regel in deinem Haus sperren oder nur warnen?",
        "thinkingPrompts": [
            "Die Kundin nennt ihre Vertragsnummer selbst. Was, wenn sie sich vertippt hat – woran merkt es ein Mensch, woran der Agent?",
            "Claude darf Tarife nur lesen. Welche Quelle in deinem Haus dürfte ein Agent auf keinen Fall lesen – und warum?",
            "Die Prüfregel stoppt einen falschen Tarif. Welche andere Zusage an Kunden würdest du gern automatisch prüfen lassen?",
        ],
        "timeboxMinutes": {"fallUndQuellen": 15, "entwurfUndMensch": 15, "selbstBauen": 20, "nachweisen": 5, "reflexion": 5},
        "doneWhen": "Ein belegter Lebensentwurf wurde vom Menschen im Cockpit verändert und gesendet; die Tarif-Belegprüfung ist geprüft und gespeichert.",
        "bridge": "In Drill 6 kannte Claude nur die Mail. Jetzt bekommt es die Wissensbasis des Versicherers: Kunden, Verträge, Tarife – über Werkzeuge, die nur lesen dürfen.",
        "focusBlocks": ["Wissen", "Kontrollen"],
        "extension": {
            "title": "Beleg-Kasten im Cockpit",
            "block": "Oberfläche",
            "prepares": "In Drill 8 gibst du Antworten frei, statt sie selbst zu schreiben. Dafür musst du auf einen Blick sehen, worauf sich ein Entwurf stützt.",
            "designQuestion": "Stell dir vor, du musst in zehn Sekunden entscheiden, ob du einem Entwurf traust – wie sollte das Cockpit dir das zeigen?",
            "task": "Zeige im Cockpit neben dem Entwurf, worauf er sich stützt: verknüpfter Vertrag, Tarifgeneration, Fundstelle – und einen klaren Hinweis, wenn etwas fehlt. Du legst fest, was drinsteht und in welcher Reihenfolge. Test: get_ticket liefert die Angaben; ohne verknüpften Vertrag kommt der Hinweis.",
            "decision": "Was musst du sehen, um in zehn Sekunden zu entscheiden, ob du dem Entwurf traust?",
            "inspiration": [
                "Wissen: Deine Mini-Wissensbasis um Textbausteine je Tarifgeneration ergänzen, z. B. welche Unterlagen bei einer Bezugsrechtsänderung nötig sind.",
                "Kontrollen: Eine zweite Prüfregel – der Entwurf nennt eine Vertragsnummer, die nicht zum Fall gehört.",
                "Kontrollen: Entwürfe ohne Fundstelle dürfen gespeichert, aber nicht gesendet werden.",
                "Werkzeuge: Claude darf einen Rückruf als Aufgabe mit Fälligkeit planen.",
            ],
        },
    },
    8: {
        "learningObjective": "Erleben, dass Agentenarbeit vollständig sein darf, aber nur eine aktuelle menschliche Freigabe im Cockpit die externe Wirkung öffnet.",
        "learningGoals": [
            "Eigene Prüfkriterien festlegen, bevor man die Arbeit des Agenten ansieht.",
            "Eine Ablehnung so begründen, dass der Agent sie umsetzen kann – Feedback als Steuerung.",
            "Begründen, warum eine Freigabe an genau einen Textstand gebunden ist, und was ein Prüfer im Moment der Entscheidung sehen muss.",
        ],
        "mission": "Lass Claude zwei neue Lebensfälle bis zur Freigabe-Vorlage bearbeiten. Gib im Cockpit einen frei und lehne einen begründet ab. Ändere danach testweise einen freigegebenen Text und beobachte, dass die Freigabe verfällt.",
        "buildTaskShort": "Ablehnungsgrund und erloschene Freigabe im Cockpit sichtbar machen.",
        "buildTask": "get_ticket soll ein Feld controlNotice liefern ({kind, text, actor, at}), wenn das letzte Kontrollereignis eine Ablehnung (draft_rejected, mit Begründung) oder eine erloschene Freigabe (review_invalidated) ist. Das Cockpit zeigt dieses Feld bereits als gelben Hinweis über dem Antwortfeld an, sobald es geliefert wird. Erst Test in tests/test_workflow.py (ablehnen → controlNotice mit Begründung; neu vorlegen → Hinweis weg), dann get_ticket in pfefferminzia/store.py.",
        "dialogueSteps": [
            {"phase": "Fälle vorbereiten", "askClaude": "Bereite die zwei neuen Lebensfälle mit Belegen und Antwort bis zur Freigabe-Vorlage vor. Freigeben kann nur ich im Cockpit.", "decision": "Bevor du die Vorlagen ansiehst: Nach welchen zwei, drei Punkten prüfst du eine Antwort, bevor du sie freigibst?", "yourMove": "Die eigenen Prüfpunkte nennen, dann beide Vorlagen im Cockpit unter „Freigaben“ daran messen."},
            {"phase": "Mensch entscheidet", "askClaude": "Welche Folgen haben Freigabe und Ablehnung bei diesen beiden Fällen?", "decision": "Welchen Fall lehnst du ab – sind beide gut, den, der einen deiner Prüfpunkte am schwächsten erfüllt – und welcher eine Satz Begründung sagt Claude genau, was zu ändern ist?", "yourMove": "Im Cockpit einen Fall freigeben und senden, den anderen mit eigener Begründung ablehnen; prüfen, ob Claudes Überarbeitung die Begründung trifft."},
            {"phase": "Selbst bauen", "askClaude": "Wie zeigen wir Ablehnungsgrund oder erloschene Freigabe im Cockpit klarer? Frag mich zuerst, was der Hinweis sagen soll und in welchen Szenarien er erscheinen muss.", "decision": "Jemand öffnet den Fall morgen: Was muss im Hinweis stehen (wer, wann, warum), und wann soll er wieder verschwinden?", "yourMove": "Inhalt und Verschwinden des Hinweises festlegen, die Verbesserung mit Claude bauen und im Browser prüfen."},
            {"phase": "Beleg zeigen", "askClaude": "Prüfe im Protokoll Freigabe und Ablehnung. Was passiert, wenn ich einen freigegebenen Text ändere? Dann hilf mir, meinen Stand zu speichern.", "decision": "Soll schon ein geändertes Komma eine Freigabe aufheben – was spricht dafür (Sicherheit), was dagegen (Aufwand)?", "yourMove": "Einen freigegebenen Text im Cockpit ändern, den Freigabeverlust sehen; Szenarien bestanden; Stand speichern."},
        ],
        "reflection": "Welche Arbeit darf der Agent in deinem Haus komplett vorbereiten – und an welcher Stelle muss ein Name unter der Entscheidung stehen?",
        "thinkingPrompts": [
            "Wenn du zehn Freigaben am Tag machst: Ab der wievielten liest du nicht mehr genau – und was hieße das für das System?",
            "Eine Freigabe verfällt, wenn sich der Text ändert. Wo gibt es bei euch heute Freigaben, die eigentlich verfallen müssten?",
            "Deine Ablehnung hat Claude gesteuert. Was unterscheidet das von Feedback an eine neue Mitarbeiterin – und was nicht?",
        ],
        "timeboxMinutes": {"faelleVorbereiten": 15, "freigabeUndAblehnung": 15, "selbstBauen": 20, "nachweisen": 5, "reflexion": 5},
        "doneWhen": "Eine Freigabe und eine Ablehnung im Protokoll; eine Änderung entwertet die alte Freigabe; eigene Verbesserung an der Freigabe geprüft und gespeichert.",
        "bridge": "Bisher hast du jeden Entwurf selbst geändert und gesendet. Jetzt bereitet Claude alles vor, und du entscheidest nur noch: freigeben oder ablehnen.",
        "focusBlocks": ["Kontrollen", "Oberfläche"],
        "extension": {
            "title": "Risiko-Einstufung je Fall",
            "block": "Kontrollen",
            "prepares": "In Drill 9 laufen manche Antworten automatisch raus. Welche dürfen das? Deine Einstufung ist die Grundlage für diese Entscheidung.",
            "designQuestion": "Wie würdest du Fälle nach Risiko sortieren – woran erkennt man einen riskanten Fall, und wer sollte das festlegen?",
            "task": "Lege mit Claude eine Einstufung fest (z. B. niedrig, mittel, hoch) und die Regeln dafür – etwa Beschwerde, Betrag, Sparte, fehlender Beleg. Claude setzt sie über ein neues Werkzeug pro Fall mit Begründung; das Cockpit zeigt sie an; das Protokoll hält fest, wer sie gesetzt hat. Test: ein Beispiel pro Stufe.",
            "decision": "Welche zwei Merkmale machen einen Fall für dich riskant – und wer darf die Einstufung ändern: Claude, du oder beide?",
            "inspiration": [
                "Oberfläche: Deine Prüfpunkte aus Etappe 1 als Checkliste im Freigabe-Dialog; freigeben erst, wenn alle abgehakt sind.",
                "Oberfläche: Zeigen, was sich seit der letzten Freigabe am Text geändert hat.",
                "Kontrollen: Ablehnen nur mit Kategorie (Ton, Fakten, Beleg, Zusage), damit man später sieht, woran Entwürfe scheitern.",
                "Werkzeuge: Claude darf freigeben – durchdenke, warum das die Freigabe aushebelt und welcher Kompromiss denkbar wäre, z. B. ein zweiter Mensch.",
            ],
        },
    },
    9: {
        "learningObjective": "Den Unterschied zwischen Pflichtfreigabe und automatischem Versand nach einer sichtbaren Eingriffsfrist beurteilen.",
        "learningGoals": [
            "Pflichtfreigabe und Eingriffsfenster am eigenen Erleben abwägen: Aufwand, Risiko, Verantwortung.",
            "Festlegen, welche Fälle automatisch laufen dürfen und welche nie.",
            "Vorher sagen, was die Automatik tun wird, und es danach am Protokoll überprüfen.",
        ],
        "mission": "Ordne drei neue Haftpflichtfälle zu und plane Antworten ein: einen laufen lassen, einen im Fenster ändern, bei einem den Versand stoppen. Spule die Workshop-Uhr im Cockpit vor und prüfe Versand und Protokoll.",
        "buildTaskShort": "Gestoppte Termine sichtbar machen und Doppelversand ausschließen.",
        "buildTask": "Erweitere controlNotice in get_ticket um schedule_cancelled (Text im Fenster geändert) und queue_removed (mit Begründung), damit das Cockpit gestoppte Termine erklärt. Teste in tests/test_workshop_end_to_end.py: Ein geänderter Termin wird nach dem Zeitsprung nicht gesendet, und zweimal dispatch_due_replies versendet den unveränderten Fall genau einmal. Einstieg: pfefferminzia/store.py, dispatch_due_replies in pfefferminzia/agentmail_service.py.",
        "dialogueSteps": [
            {"phase": "Routing prüfen", "askClaude": "Ordne die drei neuen Fälle nachvollziehbar zu. Welche sind Haftpflicht, und ist der Empfänger für Antworten erlaubt? Noch nichts einplanen.", "decision": "Welcher Fall wäre dir für einen automatischen Versand zu heikel – und woran erkennst du das?", "yourMove": "Sparte, Quellen und erlaubten Empfänger selbst prüfen; den heiklen Fall benennen."},
            {"phase": "Warteschlange erleben", "askClaude": "Bereite belegte Antworten vor und plane sie ins 24-Stunden-Fenster ein.", "decision": "Welchen lässt du laufen, welchen änderst du, welchen stoppst du – je ein Satz Begründung. Und: Wie viele Mails gehen nach +24 h raus, und welche?", "yourMove": "Die Vorhersage aufschreiben, dann im Cockpit unter „Eingriffsfenster“ einen Text ändern, bei einem mit Begründung den Versand stoppen, einen laufen lassen."},
            {"phase": "Selbst bauen", "askClaude": "Wie machen wir gestoppte Termine und Duplikatschutz überprüfbar? Frag mich zuerst, welche Fehler am schlimmsten wären – die prüfen wir dann als Szenarien.", "decision": "Was wäre schlimmer: eine Antwort doppelt oder eine gestoppte Antwort doch versendet? Welche zwei Szenarien müssen wir deshalb unbedingt prüfen?", "yourMove": "Die Szenarien festlegen, die nie schiefgehen dürfen, und die Verbesserung am Eingriffsfenster mit Claude bauen."},
            {"phase": "Wirkung belegen", "askClaude": "Was würde nach dem Zeitsprung automatisch rausgehen? Danach prüfe Versand und Protokoll mit mir und hilf mir, meinen Stand zu speichern.", "decision": "Stimmt das Ergebnis mit deiner Vorhersage überein? Würdest du das Fenster in echt kürzer oder länger machen – wovon hängt es ab?", "yourMove": "Im Cockpit „Workshop-Zeit +24 h“ drücken; genau einen Auto-Versand prüfen und mit der Vorhersage vergleichen; Stand speichern."},
        ],
        "reflection": "Für welche Fälle in deinem Haus wäre „läuft, wenn niemand widerspricht“ vertretbar – und wer schaut dann ins Fenster?",
        "thinkingPrompts": [
            "Im Fenster hat niemand widersprochen, also ging die Mail raus. Wer trägt die Verantwortung: der Agent, du oder wer das Fenster festgelegt hat?",
            "Was passiert mit dem Eingriffsfenster am Freitagabend oder in der Ferienzeit?",
            "Welche Routine läuft bei euch heute schon nach „geht raus, wenn niemand widerspricht“ – nur ohne Agent?",
        ],
        "timeboxMinutes": {"routeUndQueue": 15, "eingreifen": 15, "selbstBauen": 15, "versandNachweis": 10, "reflexion": 5},
        "doneWhen": "Ein automatischer Versand, eine Änderung und ein Stopp sind im Protokoll nachvollziehbar; eigene Verbesserung am Eingriffsfenster geprüft und gespeichert.",
        "bridge": "Eine Freigabe für jeden Fall kostet Zeit. Jetzt probierst du die Alternative: Antworten laufen automatisch, wenn niemand im Zeitfenster eingreift.",
        "focusBlocks": ["Kontrollen", "Protokoll"],
        "extension": {
            "title": "Eine Kennzahl für deinen Report",
            "block": "Protokoll",
            "prepares": "In Drill 10 wird aus dem Protokoll ein Management-Bericht. Was dort nicht gezählt wird, kannst du nicht belegen.",
            "designQuestion": "Welche Frage würde dein Vorstand zum Eingriffsfenster stellen – und was müssten wir dafür mitzählen?",
            "task": "Lege fest, welche Frage dein Bericht beantworten soll (z. B. Warum wird im Fenster eingegriffen? Wie oft ändert der Mensch den Text des Agenten?), und ergänze in pfefferminzia/management_report.py eine gruppierte Zählung dafür – nur Zahlen, keine Texte oder Namen. Test in tests/test_management_report.py.",
            "decision": "Welche Frage soll deine Zahl beantworten – und was würde sie ausdrücklich nicht zeigen?",
            "inspiration": [
                "Kontrollen: Beschwerden laufen nie automatisch, sie brauchen immer eine Freigabe.",
                "Kontrollen: Die Fensterlänge hängt vom Fall ab, z. B. länger bei hohen Beträgen.",
                "Oberfläche: Eine Übersicht „geht heute raus“ mit Countdown und Grund.",
                "Werkzeuge: Claude darf nur Fälle einplanen, die deine Einstufung als niedrig führt.",
            ],
        },
    },
    10: {
        "learningObjective": "Aus operativen Ereignissen einen knappen, belegten Management-Befund machen – ohne aus einer lokalen Simulation Unternehmens-KPIs abzuleiten.",
        "learningGoals": [
            "Beobachtung, Deutung und Empfehlung trennen und die Grenze einer Aussage aus einer kleinen Simulation benennen.",
            "Das eigene agentische System aus seinen sechs Bausteinen erklären: was es darf, wo der Mensch entscheidet.",
            "Eine Grafik so anlegen, dass sie genau eine Frage beantwortet.",
        ],
        "mission": "Nimm die gezählten Ereignisse aus Drill 9 und baue daraus einen kurzen Bericht mit höchstens vier Folien: Beobachtung, Grafik, Empfehlung, Grenze der Aussage.",
        "buildTaskShort": "Eine zweite, beschriftete Grafik und eine eigene belegte Empfehlung bauen.",
        "buildTask": "Ergänze in slides/management.js eine zweite D3-Ansicht (z. B. Kontrollereignisse: Freigaben, Ablehnungen, Stopps, Auto-Versände) mit Achsen/Beschriftung und Nullfall, und ersetze den Empfehlungs-Platzhalter durch deine eigene begründete Empfehlung mit Grenze. Nur /api/management-report verwenden; keine Mailtexte, Namen, Secrets oder erfundenen KPIs. Test: tests/test_management_report.py.",
        "dialogueSteps": [
            {"phase": "Befund wählen", "askClaude": "Welche Beobachtungen aus unserem Drill-9-Schnappschuss sind wirklich belegt? Bitte keine Management-Aussage erfinden.", "decision": "Welche eine Frage soll dein Vorstand nach zwei Minuten beantworten können? Welche Zahl stützt die Antwort, und was würde sie widerlegen?", "yourMove": "Frage, Aussage und Grenze selbst wählen; Demo- und Inbox-Fälle unterscheiden."},
            {"phase": "Visualisieren", "askClaude": "Zeig mir für diese Aussage erst, welche Zahlen die Grafik braucht und wie sie aussehen soll – dann bauen wir sie.", "decision": "Was soll man in fünf Sekunden sehen – was kommt auf die Achsen, was wird hervorgehoben, und was steht da, wenn ein Wert null ist?", "yourMove": "Skizze in Worten vorgeben, Grafik mit Claude bauen; Achsen, Beschriftung und Nullfälle im Browser prüfen."},
            {"phase": "Entscheidung formulieren", "askClaude": "Hier ist meine Empfehlung in eigenen Worten. Kürze sie und stell mir eine kritische Rückfrage – schreib sie nicht neu.", "decision": "Wie lautet deine Empfehlung in zwei Sätzen: was, auf welchem Beleg, mit welcher Kontrollregel – und was beweist sie ausdrücklich nicht?", "yourMove": "Empfehlung und Einschränkung selbst schreiben; höchstens vier Folien."},
            {"phase": "Vorführen", "askClaude": "Prüfe, ob die Folien lokal laufen, die Zahlen zu Drill 9 passen und keine persönlichen Daten enthalten. Dann hilf mir, meinen Stand zu speichern.", "decision": "Welche Rückfrage aus dem Vorstand fürchtest du am meisten, und was antwortest du?", "yourMove": "Report zwei Minuten zeigen, Rückfrage beantworten, Prüfungen laufen lassen, Stand speichern."},
        ],
        "reflection": "Was nimmst du aus dem Tag als Regel mit: Welche Arbeit darf ein Agent bei euch allein, mit Fenster oder nur mit Freigabe tun?",
        "thinkingPrompts": [
            "Welche Zahl aus dem Workshop würde dein Vorstand am ehesten falsch verstehen – und wie verhinderst du das?",
            "Wenn du morgen einen Baustein bei euch einführen dürftest: Welcher bringt am meisten, welcher birgt das größte Risiko?",
            "Was müsste im Protokoll stehen, damit du einem Prüfer in einem Jahr erklären kannst, warum eine Antwort rausging?",
        ],
        "timeboxMinutes": {"snapshotUndFrage": 5, "selbstBauen": 20, "interpretation": 10, "nachweisen": 5, "reflexion": 5},
        "doneWhen": "Höchstens vier präsentierbare Folien; eine Grafik mit euren gezählten Ereignissen; belegte Empfehlung mit Grenze; eigener Stand gespeichert.",
        "bridge": "Alles, was heute passiert ist, steht im Protokoll. Jetzt machst du daraus eine belegte Aussage für dein Management – und zeigst dein System.",
        "focusBlocks": ["Protokoll"],
        "extension": {
            "title": "Folie: Mein agentisches System",
            "block": "alle",
            "prepares": "Das nimmst du mit nach Hause: dein System in einem Bild.",
            "designQuestion": "Wie würdest du einer Kollegin in einem Bild erklären, was dein System darf und wo du entscheidest?",
            "task": "Eine Zusatzfolie am Ende (zählt nicht zu den vier Report-Folien) in slides/management.js: dein System in sechs Bausteinen – was Claude darf, wo du entscheidest, was du heute selbst gebaut hast (aus MEINE_ERWEITERUNGEN.md) und was du als Nächstes bauen würdest.",
            "decision": "Welchen Baustein würdest du in deinem Haus als Erstes bauen – und welchen auf keinen Fall ohne menschliche Kontrolle?",
            "inspiration": [
                "Bonus mit restlichem Guthaben: ein 30–60-Sekunden-Video deiner Lösung mit Remotion als letzte Folie.",
                "Oberfläche: Die Grafik lässt sich zwischen Leben und Haftpflicht umschalten.",
                "Protokoll: Eine Folie „Was wir nicht messen konnten“.",
            ],
        },
    },
}

# The day's frame: every agentic system is built from these blocks. Each drill
# puts some in focus; its extension builds the block the next drill needs.
BUILDING_BLOCKS = {
    "Eingänge": "Woher kommen die Fälle? (Postfach, Abholen der Mails)",
    "Wissen": "Was darf der Agent nachschlagen? (Kunden, Verträge, Tarife, eigene Notizen)",
    "Werkzeuge": "Was darf der Agent tun? Jedes Werkzeug ist eine Hand – was fehlt, kann er nicht.",
    "Kontrollen": "Wo prüft eine Regel, wo entscheidet ein Mensch? (Prüfregel, Freigabe, Eingriffsfenster)",
    "Oberfläche": "Was sieht und tut der Mensch? (Cockpit)",
    "Protokoll": "Was wird festgehalten, damit man es später belegen kann?",
}

# Every extension starts as a short spec in the participant's own words.
SPEC_QUESTIONS = [
    "Was soll neu möglich sein – in einem Satz, aus Sicht der Person, die damit arbeitet?",
    "Welcher Baustein ist das: Eingänge, Wissen, Werkzeuge, Kontrollen, Oberfläche oder Protokoll?",
    "Wer löst es aus: du im Cockpit, Claude über ein Werkzeug oder eine Automatik?",
    "Welche Daten braucht es – und welche darf es auf keinen Fall sehen oder ändern?",
    "Welche Kontrolle gehört dazu?",
    "Woran erkennen wir, dass es funktioniert: ein Beispiel, ein Gegenbeispiel – und was steht danach im Protokoll?",
]

EXTENSION_RULES = (
    "Erst fragen, was die Person in ihrer Kommandozentrale gern hätte. Hat sie keine eigene Idee, das Problem der "
    "empfohlenen Erweiterung mit ihrer 'designQuestion' öffnen – 'task' ist nur deine Richtung, nicht vorlesen und "
    "nicht vorbauen. Ihre Skizze bestimmt den Entwurf; du ergänzt mit Rückfragen. Dann den Steckbrief "
    "(specQuestions) im Gespräch klären, höchstens zwei Fragen auf einmal; ein Risiko und eine Alternative nennen, "
    "die Person entscheidet. Den Steckbrief in MEINE_ERWEITERUNGEN.md festhalten, dann klein und mit Test bauen. "
    "Nur erfundene Daten. Ein neues Werkzeug für Claude erscheint erst in einer neuen Code-Sitzung. Werkzeuge mit "
    "Außenwirkung (senden, freigeben, Zeit) nur mit einer Kontrolle im Steckbrief; die Antwort-Liste bleibt unangetastet, "
    "und Claude nutzt ein solches Werkzeug nur nach frischem, ausdrücklichem Ja für genau diesen Fall."
)

# The case every participant must have handled before extensions open:
# (description, SQL over ticket_events that counts matching evidence).
CASE_EVIDENCE: dict[int, list[tuple[str, str]]] = {
    6: [("Eine Antwort wurde von einem Menschen im Cockpit gesendet.",
         "SELECT COUNT(*) FROM ticket_events WHERE type = 'reply_sent' AND actor != 'auto-send-worker'")],
    7: [("Eine Lebensantwort wurde von einem Menschen im Cockpit gesendet.",
         "SELECT COUNT(*) FROM ticket_events e JOIN tickets t ON t.id = e.ticket_id"
         " WHERE e.type = 'reply_sent' AND e.actor != 'auto-send-worker' AND t.product_line = 'life'")],
    8: [("Ein Entwurf wurde im Cockpit freigegeben.", "SELECT COUNT(*) FROM ticket_events WHERE type = 'draft_approved'"),
        ("Ein Entwurf wurde im Cockpit begründet abgelehnt.", "SELECT COUNT(*) FROM ticket_events WHERE type = 'draft_rejected'")],
    9: [("Eine Antwort lief nach dem Zeitfenster automatisch raus.",
         "SELECT COUNT(*) FROM ticket_events WHERE type = 'reply_sent' AND actor = 'auto-send-worker'"),
        ("Ein eingeplanter Text wurde im Fenster geändert.", "SELECT COUNT(*) FROM ticket_events WHERE type = 'schedule_cancelled'"),
        ("Bei einer Antwort wurde der Versand mit Begründung gestoppt.", "SELECT COUNT(*) FROM ticket_events WHERE type = 'queue_removed'")],
    10: [],
}


def case_evidence(drill: int, db: sqlite3.Connection | None = None) -> dict[str, Any]:
    """What the audit log already shows of this drill's case, and what is still missing."""
    db = db or get_database()
    missing = [text for text, query in CASE_EVIDENCE[drill] if not db.execute(query).fetchone()[0]]
    return {"complete": not missing, "missing": missing}


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
        "Ist die Mail noch nicht da, kurz warten und das Postfach noch einmal abrufen – die Zustellung dauert manchmal einige Sekunden.",
        "Claude legt den Entwurf beim Fall ab; im Cockpit steht er unter der Mail. Senden kann nur der Mensch dort.",
        "Für den Code: send_ticket_draft ruft am Ende schon complete_ticket_todos für 'review' und 'queue_intervention' auf. Es fehlt die Aufgabenart 'reply'.",
    ],
    7: [
        "Trenne Nachrichtentext (Behauptung) von vertrauenswürdigen Tarifquellen (Beleg).",
        "Erst die Kundin finden, dann den Vertrag zuordnen und die genau passende Tarifgeneration lesen – und erst danach entwerfen.",
        "Für den Code: In save_draft sind Ticket und linkedContracts bekannt. Suche im Text nach den Generationen aus der Tabelle documents und vergleiche sie mit tariffGenerationId des Vertrags.",
    ],
    8: [
        "Beobachte, an welcher Stelle eine externe Wirkung technisch blockiert bleibt: Claude hat kein Freigabe- und kein Sende-Werkzeug.",
        "Claude legt den Entwurf zur Freigabe vor; du entscheidest im Cockpit unter „Freigaben“. Nach einer Ablehnung überarbeitet Claude den Entwurf.",
        "Für den Code: Die Ereignisse draft_rejected und review_invalidated stehen schon in ticket['events']; controlNotice ist das jüngste davon, solange kein neueres Kontrollereignis folgt.",
    ],
    9: [
        "Ordne zuerst die Sparte zu; die Kontrollregel folgt aus der Sparte.",
        "Claude plant die Antworten ein; Eingriffe (Text ändern, Versand stoppen) und den Zeitsprung machst du im Cockpit.",
        "Für den Code: schedule_cancelled und queue_removed sind schon Ereignisse. Für den Duplikattest dispatch_due_replies zweimal aufrufen und die gesendeten Fake-Mails zählen.",
    ],
    10: [
        "Die Zahlen zählen nur die Fälle aus deinem Workshop; unterscheide die mitgelieferten Beispielfälle von den Mails aus deinem Postfach.",
        "Es gibt schon eine erste Grafik und Folien als Grundlage; baue darauf auf, statt neu anzufangen.",
        "Zeige Beobachtung, Kontrollgrenze, Empfehlung und Unsicherheit; ein schöner Chart ohne Beschriftung ist kein Management-Befund.",
    ],
}


def drill_guide(
    hint_level: int = 0, db: sqlite3.Connection | None = None, *, include_extensions: bool = False
) -> dict[str, Any]:
    db = db or get_database()
    profile = checkpoint_profile(db)
    drill = profile["drill"]
    bounded = max(0, min(hint_level, 3))
    evidence = case_evidence(drill, db)
    brief = DRILL_BRIEFS[drill]
    extensions = None
    if include_extensions:
        extensions = {"unlocked": evidence["complete"], "missing": evidence["missing"]}
        if evidence["complete"]:
            extensions |= {"recommended": brief["extension"], "specQuestions": SPEC_QUESTIONS, "rules": EXTENSION_RULES}
    reference = REFERENCE_TAGS[drill]
    previous = f"checkpoint/{profile['name']}" if profile["name"] != "drill-10-complete" else "checkpoint/drill-10-start"
    return {
        "checkpoint": profile,
        **{key: value for key, value in brief.items() if key != "extension"},
        "buildingBlocks": BUILDING_BLOCKS,
        "learningPath": {
            "commonEvidence": "Fall im Cockpit und MCP nachvollziehen, eigene Codeänderung testen, Diff prüfen und auf eigenem Branch committen.",
            "guided": "Nur nächsten Schritt, Dateistelle und ein kleines Prüfszenario zeigen; bei Bedarf den offiziellen Checkpoint laden.",
            "building": "Akzeptanzkriterien geben, Code in kleinen Iterationen mit der Person bauen und verifizieren.",
            "extend": "Erst nach Fallnachweis, eigenem Bauauftrag und auf Wunsch: die eigene Kommandozentrale erweitern – mit Steckbrief, im Baustein, den der nächste Drill braucht.",
        },
        "referenceSolution": {
            "tag": f"checkpoint/{reference}",
            "diff": f"git diff {previous} checkpoint/{reference}",
            "rule": "Nur im Rettungsmodus oder auf ausdrücklichen Wunsch zeigen; sonst nur als Orientierung für die Richtung nutzen.",
        },
        "caseEvidence": evidence,
        "extensions": extensions,
        "hintLevel": bounded,
        "hint": None if bounded == 0 else HINTS[drill][bounded - 1],
        "instruction": (
            "Sprich wie mit einer Führungskraft ohne IT-Hintergrund (CLAUDE.md, Abschnitt 0): keine Datei- oder "
            "Funktionsnamen, kein Code, keine englischen Technikwörter; arbeite still und melde nur Ergebnisse. "
            "'buildTask', 'extension.task' und Hinweis-Level 3 sind nur deine Richtung – übersetzen, nie vorlesen. "
            "Die vier Dialogetappen sind eine Landkarte, kein Copy-paste-Auftrag. Frage nach der gewünschten Hilfstiefe, "
            "beginne mit der aktuellen Etappe und stelle dort zuerst die Frage aus 'decision' – bevor du etwas entwirfst, "
            "baust oder vorschlägst. Frag offen („Was meinst du, wie sollten wir … aufbauen?“), greif die Idee der Person auf, "
            "schärfe sie mit einer Rückfrage („Und was passiert, wenn …?“) und ergänze erst dann, was fehlt. Die Antwort "
            "der Person bestimmt, was du tust. Nur wer nach der offenen Frage hängt, bekommt zwei, drei Denkrichtungen "
            "mit ihren Folgen – als Anstoß, nicht als Menü. In Wartezeiten und wenn die Person früh fertig ist, einen "
            "Denkanstoß aus 'thinkingPrompts' stellen und ihn auf ihr eigenes Haus beziehen. Beim Bauen: Regel in ihren "
            "Worten → Szenarien von der Person, auch eines, das nie passieren darf → du machst daraus automatische "
            "Prüfungen und baust klein → Ergebnis in Alltagssprache („3 von 3 Szenarien bestanden“), kein Test-Jargon "
            "wie rot/grün oder TDD → in drei Alltagssätzen sagen, was sich geändert hat → Person prüft im Cockpit. Warte an jedem 'yourMove'. Freigeben, Senden und Zeitsprung macht "
            "der Mensch im Cockpit. Vor dem Commit die Frage aus 'reflection' stellen. Zum Einstieg 'bridge' und die "
            "Bausteine aus 'focusBlocks' nennen. Den eigenen Bauauftrag nie überspringen; wer fertig ist, erweitert "
            "das eigene System ('extensions', erst wenn 'caseEvidence.complete' wahr ist) – nie den nächsten Drill vorwegnehmen."
        ),
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
