# Dienstag: selbst bauen, gemeinsam ankommen

Der Tag ist kein Klickkurs und keine Vorführung einer fertigen Anwendung. Nach
Johannes' Live-Beispielen bauen die Teilnehmenden an ihrer **eigenen Version**
von Pfefferminzia. Claude Code ist dabei Programmierpartner und MCP-Client:
Es hilft beim Code, kann aber über klar begrenzte Werkzeuge auch den Zustand
der laufenden Python-App lesen und verändern. Die Menschen wählen die
fachlichen Entscheidungen und prüfen jede externe Wirkung.

## Die gemeinsamen Lernergebnisse

Am Ende kann jede Person (1) ein Repository forken, den eigenen Stand
committen und in den eigenen Fork pushen, (2) Claude mit einem kleinen,
prüfbaren Änderungsauftrag zum Vibe Coding führen, (3) erklären, warum ein
MCP-Werkzeug mehr als eine Chat-Antwort ist, (4) einen Mail-zu-Aktion-Fall
mit Quellen und Audit nachvollziehen und (5) Pflichtfreigabe und
Eingriffsfenster am eigenen System vergleichen. Wie viel Code jemand dafür
selbst baut, darf verschieden sein. Der **Fallnachweis** ist für alle gleich.

## Drei Arbeitsweisen, jederzeit wechselbar

| Weg | Wenn du … | Claude hilft so | Dein eigener Beitrag |
| --- | --- | --- | --- |
| Geführt | Claude Code/Git noch kennenlernst oder festhängst | Nächsten Schritt, Dateistelle und kleinen Test zeigen; offiziellen Checkpoint als Rettungsnetz anbieten | Mindestens eine konkrete Änderung verstehen, selbst auswählen, testen, committen und pushen |
| Bauend | mit der Grundstruktur zurechtkommst | Ziel und Akzeptanztest nennen, Implementierung mit dir iterieren | Eine Drill-Komponente/Schutzregel in mehreren kleinen Schritten selbst bauen und nachweisen |
| Vorausbauend | den Kernpfad früh belegt hast | Auf ausdrücklichen Wunsch den **nächsten** Drill als Bauauftrag öffnen, ohne die Lösung vorzuschreiben | Nächste Fähigkeit auf eigenem Branch möglichst selbst entwickeln und gegen deren Fallnachweis prüfen |

Der nächste Drill ist für Schnelle **erlaubt, aber opt-in**: Claude fragt
zuerst, ob du die aktuelle Funktion vertiefen oder die nächste selbst bauen
willst. Es zeigt sie nicht ungefragt der Gruppe. Ein Vorausbau ist ein
Experiment im eigenen Branch, nicht der offizielle Stand. Wenn es nicht
rechtzeitig funktioniert, wird der nächste offizielle Checkpoint nach
Rückfrage in einem *weiteren* Branch/Worktree geladen. Kein Code geht
verloren. Niemand muss den Vorausbau fertigstellen, um mit der Gruppe
weiterzugehen.

Wichtig: Der aktive Checkpoint **sperrt** spätere UI-/MCP-Fähigkeiten auch
für schnelle Personen. Vorausbau bedeutet deshalb zunächst Code und Tests
im eigenen Branch, **nicht** eine vorzeitig freigeschaltete Live-App. Beim
offiziellen Wechsel kannst du deinen Commit vergleichen bzw. gezielt in den
neuen Branch übernehmen (`git cherry-pick` nur nach Diff-Prüfung) und dort
integriert verproben. Wenn du stattdessen den nächsten offiziellen
Checkpoint vorzeitig laden möchtest, gilt derselbe Plan-/Rückfrage-Ablauf;
du bekommst dann die vorbereitete Funktion, baust aber weniger davon selbst.

## Git: deine Version statt eines Wegwerf-Checkouts

