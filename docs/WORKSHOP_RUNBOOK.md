# Runbook für Dienstag, 29. September 2026

Das ist die operative Quelle für den Dozenten. Der Lernbogen steht in
[WORKSHOP_AGENDA.md](WORKSHOP_AGENDA.md), die Teilnehmersicht in
[DRILL_CARDS.md](DRILL_CARDS.md). Nummerierung: Falk hat am Montag Drill 1–5,
Dienstag ist Drill 6–10.

## Checkpoints und Referenzlösungen

| Tag `checkpoint/…` | Freigeschaltet | Enthält Lösung von |
| --- | --- | --- |
| `drill-06-start` (= Spitze von `main`) | Posteingang, Aufgaben, Entwurf, Senden im Cockpit | – |
| `drill-07-start` | + Kunden/Tarife | Drill 6: Antwort-Aufgabe erledigt sich beim Senden |
| `drill-08-start` | + Pflichtfreigabe Leben, Claims | + Drill 7: Tarif-Belegprüfung |
| `drill-09-start` | + Router, Eingriffsfenster, Workshop-Uhr, Auto-Versand an | + Drill 8: `controlNotice` im Review |
| `drill-10-start` | + Vorstandspräsentation, Auto-Versand aus | + Drill 9: Queue-Hinweise, Duplikattest |
| `drill-10-complete` | wie oben | + Drill 10: Beispiel-Vorstandspräsentation (Grafik, Empfehlung, Video-Platz) |

Die Teilnehmenden klonen `main` und starten bei Drill 6. Die Lösungen liegen
als lineare Commits auf dem Branch `reference` über `main`; die Tags zeigen
darauf. Claude kennt über `get_drill_guide` → `referenceSolution` den
passenden `git diff` und zeigt ihn nur im Rettungsmodus oder auf Wunsch.

**Nach jeder Änderung an `main`** die Lösungen neu aufsetzen und taggen:

```bash
git switch reference && git rebase main && uv run pytest -q
uv run pfefferminzia instructor retag            # Plan ansehen
uv run pfefferminzia instructor retag --yes
git push origin main reference --force-with-lease && git push origin --tags --force
```

## Dozenten-Tresor

`.instructor/` (Organisationsschlüssel, Roster, Zettel, Versand-Log) ist
Git-ignoriert, liegt aber verschlüsselt als `instructor.vault` im Repo
(scrypt + AES-256-GCM). Auf einem neuen Rechner in der Claude-App sagen:
„Entsperre den Dozenten-Tresor mit diesem Passwort: …“ – oder
`uv run pfefferminzia instructor unlock`. Nach Änderungen (neue Inboxen,
Versand) `instructor lock` und den Tresor committen. Das Passwort kam per Mail;
das Repo ist öffentlich, also nirgends teilen und den AgentMail-Schlüssel nach
dem Workshop rotieren.

## Vorbereitung vor Dienstag

1. **AgentMail-Kapazität:** 16 Teilnehmende + 3 Reserve + 1 Dozenten-Inbox.
2. **Dozenten-Zugang** in `.instructor/.env` (Git-ignoriert):

   ```dotenv
   INSTRUCTOR_AGENTMAIL_API_KEY=…   # Organisationsschlüssel, nie weitergeben
   INSTRUCTOR_INBOX_ID=…@agentmail.to   # Absender der Szenario-Mails
   ```

3. **Inboxen und Schlüssel anlegen** (idempotent, legt nur fehlende Plätze an):

   ```bash
   uv run pfefferminzia instructor provision --count 19 --prefix pfm26        # Plan
   uv run pfefferminzia instructor provision --count 19 --prefix pfm26 --yes
   ```

   Ergebnis: `.instructor/roster.csv` (Rechte 600). Namen kannst du in der
   Spalte `name` nachtragen.
