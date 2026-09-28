# Beispiel: Launchvideo „Pfefferminzia 2.0“ (Remotion)

Das Beispielvideo aus Drill 10, ganz aus React-Komponenten gebaut. Ergebnis:
[`docs/media/pfefferminzia-2-0-pitch.mp4`](../docs/media/pfefferminzia-2-0-pitch.mp4).

```sh
npm install
npm run studio   # Vorschau im Browser
npm run render   # → out/pfefferminzia-2-0-pitch.mp4
```

| Datei | Inhalt |
| --- | --- |
| `src/theme.ts` | Farben, Schriften, Takt (112,5 BPM = 16 Bilder pro Schlag, Drop auf Bild 720) |
| `src/components/ui.tsx` | Cockpit-Bausteine: Logo, Fenster, Mailzeile, Leistungsentscheidung, Countdown, Protokoll, Mauszeiger |
| `src/components/motion.tsx` | Bewegung im Takt: pulsierender Hintergrund, Überschriften Wort für Wort, Hervorheben einer Komponente |
| `src/scenes.tsx` | Die Szenen: Chaos, Enthüllung, fünf Bausteine, Botschaft, Abspann |
| `src/Pitch.tsx` | Zeitleiste und Musik |

Die Musik kommt aus `../assets/music` (Audiio-Lizenz: nur im eigenen Video
verwenden, nicht als Datei weitergeben). Alle Fälle sind erfunden.
Teilnehmende kopieren diesen Ordner nach `~/pfefferminzia-video` und machen
daraus ihr eigenes Video; im Repo bleibt er Node-frei (kein `node_modules`).