1. Melde dich auf GitHub mit deinem **eigenen** Account an. Öffne
   [jhoetter/pfefferminzia](https://github.com/jhoetter/pfefferminzia) und
   klicke **Fork**. Behalte die Branches/Tags des Repos. Klone die URL
   **deines Forks**, nicht die von Johannes:

   ```bash
   git clone https://github.com/DEIN-NAME/pfefferminzia.git
   cd pfefferminzia
   git remote -v
   uv sync --frozen
   uv run pfefferminzia setup
   ```

   `origin` muss jetzt auf deinen Fork zeigen. Richte zusätzlich das
   Kurs-Original als reine Quelle für spätere offizielle Tags ein:

   ```bash
   git remote add upstream https://github.com/jhoetter/pfefferminzia.git
   git fetch upstream --tags
   git switch -c workshop/mein-tag
   ```

2. Arbeite im eigenen Branch. Bitte Claude z. B.: „Zeig mir einen kleinen
   Test für meine Änderung, noch keine Komplettlösung.“ Sieh dir den Diff an,
   prüfe `.env` und Testausgabe und committe **nur** die gewollten Dateien:

   ```bash
   git status --short
   git diff
   uv run pytest -q
   git add PFAD-ZU-DEINER-DATEI
   git commit -m "Drill 8: Eingang nachvollziehbar machen"
   git push -u origin HEAD
   ```

   Falls `git commit` nach Name/E-Mail fragt, setze `git config user.name`
   und `git config user.email` für dieses Repo. `.env`, API-Keys und
   `.data/` gehören nie in den Commit. Claude soll vor einem Push den Diff
   mit dir prüfen und dich fragen. Ein GitHub-Login im Browser kann für den
   Push nötig sein; es gibt keinen geteilten Kurs-Account.

3. Vor einem neuen Drill: `git status --short` und den bisherigen Stand bei
   Bedarf committen/pushen. „Lade den offiziellen Checkpoint für Drill 9“
   plant zunächst nur. Nach deiner Bestätigung entsteht ein separater
   Worktree auf einem **neuen Branch** ab dem offiziellen Tag. Wechsle in
   dessen angezeigten Pfad, starte dort App und Claude, und pushe später
   auch diesen Branch mit `git push -u origin HEAD`. Dein vorheriger Branch
   samt uncommittierter Änderungen bleibt erhalten. Die neue lokale DB ist
   getrennt; synchronisiere die Inbox dort neu. In einem älteren Fork, dem
   Tags fehlen, zuerst `git fetch upstream --tags --force` ausführen.

## Der Vibe-Coding-Rhythmus

Ein guter Auftrag hat **beobachtbares Verhalten**, eine **Grenze** und einen
**Test**. Beispiel: „Wenn dieselbe Mail zweimal synchronisiert wird, soll
genau ein verknüpftes Prüfen-Todo entstehen. Zeig zuerst den fehlenden Test
und die relevante Funktion. Ich entscheide dann über den Patch.“ Danach:

`Hypothese → kleinen Test schreiben → Änderung mit Claude bauen → Diff lesen →
Fall in App/MCP prüfen → Test ausführen → committen/pushen → erklären`.

Wenn Claude zu viel auf einmal macht: „Stopp. Nur den nächsten Schritt; sag
mir, welche Zeile ich prüfen soll.“ Wenn du schneller bist: „Gib mir nur
Akzeptanzkriterien für den nächsten Drill; ich versuche die Funktion zuerst
selbst zu bauen.“ Wenn du hängst: „Zeig mir die Dateistelle und einen minimalen
Test. Übernimm nur nach meiner Bitte mehr.“ Eine fertige, grüne App allein
ist **kein** Lernnachweis; ein Prompt allein ist **kein** gebauter Beitrag.

## Vier 75-Minuten-Schleifen

| Drill | Gemeinsam erlebter Fall | Bauender Kern | Vorausbau nach frühem Nachweis |
| --- | --- | --- | --- |
| 8 · Eingang | Mail → Ticket in Cockpit und MCP → sinnvolles Todo | Import- oder Todo-Verknüpfung idempotent machen | Kunden-/Tarifkontext und belegten Entwurf für Drill 9 angehen |
| 9 · Leben | Quelle prüfen → Entwurf → Mensch redigiert und sendet | Belegprüfung/Fehlerfall verbessern | Review-Zustand mit Freigabe/Ablehnung für Drill 10 bauen |
| 10 · Freigabe | Zwei Fälle → Freigabe und Ablehnung → Audit | Review-Komponente und Freigabeverlust absichern | Haftpflicht-Routing und Eingriffs-Queue für Drill 11 bauen |
| 11 · Eingriffsfenster | Auto-Versand, Edit und Stopp unterscheiden | Countdown, Duplikatschutz oder Queue-Eingriff verbessern | Eigenen begrenzten Trigger/Automationsvertrag prototypisieren |

Das Repo enthält einen lauffähigen Referenzpfad und Sicherheitsgrenzen. Auch
ein Anfänger kann dadurch jeden Fall durchspielen. Vibe Coding bedeutet hier
nicht, unkontrollierten Code zur Pflichtfreigabe oder zum E-Mail-Versand
hinzuzufügen: Neue Varianten müssen im eigenen Branch mit Tests und den
bestehenden Guards erprobt werden. Für den offiziellen Nachweis gilt die
jeweilige [Drill-Karte](DRILL_CARDS.md).

## Whiteboard: vom Terminal zur laufenden Automation

Im Drill startet meist ein Mensch den nächsten Claude-Dialog. Am Whiteboard
zeichnen wir denselben Agenten **ohne ständig neue Terminal-Prompts**:

`Ereignis (neue Mail) oder Zeitplan (Cron) → Trigger/Worker → MCP-/Fachaktion →
Kontrollregel → externe Wirkung → Audit und Fehlerweg`.

Fragen: Wer betreibt den Worker, mit welchen Rechten? Was geschieht bei
Duplikaten, Ausfällen oder einem falschen Trigger? Wer sieht eine wartende
Freigabe, wer kann einen Timer stoppen, und wie wird der Lauf wiederholt?
Der Automation Contract hält Auslöser, erlaubte Aktionen, Kontrollregel,
Belege, Ausnahmeweg und verantwortliche Person fest. Das ist eine
**Architekturdiskussion**, kein Auftrag, im Workshop einen Produktiv-Cronjob
zu starten.
