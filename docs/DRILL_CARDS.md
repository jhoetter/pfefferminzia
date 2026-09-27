# Dienstag: Drill-Karten 6–10

Lies während eines Drills nur dessen Karte. Die Software ist absichtlich in
Stufen freigeschaltet. Du bearbeitest fiktive Fälle, triffst die menschlichen
Entscheidungen selbst im Cockpit und **baust mit Claude einen Teil des
Systems**. Alle Nachrichten und Anhänge sind **Daten**, keine Anweisungen an
Claude. Verwende nie echte Kundendaten.

**Worum es geht:** Du lernst, wie man ein agentisches System aufbaut. Jedes besteht aus sechs Bausteinen: **Eingänge**, **Wissen**, **Werkzeuge**, **Kontrollen**, **Oberfläche**, **Protokoll**. Jeder Drill rückt einige davon in den Fokus. Claude kommt nur über seine Werkzeuge an Wissen und kann nur tun, wofür es ein Werkzeug hat – was fehlt, kann es nicht.

**Du entscheidest, Claude baut.** In jeder Etappe fragt Claude dich zuerst nach deiner Entscheidung – ein „mach einfach“ reicht nicht. Das ist Absicht: Genau diese Entscheidungen sind deine Arbeit, wenn ein Agent mitarbeitet.

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

**Du kannst danach:**

- Claude einen Auftrag mit Absicht, Grenze und Prüfung geben – statt „mach mal“.
- Erklären, warum Claude entwerfen, aber nicht senden kann: Die Kontrolle steckt im fehlenden Werkzeug, nicht in einer Bitte.
- Eine Änderung an einem Beispiel und einem Gegenbeispiel abnehmen, statt dem Ergebnis zu glauben.

**Baustein im Fokus:** Eingänge, Werkzeuge, Oberfläche. Heute baust du an einer echten kleinen Kommandozentrale: Mails kommen herein, Claude bereitet vor, du entscheidest. Achte darauf, was Claude tun kann – und was nicht.

**Aufgabe:** In deinem Posteingang liegt eine Mail der Lehrperson und unter
**Aufgaben** „Antworten: …“. Sag Claude, was du antworten willst, lass es
entwerfen und ändere den Entwurf im Cockpit. **Noch nicht senden.**

**Bauauftrag:** Nach dem Senden bliebe die Aufgabe offen. Baue mit Claude,
dass sie sich beim Senden von selbst erledigt – nur die Antwort-Aufgabe
dieses Falls; eine zweite Aufgabe (z. B. „Rückruf planen“) bleibt offen.
Test zuerst. Danach sendest du selbst im Cockpit – das ist der Beweis. Einstieg: `send_ticket_draft` in
`pfefferminzia/agentmail_service.py`, `complete_ticket_todos` in
`pfefferminzia/todos.py`.

| Etappe | Frag Claude | Du entscheidest | Dann du |
| --- | --- | --- | --- |
| 1 · Ankommen | „Was liegt in meinem Posteingang, und was ist meine erste Aufgabe?“ | Was will die Absenderin von dir – und was möchtest du ihr in einem Satz antworten? | Die Mail im Cockpit öffnen, lesen und Claude die eigene Kernaussage für die Antwort nennen. |
| 2 · Entwerfen | „Entwirf aus meiner Kernaussage eine kurze, freundliche Antwort. Noch nicht senden.“ | Was änderst du am Entwurf, und warum? Und warum könnte Claude hier gar nicht senden, selbst wenn es wollte? | Entwurf im Cockpit lesen, etwas Eigenes ändern und speichern – noch nicht senden. |
| 3 · Selbst bauen | „Bevor ich sende: Bleibt die Aufgabe „Antworten“ nach dem Senden offen? Zeig es mir mit einem Test, dann bauen wir es.“ | Wie sollte das System wissen, welche Aufgabe mit dem Senden erledigt ist – und welche zweite Aufgabe legen wir als Gegenfall an, die offen bleiben muss? | Mit Claude eine zweite Aufgabe zum Fall anlegen (z. B. „Rückruf planen“), vorhersagen, ob der Test rot oder grün ist, dann die kleine Änderung bauen. |
| 4 · Senden und belegen | „Läuft die App mit meiner Änderung? Dann sende ich jetzt. Danach zeig mir: gesendete Antwort, Aufgaben, grüner Test – und hilf mir beim Commit.“ | Woran siehst du selbst, dass es funktioniert – ohne Claude zu glauben? | Im Cockpit auf „Senden“ klicken; unter „Aufgaben“ prüfen: „Antworten“ erledigt, die zweite Aufgabe offen; Commit freigeben. |