4. **Zettel erzeugen:** `uv run pfefferminzia instructor handouts` schreibt pro
   Platz `.instructor/handouts/platz-NN.txt` und `alle-zum-ausdrucken.txt`
   (Seitenumbruch pro Person): drei Werte plus der Start-Satz für Claude.
   Ausdrucken und einzeln verteilen, nicht per Gruppenchat.
   Die Zuordnung Platz → Inbox → Schlüssel als eine Mail an dich:
   `instructor mail-roster jt.hoetter@gmail.com --yes` oder Claude bitten
   („Schick mir die Inbox-Zuordnung“).
   Teilnehmende brauchen nur den Schlüssel; Claude verbindet damit die Inbox
   (`connect`). An wen alle antworten dürfen, steht für alle gleich in
   `.env.example` (`WORKSHOP_ALLOWED_RECIPIENTS`).
7. **Eine Mail an alle (Live-Demo):** `instructor addresses` bzw. Claude
   („Gib mir alle Inbox-Adressen“) liefert die 16 Adressen als eine Zeile.
   In Gmail ins **BCC** einfügen und senden: Jede Instanz importiert die Mail
   beim nächsten Sync als eigenes Ticket.
5. **Einen Platz komplett durchspielen** mit einem frischen Terminal: Start-Satz
   → Einrichtung → Neustart im Ordner → `instructor send 6 --slot 1 --yes` →
   Sync → … bis Drill 10. Dabei einmal den offiziellen Checkpoint laden.
6. **Claude-Zugänge** und zwei bis drei Reserve-Sitze klären.

## Tagesablauf

Alles Dozentenseitige geht auch per Claude: Auf deinem Rechner (mit
`.instructor/.env`) hat Claude die Werkzeuge `instructor_send_scenarios`,
`instructor_progress`, `instructor_list_scenarios`,
`instructor_provision_inboxes` und `instructor_write_handouts`. Sag z. B.
„Zeig mir den Plan für die Drill-7-Mails“ → „Ja, senden“ oder „Wer hängt?“.
Claude zeigt immer erst den Plan. Die Terminal-Befehle unten sind der
Fallback.

Die Teilnehmenden arbeiten **nur** in der Claude-App (Code) und im Cockpit;
Claude führt alle Befehle für sie aus. Der Drill-Wechsel passiert im selben
Ordner und in derselben Sitzung; nur beim allerersten Start (Klonen) gibt es
einmal eine neue Code-Sitzung im Ordner `pfefferminzia`.

| Zeit | Du sagst | Du tust |
| --- | --- | --- |
| 08:30 | Input-Deck (`?deck=input`), Live-Beispiele | – |
| 10:00 | Drill 6: „Sagt Claude den Satz vom Zettel … ihr seht ein Softwaregerüst. Erste Aufgabe liegt schon im Posteingang: meine Mail beantworten – ihr sagt, was drinstehen soll, Claude schreibt. Bevor ihr sendet, baut ihr mit Claude, dass sich die Aufgabe beim Senden erledigt; euer Senden ist der Beweis. Claude fragt euch dabei immer zuerst nach eurer Entscheidung. Wenn ihr nicht weiterwisst: fragt Claude.“ | **Vorher** (z. B. 09:45): „Schick die Drill-6-Begrüßung an alle“ oder eigene Mail per BCC |
| 11:15 | Drill 7: „Ladet mit Claude Drill 7 – mitnehmen oder offiziell.“ | nach dem Laden `instructor send 7 --yes` |
| 13:15 | Drill 8 | `instructor send 8 --yes` |
| 14:30 | Drill 9 | `instructor send 9 --yes` |
| 15:45 | Drill 10: „Ich will zu Drill 10“ – übernimmt die Zählwerte aus Drill 9 | – |
| 16:45 | Whiteboard, Laptops zu | – |

Die Mails pro Drill zum Kopieren und Selbst-Versenden (Gmail, alle Plätze ins
BCC): [MAILS_ZUM_VERSENDEN.md](MAILS_ZUM_VERSENDEN.md).

