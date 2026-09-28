/* Tuesday deck content on the reveal.js base of the workshop template. Slides stay lean; the script lives in the notes (press S). */
(() => {
  const sourceSlides = document.querySelector('.slides');
  const logo = sourceSlides.querySelector('img[src^="data:image/png"]')?.getAttribute('src') || '';
  const johannesAvatar = sourceSlides.querySelector('svg[aria-label^="Comicfigur Johannes"]')?.outerHTML || '';
  const deckName = new URLSearchParams(window.location.search).get('deck') || 'gesamt';
  const pill = (text, tone = '') => `<span class="day-pill ${tone}">${text}</span>`;
  const card = (title, content, extra = '') => `<div class="day-card ${extra}"><h3>${title}</h3>${content}</div>`;
  // Most cards hold one short line; `short` keeps them compact instead of stretching to the bottom.
  const grid = (items, columns = 'two', size = 'short') => `<div class="day-grid ${columns} ${size}">${items.join('')}</div>`;
  const prompt = text => `<div class="day-prompt">${text}</div>`;
  // One slide per drill stays on the projector while people work: four steps, done, early finish.
  const taskBoard = (steps, done, early) => grid([
    card('Eure vier Schritte', `<ol class="day-tasks">${steps.map(step => `<li>${step}</li>`).join('')}</ol>`, 'mint-card'),
    card('Fertig, wenn …', `<p>${done}</p><h3 class="day-task-early">Früher fertig?</h3><p>${early}</p><p class="day-small">Hängst du? Frag Claude – oder mich.</p>`)
  ], 'two', 'full');
  const stage = (number, headline, tags) => `<div class="day-big-num">${number}</div><div class="day-stage-title">DRILL ${number}</div><div class="day-stage-summary"><strong>${headline}</strong></div><div class="day-stage-bottom">${tags.map(x => pill(x, 'mint')).join('')}</div>`;
  // Real cockpit screenshots, cropped to the part that matters, always inside the slide.
  const shot = (...images) => `<div class="day-shot ${images.length > 1 ? 'pair' : ''}">${images.map(([file, alt]) => `<img src="assets/${file}" alt="${alt}">`).join('')}</div>`;

  // The day in one table; every deck shows where we are.
  const DAY = [
    ['08:30–09:45', 'Input', 'Live-Beispiele · Vibe Coding · Kontrolle', 'input'],
    ['10:00–11:00', 'Drill 6', 'Die Kommandozentrale', 'drill-06'],
    ['11:15–12:15', 'Drill 7', 'Leben: der Mensch sendet', 'drill-07'],
    ['12:15–13:15', 'Mittag', '', 'mittag'],
    ['13:15–14:15', 'Drill 8', 'Leben: der Mensch gibt frei', 'drill-08'],
    ['14:30–15:30', 'Drill 9', 'Haftpflicht: das Eingriffsfenster', 'drill-09'],
    ['15:45–16:30', 'Drill 10', 'Pfefferminzia 2.0: Video und Vorstand', 'drill-10'],
    ['16:45–18:00', 'Whiteboard', 'Wo darf der Agent handeln?', 'abschluss'],
  ];
  const PLAN = {
    'drill-06': [['10:00', 'Einrichten, Posteingang ansehen'], ['10:15', 'Antwort entwerfen'], ['10:25', 'Bauen: Aufgabe erledigt sich'], ['10:45', 'Senden und nachweisen'], ['10:55', 'Rückblick']],
    'drill-07': [['11:15', 'Bestand ansehen, Fall zuordnen'], ['11:30', 'Entwurf mit Beleg ändern'], ['11:45', 'Bauen: falsches Tarifzitat stoppen'], ['12:05', 'Austricksen, dann senden'], ['12:10', 'Rückblick']],
    'drill-08': [['13:15', 'Prüfpunkte, Entscheidungen vorbereiten'], ['13:30', 'Freigeben und ablehnen'], ['13:45', 'Bauen: Ablehnungsgrund sichtbar'], ['14:05', 'Freigabe erlischt – nachweisen'], ['14:10', 'Rückblick']],
    'drill-09': [['14:30', 'Vorsortierung festlegen'], ['14:45', 'Bauen und Postfach abrufen'], ['15:00', 'Vorhersagen, eingreifen'], ['15:15', 'Zeit +24 h, Protokoll prüfen'], ['15:25', 'Rückblick']],
    'drill-10': [['15:45', 'Botschaft – Claude richtet ein'], ['15:50', 'Video bauen und rendern'], ['16:10', 'Präsentation für den Vorstand'], ['16:25', 'Vorführen']],
  };
  const timetable = (active, compact = false) => {
    const index = DAY.findIndex(row => row[3] === active);
    return `<div class="day-timeline ${compact ? 'compact' : ''}">${DAY.map(([time, what, detail, key], i) =>
      `<div class="day-timeline-row ${key === active ? 'now' : index >= 0 && i < index ? 'past' : ''} ${key === 'mittag' ? 'pause' : ''}"><strong>${time}</strong><em>${what}</em><span>${detail}</span></div>`).join('')}</div>`;
  };
  const zeitplan = key => ({
    id: `Zeitplan-${key}`, type: 'Zeitplan', eyebrow: 'Wo wir stehen', title: 'Der Tag – und diese Stunde.',
    body: `<div class="day-schedule">${timetable(key, true)}${PLAN[key] ? card('Diese Stunde', `<ol class="day-plan">${PLAN[key].map(([time, step]) => `<li><strong>${time}</strong>${step}</li>`).join('')}</ol>`, 'mint-card') : ''}</div>`,
    notes: 'ZEIT: 30 Sekunden. Zeigen, wo wir im Tag stehen und wie die Stunde läuft. Die Minuten sind ein Rahmen, kein Taktstock – wer hängt, lädt beim nächsten Drill den offiziellen Stand.'
  });
  const recap = (drill, built, learned, question) => ({
    id: `Rueckblick${drill}`, type: 'Rückblick', eyebrow: `Rückblick · Drill ${drill}`, title: 'Was wir gerade gebaut haben.',
    body: grid([card('Gebaut', `<p class="day-emphasis">${built}</p>`, 'mint-card'), card('Gelernt', `<p class="day-emphasis">${learned}</p>`), card('Eure Runde', `<p class="day-emphasis">${question}</p>`, 'red-card')], 'three'),
    notes: `ZEIT: 3 Minuten. Zwei, drei Stimmen einholen, dann weiter. Nicht den nächsten Drill erklären – das macht die nächste Folie.`
  });

  const slides = [
    {
      id: 'Titel', type: 'Titel', eyebrow: 'Dienstag · 29. September 2026', cover: true,
      body: `<div class="day-cover-title">VOM AGENTEN<br>ZUM SYSTEM</div><div class="day-cover-sub">Wenn KI im Versicherungsprozess handelt.</div><div class="day-cover-ribbon">AI AUTOMATION · INSURANCE EDITION</div><div class="day-cover-burst"><strong>5</strong><span>DRILLS</span></div>`,
      notes: 'ZEIT: 1 Minute. SAGEN: Gestern haben wir mit Daten und Urteilen gearbeitet. Heute geben wir dem Agenten kontrollierte operative Fähigkeiten. ÜBERLEITUNG: Wo genau kippt Assistenz in Wirkung? NICHT: Die vollständige Lösung vorwegnehmen.'
    },
    {
      id: 'Bruecke', type: 'Statement', eyebrow: 'Von Montag zu Dienstag', title: 'Aus einer guten Antwort wird eine Handlung.',
      body: grid([
        card('Montag · verstehen', `<p class="day-emphasis">Claude analysiert und schlägt vor.</p>${pill('Augmentation', 'blue')}`),
        card('Dienstag · handeln', `<p class="day-emphasis">Claude bewegt Fälle weiter – mit Kontrolle.</p>${pill('Automation', 'red')}`, 'mint-card')
      ]),
      notes: 'ZEIT: 3 Minuten. SAGEN: Gestern, in Falks Drills 1–5, hat Claude analysiert und vorgeschlagen – Kundensicht, Schadenfall, Underwriting blieben im Arbeitsraum. Heute, in Drill 6–10, bekommt es kontrollierte operative Fähigkeiten: Ein Postfach empfängt, ein Entwurf wird versendet, eine Warteschlange löst später aus. Der Unterschied ist nicht die Qualität des Textes, sondern die Wirkung außerhalb des Chats. FRAGE: Welche Aktion würde bei Ihnen erstmals jemand anderem auffallen?'
    },
    {
      id: 'Agenda', type: 'Zeitplan', eyebrow: 'Der Dienstag in einem Blick', title: 'Fünf Drills. Ein System.',
      body: timetable(''),
      notes: 'ZEIT: 2 Minuten. SAGEN: Vier 60-Minuten-Drills plus ein 45-Minuten-Drill, dazwischen 15 Minuten Puffer und die Mittagspause. Jeder Drill: ein Fall für alle, ein eigener Bauauftrag – und ein Checkpoint mit Lösung, falls es klemmt. Jede Person arbeitet in ihrer eigenen Kopie. Zum Schluss 75 Minuten Whiteboard.'
    },
    {
      id: 'LiveBeispiele', type: 'Input', eyebrow: 'Morgens · Blick nach vorn', title: 'Ich zeige, wie ich arbeite. Dann baut ihr.',
      body: grid([
        card('Live-Demo', `<p class="day-emphasis">Drei eigene Anwendungen, im Browser.</p>`, 'mint-card'),
        card('Danach ihr', `<p class="day-emphasis">Eigene Kopie. Claude als Partner und Tutor.</p>`)
      ]),
      notes: 'ZEIT: 5 Minuten plus Live-Demo. Die eigenen Seiten live im Browser öffnen – als Möglichkeitshorizont, nicht als Pfefferminzia-Musterlösung. Überleitung: nicht die Beispiele kopieren, sondern denselben Entwicklungsmodus an Pfefferminzia lernen. Aus einem Prompt wird erst mit geprüften Szenarien und sichtbarer Wirkung Software. Heute Abend: ein Gefühl dafür, welche Aufgaben autonom laufen, welche Planung brauchen und wo Kontrolle nötig ist.'
    },
    {
      id: 'Architektur', type: 'Inhalt', eyebrow: 'Wie das System gebaut ist', title: 'Mensch und Agent nutzen dieselben Funktionen.',
      body: `<div class="day-flow">
        <div class="day-flow-step"><b>Mensch</b><span>prüft und<br>entscheidet</span></div><div class="day-arrow">↔</div>
        <div class="day-flow-step"><b>Claude</b><span>plant und nutzt<br>Werkzeuge</span></div><div class="day-arrow">↔</div>
        <div class="day-flow-step"><b>Pfefferminzia</b><span>Regeln, Rechte,<br>Protokoll</span></div><div class="day-arrow">↔</div>
        <div class="day-flow-step"><b>Postfach</b><span>eigene Inbox<br>und Versand</span></div>
      </div>`,
      notes: 'ZEIT: 5 Minuten. SAGEN: Die Oberfläche ist nicht die eigentliche Schnittstelle. Claude Code spricht über MCP mit demselben Python-System, das auch das Cockpit nutzt. AgentMail ist die externe Grenze; pro Person gibt es eine isolierte Inbox. VORFÜHRUNG: Eine Nachricht erscheint im Cockpit und kann über MCP gelesen werden.'
    },
    {
      id: 'Belege', type: 'Inhalt', eyebrow: 'Verifizierbarkeit', title: 'Jede Aktion braucht einen sichtbaren Beleg.',
      body: grid([
        card('Vorher', `<p class="day-emphasis">Welche Kundin? Welcher Vertrag? Welcher Tarif?</p>`),
        card('Nachher', `<p class="day-emphasis">Wer hat freigegeben, geändert, gestoppt – und wann?</p>`, 'mint-card')
      ]),
      notes: 'ZEIT: 4 Minuten. SAGEN: Wir vertrauen keinem „erledigt“ im Chat, sondern prüfen den Zustand im System. Vor der Wirkung: Kundin, Vertrag, Tarifgeneration, Fundstelle – und wer die Aktion auslösen darf. Nach der Wirkung: welcher Status sich geändert hat, wer freigegeben, editiert oder gestoppt hat, was wann an welche erlaubte Adresse ging. Demonstrieren am Protokoll.'
    },
    {
      id: 'Kontrollmuster', type: 'Inhalt', eyebrow: 'Zwei Kontrollmuster', title: 'Zwei Stopplinien in einem System.',
      body: grid([
        card('Leben · Freigabe', `<p class="day-emphasis">Nichts geht raus ohne deine Freigabe.</p>${pill('Pflicht', 'red')}`, 'red-card'),
        card('Haftpflicht · Fenster', `<p class="day-emphasis">Geht nach 24 h automatisch raus – außer du hältst es an.</p>${pill('Eingriff möglich', 'mint')}`, 'mint-card')
      ]),
      notes: 'ZEIT: 6 Minuten. SAGEN: Das ist keine pauschale Aussage über Versicherungsprodukte. Wir simulieren zwei Kontrollmuster an synthetischen Fällen. Leben: Agent bereitet Entscheidung und Text vor, der Mensch gibt frei, lehnt ab oder ergänzt Kontext. Haftpflicht: nach sichtbarer Frist geht die Antwort standardmäßig raus; im Fenster kann der Mensch ändern oder anhalten. FRAGE: Welche Fehlerklasse fängt welches Muster ab?'
    },
    {
      id: 'Zielbild', type: 'Inhalt', eyebrow: 'Das Zielbild', title: 'Sechs Bausteine. Fünf Etappen.',
      body: grid([
        card('Jedes agentische System', `<p class="day-emphasis">Eingänge · Wissen · Werkzeuge · Kontrollen · Oberfläche · Protokoll</p>`),
        card('Heute', `<p><strong>6</strong> Posteingang: Mensch sendet<br><strong>7</strong> Bestand: belegter Entwurf<br><strong>8</strong> Freigabe der Entscheidung<br><strong>9</strong> Eingriffsfenster<br><strong>10</strong> Video und Vorstand</p>`, 'mint-card')
      ]),
      notes: 'ZEIT: 4 Minuten. SAGEN: Heute geht es darum, wie man ein agentisches System aufbaut. Jeder Drill rückt einen Baustein in den Fokus; die Kontrollregel liegt zwischen Vorschlag und externer Wirkung. Jeder Startzustand zeigt nur die Fähigkeiten des aktuellen Drills. Der nächste Checkpoint enthält die Lösung des vorigen Bauauftrags – wer hängt, lädt ihn und macht mit der Gruppe weiter.'
    },
    {
      id: 'Arbeitsrhythmus', type: 'Inhalt', eyebrow: 'So arbeiten wir', title: 'Ihr entscheidet. Claude baut.',
      body: `<div class="day-flow"><div class="day-flow-step"><b>Regel</b><span>in euren Worten</span></div><div class="day-arrow">→</div><div class="day-flow-step"><b>Szenarien</b><span>was muss gelten?</span></div><div class="day-arrow">→</div><div class="day-flow-step"><b>Bauen</b><span>Claude schreibt Code</span></div><div class="day-arrow">→</div><div class="day-flow-step"><b>Prüfen</b><span>im Cockpit erleben</span></div><div class="day-arrow">→</div><div class="day-flow-step"><b>Speichern</b><span>euer Stand</span></div></div>`,
      notes: 'ZEIT: 3 Minuten. SAGEN: Nicht vier Prompts, sondern echte Entwicklungszyklen. In jeder Etappe fragt Claude zuerst nach eurer Entscheidung – ein „mach einfach“ reicht nicht. Tempo: Claude führt Schritt für Schritt oder lässt euch mehr selbst probieren; wer früher fertig ist, baut die eigene Kommandozentrale aus. Fallnachweis und Sicherheitsgrenzen bleiben für alle gleich.'
    },
    {
      id: 'Drill6Start', type: 'Kapitel', eyebrow: '10:00–11:00 · Meilenstein 1', title: 'Die Kommandozentrale', study: true,
      body: stage('6', 'Ein Satz an Claude – und die erste Antwort.', ['Start: drill-06-start']),
      notes: 'ZEIT: 1 Minute. SAGEN: Claude richtet alles ein und öffnet die Kommandozentrale. Im Posteingang liegt meine Mail – eure erste Aufgabe: antworten, mit Claude. Den Text bereitet Claude vor, senden tut der Mensch. Noch kein Kundenkontext, keine Freigabe, kein Timer.'
    },
    zeitplan('drill-06'),
    {
      id: 'Drill6Los', type: 'Drill', eyebrow: 'Drill 6 · So startet ihr', title: 'Ein Satz an Claude. Kein Terminal.', study: true,
      body: grid([
        card('Claude-App → Code', `${prompt('Klone https://github.com/jhoetter/pfefferminzia nach ~/pfefferminzia, richte alles nach der README ein und starte die Kommandozentrale. Ich bin in Drill 6.')}<p class="day-small">Dann den Schlüssel vom Zettel einfügen.</p>`, 'mint-card'),
        card('Nicht weiter?', `<p class="day-emphasis">Fragt Claude – oder mich.</p><p>Claude kennt den Drill und gibt Hinweise in kleinen Schritten. Ich laufe rum.</p>`)
      ]),
      notes: 'ZEIT: 10 Minuten inkl. Einrichtung. SAGEN: Claude-App öffnen, Bereich Code, neue Sitzung mit eurem Benutzerordner. Sagt Claude den Satz; danach bittet es euch einmal um eine neue Sitzung im Ordner pfefferminzia, dann öffnet sich die Kommandozentrale – ein Softwaregerüst, das ihr heute ausbaut. Die erste Aufgabe steht schon drin: meine Mail beantworten. Keine Sorge: Beim nächsten Drill gibt es einen Checkpoint. VORHER: Claude bitten „Schick die Drill-6-Begrüßung an alle“.'
    },
    {
      id: 'Teilnehmende', type: 'Setup', eyebrow: 'Drill 6 · Eure Plätze', title: 'Wer hat welchen Schlüssel?',
      body: `<div class="day-roster" id="day-roster"><p class="day-roster-empty">Lade die Liste …</p></div>`,
      notes: 'Nur auf dem Dozentenrechner: Die Liste kommt zur Laufzeit aus .instructor/roster.csv (nie aus Git). Gezeigt werden Vorname und der Anfang des Schlüssels – der gemeinsame Anfang plus vier Zeichen, damit jede Person ihren Zettel wiedererkennt. Folie über die Kommandozentrale öffnen (http://127.0.0.1:3004/slides/…), sonst bleibt sie leer.'
    },
    {
      id: 'Drill6Cockpit', type: 'Screenshot', eyebrow: 'Drill 6 · Die Kommandozentrale', title: 'Die erste Mail ist schon da.', study: true, visual: true,
      body: shot(['cockpit-drill6.webp', 'Kommandozentrale mit geöffneter Mail und Antwortentwurf']),
      notes: 'ZEIT: 2 Minuten. SAGEN: Das ist eure eigene Instanz. Links die Bereiche, in der Mitte der Posteingang, rechts die Mail mit Antwortfeld und der Aufgabe „Antworten“. Claude schreibt den Entwurf, ihr ändert und sendet. Senden kann nur der Mensch – Claude hat dafür kein Werkzeug.'
    },
    {
      id: 'Drill6Auftrag', type: 'Drill', eyebrow: "Drill 6 · Eure Aufgaben · 60 Minuten", title: "Entscheiden. Bauen. Selbst senden.",
      subtitle: "Start: neue Sitzung im Ordner pfefferminzia – „weiter mit Drill 6“.", study: true,
      body: taskBoard(["Mail lesen: Was willst du antworten?", "Claude entwirft, du änderst – <strong>noch nicht senden</strong>.", "Bauen: „Antworten“ erledigt sich beim Senden.", "Senden – und sehen, dass es wirkt."], "Antwort gesendet, die Aufgabe hat sich selbst erledigt, Stand gespeichert.", "Denkanstoß von Claude holen, dann die eigene Kommandozentrale ausbauen."),
      notes: "ZEIT: 2 Minuten, dann bleibt die Folie stehen. SAGEN: Ihr entscheidet, Claude baut. Claude zeigt zuerst, was die Kommandozentrale kann, und fragt euch in jedem Schritt. Wichtig: in Schritt 2 noch nicht senden – euer Senden ist in Schritt 4 der Beweis. Wer früher fertig ist: Denkanstöße, dann eigene Erweiterung (z. B. Suche im Posteingang) – nicht vorgreifen. Ich laufe rum."
    },
    {
      id: 'Drill7Start', type: 'Kapitel', eyebrow: '11:15–12:15 · Meilenstein 2', title: 'Der Mensch sendet', study: true,
      body: stage('7', 'Claude bereitet vor – mit Belegen aus dem Bestand.', ['Start: drill-07-start']),
      notes: 'ZEIT: 1 Minute. SAGEN: Neu ist der Bestand – die Daten von Montag. Claude löst den Leben-Fall zu Kundin, Vertrag und Tarifgeneration auf, ihr redigiert und sendet selbst. DOZENT: Claude bitten „Schick die Drill-7-Mails an alle“.'
    },
    zeitplan('drill-07'),
    recap(6, 'Die Aufgabe „Antworten“ erledigt sich beim Senden.', 'Claude entwirft. Senden tut der Mensch.', 'Was hat euch überrascht?'),
    {
      id: 'Drill7Kontext', type: 'Screenshot', eyebrow: 'Drill 7 · Aus dem Bestand', title: 'Die Mail behauptet. Der Vertrag belegt.', study: true, visual: true,
      body: shot(['cockpit-drill7.webp', 'Aus dem Bestand: Kundin, Vertrag, Tarifgeneration PL-2017, Begünstigte']),
      notes: 'ZEIT: 3 Minuten. SAGEN: Unter „Aus dem Bestand“ steht, was Claude nachgeschlagen hat – nicht aus der Mail, sondern aus den Daten des Versicherers. Tarifgeneration PL-2017, Begünstigte, Tarifblatt. Nicht die erstbeste Tarif-PDF, sondern die zum Vertrag passende Generation. Links „Bestand“ zeigt alle Kunden und Verträge.'
    },
    {
      id: 'Drill7Auftrag', type: 'Drill', eyebrow: "Drill 7 · Eure Aufgaben · 60 Minuten", title: "Erst Quelle. Dann Entwurf. Dann du.",
      subtitle: "Start: „Ich will zu Drill 7. Frag mich, ob ich meinen Stand mitnehmen will.“", study: true,
      body: taskBoard(["Bestand ansehen: Kundin, Vertrag, Tarif bestätigen.", "Entwurf mit Beleg ändern – <strong>noch nicht senden</strong>.", "Bauen: Ein falsches Tarifzitat wird gestoppt.", "Austricksen – dann senden."], "Antwort gesendet, falsches Tarifzitat wird gestoppt, Stand gespeichert.", "Denkanstoß holen, dann ausbauen – z. B. das Tarifblatt direkt im Cockpit."),
      notes: "ZEIT: 2 Minuten, dann bleibt die Folie stehen. SAGEN: Claude lädt beim Wechsel im selben Ordner, ohne neue Sitzung. Erst den Bestand anschauen, dann die Mail. Die Mail ist eine Behauptung, der Vertrag ist der Beleg. Den Wortlaut der Fehlermeldung legt ihr selbst fest. Früher fertig: Denkanstöße und eigene Erweiterung (Vorschlag: Beleg-Ampel). DOZENT: Drill-7-Mails nach dem Laden senden."
    },
    {
      id: 'Drill8Start', type: 'Kapitel', eyebrow: '13:15–14:15 · Meilenstein 3', title: 'Der Mensch gibt frei', study: true,
      body: stage('8', 'Claude bereitet alles vor. Du gibst die Entscheidung frei.', ['Start: drill-08-start']),
      notes: 'ZEIT: 1 Minute. SAGEN: Der Mensch schreibt nicht mehr jeden Satz. Er verantwortet die Entscheidung vor jeder externen Wirkung. Eine Ablehnung ist ein vollwertiger Erfolgspfad. DOZENT: Claude bitten „Schick die Drill-8-Mails an alle“.'
    },
    zeitplan('drill-08'),
    recap(7, 'Ein falsches Tarifzitat wird gestoppt.', 'Die Mail behauptet, der Vertrag belegt.', 'Wo zitiert euer Haus heute den falschen Tarif?'),
    {
      id: 'Drill8Review', type: 'Screenshot', eyebrow: 'Drill 8 · Die Freigabe', title: 'Freigegeben wird die Entscheidung.', study: true, visual: true,
      body: shot(['cockpit-drill8.webp', 'Karte Leistungsentscheidung mit Knopf „Entscheidung freigeben“']),
      notes: 'ZEIT: 4 Minuten. SAGEN: Claude legt eine Leistungsentscheidung vor – Ergebnis, Betrag, Rechtsgrundlage, Begründung – und schreibt den Antwortentwurf dazu. Ihr gebt die Entscheidung frei, nicht jedes Wort. Beim Freigeben entsteht ein versiegelter PDF-Beleg, der mit der Antwort mitgeht. Ändert Claude die Entscheidung, erlischt die Freigabe; den Text dürft ihr frei ändern. Darüber die Leistungsakte: Die alte Ablehnung stützte sich auf eine Frist, die nur bei Suizid gilt.'
    },
    {
      id: 'Drill8Auftrag', type: 'Drill', eyebrow: "Drill 8 · Eure Aufgaben · 60 Minuten", title: "Claude bereitet vor. Du entscheidest.",
      subtitle: "Start: „Ich will zu Drill 8. Frag mich, ob ich meinen Stand mitnehmen will.“", study: true,
      body: taskBoard(["Erst deine Prüfpunkte, dann die Entscheidungen.", "Eine freigeben, eine begründet ablehnen.", "Bauen: Der Ablehnungsgrund wird sichtbar.", "Entscheidung ändern – Freigabe erlischt."], "Eine Entscheidung freigegeben und gesendet, eine abgelehnt, Stand gespeichert.", "Denkanstoß holen, dann ausbauen – z. B. eine Prüf-Checkliste beim Freigeben."),
      notes: "ZEIT: 2 Minuten, dann bleibt die Folie stehen. SAGEN: Erst die eigenen Prüfpunkte, dann die Vorlage – sonst prüft man nur, was der Agent zeigt. Eine Ablehnung ist ein vollwertiger Erfolgspfad; die Begründung steuert Claude. Text ändern lässt die Freigabe stehen, Entscheidung ändern nicht. Früher fertig: Denkanstöße und eigene Erweiterung (Vorschlag: Risiko-Einstufung). DOZENT: Drill-8-Mails nach dem Laden senden."
    },
    {
      id: 'Drill9Start', type: 'Kapitel', eyebrow: '14:30–15:30 · Meilenstein 4', title: 'Das Eingriffsfenster', study: true,
      body: stage('9', 'Automatisch – solange niemand eingreift.', ['Start: drill-09-start']),
      notes: 'ZEIT: 1 Minute. SAGEN: Jetzt ändert sich die Voreinstellung. Ohne Eingriff geht eine Antwort raus. Darum müssen Warteschlange und Frist sichtbar und beeinflussbar sein. Und: Neue Mails sortiert ihr heute selbst vor – nach Stichwörtern oder mit KI. DOZENT: Claude bitten „Schick die Drill-9-Mails an alle“.'
    },
    zeitplan('drill-09'),
    recap(8, 'Der Ablehnungsgrund steht im Fall.', 'Freigegeben wird die Entscheidung – ändert sie sich, erlischt die Freigabe.', 'Was war eure beste Ablehnungsbegründung?'),
    {
      id: 'Drill9Queue', type: 'Screenshot', eyebrow: 'Drill 9 · Das Eingriffsfenster', title: 'Geht in 24 h raus – außer du hältst es an.', study: true, visual: true,
      body: shot(['cockpit-drill9-list.webp', 'Eingriffsfenster mit drei eingeplanten Antworten und Countdown'], ['cockpit-drill9-fenster.webp', 'Antwort mit „Geht automatisch raus in 23 h 58 min“ und „Versand stoppen“']),
      notes: 'ZEIT: 4 Minuten. SAGEN: Links das Eingriffsfenster mit Countdown pro Antwort. Unten im Fall: „Ändern und Versand stoppen“ oder „Versand stoppen“. Oben rechts „Zeit +24 h“ – das kann nur der Mensch. Erst vorhersagen, was nach 24 Stunden rausgeht, dann vorspulen und am Protokoll prüfen.'
    },
    {
      id: 'Drill9Auftrag', type: 'Drill', eyebrow: "Drill 9 · Eure Aufgaben · 60 Minuten", title: "Das Fenster ist sichtbar. Die Wirkung kommt später.",
      subtitle: "Start: „Ich will zu Drill 9. Frag mich, ob ich meinen Stand mitnehmen will.“", study: true,
      body: taskBoard(["Entscheiden: Stichwörter oder KI?", "Bauen: Vorsortierung – dann Postfach abrufen.", "Vorhersagen: ändern, stoppen, laufen lassen.", "„Zeit +24 h“ – mit Vorhersage vergleichen."], "Mails werden nach deinen Regeln vorsortiert; eine Antwort ging automatisch raus, eine geändert, eine gestoppt.", "Denkanstoß holen, dann ausbauen – z. B. „geht als Nächstes raus“ sortiert."),
      notes: "ZEIT: 2 Minuten, dann bleibt die Folie stehen. SAGEN: Jetzt kippt die Voreinstellung: Ohne Eingriff passiert etwas. Die Vorsortierung ist euer Bauauftrag – ihr wählt den Weg und was bei Unklarheit passiert. Der Drill-9-Stand schaltet den automatischen Versand selbst ein. Früher fertig: Denkanstöße und eigene Erweiterung (Vorschlag: eigene Kennzahl für die Vorstandspräsentation). DOZENT: Drill-9-Mails nach dem Laden senden."
    },
    {
      id: 'Drill10Start', type: 'Kapitel', eyebrow: '15:45–16:30 · Meilenstein 5', title: 'Pfefferminzia 2.0', study: true,
      body: stage('10', 'Erst begeistern, dann belegen.', ['Start: drill-10-start', 'Freie Hand']),
      notes: 'ZEIT: 1 Minute. SAGEN: Letzter Drill vor dem Whiteboard. Ihr erzählt euer System nach außen – erst als Marketing-Video mit Remotion, dann dem Vorstand. Botschaft, Szenen und Folien bestimmt ihr. Beim Wechsel werden nur gezählte Werte kopiert, keine Mailtexte oder Namen. Auto-Versand ist wieder aus.'
    },
    zeitplan('drill-10'),
    recap(9, 'Neue Mails sortieren sich selbst vor.', 'Automatisch geht – mit sichtbarem Eingriffsfenster.', 'Stimmte eure Vorhersage nach +24 h?'),
    {
      id: 'Drill10Daten', type: 'Screenshot', eyebrow: 'Drill 10 · Ein Beispiel', title: 'Botschaft → Video → Vorstand.', study: true, visual: true,
      body: shot(['drill10-video.webp', 'Standbild aus dem Beispielvideo Pfefferminzia 2.0']),
      notes: 'ZEIT: 2 Minuten. Das Beispielvideo aus der README kurz zeigen (docs/media/pfefferminzia-2-0-pitch.mp4) – als Möglichkeit, nicht als Vorlage zum Nachbauen. SAGEN: Claude richtet Node und Remotion im Hintergrund ein, während ihr die Botschaft überlegt. Klappt das nicht in fünf Minuten: Video weglassen, Präsentation bauen. Marketing darf begeistern – aber keine erfundenen Zahlen. Der Vorstand braucht Beleg und Grenze.'
    },
    {
      id: 'Drill10Auftrag', type: 'Drill', eyebrow: "Drill 10 · Eure Aufgaben · 45 Minuten", title: "Ein Video. Eine Präsentation. Eure Botschaft.",
      subtitle: "Start: „Ich will zu Drill 10. Frag mich, ob ich meinen Stand mitnehmen will.“", study: true,
      body: taskBoard(["Für wen, welche Botschaft? Claude richtet ein.", "Video bauen, verbessern, rendern.", "Präsentation für den Vorstand.", "Drei Minuten vorführen."], "Video und Präsentation im Pfefferminzia-Look; keine erfundenen Zahlen; Stand gespeichert.", "Eine kürzere Videofassung – oder die Folie „Mein agentisches System“."),
      notes: "ZEIT: 2 Minuten, dann bleibt die Folie stehen. SAGEN: Freie Hand – Ton, Szenen, Folien entscheidet ihr. Präsentation: unten links „Vorstand“ im Cockpit. Anleitung: docs/VIDEO_REMOTION.md. Wer ohne Guthaben ist: Buddy-Modus."
    },
    {
      id: 'Checkpoints', type: 'Rettung', eyebrow: 'Sicheres Aufholen', title: 'Hängst du? Der Checkpoint rettet dich.',
      body: grid([
        card('Eigenen Stand mitnehmen', `<p class="day-emphasis">Dein Code und deine Fälle bleiben.</p>`, 'mint-card'),
        card('Frisch offiziell starten', `<p class="day-emphasis">Lösung laden – deine Arbeit wird gesichert.</p>`)
      ]),
      notes: 'ZEIT: 3 Minuten. SAGEN: Claude fragt beim Drill-Wechsel: mitnehmen oder frisch offiziell? Es zeigt den Plan und lädt erst nach einem klaren Ja. Alles passiert im selben Ordner und in derselben Sitzung. Mitnehmen stellt nur den Drill um, auch noch nicht Gespeichertes bleibt. Offiziell sichert den eigenen Code und die Fälle und lädt den Referenzstand mit allen bisherigen Lösungen.'
    },
    {
      id: 'Tempo', type: 'Inhalt', eyebrow: 'Euer Tempo', title: 'Schneller? Ausbauen. Hängst du? Halt.',
      body: grid([
        card('Schneller', `<p class="day-emphasis">Die eigene Kommandozentrale erweitern – erst Steckbrief, dann bauen.</p>`, 'mint-card'),
        card('Mehr Unterstützung', `<p class="day-emphasis">Claude zeigt den nächsten Schritt. Ich helfe. Der Checkpoint holt auf.</p>`, 'red-card')
      ]),
      notes: 'ZEIT: 2 Minuten. SAGEN: Ausbauen ist ein Angebot nach dem Fallnachweis – kein Pflichtprogramm und kein Vorgriff auf den nächsten Drill. Wer ein Werkzeug mit Außenwirkung baut, etwa Senden, legt vorher die Kontrolle fest. Buddys stellen Fragen, übernehmen nicht Tastatur oder Freigabe. Bei Tokenlimit: Browser und Drill-Karten; nie Passwörter teilen.'
    },
    {
      id: 'Whiteboard', type: 'Schluss', eyebrow: '16:45 · Laptops zu', title: 'Wo darf der Agent handeln?',
      body: `<div class="day-flow"><div class="day-flow-step"><b>Auslöser</b><span>Mail · Zeitplan</span></div><div class="day-arrow">→</div><div class="day-flow-step"><b>Agent</b><span>Werkzeuge + Belege</span></div><div class="day-arrow">→</div><div class="day-flow-step"><b>Kontrolle</b><span>Freigabe oder<br>Fenster</span></div><div class="day-arrow">→</div><div class="day-flow-step"><b>Wirkung</b><span>Versand + Protokoll</span></div></div>`,
      notes: 'ZEIT: 2 Minuten, dann Beamer aus. SAGEN: Wir haben Claude heute im Chat angestoßen; wie sähe derselbe Prozess als Mail-Event oder periodischer Lauf aus? Wer betreibt ihn, mit welchen Rechten, Retry- und Stoppregeln? Kein Produktiv-Cronjob im Workshop.'
    },
    {
      id: 'Contract', type: 'Schluss', eyebrow: 'Übergabe an Mittwoch', title: 'Ein Automation Contract macht die Grenze explizit.',
      body: grid([
        card('Sechs Felder', `<p class="day-emphasis">Auslöser · Aktionen · Kontrollregel · Belege · Ausnahme · verantwortlicher Mensch</p>`, 'mint-card'),
        card('Eine Frage', `<p class="day-emphasis">Welche externe Wirkung wäre bei euch heute schon verantwortbar?</p>`, 'red-card')
      ]),
      notes: 'ZEIT: 1 Minute. SAGEN: Die Gruppe schreibt den Contract am Whiteboard / im Handout. Was darf automatisch laufen, was bleibt absichtlich beim Menschen – und welchen Beleg bräuchtet ihr, um es morgen noch zu erklären? Am Mittwoch dient er als Startpunkt für den eigenen Fall.'
    }
  ];

  const agentisch = window.PFEFFERMINZIA_AGENTISCH_SLIDES || [];

  const deckIds = {
    gesamt: ['Titel', 'Bruecke', 'Agenda', 'LiveBeispiele', 'Kontrollmuster', 'Zielbild', 'Arbeitsrhythmus', 'Tempo', 'Whiteboard', 'Contract'],
    input: ['Titel', 'Bruecke', 'Agenda', 'LiveBeispiele', 'Architektur', 'Belege', 'Kontrollmuster', 'Zielbild', 'Arbeitsrhythmus'],
    'drill-06': ['Drill6Start', 'Zeitplan-drill-06', 'Drill6Los', 'Teilnehmende', 'Drill6Cockpit', 'Drill6Auftrag', 'Checkpoints'],
    'drill-07': ['Drill7Start', 'Zeitplan-drill-07', 'Rueckblick6', 'Drill7Kontext', 'Drill7Auftrag', 'Checkpoints'],
    'drill-08': ['Drill8Start', 'Zeitplan-drill-08', 'Rueckblick7', 'Drill8Review', 'Drill8Auftrag', 'Checkpoints'],
    'drill-09': ['Drill9Start', 'Zeitplan-drill-09', 'Rueckblick8', 'Drill9Queue', 'Drill9Auftrag', 'Checkpoints'],
    'drill-10': ['Drill10Start', 'Zeitplan-drill-10', 'Rueckblick9', 'Drill10Daten', 'Drill10Auftrag'],
    abschluss: ['Zeitplan-abschluss', 'Whiteboard', 'Contract'],
    teilnehmende: ['Teilnehmende'],
    agentisch: agentisch.map(slide => slide.id)
  };
  slides.push(zeitplan('abschluss'));
  const allSlides = [...slides, ...agentisch];
  const selectedIds = deckIds[deckName] || deckIds.gesamt;
  const selectedSlides = selectedIds.map(id => allSlides.find(slide => slide.id === id));
  document.title = `Pfefferminzia · ${deckName === 'agentisch' ? 'Agentisch arbeiten' : deckName === 'gesamt' ? 'Gesamtkontext' : deckName}`;
  const footerLabel = deckName === 'agentisch'
    ? 'Arbeiten in agentischen Teams · Johannes Hötter'
    : 'AI Studio and the Future of Work · Insurance Edition · Johannes Hötter';

  function render(slide, index) {
    const bubbleText = slide.avatarBubble || (slide.id === 'AgentischTitel' ? 'Hi, ich bin Johannes.' : slide.study ? 'Nur dieser Drill. Versprochen.' : '');
    const avatar = johannesAvatar && (slide.cover || slide.avatar || slide.id.endsWith('Start') || slide.id === 'AgentischBruecke')
      ? `<div class="day-avatar-sticker ${slide.cover ? 'cover' : ''}">${johannesAvatar}${bubbleText ? `<div class="day-avatar-bubble">${bubbleText}</div>` : ''}</div>`
      : '';
    const frame = slide.cover
      ? `<div class="day-frame"><div class="day-head"><div class="caption">${slide.eyebrow}</div><img class="day-logo" src="${logo}" alt="Universität St.Gallen"></div>${slide.body}${avatar}<div class="day-foot"><div>${footerLabel}</div><div>${slide.type} · <strong>${String(index + 1).padStart(2, '0')} / ${selectedSlides.length}</strong></div></div></div>`
      : `<div class="day-frame ${slide.visual ? 'visual' : ''}">${slide.study ? '<div class="day-stripe"></div>' : ''}<div class="day-head"><div class="caption ${slide.study ? 'mint' : ''}">${slide.eyebrow}</div><img class="day-logo" src="${logo}" alt="Universität St.Gallen"></div><div class="day-heading"><h2>${slide.title}</h2>${slide.subtitle ? `<p>${slide.subtitle}</p>` : ''}</div><div class="day-content">${slide.body}</div>${avatar}${slide.source ? `<div class="day-source">${slide.source}</div>` : ''}<div class="day-foot"><div>${footerLabel}</div><div>${slide.type} · <strong>${String(index + 1).padStart(2, '0')} / ${selectedSlides.length}</strong></div></div></div>`;
    return `<section data-id="${slide.id}">${frame}<aside class="notes"><p>${slide.notes}</p></aside></section>`;
  }

  sourceSlides.innerHTML = selectedSlides.map(render).join('');

  // Participants and the start of their keys – only on the instructor machine, read at runtime from .instructor/.
  const roster = document.getElementById('day-roster');
  if (roster) {
    fetch('/api/instructor/roster', {cache: 'no-store'})
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(rows => {
        roster.innerHTML = rows.map(row => `<div class="day-roster-card"><span>${row.slot}</span><strong>${row.firstName}</strong><code>${row.keyStart}</code></div>`).join('');
      })
      .catch(() => { roster.innerHTML = '<p class="day-roster-empty">Nur auf dem Dozentenrechner – über die Kommandozentrale öffnen.</p>'; });
  }
})();