**Fertig, wenn:** deine geprüfte Antwort gesendet ist, sich die Aufgabe beim
Senden von selbst erledigt und deine Änderung mit grünem Test committet ist.

**Zum Schluss:** Was hast du heute entschieden, und was hat Claude gemacht? Wo war eine Grenze eingebaut, statt nur erbeten?

**Zum Nachdenken** – für Wartezeiten und wenn du früher fertig bist:

- Stell dir vor, Claude hätte heute ein Sende-Werkzeug gehabt: Was wäre mit deiner Antwort passiert – und wer hätte es gemerkt?
- Die Aufgabe „Antworten“ ist von selbst entstanden. Welche Aufgaben entstehen bei euch aus einer Mail – und welche davon dürfte ein Agent anlegen, welche nie?
- Woran merkst du bei einer neuen Kollegin, dass sie eine Mail nur überflogen hat – und woran würdest du es bei Claude merken?

**Früher fertig?** Nicht den nächsten Drill vorwegnehmen – gestalte deine eigene Kommandozentrale weiter. Was hättest du gern? Oder denk über den Vorschlag **Meine Mini-Wissensbasis** (Baustein Wissen) nach: Wenn Claude beim Antworten wissen soll, wer dir schreibt und wie du die Person ansprichst – wie würdest du das aufbauen: Wo liegen die Angaben, wie kommt Claude dran, und wer darf sie ändern? *Warum jetzt:* In Drill 7 bekommt Claude die große Wissensbasis des Versicherers: Kunden, Verträge, Tarife. Wer hier schon eine kleine gebaut hat, erkennt dort dieselbe Idee im Großen. Claude fragt dich nach deiner Idee, hilft beim Steckbrief ([MEINE_ERWEITERUNGEN.md](../MEINE_ERWEITERUNGEN.md)) und baut dann mit dir.

## Drill 7 – Leben: Mensch bearbeitet, Agent bereitet vor (60 Min.)

**Du kannst danach:**

- Erklären, woher ein Agent sein Wissen hat – nur aus den Quellen, die wir ihm als Werkzeug geben – und Behauptungen der Kundin davon trennen.
- Eine Fachregel so genau festlegen, dass sie prüfbar wird: was gilt als Fehler, was ausdrücklich nicht.
- Entscheiden, was eine automatische Prüfung der Sachbearbeitung sagen muss, damit sie hilft statt nervt.

**Baustein im Fokus:** Wissen, Kontrollen. In Drill 6 kannte Claude nur die Mail. Jetzt bekommt es die Wissensbasis des Versicherers: Kunden, Verträge, Tarife – über Werkzeuge, die nur lesen dürfen.

**Aufgabe:** Die Lehrperson schickt eine fiktive Lebensanfrage. Claude
ordnet Person, Police und Tarifgeneration zu und entwirft mit Beleg. Du
änderst den Text im Cockpit und sendest dort selbst.

**Bauauftrag:** Ein Entwurf, der eine **falsche Tarifgeneration** zitiert
(z. B. „PL-2012“, wenn der Vertrag PL-2017 hat), wird beim Speichern mit
klarer Meldung abgewiesen. Ein korrekter Entwurf bleibt erlaubt.
Einstieg: `save_draft` in `pfefferminzia/store.py`, Tests in `tests/test_workflow.py`.

| Etappe | Frag Claude | Du entscheidest | Dann du |
| --- | --- | --- | --- |
| 1 · Quelle | „Welche Person, Police und Tarifgeneration passen? Zeig mir die Belege, noch kein Entwurf.“ | Welche Aussage in der Mail ist nur Behauptung der Kundin, welche ist durch Vertrag und Tarif belegt? Stimmt die Zuordnung – woran machst du das fest? | Zuordnung selbst bestätigen. |
| 2 · Entwurf | „Erstelle einen begründeten Entwurf mit Fundstelle. Senden mache ich im Cockpit.“ | Welchen Satz im Entwurf würdest du so nicht unterschreiben, und wie lautet er besser? | Im Cockpit ändern, speichern, bewusst senden. |
| 3 · Bauen | „Hilf mir mit einem fehlschlagenden Test für eine falsch zitierte Tarifgeneration.“ | Wann ist ein Tarifzitat für dich falsch – auch wenn gar keiner oder zwei genannt sind? Und wie soll die Meldung wörtlich lauten, damit die Sachbearbeitung sofort weiß, was zu tun ist? | Schutzregel mit Claude bauen, Gegenfall testen. |
| 4 · Beleg | „Zeig mir Quelle, meine Änderung, Versand und Test. Dann Commit.“ | Versuch die Prüfung auszutricksen: Welchen Entwurf schreibst du im Cockpit, damit sie greifen müsste? | Activity Log prüfen, committen. |

