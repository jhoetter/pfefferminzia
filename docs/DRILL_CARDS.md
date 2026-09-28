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
Beim nächsten Drill gibt es immer einen offiziellen Zwischenstand mit Lösung.

## Start (einmal, zu Beginn von Drill 6)

Du brauchst **kein Terminal**. Öffne die Claude-App → **Code** → neue
Sitzung mit deinem Benutzerordner und schreibe:

> Klone https://github.com/jhoetter/pfefferminzia nach ~/pfefferminzia,
> richte alles nach der README ein und starte die Kommandozentrale.
> Ich bin in Drill 6.

Claude richtet alles ein und öffnet <http://127.0.0.1:3004>. Wenn es fragt,
füge den **Schlüssel von deinem Zettel** ein (beginnt mit `am_`). Grauer
Text im Eingabefeld ist nur ein Vorschlag der App – nicht übernehmen; mehr
brauchst du nicht. Das ist **nur** in diesem synthetischen Workshop in
Ordnung; echte Zugangsdaten und Kundendaten gehören nie in einen Chat, den
Schlüssel nie in Git, Gruppenchats oder Screenshots. Danach bittet Claude
dich einmal, eine **neue Code-Sitzung mit dem Ordner `pfefferminzia`** zu
öffnen, dort „weiter mit Drill 6“ zu schreiben und die Frage nach dem
Pfefferminzia-Server mit Ja zu beantworten. Den Schlüssel musst du dort nicht
noch einmal eingeben. Alles Weitere (Befehle,
Prüfungen, Speichern) erledigt Claude für dich; du prüfst im Cockpit und im Chat.

**Wichtig:** An deine Workshop-Adresse kann jede externe Adresse schreiben
(auch Gmail). Die Antwort-Liste sperrt nur **ausgehende**
Antworten. Eine private Testmail ist nur ein Verbindungstest, kein
Versicherungsfall.

**Freigeben, Ablehnen, Senden und die Workshop-Uhr gibt es nur im Cockpit.**
Claude hat dafür kein Werkzeug – das ist die Lektion des Tages.

## Drill 6 – Die Kommandozentrale (60 Min.)

**Du kannst danach:**

- Claude einen Auftrag mit Absicht, Grenze und Prüfung geben – statt „mach mal“.
- Erklären, warum Claude entwerfen, aber nicht senden kann: Die Kontrolle steckt im fehlenden Werkzeug, nicht in einer Bitte.
- Verstehen, warum man ein System an mehreren Szenarien prüft – auch an dem, was nie passieren darf –, bevor man ihm vertraut.

**Baustein im Fokus:** Eingänge, Werkzeuge, Oberfläche. Heute baust du an einer echten kleinen Kommandozentrale: Mails kommen herein, Claude bereitet vor, du entscheidest. Achte darauf, was Claude tun kann – und was nicht.

**Was du heute im Cockpit siehst** – neu: Alles – das ist deine eigene kleine Kommandozentrale.

- Links „Posteingang“: Jede Mail aus deinem Postfach wird ein Fall mit Nummer, z. B. PF-1008. Unten links holt der Pfeil neue Mails ab.
- Links „Aufgaben“: Zu jeder neuen Mail entsteht von selbst die Aufgabe „Antworten: …“. Aufgaben kann man von Hand abhaken.
- Klickst du einen Fall an, siehst du die Mail, darunter den Antwortentwurf mit „Speichern“ und „Senden“ und ganz unten die „Aktivität“ – das Protokoll, wer wann was getan hat.
- Claude kann: Mails abholen, Fälle lesen, Aufgaben anlegen und Antworten entwerfen. Claude kann nicht: Senden – dafür hat Claude kein Werkzeug. Senden kannst nur du im Cockpit.

**So läuft die Stunde:**

1. Du liest die Mail und sagst, was du antworten willst.
2. Claude entwirft, du änderst – aber du sendest noch nicht.
3. Gemeinsam bauen: Die Aufgabe „Antworten“ soll sich beim Senden von selbst erledigen.
4. Du sendest – und siehst in den Aufgaben, dass es wirkt.

**Aufgabe:** In deinem Posteingang liegt eine Mail der Lehrperson und unter
**Aufgaben** „Antworten: …“. Sag Claude, was du antworten willst, lass es
entwerfen und ändere den Entwurf im Cockpit. **Noch nicht senden.**

**Bauauftrag:** Nach dem Senden bliebe die Aufgabe offen. Baue mit Claude,
dass sie sich beim Senden von selbst erledigt – nur die Antwort-Aufgabe
dieses Falls; eine zweite Aufgabe (z. B. „Rückruf planen“) bleibt offen.
Vorher legst du fest, welche Szenarien stimmen müssen. Danach sendest du
selbst im Cockpit – das ist der Beweis.