Zwischendurch: `uv run pfefferminzia instructor status` zeigt pro Platz, welche
Szenarien angekommen und welche beantwortet sind (Antworten landen in deiner
Inbox). So siehst du, wer hängt. `send` versendet nichts doppelt; einzelne
Personen mit `--slot 03` nachbeliefern, bewusst erneut mit `--resend`.
`instructor scenarios` zeigt alle Texte; `send challenge --slot …` schickt die
Prompt-Injection-Challenge gezielt an Schnelle.

Beim Drill-Wechsel bleibt alles im selben Ordner und in derselben Sitzung.
Frisch offiziell sichert den eigenen Code als Commit auf dem bisherigen
Zweig, lädt den offiziellen Stand auf einen neuen Zweig (`workshop/drill-07`)
und legt die bisherigen Fälle unter `.data/sicherung/` ab; Mitnehmen stellt
nur den Drill um. Claude startet die Kommandozentrale neu. Im offiziellen
Modus werden alte Mails neu importiert; schon
beantwortete erscheinen als „gesendet“ mit der alten Antwort im Verlauf und
erledigter Aufgabe. „Bearbeitet nur die neu angekündigten Fälle.“

**Probe mit derselben Inbox:** Eine frische Kopie übernimmt beim Abgleich
auch die Antworten aus dem letzten Durchlauf; die alte Begrüßung steht dann
als beantwortet da und zählt nicht als Fallnachweis. Für einen frischen
Drill-6-Fall die Begrüßung neu schicken:
`instructor send 6 --slot <Platz> --resend --yes`.

## Was nur der Mensch kann

Freigeben, Ablehnen, Senden und der Zeitsprung existieren nur im Cockpit
(REST für die Browser-App), nicht in MCP. Claude kann vorbereiten, einplanen
und aus der Queue nehmen (bremsen). Ehrliche Grenze für Nachfragen: Lokal
hat Claude auch eine Shell und könnte die REST-Endpunkte technisch aufrufen;
`CLAUDE.md` verbietet das, und in Produktion bräuchte die Freigabe eine
eigene, authentifizierte menschliche Identität. Genau das ist ein guter
Whiteboard-Punkt.

## Go/No-Go

- `uv run pytest -q` grün, auf `main` und auf `reference`.
- `instructor retag` meldet keine fehlenden Tags; Tags sind gepusht.
- Ein Platz einmal komplett von Drill 6 bis 10 durchgespielt, inklusive
  offiziellem Checkpoint und echtem Mail-Roundtrip an die Dozenten-Inbox.
- `instructor status` zeigt die Antworten dieses Durchlaufs.
- Drill 9: Der Zeitsprung versendet genau die eine unveränderte Antwort.
- Drill 10: Die Vorstandspräsentation zeigt die Zählwerte; Auto-Versand ist aus.
- Drill 10 auf einem **Mac ohne Node**: Claude installiert Node ohne
  Administrator-Passwort, legt das Remotion-Projekt an und rendert ein
  kurzes Video – in unter zehn Minuten? Das Video läuft in der Präsentation.
- Reserve-Plätze getestet, nicht nur angelegt.
- **Probe wie die Teilnehmenden:** Claude-App, Sonnet 5 auf „Mittel“ (kommt aus
  `.claude/settings.json`; im Modellwähler kontrollieren), frische Kopie,
  frische Mail (`instructor send 6 --slot <Platz> --resend --yes`).
- **Bewusst passiv spielen:** in jedem Drill mindestens einmal „weiß nicht“,
  „mach einfach“ und „ja“ schreiben. Claude muss offen nachfragen, darf nicht
  losbauen und keinen Gegenfall selbst wählen.
- **Sprachcheck:** Keine Datei- oder Funktionsnamen, kein Code, kein „Test“,
  „Commit“, „rot/grün“ in Claudes Nachrichten – auch nicht, während es im
  Programm sucht. Keine Zwischenberichte beim Suchen.
