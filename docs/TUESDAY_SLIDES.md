# Präsentationen für Dienstag

Der [Deck-Launcher](../slides/decks.html) enthält zehn bewusst kurze, getrennte
Präsentationen. Im laufenden Workshop beginnt jede Session mit ihrem eigenen
Deck; die [Gesamtpräsentation](../slides/index.html?deck=gesamt) ist vor allem
für Vorbereitung und Nacharbeit gedacht. Der separate Vortrag
[„Jede Aufgabe zuerst agentisch“](../slides/index.html?deck=agentisch)
überträgt Johannes’ 35-seitige PDF `input-agentisches-arbeiten (2).pdf` als
36-Folien-Vortrag in Falks Golden-Age-Design. HLE- und METR-Folien sowie alle
15 Bildbeispiele inklusive Token-Dashboard, Produkt-Screenshots, Personas und
Council sind enthalten. Persönliche Einschätzungen und illustrative
Benchmarkreihen sind als solche gekennzeichnet; die Originalbilder lassen sich
auf der Folie zur Detailansicht öffnen.

Die Input-Folien beginnen mit Johannes' drei live gezeigten Anwendungen und
führen dann von „eigener Fork“ über Vibe Coding und MCP zu den zwei
Kontrollmustern. Die Abschlussfolie erweitert das Bild von Terminal-Prompts
auf Event- und Cron-Trigger. Die Seiten werden **live** geöffnet; die Folie
beschreibt ihren Inhalt nicht im Voraus. Der adaptive
[Lernpfad](LEARNING_PATH.md) ist die gemeinsame Grundlage für Tutor und
Folien.

Die Arbeitsauftragsfolie jedes Drills zeigt vier kurze Dialogetappen mit
einem menschlichen Stopp nach jeder Frage. Die Prompts sind Beispiele für ein
Gespräch mit Claude, **kein einzelner Copy-paste-Auftrag**. Ausführliche
Formulierungen, Handlungen und Nachweise stehen in den
[Teilnehmerkarten](DRILL_CARDS.md) und im MCP-Drill-Guide.

| Deck | Live-Einsatz | Folien |
| --- | --- | ---: |
| [Input](../slides/index.html?deck=input) | 08:30 · Live-Beispiele, Vibe Coding, MCP, Kontrolle | 10 |
| [Drill 8](../slides/index.html?deck=drill-08) | 10:00 · Cockpit und Inbox | 4 |
| [Drill 9](../slides/index.html?deck=drill-09) | 11:15 · Leben: Mensch bearbeitet | 4 |
| [Drill 10](../slides/index.html?deck=drill-10) | 13:15 · Leben: Mensch gibt frei | 4 |
| [Drill 11](../slides/index.html?deck=drill-11) | 14:30 · Haftpflicht: Eingriffsfenster | 4 |
| [Drill 12](../slides/index.html?deck=drill-12) | 15:45 · Management-Report-Auftrag | 3 |
| [Eigener Report](../slides/index.html?deck=management) | 15:45 · bearbeitbare reveal.js-/D3-Folien | 3 |
| [Abschluss](../slides/index.html?deck=abschluss) | 16:45 · Whiteboard, danach Beamer aus | 2 |

Nach `uv run pfefferminzia serve` den Launcher unter
<http://127.0.0.1:3004/slides/decks.html> öffnen. Alternativ
`slides/decks.html` direkt im Browser öffnen; die **Unterrichtsdecks**
funktionieren offline. Der eigene Report braucht für seine lokalen Daten den
Python-Server, aber ebenfalls **kein Node.js**. Pfeiltasten/Leertaste navigieren, `S` öffnet die
Referentenansicht mit Notizen, `F` Vollbild und `Esc` die Übersicht. Für den
PDF-Export `&print-pdf` an eine Deck-URL mit `?deck=...` anhängen und mit
Hintergrundgrafiken drucken.

Cockpit, Review und Queue auf den Folien sind **Foliendemos**. Sie lesen keine
lokalen Falldaten und lösen keine echten Freigaben oder E-Mails aus. Die
wirklichen Aktionen finden im Pfefferminzia-Cockpit statt. Der Johannes-Avatar
stammt als SVG aus Falks vorhandener Workshop-Vorlage; er steht auf Titeln
und Kapitelstarts, damit Arbeitsfolien luftig bleiben.

Der **eigene Management-Report** ist die Ausnahme: Er liest im
Drill-12-Checkpoint den lokalen aggregierten Snapshot über
`/api/management-report`. Für ihn muss die Python-App laufen; ohne
Checkpoint-Daten erscheint ein klarer Fehlerzustand. Die Unterrichtsdecks
bleiben offline nutzbar. reveal.js und D3 sind bereits in `slides/index.html`
eingebettet; keine Installation, kein CDN und kein Node-Build.

Die Präsentationen verwenden Falk Uebernickels
[AI-Studio-Vorlagen-Foliensatz](https://github.com/falkue/ai-studio-foliensatz)
als Basis. Reveal.js, Schriften, HSG-Logo und SVG-Comic sind in
`slides/index.html` eingebettet; die Workshop-Inhalte liegen in
`slides/dienstag.js`, der neu gesetzte Originalvortrag in
`slides/agentisch.js` und die aus der vom Nutzer bereitgestellten PDF
mechanisch extrahierten Bilder in `slides/assets/agentisch/`. Alle Bilder
bleiben lokal; beim Präsentieren wird nichts nachgeladen. HLE und METR sind
in den Referentennotizen mit Primärquellen und Messgrenzen erläutert.
Das HSG-Logo ist nur für die
Veranstaltung der Universität St.Gallen zu verwenden. Die übernommene
Vorlage entspricht dem Upstream-Stand `f196f78`.