| Etappe | Frag Claude | Du entscheidest | Dann du |
| --- | --- | --- | --- |
| 1 · Ankommen | „Was liegt in meinem Posteingang, und was ist meine erste Aufgabe?“ | Was will die Absenderin von dir – und was möchtest du ihr in einem Satz antworten? | Die Mail im Cockpit öffnen, lesen und Claude die eigene Kernaussage für die Antwort nennen. |
| 2 · Entwerfen | „Entwirf aus meiner Kernaussage eine kurze, freundliche Antwort. Noch nicht senden – mein Senden soll nachher zeigen, dass unser Bau wirkt.“ | Was änderst du am Entwurf, und warum? Und warum könnte Claude hier gar nicht senden, selbst wenn es wollte? | Entwurf im Cockpit lesen, etwas Eigenes ändern und speichern – noch nicht senden. Senden ist in Etappe 4 der Beweis. |
| 3 · Selbst bauen | „Bevor ich sende: Welche Szenarien müssen stimmen, damit ich mich darauf verlassen kann, dass sich die Aufgabe beim Senden erledigt? Hilf mir, sie aufzuschreiben, dann bauen wir es.“ | Wie sollte das System wissen, welche Aufgabe mit dem Senden erledigt ist – und welche zweite Aufgabe legen wir als Gegenfall an, die offen bleiben muss? | Mit Claude eine zweite Aufgabe zum Fall anlegen (z. B. „Rückruf planen“), die Szenarien in eigenen Worten festlegen – was soll passieren, was darf nie passieren –, dann Claude die kleine Änderung bauen lassen. |
| 4 · Senden und belegen | „Läuft die App mit meiner Änderung? Dann sende ich jetzt. Danach zeig mir: gesendete Antwort, Aufgaben, bestandene Szenarien – und hilf mir, meinen Stand zu speichern.“ | Woran siehst du selbst, dass es funktioniert – ohne Claude zu glauben? | Im Cockpit auf „Senden“ klicken; unter „Aufgaben“ prüfen: „Antworten“ erledigt, die zweite Aufgabe offen; Speichern freigeben. |

**Fertig, wenn:** Eine von dir geprüfte Antwort ist gesendet; die Antwort-Aufgabe erledigt sich beim Senden automatisch; eigene Änderung mit bestandenen Szenarien gespeichert.

**Zum Schluss:** Was hast du heute entschieden, und was hat Claude gemacht? Wo war eine Grenze eingebaut, statt nur erbeten?

**Zum Nachdenken** – für Wartezeiten und wenn du früher fertig bist:

- Stell dir vor, Claude hätte heute ein Sende-Werkzeug gehabt: Was wäre mit deiner Antwort passiert – und wer hätte es gemerkt?
- Die Aufgabe „Antworten“ ist von selbst entstanden. Welche Aufgaben entstehen bei euch aus einer Mail – und welche davon dürfte ein Agent anlegen, welche nie?
- Woran merkst du bei einer neuen Kollegin, dass sie eine Mail nur überflogen hat – und woran würdest du es bei Claude merken?

**Früher fertig?** Nicht den nächsten Drill vorwegnehmen – bau die heutigen Teile weiter aus: Was würdest du gern noch sehen oder tun können? Anregungen: Posteingang: Suche und ein Filter „nur offene Fälle“; Aufgaben: Fälligkeit und „wer ist dran“ – und sichtbar machen, wodurch eine Aufgabe erledigt wurde; Entwurf: ein Knopf im Cockpit „Claude um einen Entwurf bitten“ – was müsste er Claude mitgeben?. Oder der Vorschlag **Meine Mini-Wissensbasis**: Wenn Claude beim Antworten wissen soll, wer dir schreibt und wie du die Person ansprichst – wie würdest du das aufbauen: Wo liegen die Angaben, wie kommt Claude dran, und wer darf sie ändern? Claude fragt dich nach deiner Idee, hilft beim Steckbrief ([MEINE_ERWEITERUNGEN.md](../MEINE_ERWEITERUNGEN.md)) und baut dann mit dir.

## Drill 7 – Leben: Mensch bearbeitet, Agent bereitet vor (60 Min.)

**Du kannst danach:**

- Erklären, woher ein Agent sein Wissen hat – nur aus den Quellen, die wir ihm als Werkzeug geben – und Behauptungen der Kundin davon trennen.
- Eine Fachregel so genau festlegen, dass sie prüfbar wird: was gilt als Fehler, was ausdrücklich nicht.
- Entscheiden, was eine automatische Prüfung der Sachbearbeitung sagen muss, damit sie hilft statt nervt.

