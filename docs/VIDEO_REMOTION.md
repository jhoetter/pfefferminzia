# Drill 10: Das Marketing-Video „Pfefferminzia 2.0“ mit Remotion

Zum Abschluss macht ihr zuerst ein kurzes Marketing-Video über euer neues
System, dann baut ihr damit die Präsentation für den Vorstand. Ihr habt dabei
weitgehend freie Hand: Botschaft, Ton, Szenen und Musik entscheidet ihr.

[Remotion](https://www.remotion.dev) baut Videos aus Code. Dafür braucht es
Node.js. Das Pfefferminzia-Repo selbst bleibt Node-frei: Das Videoprojekt
liegt in einem **eigenen Ordner neben dem Repo** (`~/pfefferminzia-video`),
ins Repo kommt nur die fertige MP4-Datei (`slides/video/`).

## Das Beispiel

Ein fertiges Beispiel liegt im Repo: [das Video](https://github.com/jhoetter/pfefferminzia/releases/download/workshop-medien/pfefferminzia-2-0-pitch.mp4)
und sein Code in [`video-beispiel/`](../video-beispiel/). Claude darf es als
Vorlage kopieren (nach `~/pfefferminzia-video`) – eure Botschaft, Szenen und
Texte bestimmt ihr. Tempo-Trick aus dem Beispiel: Bei 112,5 BPM ist ein Schlag
genau 16 Bilder; so landen Schnitte und Einblendungen auf der Musik.

## So bittest du Claude

> „Wir machen das Marketing-Video für Pfefferminzia 2.0. Richte im
> Hintergrund alles ein und frag mich währenddessen nach meiner Botschaft.“

## Ablauf (für dich und Claude)

1. **Einrichten, während du nachdenkst:** Claude prüft `node -v` (18 oder
   neuer). Fehlt Node, fragt Claude einmal und installiert es **ohne
   Administrator-Passwort** in deinen Benutzerordner (offizielles Node-Archiv
   von nodejs.org, kein `sudo`). Dann legt Claude `~/pfefferminzia-video` mit
   `npx create-video@latest` an (Vorlage „Blank“). Das dauert ein paar
   Minuten und läuft im Hintergrund.
2. **Botschaft zuerst:** Für wen ist das Video (Vorstand, Belegschaft,
   Kundschaft)? Was soll danach im Kopf bleiben – in einem Satz? Welche
   zwei, drei Szenen gehören dazu? Das entscheidest du; Claude fragt nach
   und macht höchstens Vorschläge, wenn du nicht weiterkommst.
3. **Bilder (optional):** Screenshots deiner Kommandozentrale (Mac: `⌘⇧4`)
   in `~/pfefferminzia-video/public/`. Keine Schlüssel, keine privaten Mails.
   Es geht auch ohne: Logo, Farben, Text und Bewegung reichen.
4. **Musik (optional):** Vier lizenzierte Instrumentals (Audiio) lädt Claude
   bei Bedarf nach `assets/music/` herunter (Adressen in `assets/music/README.md`). Claude misst auf Wunsch das Tempo und sucht den
   Drop; nur im eigenen Video verwenden, nicht als Datei weitergeben.
5. **Pfefferminzia-Look:** Tiefes Grün `#173d2c`, Minze `#52b986`, helles
   Minzgrün `#d9f1e1`; das Logo liegt in `slides/assets/pfefferminzia-logo.svg`.
   1920×1080, 30 fps, 20–60 Sekunden.
6. **Vorschau:** `npx remotion studio` öffnet eine Vorschau im Browser.
   Iteriere mit Claude an Tempo, Übergängen und Texten.
7. **Rendern:** `npx remotion render <Komposition> out/pfefferminzia-2-0.mp4 --crf 28`
   (unter 20 MB). Claude kopiert die Datei nach `slides/video/` im
   Pfefferminzia-Ordner.
8. **Weiter zur Präsentation:** In `slides/vorstand.js` oben
   `const VIDEO = 'video/pfefferminzia-2-0.mp4';` – dann läuft das Video auf
   Folie 2 von <http://127.0.0.1:3004/slides/vorstand.html>.

## Grenzen

- Marketing darf begeistern, aber nichts behaupten, was der Workshop nicht
  zeigt: keine erfundenen Zahlen zu Zeitersparnis, Kosten oder Kundschaft.
  Alle Fälle sind synthetisch.
- Remotion ist für Einzelpersonen und kleine Teams frei; für die Nutzung in
  einem größeren Unternehmen gilt deren Lizenz
  ([remotion.dev/license](https://www.remotion.dev/license)). Für diese
  Lernübung genügt das Ausprobieren.
- Das Videoprojekt und `node_modules` gehören **nicht** ins Pfefferminzia-Repo.
- Klappt die Installation nicht in fünf Minuten: Video auslassen und direkt
  die Präsentation bauen. Das ist völlig in Ordnung.
