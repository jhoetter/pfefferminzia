# Dienstag: selbst bauen, gemeinsam ankommen

Der Tag ist kein Klickkurs. Nach Johannes' Live-Beispielen baut jede Person
an ihrer **eigenen Kopie** von Pfefferminzia. Claude Code ist dabei
Programmierpartner, Tutor und MCP-Client: Es hilft beim Code und kann über
begrenzte Werkzeuge auch die laufende App lesen und Fälle vorbereiten. Die
fachlichen Entscheidungen und jede externe Wirkung bleiben beim Menschen im
Cockpit.

## Worum es geht: Wie baue ich ein agentisches System auf?

Jedes agentische System besteht aus sechs Bausteinen: **Eingänge** (woher
kommen Fälle), **Wissen** (was darf der Agent nachschlagen), **Werkzeuge**
(was darf er tun – was fehlt, kann er nicht), **Kontrollen** (wo prüft eine
Regel, wo entscheidet ein Mensch), **Oberfläche** (was sieht und tut der
Mensch) und **Protokoll** (was wird festgehalten). MCP ist die Art, wie
Claude an Werkzeuge und Wissen kommt.

| Drill | Baustein im Fokus | Empfohlene Erweiterung für Schnelle (bereitet den nächsten Drill vor) |
| --- | --- | --- |
| 6 | Eingänge, Werkzeuge, Oberfläche | Mini-Wissensbasis (z. B. erfundene Kontakte, Antwortregeln) → Drill 7: Wissen des Versicherers |
| 7 | Wissen, Kontrollen | Beleg-Kasten im Cockpit → Drill 8: Freigabe braucht Überblick |
| 8 | Kontrollen, Oberfläche | Risiko-Einstufung je Fall → Drill 9: Was darf automatisch laufen? |
| 9 | Kontrollen, Protokoll | Eigene Kennzahl → Drill 10: Was nicht gezählt wird, ist nicht belegbar |
| 10 | Protokoll | Folie „Mein agentisches System“; Bonus-Video |

## Lernergebnisse

Am Ende kann jede Person (1) Claude mit einem kleinen, prüfbaren Auftrag zum
Vibe Coding führen, (2) erklären, warum ein MCP-Werkzeug mehr ist als eine
Chat-Antwort – und warum ein *fehlendes* Werkzeug eine Kontrolle ist,
(3) einen Mail-zu-Aktion-Fall mit Quellen und Audit nachvollziehen,
(4) Pflichtfreigabe und Eingriffsfenster am eigenen System vergleichen und
(5) den eigenen Stand testen und committen und (6) das eigene System aus
den sechs Bausteinen erklären und an einer selbst gewählten Stelle mit
Steckbrief erweitern. Wie viel Code jemand selbst baut,
darf verschieden sein; der **Fallnachweis** ist für alle gleich.

## Drei Arbeitsweisen, jederzeit wechselbar

| Weg | Wenn du … | Claude hilft so | Dein Beitrag |
| --- | --- | --- | --- |
| Geführt | Claude Code noch kennenlernst oder festhängst | Nächster Schritt, Dateistelle, ein Prüfszenario; Checkpoint als Rettungsnetz | Eine Änderung verstehen, auswählen, testen, committen |
| Bauend | mit der Struktur zurechtkommst | Akzeptanzkriterien nennen, Implementierung mit dir iterieren | Den Bauauftrag in mehreren kleinen Schritten bauen und belegen |
| Ausbauend | Fall und Bauauftrag früh belegt hast | Empfohlene Erweiterung oder Anregungen vorstellen, Steckbrief mit dir klären, Risiko und Alternative nennen | Selbst festlegen, was deine Kommandozentrale zusätzlich können soll – dann mit Claude bauen |