**Baustein im Fokus:** Wissen, Kontrollen. In Drill 6 kannte Claude nur die Mail. Jetzt bekommt es die Wissensbasis des Versicherers: Kunden, Verträge, Tarife – über Werkzeuge, die nur lesen dürfen.

**Was du heute im Cockpit siehst** – neu: Der Bestand des Versicherers kommt dazu: die Kunden, Verträge und Tarife aus den CSV-Dateien von Montag. Claude darf darin nachschlagen, ändern kann es nichts.

- Links neu „Bestand“: oben steht, woher die Daten kommen; darunter Kunden (mit Suche) und Tarife. Ein Klick auf eine Kundin zeigt Stammdaten und Verträge, ein Klick auf einen Vertrag Begünstigte und Tarifblatt.
- Im Fall neu: „Aus dem Bestand“ zwischen Mail und Entwurf – was zur Mail im Bestand nachgeschlagen wurde, und wer es wie zugeordnet hat. Das steht nicht in der Mail.
- Posteingang, Aufgaben, Entwurf, Senden und Aktivität kennst du aus Drill 6.
- Claude kann: Den Bestand laden und darin suchen, den Fall einer Kundin und einem Vertrag zuordnen, die passende Tarifgeneration lesen und mit Fundstelle entwerfen. Claude kann nicht: Senden und im Bestand etwas ändern.

**So läuft die Stunde:**

1. Claude lädt den Bestand; du schaust ihn dir an und bestätigst Kundin, Vertrag und Tarifgeneration zu deiner Lebensanfrage selbst.
2. Claude entwirft mit Beleg, du änderst den Text – noch nicht senden.
3. Gemeinsam bauen: Ein Entwurf mit falscher Tarifgeneration wird beim Speichern gestoppt.
4. Du versuchst, die Prüfung auszutricksen – dann korrigierst du und sendest selbst.

**Aufgabe:** Claude lädt zuerst den Bestand von gestern – die Kunden,
Verträge und Tarife aus den CSV-Dateien von Montag; du musst nichts tun. Du
siehst ihn links unter **Bestand**. Dann kommt die Lebensanfrage der
Lehrperson: Du bestätigst Kundin, Vertrag und Tarifgeneration selbst im
Bestand, Claude entwirft mit Beleg, du änderst den Text – gesendet wird erst
am Ende.

**Bauauftrag:** Ein Entwurf, der eine **falsche Tarifgeneration** zitiert
(z. B. „PL-2012“, wenn der Vertrag PL-2017 hat), wird beim Speichern mit
klarer Meldung abgewiesen. Ein korrekter Entwurf bleibt erlaubt. Den
Wortlaut der Meldung legst du fest. Danach versuchst du, die Prüfung an
deinem eigenen Fall auszutricksen – und sendest erst dann.

| Etappe | Frag Claude | Du entscheidest | Dann du |
| --- | --- | --- | --- |
| 1 · Bestand und Quelle | „Lade den Bestand von gestern und zeig mir, wo ich ihn sehe. Welche Kundin und welcher Vertrag passen zur neuen Lebensanfrage? Noch keinen Entwurf.“ | Welche Aussage in der Mail ist nur Behauptung der Kundin – und was findest du dazu selbst im Bestand? | Links „Bestand“ öffnen, die Kundin selbst suchen und im Fall unter „Aus dem Bestand“ die Zuordnung und Tarifgeneration bestätigen oder widersprechen. |
| 2 · Entwurf prüfen | „Erstelle jetzt einen begründeten Antwortentwurf mit Fundstelle. Noch nicht senden – erst bauen wir die Prüfung.“ | Welchen Satz im Entwurf würdest du so nicht unterschreiben, und wie lautet er besser? | Text im Cockpit prüfen, den Satz selbst ändern und speichern – noch nicht senden. |
| 3 · Selbst bauen | „Wir bauen eine Prüfung gegen falsch zitierte Tarifgenerationen. Frag mich zuerst nach der Regel und den Szenarien, die sie bestehen muss, dann bauen wir.“ | Wann ist ein Tarifzitat für dich falsch – auch wenn gar keiner oder zwei genannt sind? Und wie soll die Meldung wörtlich lauten, damit die Sachbearbeitung sofort weiß, was zu tun ist? | Szenarien mit einem eigenen Gegenfall festlegen, Meldungstext selbst formulieren, dann mit Claude bauen. |
| 4 · Austricksen und senden | „Ich schreibe jetzt absichtlich eine falsche Tarifgeneration in meinen Entwurf. Wird er gestoppt? Danach korrigiere ich und sende – und du hilfst mir, meinen Stand zu speichern.“ | Mit welchem falschen Satz versuchst du, die Prüfung auszutricksen – und hält sie? | Im eigenen Fall eine falsche Tarifgeneration eintragen und speichern, die eigene Meldung sehen; dann korrigieren, speichern und selbst senden; Stand speichern. |