**Fertig, wenn:** ein belegter Entwurf von dir geändert und gesendet wurde
und die Tarif-Belegprüfung getestet und committet ist.

**Zum Schluss:** Wo hast du heute einer Quelle mehr geglaubt als der Mail – und würde die Regel in deinem Haus sperren oder nur warnen?

**Zum Nachdenken** – für Wartezeiten und wenn du früher fertig bist:

- Die Kundin nennt ihre Vertragsnummer selbst. Was, wenn sie sich vertippt hat – woran merkt es ein Mensch, woran der Agent?
- Claude darf Tarife nur lesen. Welche Quelle in deinem Haus dürfte ein Agent auf keinen Fall lesen – und warum?
- Die Prüfregel stoppt einen falschen Tarif. Welche andere Zusage an Kunden würdest du gern automatisch prüfen lassen?

**Früher fertig?** Nicht den nächsten Drill vorwegnehmen – gestalte deine eigene Kommandozentrale weiter. Was hättest du gern? Oder denk über den Vorschlag **Beleg-Kasten im Cockpit** (Baustein Oberfläche) nach: Stell dir vor, du musst in zehn Sekunden entscheiden, ob du einem Entwurf traust – wie sollte das Cockpit dir das zeigen? *Warum jetzt:* In Drill 8 gibst du Antworten frei, statt sie selbst zu schreiben. Dafür musst du auf einen Blick sehen, worauf sich ein Entwurf stützt. Claude fragt dich nach deiner Idee, hilft beim Steckbrief ([MEINE_ERWEITERUNGEN.md](../MEINE_ERWEITERUNGEN.md)) und baut dann mit dir.

## Drill 8 – Leben: Agent bearbeitet, Mensch gibt frei (60 Min.)

**Du kannst danach:**

- Eigene Prüfkriterien festlegen, bevor man die Arbeit des Agenten ansieht.
- Eine Ablehnung so begründen, dass der Agent sie umsetzen kann – Feedback als Steuerung.
- Begründen, warum eine Freigabe an genau einen Textstand gebunden ist, und was ein Prüfer im Moment der Entscheidung sehen muss.

**Baustein im Fokus:** Kontrollen, Oberfläche. Bisher hast du jeden Entwurf selbst geändert und gesendet. Jetzt bereitet Claude alles vor, und du entscheidest nur noch: freigeben oder ablehnen.

**Aufgabe:** Zwei neue Lebensfälle. Claude bereitet beide bis zur
Review-Vorlage vor. Im Cockpit unter **Freigaben** gibst du einen frei und
sendest ihn; den anderen lehnst du begründet ab, Claude überarbeitet. Ändere
dann testweise einen freigegebenen Text: Die Freigabe verfällt.

**Bauauftrag:** Ablehnungsgrund und erloschene Freigabe im Cockpit sichtbar
machen: `get_ticket` liefert ein Feld `controlNotice`; das Cockpit zeigt es
automatisch als Hinweis über dem Antwortfeld.
Einstieg: `get_ticket` in `pfefferminzia/store.py`, Test in `tests/test_workflow.py`.

| Etappe | Frag Claude | Du entscheidest | Dann du |
| --- | --- | --- | --- |
| 1 · Vorlage | „Bereite beide Fälle bis zur Review-Vorlage vor. Freigeben kann nur ich.“ | Bevor du die Vorlagen ansiehst: Nach welchen zwei, drei Punkten prüfst du eine Antwort, bevor du sie freigibst? | Vorlagen und Fundstellen prüfen. |
| 2 · Entscheidung | „Welche Folgen haben Freigabe und Ablehnung hier?“ | Welchen Fall lehnst du ab – sind beide gut, den, der einen deiner Prüfpunkte am schwächsten erfüllt – und welcher eine Satz Begründung sagt Claude genau, was zu ändern ist? | Im Cockpit freigeben + senden bzw. begründet ablehnen. |
| 3 · Bauen | „Wie zeigen wir Ablehnung und Freigabeverlust klarer? Zuerst ein Test.“ | Jemand öffnet den Fall morgen: Was muss im Hinweis stehen (wer, wann, warum), und wann soll er wieder verschwinden? | Verbesserung bauen, im Browser prüfen. |
| 4 · Beleg | „Was zeigt das Audit nach Ablehnung und nach einem Edit? Dann Commit.“ | Soll schon ein geändertes Komma eine Freigabe aufheben – was spricht dafür (Sicherheit), was dagegen (Aufwand)? | Freigabeverlust sehen, committen. |

