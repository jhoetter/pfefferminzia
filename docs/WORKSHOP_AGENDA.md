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
| Dienstag | Vom Agenten zum System: AI Automation | Johannes Hötter | Was ändert sich, wenn ein Agent operative Fähigkeiten nutzen und externe Wirkungen auslösen kann? | Die Teilnehmenden bauen einen MCP-basierten E-Mail-zu-Aktion-Prozess und vergleichen verpflichtende Freigabe mit einem reversiblen Automationsfenster. |
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
| 08:30–09:45 | **Input – Vom Assistenten zum Agenten: Wenn KI handelt** | Rund 45–50 Minuten Input, danach Diskussion und Tagesbriefing. Johannes zeigt seine Arbeit mit Agententeams, erklärt das MCP-first-Betriebsmodell, führt Verifiability ein und stellt die beiden Kontrollmuster des Tages gegenüber. |
| 10:00–11:15 | **Drill 1 – Die Kommandozentrale für Agenten** | Die Teilnehmenden starten eine eigene Pfefferminzia-Instanz, verbinden Claude über MCP und empfangen die erste Nachricht in einer persönlichen AgentMail-Inbox. Sie sehen, dass menschliche Oberfläche und Agent dieselben kontrollierten Fachfunktionen verwenden. |
| 11:30–12:45 | **Drill 2 – Leben: Der Mensch bearbeitet, der Agent bereitet vor** | Das System ermittelt Kunde, Antrag oder Vertrag, Tarifgeneration und relevante Dokumente. Die Teilnehmenden prüfen den zusammengestellten Kontext und verfassen die Antwort selbst. Ziel ist Augmentation innerhalb eines operativen Prozesses, noch kein autonomer Versand. |
| 13:45–15:00 | **Drill 3 – Leben: Der Agent bearbeitet, der Mensch gibt frei** | Ein neuer Lebensfall trifft per E-Mail ein. Der Agent erstellt die vollständige Antwort und erzeugt eine Review-Notification. Die Teilnehmenden können freigeben, editieren oder Kontext ergänzen. Neuer menschlicher Input führt zurück in den agentischen Loop; erst eine ausdrückliche Freigabe löst den tatsächlichen E-Mail-Versand aus. |
| 15:15–16:30 | **Drill 4 – Haftpflicht: Automatisch, solange niemand widerspricht** | Der Agent bearbeitet eine einfache Haftpflichtanfrage und plant die Antwort für 24 Stunden später ein. Die Teilnehmenden lassen eine Antwort weiterlaufen, bearbeiten eine zweite und nehmen eine dritte aus der Queue oder brechen sie ab. Anschließend wird die Workshop-Zeit vorgespult und die verbliebene Nachricht tatsächlich versendet. |
| 16:45–18:00 | **Whiteboard-Abschluss – Wo darf der Agent handeln?** | Kein weiterer Foliensatz: mit geschlossenen Laptops, einem Getränk und im Halbkreis rekonstruiert die Gruppe das System und seine Kontrollpunkte am Whiteboard. Danach übertragen die Teilnehmenden das Muster auf einen eigenen Prozess und formulieren einen Automation Contract für Mittwoch. |

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

Jeder 75-minütige Drill folgt derselben Struktur. Damit bleibt der Kern für alle
erreichbar und schnellere Gruppen erhalten sinnvolle Vertiefungen.

| Dauer | Phase |
| --- | --- |
| 10 Min. | Rolle, Fall und beobachtbare Erfolgskriterien |
| 25–30 Min. | Kernpfad, den alle Teilnehmenden abschließen sollen |
| 15 Min. | Kontext, Quellen, Tool-Aufrufe und Zustandsänderungen untersuchen und verifizieren |
| 10–15 Min. | Optionale Challenge Card oder Verfeinerung |
| 10 Min. | Gemeinsame Auswertung und Übergang zur nächsten Kontrollstufe |

Die Teilnehmenden können in Paaren zusammenarbeiten, betreiben aber jeweils ein
isoliertes lokales System mit eigener Inbox. Der Lehrende kann nach jeder Phase
gemeinsam weitergehen, statt darauf zu warten, dass alle jede Vertiefung
vollständig beendet haben.

### Optionale Challenge Cards

Die Challenges vertiefen einen bestehenden Drill. Generische Kosten- oder
Deckungsfragen benötigen dafür keinen eigenen Programmpunkt.

- Zwei Kunden haben sehr ähnliche Namen.
- In der eingehenden Nachricht fehlt die Vertragsnummer.
- Die zuerst ausgewählte Tarifgeneration ist nicht mehr anwendbar.
- Eine Beschwerde wird fälschlich als normale Serviceanfrage klassifiziert.
- Ein Anhang enthält Anweisungen an den Agenten und muss als nicht
  vertrauenswürdiger Inhalt behandelt werden.
- Die gewünschte menschliche Änderung widerspricht den zitierten Tarifregeln.

### Whiteboard-Abschluss

Der Abschlussblock ist bewusst elastisch und kann 40 bis 75 Minuten dauern.
Die Gruppe zeichnet zunächst den gemeinsam erlebten Prozess nach:

`E-Mail → Kunde und Vertrag → Tarif und Dokumente → agentische Bearbeitung → Kontrollregel → externe Wirkung → Audit-Historie`

Am Schritt „Kontrollregel“ werden der Lebens- und der Haftpflichtzweig ergänzt.
Danach wendet jede Gruppe die Zeichnung auf einen möglichen Prozess aus der
eigenen Organisation an:

- Was startet den Prozess?
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
