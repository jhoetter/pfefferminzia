# Bonus: ein kurzes Video deiner Lösung mit Remotion

Freiwillig, nach Drill 10 und nur mit restlichem Claude-Guthaben. Ziel: ein
30–60-Sekunden-Video, das zeigt, was **deine** Pfefferminzia-Version am Ende
des Tages kann, und das du als letzte Folie deines Management-Reports zeigst.

[Remotion](https://www.remotion.dev) baut Videos mit React-Code. Dafür braucht
es Node.js. Das Pfefferminzia-Repo selbst bleibt Node-frei: Das Videoprojekt
liegt in einem **eigenen Ordner neben dem Repo**, ins Repo kommt nur die
fertige MP4-Datei.

## So bittest du Claude

> „Ich möchte den Video-Bonus aus docs/BONUS_VIDEO.md machen. Prüf zuerst, ob
> Node da ist, und führe mich dann Schritt für Schritt.“

## Ablauf (für dich und Claude)

1. **Node prüfen:** `node -v` muss 18 oder neuer zeigen. Fehlt Node, fragt
   Claude, ob es installiert werden darf. Wenn nicht: Bonus auslassen, das
   ist völlig in Ordnung.
2. **Screenshots machen (5 Minuten):** 4–6 Bilder deiner laufenden
   Kommandozentrale, z. B. neues Ticket, belegter Entwurf, Freigabe,
   Eingriffsfenster mit Countdown, Activity Log, Report-Grafik. Keine
   API-Schlüssel und keine privaten Mails im Bild. Mac: `⌘⇧4`.
3. **Projekt anlegen:** Claude legt `~/pfefferminzia-video` mit
   `npx create-video@latest` an (Vorlage „Blank“) und kopiert die Screenshots
   nach `public/`.
4. **Storyboard vor Code:** Claude schlägt 5–7 Szenen vor (Titel → je
   Screenshot eine Aussage: *was das System tut* und *wo der Mensch
   kontrolliert* → Schluss mit den zwei Kontrollmustern). Du entscheidest die
   Texte. 1920×1080, 30 fps, höchstens 60 Sekunden.
5. **Vorschau:** `npx remotion studio` öffnet eine Vorschau im Browser.
   Iteriere mit Claude an Tempo, Übergängen und Beschriftung.
6. **Rendern:** `npx remotion render <Komposition> out/demo.mp4 --crf 28`.
   Die Datei sollte unter 20 MB bleiben.
7. **Einbinden:** Kopiere das Video nach `slides/assets/report/demo.mp4` im
   Pfefferminzia-Repo und setze oben in `slides/management.js`
   `const DEMO_VIDEO = 'assets/report/demo.mp4';`. Deck unter
   <http://127.0.0.1:3004/slides/index.html?deck=management> prüfen,
   committen.

## Grenzen

- Alles zeigt synthetische Workshop-Daten. Keine Aussagen über echte Kunden,
  Zeitersparnis oder Wirksamkeit.
- Remotion ist für Einzelpersonen und kleine Teams frei; für die Nutzung in
  einem größeren Unternehmen gilt deren Lizenz
  ([remotion.dev/license](https://www.remotion.dev/license)). Für diese
  Lernübung genügt das Ausprobieren.
- Das Videoprojekt und `node_modules` gehören **nicht** ins Pfefferminzia-Repo.