Ausbauen ist Opt-in und **nimmt nie den nächsten Drill vorweg**. Die Person
gestaltet ihr eigenes System: eine eigene Idee (z. B. „Claude soll selbst
senden dürfen“, eine neue Ansicht im Cockpit) oder die empfohlene
Erweiterung. Zuerst kommt ein kurzer Steckbrief in `MEINE_ERWEITERUNGEN.md`:
Was soll neu möglich sein, welcher Baustein, wer löst aus, welche Daten,
welche Kontrolle, woran erkennen wir Erfolg? Werkzeuge mit Außenwirkung sind
in der eigenen Kopie erlaubt, aber nur mit festgelegter Kontrolle; die
Antwort-Liste bleibt unangetastet. Nur erfundene Daten.

## Der Vibe-Coding-Rhythmus

Ein guter Auftrag hat **beobachtbares Verhalten**, eine **Grenze** und
**Szenarien**, an denen man ihn prüft – auch eines, das nie passieren darf.
Je mehr sinnvolle Szenarien bestanden sind, desto mehr kannst du dem System
vertrauen. Die Entscheidungen darin triffst du, nicht Claude. In jeder
Etappe fragt Claude zuerst nach deiner Entscheidung; auf „mach einfach“ bietet
es zwei, drei Optionen an. Beispiel: „Wenn dieselbe Mail zweimal synchronisiert wird, soll
genau ein verknüpftes Prüfen-Todo entstehen – und nie zwei. Welche Szenarien prüfen wir?“

`Regel in deinen Worten → Szenarien (auch: was nie passieren darf) →
Änderung mit Claude → Diff lesen → Szenarien prüfen lassen → Fall im Cockpit
prüfen → committen → erklären`

- Claude macht zu viel auf einmal? „Stopp. Nur den nächsten Schritt; sag mir,
  welche Zeile ich prüfen soll.“
- Du bist schneller? „Ich bin fertig. Ich möchte meine Kommandozentrale
  erweitern – hilf mir mit dem Steckbrief.“
- Du hängst? „Zeig mir die Stelle im Code und ein einfaches Szenario.“ Oder: „Zeig
  mir die Referenzlösung für diesen Schritt und erklär sie mir.“

Eine grüne App allein ist kein Lernnachweis; ein Prompt allein ist kein
gebauter Beitrag.

## Die fünf Bauaufträge

| Drill | Fall für alle | Bauauftrag | Lösung im Checkpoint |
| --- | --- | --- | --- |
| 6 · Erste Antwort | Mail kommt mit Aufgabe → Claude entwirft → bauen → Mensch sendet (= Beweis) | Aufgabe erledigt sich beim Senden | `drill-07-start` |
| 7 · Leben | Quelle prüfen → Entwurf → Mensch sendet | Tarif-Belegprüfung beim Speichern | `drill-08-start` |
| 8 · Freigabe | Zwei Fälle → Freigabe und Ablehnung | Ablehnung und erloschene Freigabe im Cockpit anzeigen | `drill-09-start` |
| 9 · Eingriffsfenster | Auto-Versand, Edit und Stopp | Gestoppte Termine erklären, Doppelversand testen | `drill-10-start` |
| 10 · Report | Erlebte Kontrolle als Management-Befund | Zweite D3-Grafik und eigene Empfehlung | `drill-10-complete` |

## Git: deine Kopie

Claude legt beim Start den Branch `workshop/mein-tag` an. Am Ende jedes
Drills zeigt es `git status` und den Diff, prüft, dass `.env` und `.data/`
nicht dabei sind, und committet nach deiner Zustimmung. Ein Drill-Wechsel
passiert im selben Ordner und in derselben Sitzung: Beim frischen offiziellen
Stand wird dein Code vorher auf deinem Zweig gesichert, der offizielle Stand
kommt auf einen neuen Zweig, deine Fälle in eine Sicherungsdatei.

**Optional – deinen Stand mitnehmen:** Wenn du einen GitHub-Account hast,
kannst du das Repo auf GitHub forken und Claude bitten: „Richte meinen Fork
als Remote `mine` ein und pushe meinen Branch dorthin.“ Nie in das Kurs-Repo
pushen.