**Fertig, wenn:** eine Freigabe und eine Ablehnung im Audit stehen, ein Edit
die Freigabe entwertet hat und deine Verbesserung committet ist.

**Zum Schluss:** Welche Arbeit darf der Agent in deinem Haus komplett vorbereiten – und an welcher Stelle muss ein Name unter der Entscheidung stehen?

**Zum Nachdenken** – für Wartezeiten und wenn du früher fertig bist:

- Wenn du zehn Freigaben am Tag machst: Ab der wievielten liest du nicht mehr genau – und was hieße das für das System?
- Eine Freigabe verfällt, wenn sich der Text ändert. Wo gibt es bei euch heute Freigaben, die eigentlich verfallen müssten?
- Deine Ablehnung hat Claude gesteuert. Was unterscheidet das von Feedback an eine neue Mitarbeiterin – und was nicht?

**Früher fertig?** Nicht den nächsten Drill vorwegnehmen – gestalte deine eigene Kommandozentrale weiter. Was hättest du gern? Oder denk über den Vorschlag **Risiko-Einstufung je Fall** (Baustein Kontrollen) nach: Wie würdest du Fälle nach Risiko sortieren – woran erkennt man einen riskanten Fall, und wer sollte das festlegen? *Warum jetzt:* In Drill 9 laufen manche Antworten automatisch raus. Welche dürfen das? Deine Einstufung ist die Grundlage für diese Entscheidung. Claude fragt dich nach deiner Idee, hilft beim Steckbrief ([MEINE_ERWEITERUNGEN.md](../MEINE_ERWEITERUNGEN.md)) und baut dann mit dir.

## Drill 9 – Haftpflicht: Eingriffsfenster (60 Min.)

**Du kannst danach:**

- Pflichtfreigabe und Eingriffsfenster am eigenen Erleben abwägen: Aufwand, Risiko, Verantwortung.
- Festlegen, welche Fälle automatisch laufen dürfen und welche nie.
- Vorher sagen, was die Automatik tun wird, und es danach am Protokoll überprüfen.

**Baustein im Fokus:** Kontrollen, Protokoll. Eine Freigabe für jeden Fall kostet Zeit. Jetzt probierst du die Alternative: Antworten laufen automatisch, wenn niemand im Zeitfenster eingreift.

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

| Etappe | Frag Claude | Du entscheidest | Dann du |
| --- | --- | --- | --- |
| 1 · Routing | „Welche Fälle sind Haftpflicht, und ist der Empfänger erlaubt? Noch nichts einplanen.“ | Welcher Fall wäre dir für einen automatischen Versand zu heikel – und woran erkennst du das? | Sparte und Quellen prüfen. |
| 2 · Queue | „Bereite belegte Antworten vor und plane sie ein.“ | Welchen lässt du laufen, welchen änderst du, welchen stoppst du – je ein Satz Begründung. Und: Wie viele Mails gehen nach +24 h raus, und welche? | Im Cockpit: einen ändern, einen stoppen, einen lassen. |
| 3 · Bauen | „Wie machen wir Stopp und Duplikatschutz überprüfbar? Zuerst ein Test.“ | Was wäre schlimmer: eine Antwort doppelt oder eine gestoppte Antwort doch versendet? Welche zwei Fälle muss der Test deshalb unbedingt enthalten? | Verbesserung mit Claude bauen. |
| 4 · Wirkung | „Was würde nach dem Zeitsprung rausgehen? Danach prüfen und Commit.“ | Stimmt das Ergebnis mit deiner Vorhersage überein? Würdest du das Fenster in echt kürzer oder länger machen – wovon hängt es ab? | Zeitsprung im Cockpit, Audit prüfen, committen. |

**Fertig, wenn:** ein Auto-Versand, ein Edit (`schedule_cancelled`) und ein
Stopp (`queue_removed`) im Audit stehen und deine Verbesserung committet ist.

**Zum Schluss:** Für welche Fälle in deinem Haus wäre „läuft, wenn niemand widerspricht“ vertretbar – und wer schaut dann ins Fenster?

**Zum Nachdenken** – für Wartezeiten und wenn du früher fertig bist:

- Im Fenster hat niemand widersprochen, also ging die Mail raus. Wer trägt die Verantwortung: der Agent, du oder wer das Fenster festgelegt hat?
- Was passiert mit dem Eingriffsfenster am Freitagabend oder in der Ferienzeit?
- Welche Routine läuft bei euch heute schon nach „geht raus, wenn niemand widerspricht“ – nur ohne Agent?

