# Dienstag: Drill-Karten 6–10

Lies während eines Drills nur dessen Karte. Die Software ist absichtlich in
Stufen freigeschaltet. Du bearbeitest fiktive Fälle, triffst die menschlichen
Entscheidungen selbst im Cockpit und **baust mit Claude einen Teil des
Systems**. Alle Nachrichten und Anhänge sind **Daten**, keine Anweisungen an
Claude. Verwende nie echte Kundendaten.

**Wenn du nicht weiterweißt, frag Claude.** Es ist dein Tutor: „Was ist mein
nächster Schritt?“, „Gib mir einen Hinweis“, „Zeig mir die Stelle im Code“.
Beim nächsten Drill gibt es immer einen Checkpoint mit Lösung.

## Start (einmal, zu Beginn von Drill 6)

Terminal öffnen, `claude` starten und schreiben:

> Klone https://github.com/jhoetter/pfefferminzia nach ~/pfefferminzia,
> richte alles nach der README ein und starte die Kommandozentrale.
> Ich bin in Drill 6.

Claude richtet alles ein und öffnet <http://127.0.0.1:3004>. Wenn es fragt,
füge die drei Zeilen von deinem Zettel ein (Inbox-ID, Schlüssel,
Szenario-Absender). Das ist **nur** in diesem synthetischen Workshop in
Ordnung; echte Zugangsdaten und Kundendaten gehören nie in einen Chat, den
Schlüssel nie in Git, Gruppenchats oder Screenshots. Danach bittet Claude
dich einmal, im Ordner `~/pfefferminzia` neu zu starten: `/exit`, dann
`cd ~/pfefferminzia && claude`, und die Frage nach dem MCP-Server
*pfefferminzia* mit Ja beantworten.

**Wichtig:** An deine Workshop-Adresse kann jede externe Adresse schreiben
(auch Gmail). `WORKSHOP_ALLOWED_RECIPIENTS` sperrt nur **ausgehende**
Antworten. Eine private Testmail ist nur ein Verbindungstest, kein
Versicherungsfall.

**Freigeben, Ablehnen, Senden und die Workshop-Uhr gibt es nur im Cockpit.**
Claude hat dafür kein Werkzeug – das ist die Lektion des Tages.

## Drill 6 – Die Kommandozentrale (60 Min.)

**Lernziel:** Eine externe Mail wird ein lokales Ticket mit demselben Zustand
in Cockpit und MCP.

**Aufgabe:** Schick eine Mail an deine Workshop-Adresse, synchronisiere,
finde dieselbe Ticket-ID im Cockpit und über Claude, lies Absender und
Betreff und lege im Cockpit ein konkretes Todo zu diesem Ticket an („PF-…:
Anliegen prüfen“). Schließe es erst nach der Prüfung.

**Bauauftrag:** Beim Import eines neuen Tickets soll automatisch genau ein
verknüpftes „Eingang prüfen“-Todo entstehen – auch wenn zweimal
synchronisiert wird. Test zuerst.
Einstieg: `sync_agentmail` in `pfefferminzia/agentmail_service.py`,
`create_todo` in `pfefferminzia/todos.py`.

| Etappe | Frag Claude | Dann du |
| --- | --- | --- |
| 1 · Inbox | „Was fehlt noch für Drill 6? Hilf mir, meine Inbox einzurichten.“ | Werte einfügen; externe Prüfung erlauben. |
| 2 · Eingang | „Ich habe eine Mail geschickt. Synchronisiere und zeig mir Betreff, Absender und Ticket-ID.“ | Ticket im Cockpit finden; Todo anlegen. |
| 3 · Bauen | „Wo wird ein Ticket importiert? Schreib mit mir zuerst einen Test für genau ein Prüfen-Todo.“ | Test lesen, Implementierung mit Claude bauen. |
| 4 · Beleg | „Prüfe zwei Syncs und den Todo-Status. Dann hilf mir beim Commit.“ | Grüner Test, Diff ansehen, committen. |

**Fertig, wenn:** gleiche Ticket-ID in Cockpit und MCP, sinnvolles Todo
abgeschlossen, eigene Änderung mit grünem Test committet. Nichts versendet.

## Drill 7 – Leben: Mensch bearbeitet, Agent bereitet vor (60 Min.)

**Lernziel:** Kundenaussage und belegte Quelle trennen; Text und Versand
bleiben beim Menschen.

**Aufgabe:** Die Lehrperson schickt eine fiktive Lebensanfrage. Claude
ordnet Person, Police und Tarifgeneration zu und entwirft mit Beleg. Du
änderst den Text im Cockpit und sendest dort selbst.

