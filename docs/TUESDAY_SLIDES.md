# Präsentationen für Dienstag

Der [Deck-Launcher](../slides/decks.html) enthält zehn Decks: Gesamtkontext, den
separaten Agentisch-Vortrag und acht kurze Session-Decks. Im laufenden Workshop beginnt jede Session mit ihrem eigenen
Deck; die [Gesamtpräsentation](../slides/index.html?deck=gesamt) ist vor allem
für Vorbereitung und Nacharbeit gedacht. Der separate Vortrag
[„Jede Aufgabe zuerst agentisch“](../slides/index.html?deck=agentisch)
überträgt Johannes’ 35-seitige PDF `input-agentisches-arbeiten (2).pdf` als
35-Folien-Vortrag in Falks Golden-Age-Design. HLE- und METR-Folien sowie alle
14 Bildbeispiele inklusive Token-Dashboard, Produkt-Screenshots, Personas und
Council sind enthalten. Persönliche Einschätzungen sind als solche
gekennzeichnet; die Originalbilder lassen sich auf der Folie zur
Detailansicht öffnen.

Die Input-Folien beginnen mit Johannes' drei live gezeigten Anwendungen und
führen dann über Vibe Coding und MCP zu den zwei Kontrollmustern. Das
Drill-6-Deck enthält die Startfolie mit dem genauen Satz an Claude. Die
Abschlussfolien erweitern das Bild von Terminal-Prompts auf Event- und
Cron-Trigger (Moderationsnotizen im Runbook). Die Seiten werden **live** geöffnet; die Folie
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
| [Input](../slides/index.html?deck=input) | 08:30 · Live-Beispiele, Vibe Coding, MCP, Kontrolle | 9 |
| [Drill 6](../slides/index.html?deck=drill-06) | 10:00 · Zeitplan, Start-Satz, Teilnehmende mit Schlüsselanfang, Cockpit | 7 |
| [Drill 7](../slides/index.html?deck=drill-07) | 11:15 · Zeitplan, Rückblick 6, Bestand | 6 |
| [Drill 8](../slides/index.html?deck=drill-08) | 13:15 · Zeitplan, Rückblick 7, Leistungsentscheidung | 6 |
| [Drill 9](../slides/index.html?deck=drill-09) | 14:30 · Zeitplan, Rückblick 8, Eingriffsfenster | 6 |
| [Drill 10](../slides/index.html?deck=drill-10) | 15:45 · Zeitplan, Rückblick 9, Video und Vorstand | 5 |
| [Vorstandspräsentation](../slides/vorstand.html) | 15:45 · eigene Präsentation im Pfefferminzia-Look mit Video-Folie | frei |
| [Abschluss](../slides/index.html?deck=abschluss) | 16:45 · Zeitplan, Whiteboard, danach Beamer aus | 3 |
| [Teilnehmende](../slides/index.html?deck=teilnehmende) | jederzeit · Vornamen und Schlüsselanfang (nur Dozentenrechner) | 1 |

Nach `uv run pfefferminzia serve` den Launcher unter
<http://127.0.0.1:3004/slides/decks.html> öffnen. Alternativ
`slides/decks.html` direkt im Browser öffnen; die **Unterrichtsdecks**
funktionieren offline. Der eigene Report braucht für seine lokalen Daten den
Python-Server, aber ebenfalls **kein Node.js**. Pfeiltasten/Leertaste navigieren, `S` öffnet die
Referentenansicht mit Notizen, `F` Vollbild und `Esc` die Übersicht. Für den
PDF-Export `&print-pdf` an eine Deck-URL mit `?deck=...` anhängen und mit
Hintergrundgrafiken drucken.

Die Folien sind bewusst knapp: je eine starke Zeile. Was du dazu sagst,
steht in den **Notizen** (`S` öffnet die Referentenansicht). Jeder Drill beginnt
mit dem Zeitplan (Tag + Minuten dieser Stunde), ab Drill 7 mit einem kurzen
Rückblick auf den vorigen Drill. Die Bildschirmfotos sind echte Ausschnitte
der Kommandozentrale im jeweiligen Stand.

Die Folie **Teilnehmende** liest Vornamen und den Schlüsselanfang zur Laufzeit
aus `.instructor/roster.csv` (Endpunkt `/api/instructor/roster`, nur auf dem
Dozentenrechner). Sie funktioniert nur, wenn die Folien über die
Kommandozentrale geöffnet sind (<http://127.0.0.1:3004/slides/…>); im Repo
steht nichts davon. Der Johannes-Avatar steht auf Titeln und Kapitelstarts.

Die **eigene Vorstandspräsentation** (`slides/vorstand.html`) ist die
Ausnahme: Sie hat bewusst den Pfefferminzia-Look statt unseres Kursdesigns,
liest im Drill-10-Stand die gezählten Werte über `/api/management-report` und
zeigt das Remotion-Video der Person (`slides/video/`). D3 liegt lokal in
`slides/assets/`; kein CDN. Node braucht nur das Videoprojekt, außerhalb des
Repos.

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
