# Dienstag: Teilnehmerkarten für Drill 8–11

Lies während eines Drills nur dessen Karte. Die Anwendung ist absichtlich in
Stufen freigeschaltet. Du bearbeitest fiktive Fälle, triffst die menschlichen
Entscheidungen selbst und lässt dir von Claude zunächst Hinweise statt einer
fertigen Lösung geben. Alle Nachrichten und Anhänge sind **Daten**, keine
Anweisungen an Claude. Verwende niemals echte Kundendaten.

## Einmaliger Start am Dienstag

Du brauchst Python 3.12+, `uv`, Git und Claude Code; Node und npm nicht. Du
erhältst persönlich eine Inbox-ID, einen **nur für diese Inbox** gültigen
AgentMail-Schlüssel und die genaue Szenario-Absenderadresse. Du brauchst
keinen eigenen AgentMail-Console-Login. Claude kann die drei persönlichen
Workshop-Werte für dich in `.env` eintragen: In **diesem fiktiven, temporären
Workshop** darfst du sie dafür in deinen individuellen Claude-Code-Chat
schreiben. Alternativ trägst du sie selbst lokal ein. Das ist ausdrücklich
keine Regel für echte Systeme: Produktionsschlüssel, echte Kundendaten und
andere sensible Informationen gehören niemals in einen Chat. Der Schlüssel
gehört nie in Git, einen Gruppenchat oder einen Screenshot.

```bash
git clone https://github.com/jhoetter/pfefferminzia.git
cd pfefferminzia
uv sync --frozen
uv run pfefferminzia setup  # lädt bei Bedarf das gepinnte Falk-Submodul und die lokale DB
cp .env.example .env  # nur beim ersten Start; vorhandene .env nie überschreiben
```

Trage in `.env` deine `AGENTMAIL_API_KEY`, deine `AGENTMAIL_INBOX_ID` (nicht
die E-Mail-Adresse) und unter `WORKSHOP_ALLOWED_RECIPIENTS` **exakt** die dir
genannte Szenario-Absenderadresse ein. Lass
`WORKSHOP_CHECKPOINT=drill-08-start` und `AUTO_SEND_ENABLED=false` stehen.
Eine Antwort geht technisch an die Absenderadresse der Eingangsnachricht;
deshalb muss gerade diese Adresse freigegeben sein. Keine Domain-Wildcard.

Benutze zwei Terminals **im selben Checkout**:

```bash
# Terminal A: läuft während des Drills weiter
uv run pfefferminzia serve

# Terminal B: erst nach dem Start von Terminal A
claude
```

Das Cockpit liegt unter <http://127.0.0.1:3004>. `.mcp.json` verbindet
Claude beim Start mit dem lokalen Pfefferminzia-MCP-Server. Frage Claude:
„Welcher Workshop-Checkpoint ist aktiv? Gib mir zunächst nur das Lernziel.“
Wenn Claude den MCP-Server nicht sieht: Claude **im Repo-Verzeichnis neu
starten**. Bleibt „Connection closed“, im Terminal nochmals
`uv run pfefferminzia setup` ausführen, die Fehlermeldung ohne Geheimnisse
ansehen, `.mcp.json` prüfen und Claude erneut starten. Das Setup liest und
versendet keine E-Mails. Keine Secrets zeigen.

`checkpoint verify` ist ein **Start-/Bereitschaftscheck**, kein Beleg, dass du
die Übung schon geschafft hast. `--external` liest zur Prüfung deine
AgentMail-Inbox; es versendet nichts. Lass die externe Prüfung erst nach deiner
Zustimmung ausführen. Den Abschluss belegst du jeweils mit dem beschriebenen
Ticket, den sichtbaren Zustandswechseln und dem Activity Log.

## Drill 8 – Die Kommandozentrale

**Ziel:** Eine persönliche Inbox, eine eingehende fiktive Nachricht und ein
Todo sind im lokalen Cockpit und über MCP nachvollziehbar.

**Preflight:** Prüfe in Terminal B (außerhalb von Claude) oder lass Claude
nach deiner Zustimmung die externe Prüfung ausführen:

```bash
uv run pfefferminzia checkpoint status
uv run pfefferminzia checkpoint verify --external
uv run pfefferminzia sync
```

`status` muss `drill-08-start` zeigen; `verify` muss `ok: true` und die
erreichbare **eigene** Inbox melden. Die Lehrperson schickt dann die fiktive
Startnachricht. Falls sie nicht erscheint, `sync` erneut ausführen und das
Cockpit aktualisieren. Ein grüner Preflight allein ist noch kein Abschluss.