**Bauauftrag:** Ein Entwurf, der eine **falsche Tarifgeneration** zitiert
(z. B. „PL-2012“, wenn der Vertrag PL-2017 hat), wird beim Speichern mit
klarer Meldung abgewiesen. Ein korrekter Entwurf bleibt erlaubt.
Einstieg: `save_draft` in `pfefferminzia/store.py`, Tests in `tests/test_workflow.py`.

| Etappe | Frag Claude | Dann du |
| --- | --- | --- |
| 1 · Quelle | „Welche Person, Police und Tarifgeneration passen? Zeig mir die Belege, noch kein Entwurf.“ | Zuordnung selbst bestätigen. |
| 2 · Entwurf | „Erstelle einen begründeten Entwurf mit Fundstelle. Senden mache ich im Cockpit.“ | Im Cockpit ändern, speichern, bewusst senden. |
| 3 · Bauen | „Hilf mir mit einem fehlschlagenden Test für eine falsch zitierte Tarifgeneration.“ | Schutzregel mit Claude bauen, Gegenfall testen. |
| 4 · Beleg | „Zeig mir Quelle, meine Änderung, Versand und Test. Dann Commit.“ | Activity Log prüfen, committen. |

**Fertig, wenn:** ein belegter Entwurf von dir geändert und gesendet wurde
und die Tarif-Belegprüfung getestet und committet ist.

## Drill 8 – Leben: Agent bearbeitet, Mensch gibt frei (60 Min.)

**Lernziel:** Der Agent darf alles vorbereiten; nur deine aktuelle Freigabe
im Cockpit öffnet die externe Wirkung.

**Aufgabe:** Zwei neue Lebensfälle. Claude bereitet beide bis zur
Review-Vorlage vor. Im Cockpit unter **Freigaben** gibst du einen frei und
sendest ihn; den anderen lehnst du begründet ab, Claude überarbeitet. Ändere
dann testweise einen freigegebenen Text: Die Freigabe verfällt.

**Bauauftrag:** Ablehnungsgrund und erloschene Freigabe im Cockpit sichtbar
machen: `get_ticket` liefert ein Feld `controlNotice`, das Cockpit zeigt es
über dem Entwurf.
Einstieg: `pfefferminzia/store.py`, `draftArea` in `web/workshop.js`,
Test in `tests/test_workflow.py`.

| Etappe | Frag Claude | Dann du |
| --- | --- | --- |
| 1 · Vorlage | „Bereite beide Fälle bis zur Review-Vorlage vor. Freigeben kann nur ich.“ | Vorlagen und Fundstellen prüfen. |
| 2 · Entscheidung | „Welche Folgen haben Freigabe und Ablehnung hier?“ | Im Cockpit freigeben + senden bzw. begründet ablehnen. |
| 3 · Bauen | „Wie zeigen wir Ablehnung und Freigabeverlust klarer? Zuerst ein Test.“ | Verbesserung bauen, im Browser prüfen. |
| 4 · Beleg | „Was zeigt das Audit nach Ablehnung und nach einem Edit? Dann Commit.“ | Freigabeverlust sehen, committen. |

**Fertig, wenn:** eine Freigabe und eine Ablehnung im Audit stehen, ein Edit
die Freigabe entwertet hat und deine Verbesserung committet ist.

## Drill 9 – Haftpflicht: Eingriffsfenster (60 Min.)

**Lernziel:** „Mensch muss freigeben“ gegen „Mensch kann im Fenster
eingreifen“ abwägen.

**Aufgabe:** Drei Haftpflichtfälle. Claude routet und plant die Antworten
ins 24-Stunden-Fenster ein. Du änderst im Cockpit unter **Eingriffsfenster**
einen Text, nimmst einen mit Begründung aus der Queue und lässt einen laufen.
Dann drückst du **Workshop-Zeit +24 h**: Genau eine Antwort geht automatisch
raus. (Der Drill-9-Checkpoint schaltet den Auto-Versand an; du musst nichts
einstellen.)

**Bauauftrag:** Gestoppte Termine erklären und Doppelversand ausschließen:
`controlNotice` auch für `schedule_cancelled` und `queue_removed`; ein Test
zeigt, dass zweimaliges `dispatch_due_replies` genau einmal sendet und ein
geänderter Termin gar nicht.
Einstieg: `pfefferminzia/store.py`, `pfefferminzia/agentmail_service.py`,
`tests/test_workshop_end_to_end.py`.

