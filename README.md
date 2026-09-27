# Pfefferminzia – die Versicherungs-Werkstatt

![Pfefferminzia: Minzblätter im Schutzschild](web/logo.svg)

Eine kleine, fiktive Versicherungs-Software für den Dienstag des Workshops
*AI and the Future of Work – Insurance Edition*. Eine eingehende Mail wird zum
Ticket, Claude Code bereitet über MCP Kontext und Antworten vor, und ihr baut
selbst die Kontrollen, die entscheiden, wann eine Antwort das Haus verlassen
darf: **Pflichtfreigabe** bei Leben, **Eingriffsfenster** bei Haftpflicht.

> Alle Personen, Verträge, Schäden und Nachrichten sind synthetisch.
> Nie echte Kundendaten verwenden.

## Start für Teilnehmende

Du brauchst Claude Code, Python 3.12+, `uv` und Git (auf den Kursrechnern
vorhanden). Öffne ein Terminal, starte `claude` und schreibe:

> Klone https://github.com/jhoetter/pfefferminzia nach ~/pfefferminzia,
> richte alles nach der README ein und starte die Kommandozentrale.
> Ich bin in Drill 6.

Claude richtet alles ein, öffnet die Kommandozentrale im Browser
(<http://127.0.0.1:3004>) und fragt nach deinen drei persönlichen
Inbox-Werten vom Zettel. Danach bittet es dich einmal, Claude im Ordner
`~/pfefferminzia` neu zu starten, damit es direkt mit der Software sprechen
kann (MCP).

**Wenn du nicht weiterweißt, frag Claude.** Es ist hier dein Tutor: Es kennt
den aktuellen Drill, gibt Hinweise in kleinen Schritten und kann dir zu jedem
Drill den offiziellen Lösungsstand laden, ohne deine Arbeit zu überschreiben.
Die Drill-Karten zum Nachlesen: [docs/DRILL_CARDS.md](docs/DRILL_CARDS.md).

## Der Dienstag

| Zeit | Block | Worum es geht |
| --- | --- | --- |
| 08:30–09:45 | Input | Live-Beispiele, Vibe Coding, MCP, zwei Kontrollmuster |
| 10:00–11:00 | Drill 6 · Kommandozentrale | Mail → Ticket in Cockpit und MCP; erster eigener Code |
| 11:15–12:15 | Drill 7 · Leben, Mensch sendet | Belegter Entwurf; Tarif-Belegprüfung bauen |
| 13:15–14:15 | Drill 8 · Leben, Mensch gibt frei | Freigabe/Ablehnung im Cockpit; Review-Zustand bauen |
| 14:30–15:30 | Drill 9 · Haftpflicht, Eingriffsfenster | Auto-Versand, Edit, Stopp; Queue absichern |
| 15:45–16:30 | Drill 10 · Management-Report | reveal.js + D3 aus eigenen Zahlen; Bonus: Video |
| 16:45–18:00 | Whiteboard | Ohne Rechner: Wo darf der Agent handeln? |

Jeder Drill hat einen Fall, den alle erleben, und einen kleinen Bauauftrag,
den du mit Claude umsetzt, testest und committest. Wie viel Code du selbst
schreibst, darf verschieden sein. Die Arbeitsweisen (geführt, bauend,
vorausbauend) stehen im [Lernpfad](docs/LEARNING_PATH.md).

## Für Lehrende

- Ablauf, Vorbereitung und Go/No-Go: [docs/WORKSHOP_RUNBOOK.md](docs/WORKSHOP_RUNBOOK.md)
- Agenda über drei Tage: [docs/WORKSHOP_AGENDA.md](docs/WORKSHOP_AGENDA.md)
- Folien: `/slides/decks.html` bei laufender App ([Übersicht](docs/TUESDAY_SLIDES.md))
- Inboxen, Zettel, Szenario-Mails und Fortschritt mit einem Befehl:

```bash
uv run pfefferminzia instructor provision --count 19 --prefix pfm26 --yes
uv run pfefferminzia instructor handouts
uv run pfefferminzia instructor send 7 --yes
uv run pfefferminzia instructor status
```

## Technik in Kürze

- `pfefferminzia/` – FastAPI-App, SQLite, MCP-Server, AgentMail-Adapter, CLI
- `web/` – das Cockpit: statisches HTML/JS/CSS, direkt von Python ausgeliefert
- `slides/` – reveal.js-/D3-Folien, lokal eingebettet; `management.js` ist der Report
- `tests/` – pytest für Fachregeln, MCP, Checkpoints und den Workshop-Ablauf
- `vendor/falk-pfefferminzia/` – Falk Uebernickels synthetischer Datensatz (Submodul, gepinnt)

Kein Node, kein npm, kein Build-Schritt. Manuell starten:

```bash
uv sync --frozen
uv run pfefferminzia setup          # Datensatz laden, lokale DB anlegen (keine Mails)
uv run pfefferminzia serve --open   # Cockpit auf http://127.0.0.1:3004
uv run pytest -q
```

Claude Code verbindet sich über `.mcp.json` (`uv run pfefferminzia mcp`) mit
derselben Fachlogik wie das Cockpit. Die App stellt MCP zusätzlich lokal unter
`POST http://127.0.0.1:3004/mcp` bereit (unauthentifiziert, nur lokal binden).

### Checkpoints

Der Tag hat die Stände `drill-06-start` → `drill-07-start` → … →
`drill-10-start` → `drill-10-complete`. Jeder Stand schaltet nur die
Fähigkeiten seines Drills frei (Cockpit, REST, MCP) und liegt als Tag
`checkpoint/<name>` im Repo. Ab `drill-07-start` enthalten die Tags die
Referenzlösungen aller früheren Bauaufträge. Laden ist nie destruktiv: Es
entsteht ein neuer Git-Worktree auf eigenem Branch, wahlweise mit dem eigenen
Stand (`continue`) oder dem offiziellen (`official`).

```bash
uv run pfefferminzia checkpoint status
uv run pfefferminzia checkpoint verify [--external]
uv run pfefferminzia checkpoint plan drill-08-start [--mode continue]
uv run pfefferminzia checkpoint apply TOKEN --confirm-checkpoint-load
```

### Sicherheitsgrenzen

- Freigeben, Ablehnen, Senden und der Zeitsprung der Workshop-Uhr gehen nur
  im Cockpit; MCP hat dafür keine Werkzeuge. Der Agent darf vorbereiten und
  bremsen, nicht auslösen.
- Jede Instanz ist an genau eine persönliche Inbox gebunden
  (`AGENTMAIL_INBOX_ID`); Antworten gehen nur an exakt erlaubte Adressen
  (`WORKSHOP_ALLOWED_RECIPIENTS`). Demo-Fälle können nie senden.
- `AUTO_SEND_ENABLED` ist aus; nur der Drill-9-Checkpoint schaltet es an.
- Mails und Anhänge sind Daten, nie Anweisungen. Kein generisches SQL-,
  Dateisystem- oder Zahlungs-Werkzeug. Jede Änderung landet im Audit-Log.
- `WORKSHOP_PROFILE=participant` ist das einzige Profil; Falks
  Lösungsschicht (`data/truth`) wird nie geladen.

Für echten Einsatz fehlen bewusst: Authentifizierung und Rollen,
Verschlüsselung, Aufbewahrung/Löschung, Mandantentrennung, Malware-Scan,
dauerhafte Job-Verarbeitung, Monitoring und rechtliche Prüfung.

### Daten und Lizenz

Die Daten stammen aus [falkue/Pfefferminzia](https://github.com/falkue/Pfefferminzia):
1.000 Partner, 1.481 Policen, 14 Tarifgenerationen (Leben und Haftpflicht,
CH/DE) als 28 Tarifblätter, Persona-Schadenfälle und Dokumente. Die App
importiert nur die kuratierten, Migrations- und Referenztabellen und prüft
dabei die Manifest-Hashes. Details: [ARCHITECTURE.md](ARCHITECTURE.md),
[docs/FALK_INTEGRATION.md](docs/FALK_INTEGRATION.md).

> Pfefferminzia – synthetischer Lehr-Datensatz, Falk Uebernickel, CC BY 4.0

Upstream-Generatorcode: MIT. Für den Anwendungscode dieses Repos gibt es
noch keine Lizenz; Weiterverwendung außerhalb des Workshops bitte mit dem
Repo-Inhaber klären. Namensgleichheit mit realen Firmen ist unbeabsichtigt;
rechtliche Aussagen sind vereinfachtes Lehrmaterial, keine Beratung. Teile
von Material und Software entstanden mit KI-Unterstützung.