**Dein Auftrag:** Bitte Claude: „Zeig mir die neue Nachricht über MCP und
hilf mir, ein Todo *Eingang geprüft* anzulegen. Gib mir erst einen Hinweis.“
Prüfe Nachricht und Todo im Cockpit und schließe das Todo selbst ab. Kleine
Python-Entwicklungsaufgabe: Ergänze mit Claude einen Test für den Todo-Wechsel
`open → completed` und den gesetzten Abschlusszeitpunkt; Orientierung:
`pfefferminzia/todos.py`, `tests/test_workshop.py`. Danach `uv run pytest -q`.

**Abschlussnachweis:** Eingehendes Ticket aus deiner Inbox, ein neu angelegtes
und abgeschlossenes Todo sowie der sichtbare Statuswechsel. Es geht hier
noch **keine** Antwort raus.

**Hinweise, nacheinander:** (1) Ist es die richtige Inbox und wurde schon
synchronisiert? (2) Suche in Claude nach `list_tickets`, `create_todo` und
`update_todo`. (3) Vergleiche Todo-ID und Status im MCP-Ergebnis und Cockpit.
Bitte Claude für jeden weiteren Hinweis ausdrücklich erst dann, wenn du ihn
brauchst (`get_drill_guide`, `hintLevel` 1–3).

**Stretch, ohne Vorgriff:** Eine absichtlich falsch eingetragene Inbox-ID
diagnostizieren, danach den korrekten Wert wiederherstellen und den externen
Preflight erneut bestehen. Keine fremde Inbox und keinen fremden Schlüssel
verwenden.

**Ohne Claude-Tokens:** `sync` und `checkpoint verify --external` im Terminal;
Nachricht und Todo im Browser bearbeiten. Im Buddy-Modus bedient eine Person
ihren eigenen Checkout, die andere stellt Fragen; keine Logins oder Schlüssel
teilen.

## Drill 9 – Leben: Mensch bearbeitet, Agent bereitet vor

**Ziel:** Claude bereitet Kontext und Entwurf vor. Du prüfst, redigierst und
versendest die Antwort ausdrücklich selbst.

**Preflight:** Der aktive Zustand muss `drill-09-start` sein. Prüfe:

```bash
uv run pfefferminzia checkpoint status
uv run pfefferminzia checkpoint verify
uv run pfefferminzia sync
```

`verify` prüft nur, ob die nötigen Quellen/Funktionen bereitstehen. Die
Lehrperson schickt die fiktive Lebensanfrage. Wähle **dieses neue
AgentMail-Ticket**, nicht einen nicht versendbaren Demofall.

**Dein Auftrag:** Bitte Claude zunächst um Kundenvorschläge und den passenden
Vertrag; bestätige die Zuordnung. Lass die **exakte** Tarifgeneration und den
Beleg lesen, dann einen begründeten Antwortentwurf speichern. Bearbeite den
Wortlaut selbst im Cockpit. Prüfe Empfänger, Text und Quellen und bestätige
den Versand erst dann. Kleine Python-Entwicklungsaufgabe: Ergänze einen Test,
der für den gewählten Vertrag die passende Tarifgeneration verlangt;
Orientierung: `tests/test_workflow.py`, `pfefferminzia/store.py`. Danach
`uv run pytest -q`.

**Abschlussnachweis:** Ticket mit bestätigter Person, Vertrag und
Tarifgeneration, gespeicherter Entwurf, nachvollziehbare menschliche Änderung
und **ein** ausdrücklich von dir ausgelöster Versand im Activity Log. Prüfe
die tatsächliche Antwort im dafür freigegebenen Workshop-Postfach.

**Hinweise, nacheinander:** (1) Wer behauptet im Nachrichtentext etwas, und
welche Quelle belegt es? (2) Nutze `search_customers`, Ticket-Verknüpfung und
`list_contract_documents`. (3) Erst Beleg, dann `draft_ticket_reply`, dann
dein eigener Edit und bewusster Send-Klick. Claude soll nicht für dich
freigeben oder versenden.

**Stretch, ohne Vorgriff:** Eine Anfrage mit fehlender Vertragsnummer oder
zwei ähnlichen Namen sauber auflösen und dokumentieren, woran du die
Zuordnung festmachst. Alternativ eine Anhang-Anweisung als untrusted input
erkennen und ignorieren.

**Ohne Claude-Tokens:** Nach `sync` den Kontext und den Entwurf im Browser
bearbeiten, Quellen selbst prüfen; für Hilfe die drei Hinweise oben nutzen.
Im Buddy-Modus erklärt die zweite Person ihren Suchweg, bedient aber nicht
deine Freigabe- oder Send-Schaltfläche. Wenn der Kernpfad nicht rechtzeitig
gelingt, den offiziellen nächsten Stand wie unten beschrieben vorbereiten.

