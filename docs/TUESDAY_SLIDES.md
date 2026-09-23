# Dienstag-Foliensatz

Der [Foliensatz](../slides/index.html) begleitet Johannes' Slot am Dienstag,
29. September 2026. Er beginnt mit dem Input und führt dann entlang der vier
Drills 8–11 bis zur Whiteboard-Frage „Wo darf der Agent handeln?“.

## Präsentieren

- Nach `uv run pfefferminzia serve` im Browser `http://127.0.0.1:3004/slides/`
  öffnen (bei abweichendem Port diesen verwenden).
- Alternativ `slides/index.html` direkt im Browser öffnen. Die Datei und ihre
  beiden lokalen Ergänzungen funktionieren offline und benötigen **kein Node**.
- Pfeiltasten oder Leertaste: weiter; `S`: Referentenansicht mit Notizen;
  `F`: Vollbild; `Esc`: Übersicht. Für PDF `?print-pdf` an die URL hängen und
  mit Hintergrundgrafiken drucken.

Die gezeichneten Cockpit-, Review- und Queue-Komponenten sind **Foliendemos**.
Sie lesen keine lokalen Falldaten und lösen keine echten Freigaben oder E-Mails
aus. Interaktion auf den Demo-Folien dient nur zur Veranschaulichung. Im Drill
wechseln Lehrende und Teilnehmende in die echte lokale Anwendung.

Die Präsentation verwendet Falk Uebernickels
[AI-Studio-Vorlagen-Foliensatz](https://github.com/falkue/ai-studio-foliensatz)
als Basis. Sein Golden-Age-Skin, Reveal.js, Schriften und HSG-Logo bleiben in
`slides/index.html` eingebettet. Die Dienstag-Inhalte und App-Mockups liegen
getrennt in `slides/dienstag.js` und `slides/dienstag.css`. Das HSG-Logo ist nur
für die Veranstaltung der Universität St.Gallen zu verwenden. Die übernommene
Vorlage entspricht dem Upstream-Stand `f196f78`.

## Didaktischer Schnitt

| Block | Folien | Offizieller Start | Nachweis am Ende |
| --- | --- | --- | --- |
| Input | 1–9 | — | Kontrollmuster und Verifiability erklärt |
| Drill 8 | 10–12 | `drill-08-start` | App, MCP, persönliche Inbox, Nachricht, Todo |
| Drill 9 | 13–15 | `drill-09-start` | Leben: Kontext, Tarifbeleg, menschlicher Edit und Versand |
| Drill 10 | 16–18 | `drill-10-start` | Leben: eine Freigabe und eine Ablehnung |
| Drill 11 | 19–21 | `drill-11-start` | Haftpflicht: Auto-Versand, Edit und Stopp mit Audit |
| Abschluss | 22–25 | — | Recovery, Sicherheitsnetze, Whiteboard, Automation Contract |

Der Whiteboard-Teil selbst ist kein weiterer Vortrag: Nach der Leitfrage auf
Folie 24 wird der Beamer ausgeschaltet. Folie 25 ist ein optionaler Handout-
Abschluss für die Überleitung auf Mittwoch.

Alle Beispiele sind fiktiv. Für die echte Generalprobe und alle Nachrichten
gelten die Empfänger-Allowlist und der Ablauf im
[Workshop-Runbook](WORKSHOP_RUNBOOK.md).