**Fertig, wenn:** Ein belegter Lebensentwurf wurde vom Menschen im Cockpit verändert und gesendet; die Tarif-Belegprüfung ist geprüft und gespeichert.

**Zum Schluss:** Wo hast du heute einer Quelle mehr geglaubt als der Mail – und würde die Regel in deinem Haus sperren oder nur warnen?

**Zum Nachdenken** – für Wartezeiten und wenn du früher fertig bist:

- Die Kundin nennt ihre Vertragsnummer selbst. Was, wenn sie sich vertippt hat – woran merkt es ein Mensch, woran der Agent?
- Claude darf Tarife nur lesen. Welche Quelle in deinem Haus dürfte ein Agent auf keinen Fall lesen – und warum?
- Die Prüfregel stoppt einen falschen Tarif. Welche andere Zusage an Kunden würdest du gern automatisch prüfen lassen?

**Früher fertig?** Nicht den nächsten Drill vorwegnehmen – bau die heutigen Teile weiter aus: Was würdest du gern noch sehen oder tun können? Anregungen: Bestand: das Tarifblatt direkt im Cockpit anzeigen statt als Download; Bestand: bei einer Kundin auch alle ihre Fälle aus dem Posteingang zeigen; Aus dem Bestand: markieren, wo die Mail vom Bestand abweicht, z. B. eine falsche Vertragsnummer. Oder der Vorschlag **Beleg-Ampel am Entwurf**: Stell dir vor, du musst in zehn Sekunden entscheiden, ob du einem Entwurf traust – was müsste dir das Cockpit dafür signalisieren? Claude fragt dich nach deiner Idee, hilft beim Steckbrief ([MEINE_ERWEITERUNGEN.md](../MEINE_ERWEITERUNGEN.md)) und baut dann mit dir.

## Drill 8 – Leben: Agent bearbeitet, Mensch gibt frei (60 Min.)

**Du kannst danach:**

- Eigene Prüfkriterien festlegen, bevor man die Arbeit des Agenten ansieht.
- Eine Ablehnung so begründen, dass der Agent sie umsetzen kann – Feedback als Steuerung.
- Begründen, warum eine Freigabe an genau einen Textstand gebunden ist, und was ein Prüfer im Moment der Entscheidung sehen muss.

**Baustein im Fokus:** Kontrollen, Oberfläche. Bisher hast du jeden Entwurf selbst geändert und gesendet. Jetzt bereitet Claude alles vor, und du entscheidest nur noch: freigeben oder ablehnen.

**Was du heute im Cockpit siehst** – neu: Claude darf Lebensfälle jetzt komplett vorbereiten – aber nichts verlässt das Haus ohne deine aktuelle Freigabe.

- Links neu „Freigaben“: Dort liegen die Lebensantworten, die Claude dir vorgelegt hat.
- Im Fall neu: „Sparte“. Nur Lebensantworten brauchen deine Freigabe – deshalb ordnet Claude jeden Fall einer Sparte zu, und du kannst sie ändern.
- Im Fall: „Freigeben“ oder „Ablehnen“ mit Begründung. Erst nach deiner Freigabe kannst du senden.
- Änderst du einen freigegebenen Text, erlischt die Freigabe – das steht dann in der Aktivität.
- Unter „Aus dem Bestand“ siehst du wie in Drill 7 Kundin, Vertrag und Tarifblatt – daran misst du die Vorlage.
- Claude kann: Fälle zuordnen, die Sparte setzen, Antworten mit Beleg entwerfen, zur Freigabe vorlegen und nach einer Ablehnung überarbeiten. Claude kann nicht: Freigeben, ablehnen oder senden.

**So läuft die Stunde:**

1. Bevor du etwas ansiehst: Nach welchen Punkten prüfst du?
2. Claude bereitet zwei Fälle vor; du gibst einen frei und lehnst einen begründet ab.
3. Gemeinsam bauen: Wer den Fall später öffnet, sieht sofort, warum abgelehnt wurde.
4. Du änderst einen freigegebenen Text und siehst die Freigabe erlöschen.

