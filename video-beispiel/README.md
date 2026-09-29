# Beispiel: Launchvideo „Pfefferminzia 2.0“ (Remotion)

Das Beispielvideo aus Drill 10, ganz aus React-Komponenten gebaut. Ergebnis:
[Beispielvideo](https://github.com/jhoetter/pfefferminzia/releases/download/workshop-medien/pfefferminzia-2-0-pitch.mp4).

```sh
npm install
npm run studio   # Vorschau im Browser
npm run render   # → out/pfefferminzia-2-0-pitch.mp4
```

| Datei | Inhalt |
| --- | --- |
| `src/theme.ts` | Farben, Schriften, Takt (112,5 BPM = 16 Bilder pro Schlag, Drop auf Bild 720) |
| `src/cockpit.tsx` | Die Kommandozentrale als React-Oberfläche; jedes Ereignis (Mail trifft ein, Sparte rastet ein, Klick, Stempel) hängt am Bild und liegt auf einem Schlag |
| `src/film.tsx` | Kamera mit harten Schnitten und Fahrten, Tiefenschärfe, Untertitel, die vier Teile |
| `src/Pitch.tsx` | Zeitleiste und Musik |

Die Musik kommt aus `../assets/music` (erst herunterladen, siehe `assets/music/README.md`) (Audiio-Lizenz: nur im eigenen Video
verwenden, nicht als Datei weitergeben). Alle Fälle sind erfunden.
Teilnehmende kopieren diesen Ordner nach `~/pfefferminzia-video` und machen
daraus ihr eigenes Video; im Repo bleibt er Node-frei (kein `node_modules`).