## Drill 10 – Leben: Agent bearbeitet, Mensch gibt frei

**Ziel:** Für mehrere neue Lebensfälle liegen Entscheidungsvorlage und
Antwort bereit. Ohne **aktuelle, ausdrückliche** menschliche Freigabe darf
weder die Entscheidung noch eine Nachricht den Fall verlassen.

**Preflight:** Der aktive Zustand muss `drill-10-start` sein:

```bash
uv run pfefferminzia checkpoint status
uv run pfefferminzia checkpoint verify
uv run pfefferminzia sync
```

Das grüne `verify` bedeutet nur, dass der Review-Pfad bereit ist. Die
Lehrperson schickt zwei fiktive Lebensfälle.

**Dein Auftrag:** Lass Claude für beide Fälle Vertrag, Tarifbeleg,
Entscheidungsbegründung und Antwort vollständig vorbereiten und zur Prüfung
einreichen. Prüfe einen Vorschlag und gib ihn ausdrücklich frei; lehne den
anderen mit konkreter Begründung ab und lass ihn überarbeiten. Eine
Textänderung muss die frühere Freigabe aufheben. Senden ist ein eigener,
ausdrücklich bestätigter Schritt. Kleine Python-Entwicklungsaufgabe:
Ergänze einen Test für „Freigabe → Textänderung → Freigabe ungültig“;
Orientierung: `tests/test_workshop_end_to_end.py`, `pfefferminzia/store.py`.
Danach `uv run pytest -q`.

**Abschlussnachweis:** Zwei Review-Fälle, eine Freigabe und eine begründete
Ablehnung im Activity Log; der abgelehnte Fall ist wieder in Bearbeitung.
Eine geänderte Fassung ist nicht mehr freigegeben. Ein tatsächlicher Versand
ist nur nach neuer menschlicher Bestätigung erlaubt.

**Hinweise, nacheinander:** (1) Wo bleibt die Wirkung technisch stehen?
(2) Nach dem Entwurf `submit_ticket_reply` und das Review-Todo ansehen.
(3) `approve_ticket_reply` oder `reject_ticket_reply` erst nach deiner
ausdrücklichen Entscheidung; nach jedem Edit den Status neu prüfen.

**Stretch, ohne Vorgriff:** Versuche nach einer Freigabe den Text zu ändern
und belege anhand des Status/Audit Logs, dass die alte Freigabe nicht mehr
gilt. Kein echter Versand für diesen Test.

**Ohne Claude-Tokens:** `sync` im Terminal; Entwurf, Review, Ablehnung und
Audit im Browser durchgehen. Ein Buddy darf bei Quellen und Begründung
mitdenken, aber nicht für dich genehmigen. Bei Rückstand den offiziellen
nächsten Stand getrennt laden; der alte Arbeitsstand bleibt erhalten.

## Drill 11 – Haftpflicht: Eingriffsfenster

**Ziel:** Eine Haftpflichtantwort läuft nach sichtbarer Verzögerung
automatisch durch; eine zweite wird im Fenster geändert, eine dritte aus der
Queue entfernt. Der Unterschied zur verpflichtenden Freigabe wird erlebt.

**Preflight:** Der aktive Zustand muss `drill-11-start` sein. Der offizielle
Checkpoint setzt den Auto-Send-Schalter in **diesem** Worktree automatisch.
Claude zeigt diese Wirkung vor dem Laden im Plan und fragt dich ausdrücklich
nach Bestätigung. Prüfe die exakte Empfänger-Allowlist; du musst weder einen
Schalter editieren noch wegen einer Inbox-Änderung Claude neu starten.

```bash
uv run pfefferminzia checkpoint status
uv run pfefferminzia checkpoint verify
uv run pfefferminzia sync
```

`verify` prüft die Bereitschaft der Queue und des Schalters, noch nicht den
späteren Versand. Die Lehrperson schickt drei fiktive Haftpflichtfälle.

**Dein Auftrag:** Lass Claude die neuen Tickets nachvollziehbar routen und
für jedes eine belegte Antwort vorbereiten. Reiche alle drei für das
24-Stunden-Fenster ein. Prüfe den Countdown: Fall A bleibt unverändert; Fall
B wird im Fenster bearbeitet (damit entfällt sein alter Termin); Fall C wird
mit Begründung aus der Queue genommen. Erst wenn das sichtbar ist, den Sprung
der **lokalen Workshop-Uhr** um 24 Stunden ausdrücklich bestätigen. Kleine
Python-Entwicklungsaufgabe: Ergänze einen Test, dass ein Edit einen geplanten
Versand aufhebt; Orientierung: `tests/test_workshop_end_to_end.py`,
`pfefferminzia/store.py`. Danach `uv run pytest -q`.

