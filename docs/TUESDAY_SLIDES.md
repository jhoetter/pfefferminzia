# Präsentationen für Dienstag

Der [Deck-Launcher](../slides/decks.html) enthält acht bewusst kurze, getrennte
Präsentationen. Im laufenden Workshop beginnt jede Session mit ihrem eigenen
Deck; die [Gesamtpräsentation](../slides/index.html?deck=gesamt) ist vor allem
für Vorbereitung und Nacharbeit gedacht. Der separate Vortrag
[„Jede Aufgabe zuerst agentisch“](../slides/index.html?deck=agentisch)
überträgt Johannes’ PDF `input-agentisches-arbeiten (2).pdf` in Falks
Golden-Age-Design. Persönliche Einschätzungen sind als solche formuliert;
kurzlebige Benchmarkzahlen wurden nicht übernommen.

| Deck | Live-Einsatz | Folien |
| --- | --- | ---: |
| [Input](../slides/index.html?deck=input) | 08:30 · Vom Agenten zum System | 8 |
| [Drill 8](../slides/index.html?deck=drill-08) | 10:00 · Cockpit und Inbox | 4 |
| [Drill 9](../slides/index.html?deck=drill-09) | 11:30 · Leben: Mensch bearbeitet | 4 |
| [Drill 10](../slides/index.html?deck=drill-10) | 13:45 · Leben: Mensch gibt frei | 4 |
| [Drill 11](../slides/index.html?deck=drill-11) | 15:15 · Haftpflicht: Eingriffsfenster | 4 |
| [Abschluss](../slides/index.html?deck=abschluss) | 16:45 · Whiteboard, danach Beamer aus | 2 |

Nach `uv run pfefferminzia serve` den Launcher unter
<http://127.0.0.1:3004/slides/decks.html> öffnen. Alternativ
`slides/decks.html` direkt im Browser öffnen; alles funktioniert offline und
braucht **kein Node.js**. Pfeiltasten/Leertaste navigieren, `S` öffnet die
Referentenansicht mit Notizen, `F` Vollbild und `Esc` die Übersicht. Für den
PDF-Export `&print-pdf` an eine Deck-URL mit `?deck=...` anhängen und mit
Hintergrundgrafiken drucken.

Cockpit, Review und Queue auf den Folien sind **Foliendemos**. Sie lesen keine
lokalen Falldaten und lösen keine echten Freigaben oder E-Mails aus. Die
wirklichen Aktionen finden im Pfefferminzia-Cockpit statt. Der Johannes-Avatar
stammt als SVG aus Falks vorhandener Workshop-Vorlage; er steht auf Titeln
und Kapitelstarts, damit Arbeitsfolien luftig bleiben.

Die Präsentationen verwenden Falk Uebernickels
[AI-Studio-Vorlagen-Foliensatz](https://github.com/falkue/ai-studio-foliensatz)
als Basis. Reveal.js, Schriften, HSG-Logo und SVG-Comic sind in
`slides/index.html` eingebettet; die Inhalte und App-Mockups liegen in
`slides/dienstag.js` und `slides/dienstag.css`. Das HSG-Logo ist nur für die
Veranstaltung der Universität St.Gallen zu verwenden. Die übernommene
Vorlage entspricht dem Upstream-Stand `f196f78`.