**Aufgabe:** Zwei neue Lebensfälle. Claude bereitet beide bis zur
Freigabe-Vorlage vor. Im Cockpit unter **Freigaben** gibst du einen frei und
sendest ihn; den anderen lehnst du begründet ab, Claude überarbeitet. Ändere
dann testweise einen freigegebenen Text: Die Freigabe verfällt.

**Bauauftrag:** Wer einen Fall später öffnet, soll sofort sehen, warum er
abgelehnt wurde oder dass eine Freigabe erloschen ist – als Hinweis über dem
Antwortfeld. Was im Hinweis steht, legst du fest.

| Etappe | Frag Claude | Du entscheidest | Dann du |
| --- | --- | --- | --- |
| 1 · Fälle vorbereiten | „Bereite die zwei neuen Lebensfälle mit Belegen und Antwort bis zur Freigabe-Vorlage vor. Freigeben kann nur ich im Cockpit.“ | Bevor du die Vorlagen ansiehst: Nach welchen zwei, drei Punkten prüfst du eine Antwort, bevor du sie freigibst? | Die eigenen Prüfpunkte nennen, dann beide Vorlagen im Cockpit unter „Freigaben“ daran messen. |
| 2 · Mensch entscheidet | „Welche Folgen haben Freigabe und Ablehnung bei diesen beiden Fällen?“ | Welchen Fall lehnst du ab – sind beide gut, den, der einen deiner Prüfpunkte am schwächsten erfüllt – und welcher eine Satz Begründung sagt Claude genau, was zu ändern ist? | Im Cockpit einen Fall freigeben und senden, den anderen mit eigener Begründung ablehnen; prüfen, ob Claudes Überarbeitung die Begründung trifft. |
| 3 · Selbst bauen | „Wie zeigen wir Ablehnungsgrund oder erloschene Freigabe im Cockpit klarer? Frag mich zuerst, was der Hinweis sagen soll und in welchen Szenarien er erscheinen muss.“ | Jemand öffnet den Fall morgen: Was muss im Hinweis stehen (wer, wann, warum), und wann soll er wieder verschwinden? | Inhalt und Verschwinden des Hinweises festlegen, die Verbesserung mit Claude bauen und im Browser prüfen. |
| 4 · Beleg zeigen | „Prüfe im Protokoll Freigabe und Ablehnung. Was passiert, wenn ich einen freigegebenen Text ändere? Dann hilf mir, meinen Stand zu speichern.“ | Soll schon ein geändertes Komma eine Freigabe aufheben – was spricht dafür (Sicherheit), was dagegen (Aufwand)? | Einen freigegebenen Text im Cockpit ändern, den Freigabeverlust sehen; Szenarien bestanden; Stand speichern. |

**Fertig, wenn:** Eine Freigabe und eine Ablehnung im Protokoll; eine Änderung entwertet die alte Freigabe; eigene Verbesserung an der Freigabe geprüft und gespeichert.

**Zum Schluss:** Welche Arbeit darf der Agent in deinem Haus komplett vorbereiten – und an welcher Stelle muss ein Name unter der Entscheidung stehen?

**Zum Nachdenken** – für Wartezeiten und wenn du früher fertig bist:

- Wenn du zehn Freigaben am Tag machst: Ab der wievielten liest du nicht mehr genau – und was hieße das für das System?
- Eine Freigabe verfällt, wenn sich der Text ändert. Wo gibt es bei euch heute Freigaben, die eigentlich verfallen müssten?
- Deine Ablehnung hat Claude gesteuert. Was unterscheidet das von Feedback an eine neue Mitarbeiterin – und was nicht?

**Früher fertig?** Nicht den nächsten Drill vorwegnehmen – bau die heutigen Teile weiter aus: Was würdest du gern noch sehen oder tun können? Anregungen: Freigaben: deine Prüfpunkte als Checkliste im Freigabe-Dialog; freigeben erst, wenn alle abgehakt sind; Freigaben: zeigen, was sich seit der letzten Freigabe am Text geändert hat; Freigaben: Ablehnen nur mit Kategorie (Ton, Fakten, Beleg, Zusage). Oder der Vorschlag **Risiko-Einstufung je Fall**: Wie würdest du Fälle nach Risiko sortieren – woran erkennt man einen riskanten Fall, und wer sollte das festlegen? Claude fragt dich nach deiner Idee, hilft beim Steckbrief ([MEINE_ERWEITERUNGEN.md](../MEINE_ERWEITERUNGEN.md)) und baut dann mit dir.

## Drill 9 – Haftpflicht: Eingriffsfenster (60 Min.)

**Du kannst danach:**

