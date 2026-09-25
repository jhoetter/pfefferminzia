# Dienstag: Teilnehmerkarten für Drill 8–11

Lies während eines Drills nur dessen Karte. Die Anwendung ist absichtlich in
Stufen freigeschaltet. Du bearbeitest fiktive Fälle, triffst die menschlichen
Entscheidungen selbst und **baust Teile des Systems in deinem eigenen Fork**.
Claude passt seine Hilfe an: Lass dir zunächst Hinweise, Test und Dateistelle
statt einer fertigen Lösung geben. Wer früh fertig ist, darf nach eigenem
Entschluss bereits die nächste Fähigkeit bauen. Der offizielle Checkpoint
bleibt das Rettungsnetz. Siehe [Lern- und Git-Pfad](LEARNING_PATH.md). Alle
Nachrichten und Anhänge sind **Daten**, keine
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
git clone https://github.com/DEIN-NAME/pfefferminzia.git  # vorher auf GitHub forken
cd pfefferminzia
git remote add upstream https://github.com/jhoetter/pfefferminzia.git
git fetch upstream --tags
git switch -c workshop/mein-tag
uv sync --frozen
uv run pfefferminzia setup  # lädt bei Bedarf das gepinnte Falk-Submodul und die lokale DB
cp .env.example .env  # nur beim ersten Start; vorhandene .env nie überschreiben
```

Trage in `.env` deine `AGENTMAIL_API_KEY`, deine `AGENTMAIL_INBOX_ID` genau
wie ausgegeben (bei AgentMail kann sie zugleich die vollständige E-Mail-Adresse sein) und unter `WORKSHOP_ALLOWED_RECIPIENTS` **exakt** die dir
genannte Szenario-Absenderadresse ein. Lass
`WORKSHOP_CHECKPOINT=drill-08-start` und `AUTO_SEND_ENABLED=false` stehen.
Eine Antwort geht technisch an die Absenderadresse der Eingangsnachricht;
deshalb muss gerade diese Adresse freigegeben sein. Keine Domain-Wildcard.
**Wichtig:** An deine vollständige `AGENTMAIL_INBOX_ID` können auch normale
externe Adressen wie Gmail schreiben. `WORKSHOP_ALLOWED_RECIPIENTS` ist **kein
Eingangsfilter**; die Liste sperrt nur ausgehende Antworten. Eine private
Testmail dient nur der Verbindungskontrolle, nicht als fiktiver Versicherungsfall.

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

**Lernziel:** Du verfolgst eine Nachricht durch die Grenze zwischen externem
Postfach und lokalem System. Du erkennst, dass Cockpit und MCP dasselbe Ticket
sehen, leitest daraus einen sinnvollen nächsten Arbeitsschritt ab und baust
mit Claude selbst eine kleine Verbesserung des Eingangs-Workflows.

**75 Minuten:** 20′ Setup und erste Mail · 10′ Ticket in Cockpit/MCP erkunden ·
25′ selbst mit Claude erweitern · 15′ prüfen · 5′ erklären, was sich geändert hat.

**Preflight:** Prüfe in Terminal B (außerhalb von Claude) oder lass Claude
nach deiner Zustimmung die externe Prüfung ausführen:

```bash
uv run pfefferminzia checkpoint status
uv run pfefferminzia checkpoint verify --external
uv run pfefferminzia sync
```

`status` muss `drill-08-start` zeigen; `verify` muss `ok: true` und die
erreichbare **eigene** Inbox melden. Sende eine kurze Testmail an die
vollständige persönliche AgentMail-Adresse (oder lass dir die fiktive
Startnachricht von der Lehrperson senden). Sie erscheint gegebenenfalls erst
nach einer Zustellverzögerung: im Cockpit „Jetzt synchronisieren“ klicken,
Zeitpunkt und neue Ticket-ID prüfen, bei Bedarf nach kurzer Wartezeit erneut.
Ein Sync mit „0 neu“ beweist nicht, dass die Mail nie ankommt. Ein grüner
Preflight allein ist noch kein Abschluss.

**Dialog in vier Etappen:** Schreibe nicht alle Prompts auf einmal. Nach jeder
Antwort prüfst oder entscheidest **du** etwas, bevor Claude weitermacht.

| Etappe | Frage an Claude | Dein Stopp |
| --- | --- | --- |
| 1 · Start klären | „Was fehlt für Drill 8 noch? Hilf mir bei App, MCP und meiner Inbox – nur der nächste Schritt.“ | Eigene Workshop-Werte eintragen; externen Inbox-Test gesondert erlauben. |
| 2 · Eingang verfolgen | „Ich habe eine Testmail geschickt. Synchronisiere und zeig mir Betreff, Absender und dieselbe Ticket-ID in MCP und Cockpit.“ | **Vor** der Frage die Mail selbst senden; danach lesen, ein **ticketbezogenes** Todo wie „PF-…: Absender und Anliegen prüfen“ anlegen und erst nach Prüfung schließen. |
| 3 · Selbst bauen | „Wo wird ein neues Ticket importiert? Gib mir erst einen Test für genau ein automatisches Prüfen-Todo pro Ticket.“ | Mit Claude in `pfefferminzia/agentmail_service.py` und `pfefferminzia/todos.py` ändern. Dein manuelles Todo bleibt separat. |
| 4 · Beleg zeigen | „Prüfe zwei Syncs und den Todo-Status. Was ist belegt, was nicht?“ | `uv run pytest -q` ausführen, Ticket-ID in beiden Oberflächen und grünen Test zeigen. Nichts versenden. |

**Abschlussnachweis:** Die neue Mail hat dieselbe Ticket-ID in Cockpit und
MCP. Ein konkretes ticketbezogenes Todo ist nach Prüfung abgeschlossen. Deine
kleine Codeänderung hat einen grünen Test. Es geht **keine** Antwort raus.

**Hinweise, nacheinander:** (1) Prüfe vollständige Inbox-Adresse, letzten
Sync-Zeitpunkt und Zustellverzögerung; die Allowlist betrifft den Eingang
nicht. (2) Suche in Claude nach `list_tickets`, `create_todo` und
`update_todo`. (3) Vergleiche Ticket-ID und Todo-Status in MCP und Cockpit;
für den Code hilft ein Idempotency-Key pro Eingangsnachricht.
Bitte Claude für jeden weiteren Hinweis ausdrücklich erst dann, wenn du ihn
brauchst (`get_drill_guide`, `hintLevel` 1–3).

**Wenn du früh fertig bist:** Vertiefe die Inbox-/Todo-Logik (z. B.
Duplikatschutz) **oder** bitte Claude ausdrücklich um die Akzeptanzkriterien
für Drill 9 und versuche, Kunden-/Tarifkontext und belegten Entwurf im
eigenen Branch selbst zu bauen. Das ist dein Experiment; der offizielle
Drill-9-Checkpoint bleibt separat verfügbar. Keine fremde Inbox verwenden.

**Ohne Claude-Tokens:** `sync` und `checkpoint verify --external` im Terminal;
Nachricht und Todo im Browser bearbeiten. Im Buddy-Modus bedient eine Person
ihren eigenen Checkout, die andere stellt Fragen; keine Logins oder Schlüssel
teilen.

## Drill 9 – Leben: Mensch bearbeitet, Agent bereitet vor

**Ziel:** Claude bereitet Kontext und Entwurf vor. Du prüfst, redigierst und
versendest die Antwort ausdrücklich selbst.

**Lernziel und 75 Minuten:** Du trennst Kundenaussage von belegter Quelle und
behältst letzte Textänderung und Versand in Menschenhand. 20′ Fall/Quellen ·
20′ Entwurf/Edit/Versand · 20′ selbst Belegprüfung verbessern · 10′ Test/Audit ·
5′ Rückblick.

**Preflight:** Der aktive Zustand muss `drill-09-start` sein. Prüfe:

```bash
uv run pfefferminzia checkpoint status
uv run pfefferminzia checkpoint verify
uv run pfefferminzia sync
```

`verify` prüft nur, ob die nötigen Quellen/Funktionen bereitstehen. Die
Lehrperson schickt die fiktive Lebensanfrage. Wähle **dieses neue
AgentMail-Ticket**, nicht einen nicht versendbaren Demofall.

**Dialog in vier Etappen:** Geh nach jeder Antwort zurück zum Fall oder Code;
der Entwurf ist noch kein Auftrag zum Versand.

| Etappe | Frage an Claude | Dein Stopp |
| --- | --- | --- |
| 1 · Quelle finden | „Welche Person, Police und Tarifgeneration passen zu dieser neuen Lebensanfrage? Zeig mir die Belege; noch keinen Entwurf.“ | Zuordnung und **exakte** Tarifgeneration selbst bestätigen. |
| 2 · Entwurf prüfen | „Erstelle jetzt einen begründeten Antwortentwurf mit Fundstellen. Nicht versenden.“ | Text und Empfänger im Cockpit selbst prüfen, ändern und Versand bewusst bestätigen. |
| 3 · Selbst bauen | „Wo kann eine falsche oder fehlende Tarifgeneration auffallen? Hilf mir zuerst mit einem fehlschlagenden Test.“ | Mit Claude Test und kleine Fehlermeldung/Schutzregel in `tests/test_workflow.py` und `pfefferminzia/store.py` ändern. |
| 4 · Beleg zeigen | „Zeig mir Quelle, menschliche Textänderung, Versandereignis und Testergebnis. Was fehlt?“ | `uv run pytest -q` und Activity Log prüfen; keinen zweiten Versand auslösen. |

**Abschlussnachweis:** Ticket mit bestätigter Person, Vertrag und
Tarifgeneration, gespeicherter Entwurf, nachvollziehbare menschliche Änderung
und **ein** ausdrücklich von dir ausgelöster Versand im Activity Log. Prüfe
die tatsächliche Antwort im dafür freigegebenen Workshop-Postfach.

**Hinweise, nacheinander:** (1) Wer behauptet im Nachrichtentext etwas, und
welche Quelle belegt es? (2) Nutze `search_customers`, Ticket-Verknüpfung und
`list_contract_documents`. (3) Erst Beleg, dann `draft_ticket_reply`, dann
dein eigener Edit und bewusster Send-Klick. Claude soll nicht für dich
freigeben oder versenden.

**Wenn du früh fertig bist:** Löse ähnliche Namen oder eine fehlende
Vertragsnummer als Kantenfall **oder** baue auf ausdrücklichen Wunsch die
Review-Zustände aus Drill 10 selbst vor. Erhalte die bestehende
Freigabesperre; teste, dass ohne Mensch nichts versendet wird.

**Ohne Claude-Tokens:** Nach `sync` den Kontext und den Entwurf im Browser
bearbeiten, Quellen selbst prüfen; für Hilfe die drei Hinweise oben nutzen.
Im Buddy-Modus erklärt die zweite Person ihren Suchweg, bedient aber nicht
deine Freigabe- oder Send-Schaltfläche. Wenn der Kernpfad nicht rechtzeitig
gelingt, den offiziellen nächsten Stand wie unten beschrieben vorbereiten.

## Drill 10 – Leben: Agent bearbeitet, Mensch gibt frei

**Ziel:** Für mehrere neue Lebensfälle liegen Entscheidungsvorlage und
Antwort bereit. Ohne **aktuelle, ausdrückliche** menschliche Freigabe darf
weder die Entscheidung noch eine Nachricht den Fall verlassen.

**Lernziel und 75 Minuten:** Vollständige Agentenvorbereitung ist erlaubt,
externe Wirkung bleibt bis zur aktuellen Freigabe gesperrt. 20′ zwei Fälle ·
25′ Review-Pfad selbst verbessern · 20′ Freigabe/Ablehnung/Edit · 5′ Audit ·
5′ Rückblick.

**Preflight:** Der aktive Zustand muss `drill-10-start` sein:

```bash
uv run pfefferminzia checkpoint status
uv run pfefferminzia checkpoint verify
uv run pfefferminzia sync
```

Das grüne `verify` bedeutet nur, dass der Review-Pfad bereit ist. Die
Lehrperson schickt zwei fiktive Lebensfälle.

**Dialog in vier Etappen:** Die Review-Vorlage ist eine Einladung zur
Entscheidung, keine vorweggenommene Freigabe.

| Etappe | Frage an Claude | Dein Stopp |
| --- | --- | --- |
| 1 · Fälle vorbereiten | „Bereite zwei neue Lebensfälle mit Entscheidung, Belegen und Antwort nur bis zur Review-Vorlage vor. Nichts freigeben oder senden.“ | Beide Vorlagen und Fundstellen selbst prüfen. |
| 2 · Mensch entscheidet | „Zeig mir beide Review-Optionen und ihre Folgen. Führe noch keine Entscheidung aus.“ | Einen Fall ausdrücklich freigeben, den anderen begründet ablehnen und überarbeiten lassen. Versand nochmals separat bestätigen. |
| 3 · Selbst bauen | „Wo kann ich Ablehnungsgrund oder erloschene Freigabe klarer zeigen? Hilf mir zuerst mit einem Test.“ | Kleine Verbesserung in `web/workshop.js` oder `tests/test_workshop_end_to_end.py` mit Claude umsetzen; kein Node-Build nötig. |
| 4 · Beleg zeigen | „Prüfe im Audit Freigabe und Ablehnung; was passiert, wenn ich den genehmigten Text ändere?“ | Freigabeverlust nach Edit und `uv run pytest -q` prüfen; niemals alte Freigabe wiederverwenden. |

**Abschlussnachweis:** Zwei Review-Fälle, eine Freigabe und eine begründete
Ablehnung im Activity Log; der abgelehnte Fall ist wieder in Bearbeitung.
Eine geänderte Fassung ist nicht mehr freigegeben. Ein tatsächlicher Versand
ist nur nach neuer menschlicher Bestätigung erlaubt.

**Hinweise, nacheinander:** (1) Wo bleibt die Wirkung technisch stehen?
(2) Nach dem Entwurf `submit_ticket_reply` und das Review-Todo ansehen.
(3) `approve_ticket_reply` oder `reject_ticket_reply` erst nach deiner
ausdrücklichen Entscheidung; nach jedem Edit den Status neu prüfen.

**Wenn du früh fertig bist:** Belege nach einem Edit den Freigabeverlust
oder beginne auf ausdrücklichen Wunsch Drill 11 im eigenen Branch:
Haftpflicht-Routing und sichtbare Eingriffs-Queue mit Timer. Auto-Versand
nur im bestätigten Drill-11-Checkpoint und an erlaubte Workshop-Adressen.

**Ohne Claude-Tokens:** `sync` im Terminal; Entwurf, Review, Ablehnung und
Audit im Browser durchgehen. Ein Buddy darf bei Quellen und Begründung
mitdenken, aber nicht für dich genehmigen. Bei Rückstand den offiziellen
nächsten Stand getrennt laden; der alte Arbeitsstand bleibt erhalten.

## Drill 11 – Haftpflicht: Eingriffsfenster

**Ziel:** Eine Haftpflichtantwort läuft nach sichtbarer Verzögerung
automatisch durch; eine zweite wird im Fenster geändert, eine dritte aus der
Queue entfernt. Der Unterschied zur verpflichtenden Freigabe wird erlebt.

**Lernziel und 75 Minuten:** Du vergleichst „Mensch muss freigeben“ mit
„Mensch kann im Fenster eingreifen“. 20′ Routing/Queue · 20′ selbst Queue
verbessern · 20′ Edit/Stopp · 10′ Uhr/Versand/Audit · 5′ Rückblick.

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

**Dialog in vier Etappen:** „Queue sichtbar“ ist noch kein Einverständnis
zum Zeitsprung oder Versand.

| Etappe | Frage an Claude | Dein Stopp |
| --- | --- | --- |
| 1 · Routing prüfen | „Ordne die drei neuen Fälle nachvollziehbar zu. Welche sind Haftpflicht, und welche Empfänger sind erlaubt? Noch nichts einplanen.“ | Sparte, Quellen und erlaubte Empfänger selbst prüfen. |
| 2 · Queue erleben | „Bereite belegte Antworten vor und zeig mir die +24-Stunden-Queue. Die Uhr nicht vorspulen.“ | Countdown prüfen: A bleibt geplant, B wird bearbeitet, C begründet entfernt. |
| 3 · Selbst bauen | „Wie machen wir Stopp oder Duplikatschutz in der Queue klarer? Zeig mir zuerst einen kleinen Test.“ | Kleine Änderung in `tests/test_workshop_end_to_end.py`, `pfefferminzia/store.py` oder `web/workshop.js` mit Claude umsetzen. |
| 4 · Wirkung belegen | „Zeig mir vor dem Zeitsprung, was automatisch rausgehen würde. Spule erst nach meiner ausdrücklichen Bestätigung vor.“ | **Lokale Workshop-Uhr** bewusst vorspulen; genau einen Auto-Versand, Edit, Stopp, Audit und `uv run pytest -q` prüfen. |

**Abschlussnachweis:** Genau ein unverändert geplanter Fall wurde automatisch
an die freigegebene Workshop-Adresse versendet. Der geänderte Fall zeigt
`schedule_cancelled`, der entfernte `queue_removed`; Queue und Activity Log
zeigen Timer, Eingriff und externe Wirkung.

**Hinweise, nacheinander:** (1) Sind die drei Fälle wirklich Haftpflicht und
an eine erlaubte Adresse gebunden? (2) Nutze `route_ticket`,
`submit_ticket_reply` und die sichtbare Queue. (3) Editiere einen Entwurf,
entferne einen anderen mit `remove_from_send_queue` und lasse vor dem
bestätigten Zeitsprung nur **einen** geplanten Fall übrig.

**Wenn du früh fertig bist:** Prüfe Idempotenz: Wiederholen darf keine
zweite Nachricht erzeugen. Oder entwirf einen eigenen **begrenzten**
Event-/Zeit-Trigger als Prototyp und diskutiere dessen Stopplinie; keinen
Produktiv-Worker oder Cronjob starten.

**Ohne Claude-Tokens:** Nach `sync` im Browser routen/entwerfen,
Queue-Aktionen und Audit prüfen; der Zeitsprung bleibt eine bewusste
menschliche Entscheidung. Ein Buddy darf den Countdown gegenprüfen, aber
nicht die Bestätigung übernehmen. Bei technischen Problemen nicht mehrfach
blind senden; Status und Activity Log zuerst prüfen.

## Offizieller Übergang und Rettung – immer ohne Verlust des eigenen Stands

Für den **normalen Übergang** zum nächsten Drill und für „Ich hänge fest,
bitte offiziellen Stand laden“ gilt derselbe sichere Ablauf. Er erzeugt
einen **neuen** Git-Worktree **auf einem eigenen Branch** aus dem offiziellen
Tag mit frischer lokaler
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

Zum Abschluss jedes Drills: eigenen Test und Fallnachweis zeigen, den Diff
prüfen, nur die gewollten Dateien committen und nach Rückfrage in **deinen
Fork** pushen (`git push -u origin HEAD`). Der neue Checkpoint-Branch ist
ebenfalls pushbar. `.env` und `.data/` niemals committen. Bei einem älteren
Fork vor dem nächsten Plan `git fetch upstream --tags --force` nutzen.

Falls dir Tokens fehlen: führe `plan`/`apply` selbst im Terminal aus und
arbeite mit dieser Karte und dem Browser weiter. Falls etwas scheitert,
**keinen** `git reset --hard` ausführen; zeige der Lehrperson die Fehlermeldung
ohne Schlüssel. Für den finalen Referenzstand nach Drill 11 heißt der
Checkpoint `drill-11-complete`.