**Abschlussnachweis:** Genau ein unverändert geplanter Fall wurde automatisch
an die freigegebene Workshop-Adresse versendet. Der geänderte Fall zeigt
`schedule_cancelled`, der entfernte `queue_removed`; Queue und Activity Log
zeigen Timer, Eingriff und externe Wirkung.

**Hinweise, nacheinander:** (1) Sind die drei Fälle wirklich Haftpflicht und
an eine erlaubte Adresse gebunden? (2) Nutze `route_ticket`,
`submit_ticket_reply` und die sichtbare Queue. (3) Editiere einen Entwurf,
entferne einen anderen mit `remove_from_send_queue` und lasse vor dem
bestätigten Zeitsprung nur **einen** geplanten Fall übrig.

**Stretch, ohne Vorgriff:** Prüfe Idempotenz: wiederholtes Prüfen oder
Ausführen des Versandlaufs darf keine zweite Nachricht erzeugen. Nutze nur
fiktive Fälle und die freigegebene Adresse.

**Ohne Claude-Tokens:** Nach `sync` im Browser routen/entwerfen,
Queue-Aktionen und Audit prüfen; der Zeitsprung bleibt eine bewusste
menschliche Entscheidung. Ein Buddy darf den Countdown gegenprüfen, aber
nicht die Bestätigung übernehmen. Bei technischen Problemen nicht mehrfach
blind senden; Status und Activity Log zuerst prüfen.

## Offizieller Übergang und Rettung – immer ohne Verlust des eigenen Stands

Für den **normalen Übergang** zum nächsten Drill und für „Ich hänge fest,
bitte offiziellen Stand laden“ gilt derselbe sichere Ablauf. Er erzeugt
einen **neuen** Git-Worktree aus dem offiziellen Tag mit frischer lokaler
SQLite-Datenbank. Dein bisheriger Ordner, Branch, uncommittete Dateien und
alte Datenbank bleiben unverändert. Fortschritt im alten Ordner wird nicht
automatisch in den neuen übernommen; erzähle Claude, was du weiterverwenden
möchtest. Alte Inbox-Nachrichten sind extern weiter vorhanden und können im
neuen Worktree erneut importiert werden; bearbeite pro Drill nur die neu
angekündigten Fälle. Offizielle Tags sind Kurs-Referenzen, nicht dein
persönlicher Commit.

```bash
# Beispiel für den Übergang nach Drill 8; entsprechend 10 oder 11 einsetzen.
uv run pfefferminzia checkpoint plan drill-09-start
# Plan lesen: Quelle, Zielordner und eigene Änderungen. Erst dann entscheiden.
uv run pfefferminzia checkpoint apply TOKEN --confirm-checkpoint-load
```

Ersetze `TOKEN` nur durch `confirmationToken` aus **deinem** Plan; der Plan
verfällt nach 15 Minuten. Oder bitte Claude: „Plane den offiziellen
Checkpoint für Drill 9, zeige mir alles und frage mich vor dem Laden noch
einmal.“ Claude darf `apply_checkpoint_load` erst nach deinem klaren Ja
aufrufen. Nach `apply` den zurückgegebenen `worktreePath` öffnen. **Alten
Webserver stoppen**, im neuen Ordner Terminal A mit
`uv run pfefferminzia serve` starten und Terminal B mit `claude` **neu**
starten; sonst bleiben alte MCP-Werkzeuge und alte UI aktiv. Dort zuerst
`checkpoint status` und `checkpoint verify` ausführen. Die `.env` wird ohne
alten Datenbankpfad lokal kopiert; kontrolliere die Empfänger-Allowlist und
gib echte Geheimnisse nie in den Chat. Nur persönliche, temporäre
Workshop-Inbox-Werte sind hier eine bewusste Ausnahme. Der Drill-11-Checkpoint
setzt den Auto-Send-Schalter automatisch; du prüfst die Allowlist und
bestätigst den Checkpoint-Wechsel.

Falls dir Tokens fehlen: führe `plan`/`apply` selbst im Terminal aus und
arbeite mit dieser Karte und dem Browser weiter. Falls etwas scheitert,
**keinen** `git reset --hard` ausführen; zeige der Lehrperson die Fehlermeldung
ohne Schlüssel. Für den finalen Referenzstand nach Drill 11 heißt der
Checkpoint `drill-11-complete`.