- Pflichtfreigabe und Eingriffsfenster am eigenen Erleben abwägen: Aufwand, Risiko, Verantwortung.
- Festlegen, welche Fälle automatisch laufen dürfen und welche nie.
- Vorher sagen, was die Automatik tun wird, und es danach am Protokoll überprüfen.

**Baustein im Fokus:** Kontrollen, Protokoll. Eine Freigabe für jeden Fall kostet Zeit. Jetzt probierst du die Alternative: Antworten laufen automatisch, wenn niemand im Zeitfenster eingreift.

**Was du heute im Cockpit siehst** – neu: Zum ersten Mal geht etwas automatisch raus – wenn niemand rechtzeitig widerspricht.

- Links neu „Eingriffsfenster“: Haftpflichtantworten, die nach 24 Stunden automatisch rausgehen, mit Countdown.
- Im Fall: Text ändern (dann wird der Termin gestoppt) oder „Versand stoppen“ mit Begründung.
- Im Eingriffsfenster: „Zeit +24 h“ spult die Workshop-Uhr vor – das kannst nur du.
- Im Bestand neu: „Schäden“. Und unter „Aus dem Bestand“ stehen die Bausteine des Vertrags und der Schadenfall mit Beträgen und der letzten Empfehlung.
- Claude kann: Sparte zuordnen, Antworten mit Beleg entwerfen, ins 24-Stunden-Fenster einplanen und einen Versand stoppen. Claude kann nicht: Die Uhr vorspulen, freigeben oder sofort senden.

**So läuft die Stunde:**

1. Welche Fälle sind Haftpflicht – und welcher wäre dir für Automatik zu heikel?
2. Claude plant ein; du sagst vorher, was rausgeht, und greifst ein: ändern, stoppen, laufen lassen.
3. Gemeinsam bauen: Gestoppte Termine werden erklärt, und nichts geht doppelt raus.
4. Du spulst die Uhr vor und vergleichst mit deiner Vorhersage.

**Aufgabe:** Drei Haftpflichtfälle. Claude ordnet sie zu und plant die Antworten
ins 24-Stunden-Fenster ein. Du änderst im Cockpit unter **Eingriffsfenster**
einen Text, stoppst bei einem mit Begründung den Versand und lässt einen laufen.
Dann drückst du **Workshop-Zeit +24 h**: Genau eine Antwort geht automatisch
raus. (Der automatische Versand ist in Drill 9 schon eingeschaltet; du musst
nichts einstellen.)

**Bauauftrag:** Auch gestoppte und geänderte Termine sollen im Cockpit
erklärt werden. Und es soll geprüft sein, dass keine Antwort doppelt
rausgeht und eine geänderte gar nicht automatisch. Welche Szenarien dafür
nötig sind, legst du fest.

| Etappe | Frag Claude | Du entscheidest | Dann du |
| --- | --- | --- | --- |
| 1 · Routing prüfen | „Ordne die drei neuen Fälle nachvollziehbar zu. Welche sind Haftpflicht, und ist der Empfänger für Antworten erlaubt? Noch nichts einplanen.“ | Welcher Fall wäre dir für einen automatischen Versand zu heikel – und woran erkennst du das? | Sparte, Quellen und erlaubten Empfänger selbst prüfen; den heiklen Fall benennen. |
| 2 · Warteschlange erleben | „Bereite belegte Antworten vor und plane sie ins 24-Stunden-Fenster ein.“ | Welchen lässt du laufen, welchen änderst du, welchen stoppst du – je ein Satz Begründung. Und: Wie viele Mails gehen nach +24 h raus, und welche? | Die Vorhersage aufschreiben, dann im Cockpit unter „Eingriffsfenster“ einen Text ändern, bei einem mit Begründung den Versand stoppen, einen laufen lassen. |
| 3 · Selbst bauen | „Wie machen wir gestoppte Termine und Duplikatschutz überprüfbar? Frag mich zuerst, welche Fehler am schlimmsten wären – die prüfen wir dann als Szenarien.“ | Was wäre schlimmer: eine Antwort doppelt oder eine gestoppte Antwort doch versendet? Welche zwei Szenarien müssen wir deshalb unbedingt prüfen? | Die Szenarien festlegen, die nie schiefgehen dürfen, und die Verbesserung am Eingriffsfenster mit Claude bauen. |
| 4 · Wirkung belegen | „Was würde nach dem Zeitsprung automatisch rausgehen? Danach prüfe Versand und Protokoll mit mir und hilf mir, meinen Stand zu speichern.“ | Stimmt das Ergebnis mit deiner Vorhersage überein? Würdest du das Fenster in echt kürzer oder länger machen – wovon hängt es ab? | Im Cockpit „Workshop-Zeit +24 h“ drücken; genau einen Auto-Versand prüfen und mit der Vorhersage vergleichen; Stand speichern. |