- **Kein Antwortvorschlag** im Eingabefeld (graues „ja, …“).
- **Früher fertig:** In mindestens einem Drill „Ich bin fertig, was jetzt?“
  fragen: erst ein Denkanstoß, dann „Was hättest du gern?“ – nie der nächste
  Drill. Die Erweiterung bleibt gesperrt, bis der Fall im Protokoll steht.
- **Zeit:** Pro Drill notieren, wann Fall, Bauauftrag und Abschluss erreicht
  waren. Drill 6 bis 9 in 60, Drill 10 in 45 Minuten?

Frühere Probe: [REHEARSAL_2026-09-23.md](REHEARSAL_2026-09-23.md) (noch mit
alter Nummerierung 8–12 und vor dem Umbau auf Entscheidungsfragen,
Szenarien und Erweiterungen am 2026-09-27).

## Schnelle Teilnehmende

Nach Fallnachweis und eigenem Commit echte Wahl anbieten: diesen Drill mit
einer Challenge vertiefen **oder** die eigene Kommandozentrale erweitern
(Claude: `includeExtensions`; erst nach dem Fallnachweis offen). Nie den
nächsten Drill vorwegnehmen. Die empfohlene Erweiterung baut den Baustein,
den der nächste Drill im Großen zeigt (Drill 6: Mini-Wissensbasis → Drill 7:
Tarife); eigene Ideen sind ausdrücklich erwünscht, z. B. „Claude darf
senden“ – dann mit Kontrolle im Steckbrief (`MEINE_ERWEITERUNGEN.md`). Beim
Drill-Wechsel „mitnehmen“ wählen, sonst fehlt die Erweiterung im neuen
Ordner. Oder Buddy werden: Fragen stellen, nicht Tastatur oder Freigabe
übernehmen.

- Drill 6: auf die eigene Gmail-Testmail antworten und verstehen, warum die App das blockiert (Antwort-Liste).
- Drill 7: ähnliche Namen, fehlende Vertragsnummer, `send challenge` (Anweisung im Mailtext).
- Drill 8: Nutzerwunsch, der dem zitierten Tarif widerspricht.
- Drill 9: Timer-Reset nach Edit, transparente Router-Schwelle.
- Drill 10: zweite, kürzere Videofassung oder Folie „Mein agentisches System“ ([VIDEO_REMOTION.md](VIDEO_REMOTION.md)).

## Wenn Tokens ausgehen

1. Paar-Modus: eine Claude-Sitzung, zwei eigene Systeme, getrennte Rollen.
2. Drill-Karten und Cockpit funktionieren ohne Modell.
3. Checkpoint im Terminal laden (`checkpoint plan` / `apply`).

Nie persönliche Accounts oder den Organisationsschlüssel teilen.

## Whiteboard (nur für dich, ohne Rechner)

Den erlebten Fluss zeichnen:

`Mail → Kontext/Belege → Agenten-Vorschlag → Kontrollregel → externe Wirkung → Audit`

Kontrollregel in Pflichtfreigabe und Eingriffsfenster teilen. Dann die Frage:
Heute hat meist ein Mensch im Terminal den nächsten Schritt angestoßen. Wie
sähe derselbe Agent als **Event** (neue Mail) oder **Cron** (jede Nacht) aus?

`Ereignis oder Zeitplan → Worker → MCP-/Fachaktion → Kontrollregel → Wirkung → Audit und Fehlerweg`

- Wer betreibt den Worker, mit welchen Rechten und welcher Identität?
- Was passiert bei Duplikaten, Ausfall, Retry, falschem Trigger?
- Wer sieht eine wartende Freigabe, wer stoppt einen Timer?
- Wie beweist das Audit hinterher, wer was ausgelöst hat?

Ergebnis ist ein einseitiger [Automation Contract](AUTOMATION_CONTRACT.md)
(Auslöser, erlaubte Aktionen, Kontrollregel, Belege, Ausnahmeweg,
verantwortliche Rolle) als Übergabe an Mittwoch.
