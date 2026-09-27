# Dienstag: selbst bauen, gemeinsam ankommen

Der Tag ist kein Klickkurs. Nach Johannes' Live-Beispielen baut jede Person
an ihrer **eigenen Kopie** von Pfefferminzia. Claude Code ist dabei
Programmierpartner, Tutor und MCP-Client: Es hilft beim Code und kann über
begrenzte Werkzeuge auch die laufende App lesen und Fälle vorbereiten. Die
fachlichen Entscheidungen und jede externe Wirkung bleiben beim Menschen im
Cockpit.

## Lernergebnisse

Am Ende kann jede Person (1) Claude mit einem kleinen, prüfbaren Auftrag zum
Vibe Coding führen, (2) erklären, warum ein MCP-Werkzeug mehr ist als eine
Chat-Antwort – und warum ein *fehlendes* Werkzeug eine Kontrolle ist,
(3) einen Mail-zu-Aktion-Fall mit Quellen und Audit nachvollziehen,
(4) Pflichtfreigabe und Eingriffsfenster am eigenen System vergleichen und
(5) den eigenen Stand testen und committen. Wie viel Code jemand selbst baut,
darf verschieden sein; der **Fallnachweis** ist für alle gleich.

## Drei Arbeitsweisen, jederzeit wechselbar

| Weg | Wenn du … | Claude hilft so | Dein Beitrag |
| --- | --- | --- | --- |
| Geführt | Claude Code noch kennenlernst oder festhängst | Nächster Schritt, Dateistelle, kleiner Test; Checkpoint als Rettungsnetz | Eine Änderung verstehen, auswählen, testen, committen |
| Bauend | mit der Struktur zurechtkommst | Akzeptanzkriterien nennen, Implementierung mit dir iterieren | Den Bauauftrag in mehreren kleinen Schritten bauen und belegen |
| Vorausbauend | den Kernfall früh belegt hast | Auf Wunsch den **nächsten** Bauauftrag im eigenen Branch öffnen | Die nächste Verbesserung möglichst selbst entwickeln |

Vorausbauen ist Opt-in und wird der Gruppe nicht verraten. Die nächste
Live-Fähigkeit (z. B. die Freigabe-Ansicht) bleibt bis zum Checkpoint
gesperrt; vorausbauen heißt Code und Tests im eigenen Branch.

## Der Vibe-Coding-Rhythmus

Ein guter Auftrag hat **beobachtbares Verhalten**, eine **Grenze** und einen
**Test**. Beispiel: „Wenn dieselbe Mail zweimal synchronisiert wird, soll
genau ein verknüpftes Prüfen-Todo entstehen. Zeig zuerst den fehlenden Test.“

`Hypothese → kleiner Test → Änderung mit Claude → Diff lesen → Fall im
Cockpit prüfen → Test ausführen → committen → erklären`

- Claude macht zu viel auf einmal? „Stopp. Nur den nächsten Schritt; sag mir,
  welche Zeile ich prüfen soll.“
- Du bist schneller? „Gib mir nur die Akzeptanzkriterien für den nächsten
  Bauauftrag; ich versuche es zuerst selbst.“
- Du hängst? „Zeig mir die Dateistelle und einen minimalen Test.“ Oder: „Zeig
  mir die Referenzlösung für diesen Schritt und erklär sie mir.“

Eine grüne App allein ist kein Lernnachweis; ein Prompt allein ist kein
gebauter Beitrag.

## Die fünf Bauaufträge

| Drill | Fall für alle | Bauauftrag | Lösung im Checkpoint |
| --- | --- | --- | --- |
| 6 · Erste Antwort | Mail kommt mit Aufgabe → Claude entwirft → Mensch sendet | Aufgabe erledigt sich beim Senden | `drill-07-start` |
| 7 · Leben | Quelle prüfen → Entwurf → Mensch sendet | Tarif-Belegprüfung beim Speichern | `drill-08-start` |
| 8 · Freigabe | Zwei Fälle → Freigabe und Ablehnung | `controlNotice`: Ablehnung und Freigabeverlust anzeigen | `drill-09-start` |
| 9 · Eingriffsfenster | Auto-Versand, Edit und Stopp | Gestoppte Termine erklären, Doppelversand testen | `drill-10-start` |
| 10 · Report | Erlebte Kontrolle als Management-Befund | Zweite D3-Grafik und eigene Empfehlung | `drill-10-complete` |

## Git: deine Kopie

Claude legt beim Start den Branch `workshop/mein-tag` an. Am Ende jedes
Drills zeigt es `git status` und den Diff, prüft, dass `.env` und `.data/`
nicht dabei sind, und committet nach deiner Zustimmung. Ein Checkpoint-Wechsel
legt einen neuen Ordner auf einem neuen Branch an; der alte bleibt, wie er
ist.

**Optional – deinen Stand mitnehmen:** Wenn du einen GitHub-Account hast,
kannst du das Repo auf GitHub forken und Claude bitten: „Richte meinen Fork
als Remote `mine` ein und pushe meinen Branch dorthin.“ Nie in das Kurs-Repo
pushen.