**Fertig, wenn:** Ein automatischer Versand, eine Änderung und ein Stopp sind im Protokoll nachvollziehbar; eigene Verbesserung am Eingriffsfenster geprüft und gespeichert.

**Zum Schluss:** Für welche Fälle in deinem Haus wäre „läuft, wenn niemand widerspricht“ vertretbar – und wer schaut dann ins Fenster?

**Zum Nachdenken** – für Wartezeiten und wenn du früher fertig bist:

- Im Fenster hat niemand widersprochen, also ging die Mail raus. Wer trägt die Verantwortung: der Agent, du oder wer das Fenster festgelegt hat?
- Was passiert mit dem Eingriffsfenster am Freitagabend oder in der Ferienzeit?
- Welche Routine läuft bei euch heute schon nach „geht raus, wenn niemand widerspricht“ – nur ohne Agent?

**Früher fertig?** Nicht den nächsten Drill vorwegnehmen – bau die heutigen Teile weiter aus: Was würdest du gern noch sehen oder tun können? Anregungen: Eingriffsfenster: sortiert nach „geht als Nächstes raus“, mit Grund und Betrag; Eingriffsfenster: Beschwerden laufen nie automatisch, sie brauchen immer eine Freigabe; Eingriffsfenster: die Fensterlänge hängt vom Fall ab, z. B. länger bei hohen Beträgen. Oder der Vorschlag **Eine Kennzahl für deinen Report**: Welche Frage würde dein Vorstand zum Eingriffsfenster stellen – und was müssten wir dafür mitzählen? Claude fragt dich nach deiner Idee, hilft beim Steckbrief ([MEINE_ERWEITERUNGEN.md](../MEINE_ERWEITERUNGEN.md)) und baut dann mit dir.

## Drill 10 – Management-Report (45 Min.)

**Du kannst danach:**

- Beobachtung, Deutung und Empfehlung trennen und die Grenze einer Aussage aus einer kleinen Simulation benennen.
- Das eigene agentische System aus seinen sechs Bausteinen erklären: was es darf, wo der Mensch entscheidet.
- Eine Grafik so anlegen, dass sie genau eine Frage beantwortet.

**Baustein im Fokus:** Protokoll. Alles, was heute passiert ist, steht im Protokoll. Jetzt machst du daraus eine belegte Aussage für dein Management – und zeigst dein System.

**Was du heute im Cockpit siehst** – neu: Aus dem Protokoll wird ein Bericht für dein Management.

- Unten links neu „Report“: deine Management-Folien mit einer ersten Grafik.
- Die Zahlen sind die gezählten Ereignisse aus deinem Drill 9 – ohne Namen und Mailtexte.
- Der automatische Versand ist wieder ausgeschaltet.
- Claude kann: Die Zahlen lesen, Folien und Grafik mit dir bauen und kritisch nachfragen. Claude kann nicht: Namen oder Mailtexte sehen – und Zahlen erfinden darf es auch nicht.

**So läuft die Stunde:**

1. Welche Frage soll dein Vorstand nach zwei Minuten beantworten können?
2. Du skizzierst die Grafik in Worten, Claude baut sie mit dir.
3. Du formulierst deine Empfehlung mit Grenze.
4. Du führst zwei Minuten vor.

**Start:** „Ich will zu Drill 10. Frag mich, ob ich meinen Stand mitnehmen
will.“ Claude übernimmt aus deinen Drill-9-Fällen nur gezählte Ereignisse
(keine Namen, Mailtexte, Schlüssel).

**Bauauftrag:** Eine zweite beschriftete Grafik (z. B. Freigaben,
Ablehnungen, Stopps, automatische Versände) und deine eigene Empfehlung mit
Grenze. Ansicht: <http://127.0.0.1:3004/slides/index.html?deck=management>.