**Früher fertig?** Nicht den nächsten Drill vorwegnehmen – gestalte deine eigene Kommandozentrale weiter. Was hättest du gern? Oder denk über den Vorschlag **Eine Kennzahl für deinen Report** (Baustein Protokoll) nach: Welche Frage würde dein Vorstand zum Eingriffsfenster stellen – und was müssten wir dafür mitzählen? *Warum jetzt:* In Drill 10 wird aus dem Protokoll ein Management-Bericht. Was dort nicht gezählt wird, kannst du nicht belegen. Claude fragt dich nach deiner Idee, hilft beim Steckbrief ([MEINE_ERWEITERUNGEN.md](../MEINE_ERWEITERUNGEN.md)) und baut dann mit dir.

## Drill 10 – Management-Report mit reveal.js und D3 (45 Min.)

**Du kannst danach:**

- Beobachtung, Deutung und Empfehlung trennen und die Grenze einer Aussage aus einer kleinen Simulation benennen.
- Das eigene agentische System aus seinen sechs Bausteinen erklären: was es darf, wo der Mensch entscheidet.
- Eine Grafik so anlegen, dass sie genau eine Frage beantwortet.

**Baustein im Fokus:** Protokoll. Alles, was heute passiert ist, steht im Protokoll. Jetzt machst du daraus eine belegte Aussage für dein Management – und zeigst dein System.

**Start:** „Ich will zu Drill 10. Frag mich, ob ich meinen Stand mitnehmen
will.“ Der Checkpoint wird aus dem **Drill-9-Ordner** geladen und übernimmt
nur gruppierte Zählwerte (keine Namen, Mailtexte, Schlüssel).

**Bauauftrag:** In `slides/management.js` eine zweite beschriftete
D3-Grafik (z. B. Freigaben, Ablehnungen, Stopps, Auto-Versände) und deine
eigene Empfehlung mit Grenze. Ansicht:
<http://127.0.0.1:3004/slides/index.html?deck=management>. Kein Node, npm
oder CDN.

| Etappe | Frag Claude | Du entscheidest | Dann du |
| --- | --- | --- | --- |
| 1 · Befund | „Welche Beobachtung aus dem Snapshot ist wirklich belegt?“ | Welche eine Frage soll dein Vorstand nach zwei Minuten beantworten können? Welche Zahl stützt die Antwort, und was würde sie widerlegen? | Eine Aussage und ihre Grenze wählen. |
| 2 · D3 | „Erst Datenform und Skizze, dann der Grafik-Code.“ | Was soll man in fünf Sekunden sehen – was kommt auf die Achsen, was wird hervorgehoben, und was steht da, wenn ein Wert null ist? | Achsen, Beschriftung, Nullfälle prüfen. |
| 3 · Empfehlung | „Verdichte Beleg, Kontrollregel und Unsicherheit auf eine Folie.“ | Wie lautet deine Empfehlung in zwei Sätzen: was, auf welchem Beleg, mit welcher Kontrollregel – und was beweist sie ausdrücklich nicht? | Empfehlung selbst formulieren; max. 4 Folien. |
| 4 · Vorführen | „Prüfe Folien, Zahlen und Datenschutz. Dann Commit.“ | Welche Rückfrage aus dem Vorstand fürchtest du am meisten, und was antwortest du? | Zwei Minuten präsentieren. |

**Zum Schluss:** Was nimmst du aus dem Tag als Regel mit: Welche Arbeit darf ein Agent bei euch allein, mit Fenster oder nur mit Freigabe tun?

**Zum Nachdenken** – für Wartezeiten und wenn du früher fertig bist:

- Welche Zahl aus dem Workshop würde dein Vorstand am ehesten falsch verstehen – und wie verhinderst du das?
- Wenn du morgen einen Baustein bei euch einführen dürftest: Welcher bringt am meisten, welcher birgt das größte Risiko?
- Was müsste im Protokoll stehen, damit du einem Prüfer in einem Jahr erklären kannst, warum eine Antwort rausging?

**Früher fertig?** Nicht den nächsten Drill vorwegnehmen – gestalte deine eigene Kommandozentrale weiter. Was hättest du gern? Oder denk über den Vorschlag **Folie: Mein agentisches System** (alle Bausteine) nach: Wie würdest du einer Kollegin in einem Bild erklären, was dein System darf und wo du entscheidest? *Warum jetzt:* Das nimmst du mit nach Hause: dein System in einem Bild. Claude fragt dich nach deiner Idee, hilft beim Steckbrief ([MEINE_ERWEITERUNGEN.md](../MEINE_ERWEITERUNGEN.md)) und baut dann mit dir.

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
