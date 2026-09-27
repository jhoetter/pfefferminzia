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

Du brauchst **kein Terminal**. Öffne die Claude-App → **Code** → neue
Sitzung mit deinem Benutzerordner und schreibe:

> Klone https://github.com/jhoetter/pfefferminzia nach ~/pfefferminzia,
> richte alles nach der README ein und starte die Kommandozentrale.
> Ich bin in Drill 6.

Claude richtet alles ein und öffnet <http://127.0.0.1:3004>. Wenn es fragt,
füge den **Schlüssel von deinem Zettel** ein (beginnt mit `am_`); mehr
brauchst du nicht. Das ist **nur** in diesem synthetischen Workshop in
Ordnung; echte Zugangsdaten und Kundendaten gehören nie in einen Chat, den
Schlüssel nie in Git, Gruppenchats oder Screenshots. Danach bittet Claude
dich einmal, eine **neue Code-Sitzung mit dem Ordner `pfefferminzia`** zu
öffnen, dort „weiter mit Drill 6“ zu schreiben und die Frage nach dem
Pfefferminzia-Server mit Ja zu beantworten. Den Schlüssel musst du dort nicht
noch einmal eingeben. Alles Weitere (Befehle,
Tests, Commits) erledigt Claude für dich; du prüfst im Cockpit und im Chat.

**Wichtig:** An deine Workshop-Adresse kann jede externe Adresse schreiben
(auch Gmail). `WORKSHOP_ALLOWED_RECIPIENTS` sperrt nur **ausgehende**
Antworten. Eine private Testmail ist nur ein Verbindungstest, kein
Versicherungsfall.

**Freigeben, Ablehnen, Senden und die Workshop-Uhr gibt es nur im Cockpit.**
Claude hat dafür kein Werkzeug – das ist die Lektion des Tages.

## Drill 6 – Die Kommandozentrale (60 Min.)

**Lernziel:** Aus einer echten Mail wird ein Fall mit Aufgabe. Claude
bereitet die Antwort vor – senden tust du.

**Aufgabe:** In deinem Posteingang liegt eine Mail der Lehrperson und unter
**Aufgaben** „Antworten: …“. Bitte Claude um einen kurzen Entwurf, ändere ihn
im Cockpit und klicke selbst auf **Senden**.

**Bauauftrag:** Nach dem Senden ist die Aufgabe noch offen. Sie soll sich
beim Senden von selbst erledigen – nur die Antwort-Aufgabe dieses Falls.
Test zuerst. Einstieg: `send_ticket_draft` in
`pfefferminzia/agentmail_service.py`, `complete_ticket_todos` in
`pfefferminzia/todos.py`.

| Etappe | Frag Claude | Dann du |
| --- | --- | --- |
| 1 · Ankommen | „Was liegt in meinem Posteingang, und was ist meine erste Aufgabe?“ | Mail im Cockpit öffnen und lesen. |
| 2 · Antworten | „Entwirf eine kurze, freundliche Antwort. Nicht senden – das mache ich.“ | Im Cockpit ändern, speichern, senden. |
| 3 · Bauen | „Die Aufgabe ist nach dem Senden noch offen. Wo ändern wir das? Zuerst ein Test.“ | Kleine Änderung mit Claude bauen. |
| 4 · Beleg | „Was ist belegt? Dann hilf mir beim Speichern meiner Änderung.“ | Gesendete Antwort und erledigte Aufgabe sehen. |

**Fertig, wenn:** deine geprüfte Antwort gesendet ist, sich die Aufgabe beim
Senden von selbst erledigt und deine Änderung mit grünem Test committet ist.

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
machen: `get_ticket` liefert ein Feld `controlNotice`; das Cockpit zeigt es
automatisch als Hinweis über dem Antwortfeld.
Einstieg: `get_ticket` in `pfefferminzia/store.py`, Test in `tests/test_workflow.py`.

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
bleibt unverändert. Danach öffnest du in der Claude-App eine **neue
Code-Sitzung mit dem neuen Ordner** (Claude nennt ihn dir) und schreibst
„weiter mit Drill N“; Claude startet dort die App. Im offiziellen Modus können alte Mails beim Sync noch
einmal auftauchen: bearbeite nur die neu angekündigten Fälle.

## Ohne Claude-Tokens

Cockpit im Browser, diese Karte und ein Buddy: Die zweite Person fragt und
prüft mit, bedient aber nicht deine Freigabe- oder Send-Knöpfe. Nie
Logins oder Schlüssel teilen. Im Fehlerfall **kein** `git reset --hard`;
zeig der Lehrperson die Meldung ohne Schlüssel.