| Etappe | Frag Claude | Du entscheidest | Dann du |
| --- | --- | --- | --- |
| 1 · Befund wählen | „Welche Beobachtungen aus unserem Drill-9-Schnappschuss sind wirklich belegt? Bitte keine Management-Aussage erfinden.“ | Welche eine Frage soll dein Vorstand nach zwei Minuten beantworten können? Welche Zahl stützt die Antwort, und was würde sie widerlegen? | Frage, Aussage und Grenze selbst wählen; Demo- und Inbox-Fälle unterscheiden. |
| 2 · Visualisieren | „Zeig mir für diese Aussage erst, welche Zahlen die Grafik braucht und wie sie aussehen soll – dann bauen wir sie.“ | Was soll man in fünf Sekunden sehen – was kommt auf die Achsen, was wird hervorgehoben, und was steht da, wenn ein Wert null ist? | Skizze in Worten vorgeben, Grafik mit Claude bauen; Achsen, Beschriftung und Nullfälle im Browser prüfen. |
| 3 · Entscheidung formulieren | „Hier ist meine Empfehlung in eigenen Worten. Kürze sie und stell mir eine kritische Rückfrage – schreib sie nicht neu.“ | Wie lautet deine Empfehlung in zwei Sätzen: was, auf welchem Beleg, mit welcher Kontrollregel – und was beweist sie ausdrücklich nicht? | Empfehlung und Einschränkung selbst schreiben; höchstens vier Folien. |
| 4 · Vorführen | „Prüfe, ob die Folien lokal laufen, die Zahlen zu Drill 9 passen und keine persönlichen Daten enthalten. Dann hilf mir, meinen Stand zu speichern.“ | Welche Rückfrage aus dem Vorstand fürchtest du am meisten, und was antwortest du? | Report zwei Minuten zeigen, Rückfrage beantworten, Prüfungen laufen lassen, Stand speichern. |

**Zum Schluss:** Was nimmst du aus dem Tag als Regel mit: Welche Arbeit darf ein Agent bei euch allein, mit Fenster oder nur mit Freigabe tun?

**Zum Nachdenken** – für Wartezeiten und wenn du früher fertig bist:

- Welche Zahl aus dem Workshop würde dein Vorstand am ehesten falsch verstehen – und wie verhinderst du das?
- Wenn du morgen einen Baustein bei euch einführen dürftest: Welcher bringt am meisten, welcher birgt das größte Risiko?
- Was müsste im Protokoll stehen, damit du einem Prüfer in einem Jahr erklären kannst, warum eine Antwort rausging?

**Früher fertig?** Nicht den nächsten Drill vorwegnehmen – bau die heutigen Teile weiter aus: Was würdest du gern noch sehen oder tun können? Anregungen: Report: die Grafik lässt sich zwischen Leben und Haftpflicht umschalten; Report: eine Folie „Was wir nicht messen konnten“; Bonus mit restlichem Guthaben: ein 30–60-Sekunden-Video deiner Lösung mit Remotion als letzte Folie. Oder der Vorschlag **Folie: Mein agentisches System**: Wie würdest du einer Kollegin in einem Bild erklären, was dein System darf und wo du entscheidest? Claude fragt dich nach deiner Idee, hilft beim Steckbrief ([MEINE_ERWEITERUNGEN.md](../MEINE_ERWEITERUNGEN.md)) und baut dann mit dir.

**Bonus mit restlichem Guthaben:** ein 30–60-Sekunden-Video deiner Lösung
mit Remotion als letzte Folie – siehe [BONUS_VIDEO.md](BONUS_VIDEO.md).

## Drill-Wechsel und Rettung – ohne Verlust des eigenen Stands

Sag Claude: „Ich will zu Drill N. Frag mich, ob ich meinen Stand mitnehmen
will.“ Du wählst:

| Modus | Was passiert | Wann sinnvoll |
| --- | --- | --- |
| **Eigenen Stand mitnehmen** | Dein Code (auch noch nicht Gespeichertes) und deine Fälle bleiben; nur der Drill wird umgestellt | Dein Bau funktioniert. |
| **Frischen offiziellen Stand laden** | Offizieller Code **mit Lösungen aller bisherigen Bauaufträge**, frische Fälle; dein Code und deine Fälle werden vorher gesichert | Du hängst fest oder willst die Referenz sehen. |

Claude zeigt dir den Plan und fragt vor dem Laden noch einmal. Der Wechsel
passiert **im selben Ordner und in derselben Sitzung** – du musst nichts neu
öffnen. Claude startet die Kommandozentrale neu und zeigt dir, was im neuen
Drill dazukommt. Im offiziellen Modus können alte Mails beim Abrufen noch
einmal auftauchen – schon beantwortete stehen dann als „gesendet“ da.
Bearbeite nur die neu angekündigten Fälle.

## Ohne Claude-Tokens

Cockpit im Browser, diese Karte und ein Buddy: Die zweite Person fragt und
prüft mit, bedient aber nicht deine Freigabe- oder Send-Knöpfe. Nie
Logins oder Schlüssel teilen. Im Fehlerfall nichts löschen oder zurücksetzen;
zeig der Lehrperson die Meldung ohne Schlüssel.