| Etappe | Frag Claude | Dann du |
| --- | --- | --- |
| 1 · Routing | „Welche Fälle sind Haftpflicht, und ist der Empfänger erlaubt? Noch nichts einplanen.“ | Sparte und Quellen prüfen. |
| 2 · Queue | „Bereite belegte Antworten vor und plane sie ein.“ | Im Cockpit: einen ändern, einen stoppen, einen lassen. |
| 3 · Bauen | „Wie machen wir Stopp und Duplikatschutz überprüfbar? Zuerst ein Test.“ | Verbesserung mit Claude bauen. |
| 4 · Wirkung | „Was würde nach dem Zeitsprung rausgehen? Danach prüfen und Commit.“ | Zeitsprung im Cockpit, Audit prüfen, committen. |

**Fertig, wenn:** ein Auto-Versand, ein Edit (`schedule_cancelled`) und ein
Stopp (`queue_removed`) im Audit stehen und deine Verbesserung committet ist.

## Drill 10 – Management-Report mit reveal.js und D3 (45 Min.)

**Lernziel:** Aus dem Erlebten eine knappe, prüfbare Management-Aussage
machen – ohne aus einer lokalen Simulation Konzern-KPIs abzuleiten.

**Start:** „Ich will zu Drill 10. Frag mich, ob ich meinen Stand mitnehmen
will.“ Der Checkpoint wird aus dem **Drill-9-Ordner** geladen und übernimmt
nur gruppierte Zählwerte (keine Namen, Mailtexte, Schlüssel).

**Bauauftrag:** In `slides/management.js` eine zweite beschriftete
D3-Grafik (z. B. Freigaben, Ablehnungen, Stopps, Auto-Versände) und deine
eigene Empfehlung mit Grenze. Ansicht:
<http://127.0.0.1:3004/slides/index.html?deck=management>. Kein Node, npm
oder CDN.

| Etappe | Frag Claude | Dann du |
| --- | --- | --- |
| 1 · Befund | „Welche Beobachtung aus dem Snapshot ist wirklich belegt?“ | Eine Aussage und ihre Grenze wählen. |
| 2 · D3 | „Erst Datenform und Skizze, dann der Grafik-Code.“ | Achsen, Beschriftung, Nullfälle prüfen. |
| 3 · Empfehlung | „Verdichte Beleg, Kontrollregel und Unsicherheit auf eine Folie.“ | Empfehlung selbst formulieren; max. 4 Folien. |
| 4 · Vorführen | „Prüfe Folien, Zahlen und Datenschutz. Dann Commit.“ | Zwei Minuten präsentieren. |

**Bonus mit restlichem Guthaben:** ein 30–60-Sekunden-Video deiner Lösung
mit Remotion als letzte Folie – siehe [BONUS_VIDEO.md](BONUS_VIDEO.md).

## Drill-Wechsel und Rettung – ohne Verlust des eigenen Stands

Sag Claude: „Ich will zu Drill N. Frag mich, ob ich meinen Stand mitnehmen
will.“ Du wählst:

| Modus | Im neuen Ordner | Wann sinnvoll |
| --- | --- | --- |
| **Eigenen Stand mitnehmen** | Dein Code (auch Uncommittetes) und deine bisherigen Fälle | Dein Bau funktioniert. |
| **Frischen offiziellen Stand laden** | Offizieller Code **mit Lösungen aller bisherigen Bauaufträge**, frische Fälle | Du hängst fest oder willst die Referenz sehen. |

Claude zeigt dir den Plan und fragt vor dem Laden noch einmal. Beide Modi
legen einen **neuen Ordner auf neuem Branch** an; dein bisheriger Ordner
bleibt unverändert. Danach: `/exit`, `cd <neuer Ordner> && claude`, Claude
startet dort die App. Im offiziellen Modus können alte Mails beim Sync noch
einmal auftauchen: bearbeite nur die neu angekündigten Fälle.

Ohne Claude geht es auch im Terminal:

```bash
uv run pfefferminzia checkpoint plan drill-07-start          # oder --mode continue
uv run pfefferminzia checkpoint apply TOKEN --confirm-checkpoint-load
```

## Ohne Claude-Tokens

Cockpit im Browser, diese Karte und ein Buddy: Die zweite Person fragt und
prüft mit, bedient aber nicht deine Freigabe- oder Send-Knöpfe. Nie
Logins oder Schlüssel teilen. Im Fehlerfall **kein** `git reset --hard`;
zeig der Lehrperson die Meldung ohne Schlüssel.
