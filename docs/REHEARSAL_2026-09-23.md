# Generalprobe vom 23. September 2026

Diese Notiz trennt **geprüfte Software** von **noch nötiger Kursorganisation**.
Sie ist kein Nachweis für ein bereits provisioniertes 17-Personen-Setup.

## Technische Nachweise

| Probe | Ergebnis |
| --- | --- |
| `uv run pytest -q` | 30 Tests grün; eine externe Starlette-Deprecation-Warnung |
| HTTP-Drill 8–11 mit isolierter SQLite-DB und Fake-AgentMail | Inbox/Todo, menschlich editierte Lebensantwort, separate Freigabe und Ablehnung, Haftpflicht-Queue mit Auto-Send/Edit/Stopp durchgelaufen; keine Netz-Mails |
| MCP-Checkpoint-Wechsel aus aktivem Drill 8 | Vorheriger Worktree mit geänderter und unversionierter Datei blieb unverändert; Drill-9-Ziel hatte richtige `.env` **und** SQLite-Stufe; ohne Bestätigung kein Apply |
| Fehler beim Worktree-Aufbau | Teil-Worktree entfernt, Quelle und Plan erhalten; erneuter Versuch erfolgreich |
| Browser bei 1440 px und 390 px | Stufengrenzen 8–11, Fokus/Escape, Logo, Queue-Timer, Bearbeiten/Stopp und geöffneter Ticket-Drawer geprüft |
| AgentMail-Pilot mit drei Free-Tier-Inboxen | Zwei Teilnehmer-Keys sind auf jeweils ihre Inbox beschränkt; externe Drill-8-Prüfung und synthetischer Eingang klappten; aus einer Pilot-Inbox ging eine geprüfte Antwort an die Dozenten-Inbox |

Die Browser- und Fake-Mail-Proben haben **keinen externen Versand** ausgelöst.
Der Pilot-Versand war eine separate, zuvor freigegebene synthetische Probe
zwischen eigenen Workshop-Inboxen. Die konkrete Testfolge liegt in
[`tests/test_rehearsal_local.py`](../tests/test_rehearsal_local.py).

## Noch offen vor dem Kurs

- Kapazität für **16 persönliche Teilnehmer-Inboxen plus eine Dozenten-Inbox**
  bereitstellen. Der Pilot hat erst zwei Teilnehmer-Inboxen; mindestens 14
  weitere fehlen. Zwei bis drei Reserve-Inboxen benötigen zusätzliche Plätze.
- Jede neue Inbox mit eigenem inboxgebundenem Schlüssel versehen, Zugang
  individuell und sicher übergeben und `checkpoint verify --external` je
  Kombination prüfen. Organisationsschlüssel niemals austeilen.
- Exakte Dozenten-Szenarioadresse in jede Empfänger-Allowlist eintragen und
  zunächst einen Pilot-Roundtrip testen; kein Domain-Wildcard nötig.
- Sieben synthetische Szenarionachrichten pro Teilnehmer vorbereiten und
  gestaffelt senden. Drill 11 erst mit geprüfter Allowlist und bewusst
  aktiviertem `AUTO_SEND_ENABLED=true` starten.
- Claude-Sitzplätze/Tokenverbrauch und zwei bis drei genehmigte Reserve-Zugänge
  organisatorisch klären; die [Teilnehmerkarten](DRILL_CARDS.md) funktionieren
  als Offline-/Buddy-Fallback.
- Johannes spielt die freigegebene Version lokal mit **seinem** Claude Code
  und der eigenen Inbox durch und bestätigt den Go/No-Go-Stand.

## Aktualisierung eines bestehenden Klons

Die offiziellen fünf Checkpoint-Tags wurden vor dem Workshop auf die geprüfte
Version aktualisiert. Ein **frischer Clone** hat sie automatisch. Ein bereits
vorher vorhandener Klon (etwa der Dozenten-Mac) muss Hauptzweig und Tags
bewusst aktualisieren, bevor Claude einen Checkpoint lädt:

```bash
git pull --ff-only
git fetch origin --tags --force
uv sync --frozen
uv run pfefferminzia checkpoint status
```

Die Tag-Aktualisierung ändert keine lokalen Arbeitsdateien. Bei eigenem
ungecommittetem Fortschritt zuerst den eigenen Zustand ansehen; für einen
offiziellen Drill den separaten Plan-/Bestätigungs-/Worktree-Weg aus den
[Teilnehmerkarten](DRILL_CARDS.md) verwenden.
