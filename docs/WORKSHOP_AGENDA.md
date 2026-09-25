# Workshop-Agenda: AI and the Future of Work – Insurance Edition

> **Status:** Arbeitsstand zur Abstimmung zwischen den Lehrenden. Das
> veröffentlichte Programm und die Details der Übungen können sich noch ändern.

Diese Agenda beschreibt den didaktischen Bogen des dreitägigen HSG-Workshops
vom 28. bis 30. September 2026. Die Übungen verwenden ausschließlich die
fiktiven und synthetischen Pfefferminzia-Workshopdaten. Echte Kunden-, Vertrags-,
Schaden-, Gesundheits- oder E-Mail-Daten dürfen nicht verwendet werden.

Offizielle Modulseite:
[AI and the Future of Work – Insurance Edition](https://www.embe.unisg.ch/modul/ai-and-the-future-of-work-insurance-edition/)

## Lernbogen

| Tag | Thema | Leitung | Leitfrage | Ergebnis für die Teilnehmenden |
| --- | --- | --- | --- | --- |
| Montag | Von der Tabelle zum Agenten: AI Augmentation | Falk Uebernickel | Wie kann KI Menschen dabei unterstützen, fragmentierte Versicherungsdaten zu verstehen und zu bearbeiten? | Die Teilnehmenden untersuchen den Datensatz aus fachlichen Rollen heraus, bauen Kundensichten zusammen, analysieren Bestände und treffen assistierte Entscheidungen. |
| Dienstag | Vom eigenen Code zum Agentensystem: Vibe Coding, MCP, Automation | Johannes Hötter | Wie baue ich mit Claude Code einen prüfbaren Prozess, und wo darf er selbst handeln? | Jede Person forkt, baut, testet und pusht ihre Pfefferminzia-Version; alle erleben Pflichtfreigabe und Eingriffsfenster und verdichten den Befund in einem Management-Report. |
| Mittwoch | Vom System in die eigene Firma: Bring Your Own Case | Falk Uebernickel | Wo lassen sich die Muster verantwortbar in der eigenen Organisation einsetzen? | Die Teilnehmenden übertragen die Muster auf eigene Fälle und formulieren einen konkreten Umsetzungspfad. |

Ulrike Baumöl begleitet den Workshop als Programmmanagerin. Der Arbeitsstand
enthält keine Einheiten von Jürgen Döllner oder Ralf Herbrich.

## Montag: Augmentation

Der Montag schafft eine gemeinsame Daten- und Fachgrundlage. Falks aktueller
Übungsbogen lautet:

1. Claude Code einrichten, den Datensatz klonen und erste Fragen stellen.
2. Als neue Chief AI & Data Officer den geerbten Bestand erkunden und eine
   erste HTML-Datenschau erstellen.
3. Den Bestand nach der Fusion analysieren und erkennen, wo Kunden verloren
   gehen.
4. Eine Kundensicht aus HAPO, VERA und MINT zusammensetzen sowie Dubletten und
   Migrationsartefakte erklären.
5. Den Schadenfall Pieper mit automatischer Ablehnung, Beschwerde, Ombudsmann
   und BaFin-Kontext rekonstruieren.
6. Drei Lebensanträge mit Underwriting-Assistenz prüfen und möglichen Bias in
   historischen Entscheidungen untersuchen.
7. Eine Storno-Frühwarnliste bauen und fragen, was sich ändert, wenn sie jede
   Woche ohne menschlichen Start ausgeführt wird.

Die letzte Frage bildet bewusst die Brücke von Augmentation zu Automation.

## Dienstag: Automation

### Tagesablauf

| Zeit | Programmpunkt | Inhalt und Ergebnis |
| --- | --- | --- |
| 08:30–09:45 | **Input – Vom Assistenten zum Agenten: Wenn KI handelt** | Johannes zeigt seine fertigen Anwendungen live (app/design/tracker.sonaloop.com), erklärt Vibe Coding mit Claude Code, MCP, Verifizierbarkeit und die zwei Kontrollmuster. Danach Fork-/Tagesbriefing. |
| 10:00–11:00 | **Drill 8 – Die Kommandozentrale für Agenten** | Eigenen Fork/Branch anlegen, Python-App und MCP starten, persönliche Mail bis zum Ticket verfolgen, eine erste Eingangsverbesserung mit Claude bauen, testen, committen und pushen. |
| 11:15–12:15 | **Drill 9 – Leben: Der Mensch bearbeitet, der Agent bereitet vor** | Kunde, Vertrag und Tarifgeneration prüfen; belegten Entwurf redigieren und bewusst selbst versenden. Einen Beleg-Guard mit Claude bauen. |
| 12:15–13:15 | **Mittagspause** | Abstand vor den Automationsmustern. |
| 13:15–14:15 | **Drill 10 – Leben: Der Agent bearbeitet, der Mensch gibt frei** | Zwei Entscheidungsvorlagen prüfen; eine freigeben, eine ablehnen. Review-Zustand selbst verbessern und belegen, dass ein Edit die Freigabe entwertet. |
| 14:30–15:30 | **Drill 11 – Haftpflicht: Automatisch, solange niemand widerspricht** | Haftpflichtfälle routen; einen laufen lassen, einen ändern, einen stoppen. Workshop-Uhr nach Bestätigung vorspulen und die Wirkung im Audit prüfen. |
| 15:45–16:30 | **Mini-Drill 12 – Management-Report** | Aus einem aggregierten Schnappschuss der eigenen Drill-11-Instanz mit reveal.js und D3 maximal vier Folien bauen: Beobachtung, Grafik, Kontrollentscheidung und Grenze der Aussage. |
| 16:45–18:00 | **Whiteboard-Abschluss – Wo darf der Agent handeln?** | Laptops zu: Den Report als Gesprächsauftakt nutzen, Pflichtfreigabe und Eingriffsfenster vergleichen. Terminal-Prompts gegen Event-/Cron-Trigger samt Retry, Rechten, Audit und Verantwortung halten; Automation Contract formulieren. |

### Die zwei Kontrollmuster

Beide Übungen zeigen Automation. Sie unterscheiden sich darin, wann ein Mensch
vor einer externen Wirkung eingreifen muss.

**Lebensfall mit hohem Risiko – verpflichtende Freigabe**

`Eingang → agentische Bearbeitung → Review-Notification → freigeben, editieren oder Kontext ergänzen → bei Bedarf zurück in den agentischen Loop → Versand`

Die E-Mail kann das System ohne eine ausdrückliche menschliche Entscheidung
nicht verlassen.

**Haftpflichtfall mit geringerem Risiko – Eingriffsfenster**

`Eingang → agentische Bearbeitung → Versand für +24 Stunden einplanen → Mensch kann editieren, aus der Queue nehmen oder abbrechen → automatischer Versand`

Der Standard ist die Ausführung nach einer sichtbaren Verzögerung. Bei beiden
Mustern hält das Activity Log Belege, vorgeschlagene Aktion, menschliche
Eingriffe und das endgültige Ergebnis fest.

### Rhythmus der Drills

Vier operative Drills dauern je 60 Minuten; der Report-Mini-Drill dauert
45 Minuten. Jeder hat eine beobachtbare Produktmission **und** eigenen Code. Der
Verifier prüft nur die Startbereitschaft; abgeschlossen ist ein Drill erst
mit Fallnachweis, getesteter Änderung und eigenem Commit/Push. Geführte
Teilnehmende verändern eine klar abgegrenzte Stelle; Bauende implementieren
mehrere kleine Schritte; Schnelle dürfen nach dem Kernnachweis auf eigenen
Wunsch bereits die nächste Fähigkeit bauen. Der offizielle Checkpoint ist
ein sicherer Rückweg, keine Musterlösungspflicht. Details:
[Lernpfad](LEARNING_PATH.md).

| Drill | Kernpfad | Selbst bauen | Nachweis + Rückblick |
| --- | ---: | ---: | ---: |
| 8 · Eingang verstehen | 20 Min. | 25 Min. | 15 Min. |
| 9 · Belegter Entwurf | 30 Min. | 20 Min. | 10 Min. |
| 10 · Pflichtfreigabe | 30 Min. | 20 Min. | 10 Min. |
| 11 · Eingriffsfenster | 30 Min. | 15 Min. | 15 Min. |
| 12 · Management-Report | 5 Min. | 20 Min. | 20 Min. |

Die genauen Teilziele, Dateieinstiege und Zeitboxen stehen in den
[Drill-Karten](DRILL_CARDS.md) und im MCP-Werkzeug `get_drill_guide` schon bei
Hinweis-Level 0. Jeder Drill ist dort als vier **aufeinanderfolgende
Dialogetappen** beschrieben: Claude fragen, menschlich prüfen/entscheiden,
selbst bauen, Ergebnis belegen. Claude soll nur den nächsten Schritt führen
und am menschlichen Stopp warten, nicht alle Prompts als einen autonomen
Auftrag ausführen oder bloß ein zufälliges Todo vorschlagen.

Die Teilnehmenden können in Paaren zusammenarbeiten, betreiben aber jeweils ein
isoliertes lokales System mit eigener Inbox und eigenem Fork. Der Lehrende
kann nach jeder Phase gemeinsam weitergehen; Vorausbau ist freiwillig und
kein Grund, andere zu bremsen oder spätere Funktionen ungefragt zu zeigen.

### Optionale Vertiefung und Vorausbau

Die Challenges vertiefen einen bestehenden Drill. Generische Kosten- oder
Deckungsfragen benötigen dafür keinen eigenen Programmpunkt.

Wer den Fall und den Codebeitrag früh nachweist, kann stattdessen auf
ausdrücklichen Wunsch den **nächsten** Drill selbst vorbauen. Die
Akzeptanzkriterien kommen vor der Lösung; beim gemeinsamen Wechsel kann die
Person ihren Branch behalten oder nach Rückfrage den offiziellen Checkpoint
in einem neuen Worktree laden. Diese Wahl wird nie über einen Reset erzwungen.

- Zwei Kunden haben sehr ähnliche Namen.
- In der eingehenden Nachricht fehlt die Vertragsnummer.
- Die zuerst ausgewählte Tarifgeneration ist nicht mehr anwendbar.
- Eine Beschwerde wird fälschlich als normale Serviceanfrage klassifiziert.
- Ein Anhang enthält Anweisungen an den Agenten und muss als nicht
  vertrauenswürdiger Inhalt behandelt werden.
- Die gewünschte menschliche Änderung widerspricht den zitierten Tarifregeln.

### Whiteboard-Abschluss

Der Abschlussblock behält seine 75 Minuten; bei Verzögerungen bleibt der
Report-Vortrag auf zwei Minuten pro Gruppe begrenzt, damit die Diskussion
nicht entfällt.
Die Gruppe zeichnet zunächst den gemeinsam erlebten Prozess nach:

`E-Mail → Kunde und Vertrag → Tarif und Dokumente → agentische Bearbeitung → Kontrollregel → externe Wirkung → Audit-Historie`

Am Schritt „Kontrollregel“ werden der Lebens- und der Haftpflichtzweig ergänzt.
Danach wendet jede Gruppe die Zeichnung auf einen möglichen Prozess aus der
eigenen Organisation an:

- Was startet den Prozess?
- Ist es ein Terminal-Prompt, eine eingehende Mail oder ein Zeitplan/Cron?
- Wer betreibt den Event-Worker; was geschieht bei Retry, Duplikat und Ausfall?
- Welchen Kontext und welche Belege braucht der Agent?
- Was darf der Agent vorbereiten oder verändern?
- Was ist die externe Wirkung?
- Braucht der Prozess eine Freigabe vor der Wirkung oder genügt ein
  Eingriffsfenster?
- Welche Belege machen das Ergebnis im Nachhinein verifizierbar?

Das Ergebnis ist ein einseitiger **Automation Contract** mit Auslöser,
erlaubten Aktionen, Kontrollregel, Belegen, Ausnahmeweg und verantwortlicher
menschlicher Rolle. Er bildet die Übergabe an die eigenen Fälle am Mittwoch.

## E-Mail-Setup für Teilnehmende

Eine gemeinsame Inbox würde Nachrichten und Trigger zwischen den Teilnehmenden
vermischen. Empfohlen wird deshalb:

- eine persönliche AgentMail-Inbox mit Inbox-spezifischem Zugang pro Person;
- zwei zusätzliche Inboxen als Reserve;
- ein zentraler Zugang des Lehrenden nur zum Anlegen der Inboxen und Verteilen
  von Szenarien;
- eine explizite Inbox-ID in jeder lokalen Pfefferminzia-Konfiguration;
- ein fehlersicherer Startabbruch, wenn keine Teilnehmer-Inbox konfiguriert ist;
  und
- eine steuerbare Workshop-Uhr, um die 24-Stunden-Queue ohne reale Wartezeit zu
  demonstrieren.

Die Teilnehmenden können Nachrichten von ihrer eigenen Adresse an ihre
persönliche Workshop-Inbox senden. Jede Nachricht und jeder Anhang darf dabei
ausschließlich fiktive Workshop-Inhalte enthalten.

## Vorbereitung

- Pro Person einen getesteten Repository-Checkout und eine isolierte Inbox
  bereitstellen.
- Vor jedem Drill einen deterministischen Reset-Punkt vorbereiten.
- Mindestens drei Lebens- und drei Haftpflichtnachrichten für Kernpfade und
  Eingriffsvarianten vorbereiten.
- Freigabe, Bearbeitung, Rückgabe an den Agenten, Abbruch und Entfernen aus der
  Queue in der Oberfläche sichtbar und über kontrollierte MCP-Funktionen
  verfügbar machen.
- Sicherstellen, dass tatsächliche Workshop-E-Mails nur an freigegebene
  Workshop-Adressen versendet werden können.
- Challenge Cards und die Whiteboard-Vorlage für den Automation Contract
  vorbereiten.
- Das genaue Format des Mittwochs offenhalten, bis die Fälle der Teilnehmenden
  und die Ergebnisse vom Montag bekannt sind.

Das technische und organisatorische Vorgehen für Checkpoints, Generalprobe,
Reservezugänge und Instructor-Steuerung steht im
[`WORKSHOP_RUNBOOK.md`](WORKSHOP_RUNBOOK.md).
