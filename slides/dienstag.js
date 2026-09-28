/* Tuesday deck content. Falk's HTML remains the visual and reveal.js base. */
(() => {
  const sourceSlides = document.querySelector('.slides');
  const logo = sourceSlides.querySelector('img[src^="data:image/png"]')?.getAttribute('src') || '';
  const johannesAvatar = sourceSlides.querySelector('svg[aria-label^="Comicfigur Johannes"]')?.outerHTML || '';
  const deckName = new URLSearchParams(window.location.search).get('deck') || 'gesamt';
  const source = deckName === 'agentisch'
    ? ''
    : 'Gestaltung: Falk Uebernickel · Fiktive Pfefferminzia-Workshopfälle';
  const pill = (text, tone = '') => `<span class="day-pill ${tone}">${text}</span>`;
  const card = (title, content, extra = '') => `<div class="day-card ${extra}"><h3>${title}</h3>${content}</div>`;
  const grid = (items, columns = 'two') => `<div class="day-grid ${columns}">${items.join('')}</div>`;
  const prompt = text => `<div class="day-prompt">${text}</div>`;
  // One slide per drill stays on the projector while people work: start, four steps, done, early finish.
  const taskBoard = (steps, done, early) => grid([
    card('Eure vier Schritte', `<ol class="day-tasks">${steps.map(step => `<li>${step}</li>`).join('')}</ol>`, 'mint-card'),
    card('Fertig, wenn …', `<p>${done}</p><h3 class="day-task-early">Früher fertig?</h3><p>${early}</p><p class="day-small">Hängst du? Frag Claude: „Was ist mein nächster Schritt?“ – oder winke mir.</p>`)
  ]);
  const code = text => `<div class="day-command">${text}</div>`;
  const stage = (number, headline, summary, tags) => `<div class="day-big-num">${number}</div><div class="day-stage-title">DRILL ${number}</div><div class="day-stage-summary"><strong>${headline}</strong><br>${summary}</div><div class="day-stage-bottom">${tags.map(x => pill(x, 'mint')).join('')}</div>`;

  const slides = [
    {
      id: 'Titel', type: 'Titel', eyebrow: 'Dienstag · 29. September 2026', cover: true,
      body: `<div class="day-cover-title">VOM AGENTEN<br>ZUM SYSTEM</div><div class="day-cover-sub">Wenn KI im Versicherungsprozess handelt.</div><div class="day-cover-ribbon">AI AUTOMATION · INSURANCE EDITION</div><div class="day-cover-burst"><strong>5</strong><span>DRILLS</span></div>`,
      notes: 'ZEIT: 1 Minute. SAGEN: Gestern haben wir mit Daten und Urteilen gearbeitet. Heute geben wir dem Agenten kontrollierte operative Fähigkeiten. ÜBERLEITUNG: Wo genau kippt Assistenz in Wirkung? NICHT: Die vollständige Lösung vorwegnehmen.'
    },
    {
      id: 'Bruecke', type: 'Statement', eyebrow: 'Von Montag zu Dienstag', title: 'Aus einer guten Antwort wird heute eine echte Handlung.',
      subtitle: 'Der Unterschied ist nicht die Qualität des Textes, sondern die Wirkung ausserhalb des Chats.',
      body: grid([
        card('Montag · verstehen', `<p class="day-emphasis">Claude untersucht Daten und macht Vorschläge.</p><p>Kundensicht, Schadenfall, Underwriting und Frühwarnliste bleiben zunächst im Arbeitsraum.</p>${pill('Augmentation', 'blue')}`),
        card('Dienstag · handeln', `<p class="day-emphasis">Claude nutzt Fachfunktionen und bewegt Fälle weiter.</p><p>Ein Postfach empfängt, ein Entwurf wird versendet, eine Warteschlange löst später aus.</p>${pill('Automation', 'red')}`)
      ]),
      notes: 'ZEIT: 3 Minuten. SAGEN: Gestern, in Falks Drills 1–5, hat Claude analysiert und vorgeschlagen. Heute, in Drill 6–10, bekommt es kontrollierte operative Fähigkeiten – und der Kontrollpunkt ist neu zu verhandeln. FRAGE: Welche Aktion würde bei Ihnen erstmals jemand anderem auffallen?'
    },
    {
      id: 'Agenda', type: 'Agenda · Tag', eyebrow: 'Der Dienstag in einem Blick', title: 'Fünf kurze Builds. Ein gemeinsamer Befund.',
      subtitle: 'Jeder Drill: ein Fall für alle, ein eigener Bauauftrag – und ein Checkpoint mit Lösung, falls es klemmt.',
      body: `<div class="day-timeline">
        <div class="day-timeline-row"><strong>08:30–09:45</strong><em>Input</em><span>Live-Apps; Vibe Coding, MCP, Kontrolle</span></div>
        <div class="day-timeline-row"><strong>10:00–11:00</strong><em>Drill 6</em><span>Kommandozentrale: erste Mail mit Claude beantworten</span></div>
        <div class="day-timeline-row"><strong>11:15–12:15</strong><em>Drill 7</em><span>Leben: belegter Entwurf, Mensch sendet</span></div>
        <div class="day-timeline-row"><strong>13:15–14:15</strong><em>Drill 8</em><span>Leben: Freigabe oder Ablehnung</span></div>
        <div class="day-timeline-row"><strong>14:30–15:30</strong><em>Drill 9</em><span>Haftpflicht: automatischer Versand mit Eingriffsfenster</span></div>
        <div class="day-timeline-row"><strong>15:45–16:30</strong><em>Drill 10</em><span>Management-Report mit reveal.js und D3</span></div>
        <div class="day-timeline-row"><strong>16:45–18:00</strong><em>Whiteboard</em><span>Event/Cron oder Prompt? Automation Contract</span></div>
      </div>`,
      notes: 'ZEIT: 2 Minuten. SAGEN: Vier 60-Minuten-Drills plus 45-Minuten-Report-Drill, dazwischen Puffer und Mittagspause 12:15–13:15. Jede Person arbeitet in ihrer eigenen Kopie, baut und committet Code. Nach den operativen Kontrollmustern wird ein kurzer Report daraus; die 75 Minuten Whiteboard bleiben erhalten.'
    },
    {
      id: 'LiveBeispiele', type: 'Input', eyebrow: 'Morgens · Blick nach vorn', title: 'Ich zeige, wie ich arbeite. Dann baut ihr selbst.',
      subtitle: 'Heute Abend: ein Gefühl dafür, welche Aufgaben autonom laufen, welche Planung brauchen und wo Kontrolle oder Freigabe nötig ist.',
      body: grid([
        card('Live-Demo', `<p>Drei eigene Anwendungen, direkt im Browser gezeigt – als Möglichkeitshorizont, nicht als Pfefferminzia-Musterlösung.</p>`, 'mint-card'),
        card('Danach ihr', `<p>Eigene Kopie. Eigener Code. Claude Code als Programmierpartner und Tutor.</p><p>Aus einem Prompt wird erst mit geprüften Szenarien, Diff und sichtbarer Wirkung Software.</p>`)
      ]),
      notes: 'ZEIT: 5 Minuten plus Live-Demo. Die eigenen Seiten live im Browser öffnen; Folie behauptet absichtlich nichts über ihren Inhalt. Überleitung: nicht die Beispiele kopieren, sondern denselben Entwicklungsmodus an Pfefferminzia lernen. Welche Aufgabe lief autonom, welche brauchte Planung, wo saß die Freigabe?'
    },
    {
      id: 'Architektur', type: 'Inhalt', eyebrow: 'MCP-first-Betriebsmodell', title: 'Mensch und Agent benutzen dieselben Fachfunktionen.',
      subtitle: 'Claude Code ist der Arbeitspartner; Python stellt kontrollierte Aktionen und prüfbare Zustände bereit.',
      body: `<div class="day-flow">
        <div class="day-flow-step"><b>Mensch</b><span>prüft und steuert<br>im Cockpit</span></div><div class="day-arrow">↔</div>
        <div class="day-flow-step"><b>Claude Code</b><span>plant und nutzt<br>MCP-Werkzeuge</span></div><div class="day-arrow">↔</div>
        <div class="day-flow-step"><b>Python-App</b><span>Fachlogik, Rechte,<br>Protokoll und Warteschlange</span></div><div class="day-arrow">↔</div>
        <div class="day-flow-step"><b>AgentMail</b><span>persönliche Inbox<br>und Versand</span></div>
      </div>`,
      notes: 'ZEIT: 5 Minuten. SAGEN: Die Oberfläche ist nicht die eigentliche Schnittstelle. Claude Code spricht über MCP mit demselben Python-System. AgentMail ist die externe Grenze. Pro Person gibt es eine isolierte Inbox. VORFÜHRUNG: Eine Nachricht erscheint im Cockpit und kann über MCP gelesen werden.'
    },
    {
      id: 'Belege', type: 'Inhalt', eyebrow: 'Verifizierbarkeit', title: 'Jede wichtige Aktion braucht einen sichtbaren Beleg.',
      subtitle: 'Wir vertrauen keinem „erledigt“ im Chat, sondern prüfen den Zustand im System.',
      body: grid([
        card('Vor der Wirkung', `<p>Welche Kundin? Welcher Vertrag? Welche Tarifgeneration? Welche Fundstelle?</p><p>Welche Aktion ist vorgeschlagen – und wer darf sie auslösen?</p>`),
        card('Nach der Wirkung', `<p>Welcher Status hat sich geändert? Wer hat freigegeben, editiert oder gestoppt?</p><p>Was ging wann an welche erlaubte Adresse raus?</p>`, 'mint-card')
      ]),
      notes: 'ZEIT: 4 Minuten. SAGEN: Verifiability ist ein Arbeitsmuster: Hypothese, Werkzeugaufruf, Zustandsänderung, Nachweis. Demonstrieren am Activity Log; keine geheimen Rohdaten auf Folien.'
    },
    {
      id: 'Kontrollmuster', type: 'Inhalt', eyebrow: 'Zwei Kontrollmuster', title: 'Dasselbe System kennt zwei unterschiedliche Stopplinien.',
      subtitle: 'Die fachliche Risikoeinschätzung bestimmt, wann der Mensch handeln muss.',
      body: grid([
        card('Leben · Opt-in', `<p class="day-emphasis">Ohne ausdrückliche Freigabe verlässt nichts den Fall.</p><p>Agent entscheidet und formuliert; Mensch genehmigt, lehnt ab oder ergänzt Kontext.</p>${pill('Freigabe ist Pflicht', 'red')}`, 'red-card'),
        card('Haftpflicht · Opt-out', `<p class="day-emphasis">Nach sichtbarer Frist geht die Antwort standardmässig raus.</p><p>Im Eingriffsfenster kann der Mensch editieren, stoppen oder den Versand stoppen.</p>${pill('Eingriff ist möglich', 'mint')}`, 'mint-card')
      ]),
      notes: 'ZEIT: 6 Minuten. SAGEN: Das ist keine pauschale Aussage über Versicherungsprodukte. Im Workshop simulieren wir zwei Kontrollmuster an synthetischen Fällen. Die Gruppe soll den Unterschied erleben. FRAGE: Welche Fehlerklasse wird durch jedes Muster abgefangen?'
    },
    {
      id: 'Zielbild', type: 'Inhalt', eyebrow: 'Rückwärts vom Zielbild', title: 'Am Ende können wir beide Kontrollmuster live vergleichen.',
      subtitle: 'Jeder Startzustand zeigt nur die Fähigkeiten des aktuellen Drills.',
      body: grid([
        card('Sechs Bausteine', `<p><strong>Eingänge</strong> · <strong>Wissen</strong> · <strong>Werkzeuge</strong> · <strong>Kontrollen</strong> · <strong>Oberfläche</strong> · <strong>Protokoll</strong></p><p>Aus diesen Teilen besteht jedes agentische System. Die Kontrollregel liegt <strong>zwischen Vorschlag und externer Wirkung</strong>.</p>`),
        card('Fünf Etappen', `<p><strong>6</strong> Eingänge &amp; Werkzeuge: Mensch sendet<br><strong>7</strong> Wissen &amp; Prüfregel: Leben<br><strong>8</strong> Kontrolle: Mensch gibt frei<br><strong>9</strong> Kontrolle: Eingriffsfenster<br><strong>10</strong> Protokoll: Management-Report</p>`, 'mint-card')
      ]),
      notes: 'ZEIT: 4 Minuten. SAGEN: Heute geht es darum, wie man ein agentisches System aufbaut. Jeder Drill rückt einen Baustein in den Fokus; wer früher fertig ist, baut den nächsten Baustein in der eigenen Kommandozentrale schon im Kleinen. Jeder Startzustand zeigt nur die Fähigkeiten des aktuellen Drills. Der nächste Checkpoint enthält die Lösung des vorigen Bauauftrags – wer hängt, lädt ihn und macht mit der Gruppe weiter. Die Teilnehmenden bauen im eigenen Branch weiter; eine Recovery liegt getrennt, ohne ihre Arbeit zu überschreiben.'
    },
    {
      id: 'Arbeitsrhythmus', type: 'Inhalt', eyebrow: 'So arbeiten wir', title: 'Nicht vier Prompts: vier echte Entwicklungszyklen.',
      subtitle: 'Gleicher Fallnachweis für alle. Unterschiedlich viel eigener Code ist erlaubt.',
      body: grid([
        card('Deine Version', `<p>Branch → Szenarien festlegen → mit Claude bauen → Diff prüfen → Fall im Cockpit erleben → Commit.</p><p>Jeder Drill endet mit einem sichtbaren eigenen Beitrag.</p>`),
        card('Dein Tempo', `<p><strong>Geführt:</strong> nächster Schritt und Dateistelle.<br><strong>Bauend:</strong> Szenarien festlegen und gemeinsam iterieren.<br><strong>Ausbauend:</strong> nach dem Fallnachweis die eigene Kommandozentrale erweitern – erst Steckbrief, dann bauen.</p>`, 'mint-card')
      ]),
      notes: 'ZEIT: 3 Minuten. SAGEN: Claude passt den Hilfsgrad an, ohne die Person zu etikettieren. Persönliche Kopie und Inbox. In jeder Etappe fragt Claude zuerst nach eurer Entscheidung – ein „mach einfach“ reicht nicht. Schnelle erweitern ihr eigenes System; andere laden nach Rückfrage den offiziellen Checkpoint. Fallnachweis und Sicherheitsgrenzen bleiben für alle gleich.'
    },
    {
      id: 'Drill6Start', type: 'Kapitel', eyebrow: '10:00–11:00 · Meilenstein 1', title: 'Die Kommandozentrale', study: true,
      body: stage('6', 'Von einem Satz an Claude zur ersten Antwort.', 'Claude richtet alles ein und öffnet die Kommandozentrale. Im Posteingang liegt meine Mail – eure erste Aufgabe: antworten, mit Claude.', ['Start: drill-06-start', 'Ziel: Antwort + eigenes Werk']),
      notes: 'ZEIT: 1 Minute. SAGEN: Bis zum Ende dieses Drills hat jede Person meine Mail beantwortet – den Text hat Claude vorbereitet, gesendet hat der Mensch. Noch kein Kundenkontext, keine Freigabe, kein Timer.'
    },
    {
      id: 'Drill6Los', type: 'Drill', eyebrow: 'Drill 6 · So startet ihr', title: 'Ein Satz an Claude. Dann seht ihr eure Kommandozentrale.',
      subtitle: 'Kein Terminal: Claude klont, richtet ein und öffnet die Software im Browser – ein Softwaregerüst, das ihr heute ausbaut.', study: true,
      body: grid([
        card('1 · Claude-App → Code → schreiben', `${prompt('Klone https://github.com/jhoetter/pfefferminzia nach ~/pfefferminzia, richte alles nach der README ein und starte die Kommandozentrale. Ich bin in Drill 6.')}<p class="day-small">Auf Nachfrage den Schlüssel vom Zettel einfügen – sonst nichts.</p>`, 'mint-card'),
        card('2 · Wenn ihr nicht weiterwisst', `<p class="day-emphasis">Fragt Claude. Es ist hier euer Tutor.</p><p>Es kennt den Drill, gibt Hinweise in kleinen Schritten und lädt euch beim nächsten Drill den offiziellen Stand, falls etwas klemmt.</p>`)
      ]),
      notes: 'ZEIT: 10 Minuten inkl. Einrichtung. SAGEN: Claude-App öffnen, Bereich Code, neue Sitzung mit eurem Benutzerordner. Sagt Claude den Satz; danach bittet es euch einmal um eine neue Sitzung im Ordner pfefferminzia, dann öffnet sich die Kommandozentrale. Die erste Aufgabe steht schon in eurer Kommandozentrale: meine Mail beantworten – lasst Claude den Entwurf schreiben, ändert ihn und sendet selbst. Danach baut ihr mit Claude, dass sich die Aufgabe beim Senden von selbst erledigt. Keine Sorge: Beim nächsten Drill gibt es einen Checkpoint. VORHER: Claude bitten „Schick die Drill-6-Begrüßung an alle“ (oder eine eigene Mail per BCC an alle).'
    },
    {
      id: 'Drill6Cockpit', type: 'Screenshot', eyebrow: 'Drill 6 · Die Kommandozentrale', title: 'Die erste Mail ist schon da – mit Aufgabe.',
      subtitle: 'Posteingang, Aufgaben, Antwort: Claude schreibt den Entwurf, ihr sendet.', study: true,
      body: `<img src="assets/cockpit-drill6.webp" alt="Pfefferminzia-Kommandozentrale mit geöffneter Mail und Antwortentwurf" style="display:block;width:100%;max-height:560px;object-fit:contain;border:1px solid #1712;border-radius:10px">`,
      notes: 'ZEIT: 2 Minuten. SAGEN: Das ist eure eigene Instanz. Links die Bereiche, in der Mitte der Posteingang, rechts die Mail mit Antwortfeld. Senden kann nur der Mensch – Claude hat dafür kein Werkzeug.'
    },
    {
      id: 'Drill6Auftrag', type: 'Drill', eyebrow: "Drill 6 · Eure Aufgaben · 60 Minuten", title: "Entscheiden. Bauen. Selbst senden.",
      subtitle: "Start: Nach dem Einrichten neue Sitzung im Ordner pfefferminzia – „weiter mit Drill 6“.", study: true,
      body: taskBoard(["Mail lesen und sagen, was du antworten willst.", "Claude entwirft, du änderst – <strong>noch nicht senden</strong>.", "Bauen: „Antworten“ erledigt sich beim Senden.", "Senden – und in den Aufgaben sehen, dass es wirkt."], "Antwort gesendet, „Antworten“ hat sich selbst erledigt, die zweite Aufgabe ist offen, Stand gespeichert.", "Denkanstoß von Claude holen, dann die heutigen Teile weiter ausbauen – was würdest du gern noch sehen? Z. B. eine Suche im Posteingang. Nicht vorgreifen."),
      notes: "ZEIT: 2 Minuten, dann bleibt die Folie stehen. SAGEN: Das sind eure Aufgaben für die nächste Stunde. Ihr entscheidet, Claude baut. Claude zeigt euch zuerst, was die Kommandozentrale kann, und führt euch Schritt für Schritt – aber es fragt euch, und ihr entscheidet. Wichtig: in Schritt 2 noch nicht senden, euer Senden ist in Schritt 4 der Beweis. Wer früher fertig ist, bekommt Denkanstöße und erweitert die eigene Kommandozentrale – nicht vorgreifen. Ich laufe rum. ZEITPLAN: 15 Min. Start, 10 Entwurf, 20 bauen, 10 senden und belegen, 5 Rückblick."
    },
    {
      id: 'Drill7Start', type: 'Kapitel', eyebrow: '11:15–12:15 · Meilenstein 2', title: 'Der Mensch bearbeitet', study: true,
      body: stage('7', 'Der Agent bereitet vor; der Mensch versendet.', 'Leben-Fall zu Kunde, Vertrag und Tarifgeneration auflösen, Antwortentwurf redigieren und bewusst selbst senden.', ['Start: drill-07-start', 'Ziel: menschlicher Versand']),
      notes: 'ZEIT: 1 Minute. SAGEN: Wir gewinnen operative Geschwindigkeit, aber die Entscheidung und der Versand bleiben in der Hand des Menschen. DOZENT: Claude bitten „Schick die Drill-7-Mails an alle“ (oder instructor send 7 --yes); Fortschritt: „Wer hat geantwortet?“.'
    },
    {
      id: 'Drill7Kontext', type: 'Screenshot', eyebrow: 'Drill 7 · App-Komponenten', title: 'Ein guter Entwurf beginnt bei der richtigen Tarifgeneration.',
      subtitle: 'Die Oberfläche macht Kunde, Police, Quelle und Antwort nebeneinander prüfbar.', study: true,
      body: `<div class="day-app"><div class="day-app-top"><span>Pfefferminzia · Leben</span><span class="day-app-badge">Entwurf · nicht versendet</span></div>
        <div class="day-app-main"><div class="day-app-left"><div class="day-app-label">Fallkontext</div><h3>Mara Keller</h3><p>Lebensversicherung<br>Police LV-2048-17</p><div class="day-app-meta"><span>Treffer geprüft</span></div><p class="day-app-note">Ähnliche Namen? Vertragsnummer fehlt? Erst Identität klären.</p></div>
        <div class="day-app-mid"><div class="day-app-label">Antwortentwurf</div><h3>Ihre Anfrage zur Police</h3><p>Sehr geehrte Frau Keller, wir haben Ihre Frage geprüft. Nach der für Ihren Vertrag gültigen Tarifgeneration …</p><p>Mit freundlichen Grüssen<br>Pfefferminzia</p><button class="day-app-button secondary" type="button" disabled>Entwurf bearbeiten</button><button class="day-app-button" type="button" disabled>Als Mensch senden</button></div>
        <div class="day-app-right"><div class="day-app-label">Belege</div><h3>Tarif 2021</h3><p>Dokument und Fundstelle sind am Fall verlinkt.</p><span class="day-app-badge">Quelle geprüft</span></div></div></div>`,
      notes: 'ZEIT: 3 Minuten. SAGEN: Die Knöpfe auf der Folie sind absichtlich deaktiviert; die Übung findet in der App statt. Betonen: Nicht die erstbeste Tarif-PDF, sondern die zum Vertrag passende Generation.'
    },
    {
      id: 'Drill7Auftrag', type: 'Drill', eyebrow: "Drill 7 · Eure Aufgaben · 60 Minuten", title: "Erst Quelle. Dann Entwurf. Dann du.",
      subtitle: "Start: „Ich will zu Drill 7. Frag mich, ob ich meinen Stand mitnehmen will.“ Claude lädt – im selben Ordner, ohne neue Sitzung.", study: true,
      body: taskBoard(["Bestand ansehen: Kundin, Vertrag und Tarif selbst bestätigen.", "Entwurf mit Beleg ändern – <strong>noch nicht senden</strong>.", "Bauen: Ein falsches Tarifzitat wird gestoppt.", "Am eigenen Fall austricksen – dann senden."], "Geänderte Antwort gesendet, ein falsches Tarifzitat wird mit deiner Meldung gestoppt, Stand gespeichert.", "Denkanstoß von Claude holen, dann die heutigen Teile weiter ausbauen – was würdest du gern noch sehen? Z. B. das Tarifblatt direkt im Cockpit. Nicht vorgreifen."),
      notes: "ZEIT: 2 Minuten, dann bleibt die Folie stehen. SAGEN: Neu ist der Bestand – die Daten von Montag, Claude lädt sie. Erst anschauen, dann die Mail. Nicht die erstbeste Tarif-PDF, sondern die zum Vertrag passende Generation. Die Mail ist eine Behauptung, der Vertrag ist der Beleg. Den Wortlaut der Fehlermeldung legt ihr selbst fest. Wer früher fertig ist: Denkanstöße und eigene Erweiterung (Vorschlag: Beleg-Ampel) – nie der nächste Drill. DOZENT: Drill-7-Mails nach dem Laden senden."
    },
    {
      id: 'Drill8Start', type: 'Kapitel', eyebrow: '13:15–14:15 · Meilenstein 3', title: 'Der Mensch gibt frei', study: true,
      body: stage('8', 'Der Agent bearbeitet; der Mensch kontrolliert.', 'Entscheidungsvorlage und Antwort stehen fertig bereit. Freigabe, Ablehnung oder neuer Kontext starten den nächsten Schritt.', ['Start: drill-08-start', 'Ziel: explizite Freigabe']),
      notes: 'ZEIT: 1 Minute. SAGEN: Der Mensch schreibt nicht mehr jeden Satz. Er verantwortet die Stopplinie vor jeder externen Wirkung. Eine Ablehnung ist ein vollwertiger Erfolgspfad. DOZENT: Claude bitten „Schick die Drill-8-Mails an alle“ (oder instructor send 8 --yes); Fortschritt: „Wer hat geantwortet?“.'
    },
    {
      id: 'Drill8Review', type: 'Screenshot', eyebrow: 'Drill 8 · Die Freigabe', title: 'Freigegeben wird die Entscheidung, nicht jedes Wort.',
      subtitle: 'Foliendemo: Klicken Sie auf Freigeben oder Ablehnen – es wird nichts gesendet.', study: true,
      body: `<div class="day-review"><div class="day-card mint-card"><h3>Entscheidungsvorlage</h3><p><strong>Fall:</strong> fiktive Lebensanfrage · Mara Keller</p><p><strong>Leistungsentscheidung:</strong> anerkannt · 139'000 EUR · PZ-2025, Abschnitt 5.</p><p><strong>Prüfpunkt:</strong> Ist die Entscheidung durch Vertrag und Tarif gedeckt?</p><div class="day-review-status" id="review-status" aria-live="polite">Wartet auf menschliche Freigabe</div></div>
        <div class="day-card"><h3>Ihre Kontrolloptionen</h3><p>Der Mensch kann genehmigen, mit Begründung ablehnen oder neuen Kontext ergänzen.</p><button type="button" class="day-app-button" data-review="approve">Freigeben</button><button type="button" class="day-app-button danger" data-review="reject">Ablehnen</button><button type="button" class="day-app-button secondary" data-review="edit">Entscheidung ändern</button><p class="day-small" style="margin-top:15px">Eine geänderte Entscheidung braucht eine neue Freigabe; den Antworttext darf man frei ändern.</p><span class="day-sim-banner">Foliendemo · keine echte Aktion</span></div></div>`,
      notes: 'ZEIT: 4 Minuten. SAGEN: Die Foliendemo simuliert die Zustandslogik. Freigabe ist explizit; Ablehnung führt zurück in den Agenten-Loop; Bearbeitung widerruft die frühere Freigabe. In der echten App sind alle drei Wege im Protokoll sichtbar.'
    },
    {
      id: 'Drill8Auftrag', type: 'Drill', eyebrow: "Drill 8 · Eure Aufgaben · 60 Minuten", title: "Claude bereitet vor. Du entscheidest.",
      subtitle: "Start: „Ich will zu Drill 8. Frag mich, ob ich meinen Stand mitnehmen will.“ Claude lädt – im selben Ordner, ohne neue Sitzung.", study: true,
      body: taskBoard(["Erst deine Prüfpunkte, dann die Leistungsentscheidungen.", "Eine Entscheidung freigeben (Beleg entsteht), eine begründet ablehnen.", "Bauen: Der Ablehnungsgrund wird im Fall sichtbar.", "Entscheidung ändern – Freigabe erlischt; Text ändern – bleibt."], "Eine Entscheidung freigegeben und gesendet, eine abgelehnt, eine erloschene Freigabe gesehen; Stand gespeichert.", "Denkanstoß von Claude holen, dann die heutigen Teile weiter ausbauen – was würdest du gern noch sehen? Z. B. eine Prüf-Checkliste beim Freigeben. Nicht vorgreifen."),
      notes: "ZEIT: 2 Minuten, dann bleibt die Folie stehen. SAGEN: Erst die eigenen Prüfpunkte, dann die Vorlage – sonst prüft man nur, was der Agent zeigt. Eine Ablehnung ist ein vollwertiger Erfolgspfad; die Begründung steuert Claude. Sind beide Entwürfe gut, den schwächeren ablehnen. Früher fertig: Denkanstöße und eigene Erweiterung (Vorschlag: Risiko-Einstufung). DOZENT: Drill-8-Mails nach dem Laden senden."
    },
    {
      id: 'Drill9Start', type: 'Kapitel', eyebrow: '14:30–15:30 · Meilenstein 4', title: 'Das Eingriffsfenster', study: true,
      body: stage('9', 'Automatisch, solange niemand widerspricht.', 'Haftpflichtfälle werden erkannt. Antworten warten sichtbar im Eingriffsfenster und gehen nach der Frist automatisch raus.', ['Start: drill-09-start', 'Ziel: Timer + Eingriff']),
      notes: 'ZEIT: 1 Minute. SAGEN: Jetzt ändert sich die Voreinstellung. Ohne Eingriff findet eine externe Wirkung statt. Darum müssen Warteschlange und Frist für Menschen sichtbar und beeinflussbar sein. DOZENT: Claude bitten „Schick die Drill-9-Mails an alle“ (oder instructor send 9 --yes); Fortschritt: „Wer hat geantwortet?“.'
    },
    {
      id: 'Drill9Queue', type: 'Screenshot', eyebrow: 'Drill 9 · Das Eingriffsfenster', title: 'Das Fenster zeigt nicht nur Zeit, sondern Eingriffsmacht.',
      subtitle: 'Foliendemo: Bearbeiten, Stoppen und Uhr +24 h verändern nur diese Folie.', study: true,
      body: `<div class="day-queue"><div class="day-queue-head"><span>Eingriffsfenster · Haftpflicht</span><button type="button" class="day-app-button secondary" data-queue="advance">Workshop-Uhr +24 h</button></div>
        <div class="day-queue-row" data-item="1" data-state="queued"><span>01</span><span><strong>Rückfrage zum Schaden</strong><small>Fall HP-2301 · fiktiv</small></span><span class="day-queue-state">Geplant</span><span class="day-queue-time">23:59 h</span><span class="day-queue-actions"><button type="button" class="day-app-button secondary" data-queue="edit">Bearbeiten</button><button type="button" class="day-app-button danger" data-queue="remove">Stoppen</button></span></div>
        <div class="day-queue-row" data-item="2" data-state="queued"><span>02</span><span><strong>Deckungsfrage</strong><small>Fall HP-2302 · fiktiv</small></span><span class="day-queue-state">Geplant</span><span class="day-queue-time">23:59 h</span><span class="day-queue-actions"><button type="button" class="day-app-button secondary" data-queue="edit">Bearbeiten</button><button type="button" class="day-app-button danger" data-queue="remove">Stoppen</button></span></div>
        <div class="day-queue-row" data-item="3" data-state="queued"><span>03</span><span><strong>Nachfrage zur Police</strong><small>Fall HP-2303 · fiktiv</small></span><span class="day-queue-state">Geplant</span><span class="day-queue-time">23:59 h</span><span class="day-queue-actions"><button type="button" class="day-app-button secondary" data-queue="edit">Bearbeiten</button><button type="button" class="day-app-button danger" data-queue="remove">Stoppen</button></span></div>
        <p style="font-size:15px;margin:9px 0 0;color:#6B5B3A">Nur Demonstration – die echten Aktionen finden ausschliesslich im lokalen Cockpit statt.</p></div>`,
      notes: 'ZEIT: 4 Minuten. SAGEN: Erst die drei Eingriffe vorführen: eine Nachricht laufen lassen, eine bearbeiten, eine stoppen. Danach Uhr vorspulen. Der Knopf auf der Folie sendet nicht; im Workshop muss die echte App mit freigegebenen synthetischen Empfängern getestet werden.'
    },
    {
      id: 'Drill9Auftrag', type: 'Drill', eyebrow: "Drill 9 · Eure Aufgaben · 60 Minuten", title: "Das Fenster ist sichtbar. Die Wirkung kommt später.",
      subtitle: "Start: „Ich will zu Drill 9. Frag mich, ob ich meinen Stand mitnehmen will.“ Claude lädt – im selben Ordner, ohne neue Sitzung.", study: true,
      body: taskBoard(["Haftpflicht erkennen – was ist dir zu heikel?", "Vorhersagen, dann ändern, stoppen, laufen lassen.", "Bauen: Stopps erklären, nichts doppelt senden.", "„Zeit +24 h“ drücken, mit Vorhersage vergleichen."], "Eine Antwort ging automatisch raus, eine ist geändert, eine gestoppt – alles im Protokoll; Stand gespeichert.", "Denkanstoß von Claude holen, dann die heutigen Teile weiter ausbauen – was würdest du gern noch sehen? Z. B. „geht als Nächstes raus“ sortiert. Nicht vorgreifen."),
      notes: "ZEIT: 2 Minuten, dann bleibt die Folie stehen. SAGEN: Jetzt kippt die Voreinstellung: Ohne Eingriff passiert etwas. Erst vorhersagen, dann vorspulen. Der Drill-9-Stand schaltet den automatischen Versand selbst ein; niemand stellt etwas von Hand um. Früher fertig: Denkanstöße und eigene Erweiterung (Vorschlag: eigene Kennzahl für Drill 10). DOZENT: Drill-9-Mails nach dem Laden senden."
    },
    {
      id: 'Drill10Start', type: 'Kapitel', eyebrow: '15:45–16:30 · Meilenstein 5', title: 'Der Management-Report', study: true,
      body: stage('10', 'Aus Erlebnissen wird eine Entscheidung.', 'Wir zeigen nur, was die gezählten Ereignisse aus eurem Workshop tatsächlich belegen.', ['Start: drill-10-start', 'Ziel: max. 4 Folien']),
      notes: 'ZEIT: 1 Minute. SAGEN: Der Report ist selbst gebaut, aber kein Konzern-Dashboard. Beim Checkpoint-Wechsel werden nur aggregierte Zählwerte kopiert, keine Mailtexte oder Namen. Auto-Versand ist wieder aus.'
    },
    {
      id: 'Drill10Daten', type: 'Inhalt', eyebrow: 'Drill 10 · Datenweg', title: 'Aus dem Protokoll wird ein belegter Befund.',
      subtitle: 'Eine lokale Simulation – kein Beweis für Zeitersparnis oder Produktivqualität.', study: true,
      body: `<div class="day-flow"><div class="day-flow-step"><b>Drill 9</b><span>eigene Fälle<br>und Protokoll</span></div><div class="day-arrow">→</div><div class="day-flow-step"><b>Zählung</b><span>nur gruppierte<br>Zählwerte</span></div><div class="day-arrow">→</div><div class="day-flow-step"><b>Grafik</b><span>beschriftet,<br>auch bei null</span></div><div class="day-arrow">→</div><div class="day-flow-step"><b>Report</b><span>Beleg · Grenze<br>Empfehlung</span></div></div>`,
      notes: 'ZEIT: 2 Minuten. SAGEN: Claude kann Code und Formulierung helfen; die Management-Aussage wählt und verantwortet der Mensch. Im Snapshot gibt es nur Sparte/Status/Herkunft und ausgewählte Kontrollereignisse als Zählwerte.'
    },
    {
      id: 'Drill10Auftrag', type: 'Drill', eyebrow: "Drill 10 · Eure Aufgaben · 45 Minuten", title: "Eine Grafik. Eine Empfehlung. Eine Grenze.",
      subtitle: "Start: „Ich will zu Drill 10. Frag mich, ob ich meinen Stand mitnehmen will.“ Claude lädt – im selben Ordner.", study: true,
      body: taskBoard(["Welche Frage soll dein Vorstand beantworten können?", "Grafik in Worten skizzieren, mit Claude bauen.", "Empfehlung mit Grenze formulieren.", "Zwei Minuten vorführen."], "Höchstens vier Folien mit Grafik, Empfehlung und Grenze; zwei Minuten vorgeführt; Stand gespeichert.", "Denkanstoß von Claude holen, dann die heutigen Teile weiter ausbauen – was würdest du gern noch sehen? Z. B. eine umschaltbare Grafik. Nicht vorgreifen."),
      notes: "ZEIT: 2 Minuten, dann bleibt die Folie stehen. SAGEN: Nur zeigen, was die gezählten Ereignisse belegen – keine erfundenen Unternehmenszahlen. Die Empfehlung schreibt ihr selbst; Claude kürzt und fragt kritisch nach. Bonus-Video mit Remotion (docs/BONUS_VIDEO.md) nur mit restlichem Guthaben."
    },
    {
      id: 'Checkpoints', type: 'Code', eyebrow: 'Sicheres Aufholen', title: 'Ein Checkpoint rettet den Tag, nicht auf Kosten Ihrer Arbeit.',
      subtitle: 'Du wählst, Claude zeigt den Plan und fragt noch einmal. Alles passiert im selben Ordner, in derselben Sitzung.',
      body: grid([
        card('Eigenen Stand mitnehmen', `<p>Dein Code, auch noch nicht Gespeichertes, und deine Fälle bleiben. Nur der Drill wird umgestellt.</p><p class="day-small">Wenn dein eigener Bau funktioniert und weiterwachsen soll.</p>`, 'mint-card'),
        card('Frisch offiziell starten', `<p>Referenzcode und neue Fälle. Dein Code und deine Fälle werden vorher gesichert – nichts geht verloren.</p><p class="day-small">Wenn du einen Rettungsstand brauchst. Nach der Wahl: Plan ansehen, ausdrücklich bestätigen, prüfen.</p>`)
      ]),
      notes: 'ZEIT: 3 Minuten. SAGEN: Claude fragt zuerst nach Mitnehmen oder frisch offiziell, zeigt den Plan und lädt erst nach einem klaren Ja. Alles passiert im selben Ordner und in derselben Sitzung – niemand öffnet etwas neu. Mitnehmen stellt nur den Drill um; offiziell sichert den eigenen Code und die Fälle und lädt den Referenzstand. Danach startet Claude die Kommandozentrale neu und zeigt, was im neuen Drill dazukommt.'
    },
    {
      id: 'Tempo', type: 'Inhalt', eyebrow: 'Adaptiver Lernpfad', title: 'Wer schneller ist, gestaltet mit. Wer hängt, bekommt Halt.',
      subtitle: 'Ausbauen ist ein Angebot nach dem Fallnachweis – kein Pflichtprogramm und kein Vorgriff auf den nächsten Drill.',
      body: grid([
        card('Schneller', `<p>Kernfall + Test belegen. Dann die eigene Kommandozentrale erweitern: empfohlene Erweiterung, Anregung oder eigene Idee – etwa eine Mini-Wissensbasis oder ein neues Werkzeug für Claude.</p><p>Erst Steckbrief: Wer löst aus, welche Daten, welche Kontrolle, woran erkennen wir Erfolg?</p>`, 'mint-card'),
        card('Mehr Unterstützung', `<p>Claude zeigt nur den nächsten Schritt. Hint Card, Buddy-Fragen und vorbereiteter Checkpoint helfen beim Aufholen.</p><p>Bei Tokenlimit: Browser + Karten; Reservezugang nur organisiert, nie Passwörter teilen.</p>`, 'red-card')
      ]),
      notes: 'ZEIT: 2 Minuten. SAGEN: Ausbauen ist Opt-in und baut den Baustein, den der nächste Drill im Großen zeigt – etwa die eigene Mini-Wissensbasis vor den Tarifen in Drill 7. Wer ein Werkzeug mit Außenwirkung baut, etwa Senden, legt vorher die Kontrolle fest. Buddys stellen Fragen, übernehmen nicht Tastatur oder Freigabe. Lehrende organisieren Token-Reserven vorher.'
    },
    {
      id: 'Whiteboard', type: 'Schluss', eyebrow: '16:45 · Laptops zu', title: 'Wo darf der Agent handeln?',
      subtitle: 'Vom Terminal-Prompt zu Event oder Cron: Wer startet, stoppt und verantwortet den Lauf?',
      body: `<div class="day-flow"><div class="day-flow-step"><b>Trigger</b><span>Prompt · Mail<br>oder Cron</span></div><div class="day-arrow">→</div><div class="day-flow-step"><b>Worker</b><span>Rechte · Retry<br>Duplikate</span></div><div class="day-arrow">→</div><div class="day-flow-step"><b>Agent</b><span>MCP + Belege</span></div><div class="day-arrow">→</div><div class="day-flow-step"><b>Kontrolle</b><span>Freigabe oder<br>Eingriffsfenster</span></div><div class="day-arrow">→</div><div class="day-flow-step"><b>Wirkung</b><span>Versand + Audit</span></div></div>`,
      notes: 'ZEIT: 2 Minuten, dann Beamer aus. SAGEN: Wir haben Claude oft im Terminal angestossen; wie sähe derselbe Prozess als Mail-Event oder periodischer Cron-Lauf aus? Wer betreibt ihn, mit welchen Rechten, Retry- und Stoppregeln? Kein Produktiv-Cronjob im Workshop.'
    },
    {
      id: 'Contract', type: 'Schluss', eyebrow: 'Übergabe an Mittwoch', title: 'Ein Automation Contract macht die Grenze explizit.',
      subtitle: 'Jede Gruppe überträgt die Muster auf einen eigenen, begrenzten Prozess.',
      body: grid([
        card('Sechs Felder', `<p>Auslöser · erlaubte Aktionen · Kontrollregel · Belege · Ausnahmeweg · verantwortlicher Mensch.</p><p>Was darf automatisch laufen? Was bleibt absichtlich beim Menschen?</p>`, 'mint-card'),
        card('Eine letzte Frage', `<p class="day-emphasis">Welche externe Wirkung wäre in Ihrem Fall heute schon verantwortbar?</p><p>Und welchen Beleg bräuchten Sie, um das morgen noch erklären zu können?</p>`, 'red-card')
      ]),
      notes: 'ZEIT: 1 Minute. SAGEN: Die Gruppe schreibt den Contract nicht auf der Folie, sondern am Whiteboard / im Handout. Am Mittwoch dient er als Startpunkt für den eigenen Fall.'
    }
  ];

  const agentisch = window.PFEFFERMINZIA_AGENTISCH_SLIDES || [];
  const management = window.PFEFFERMINZIA_MANAGEMENT_SLIDES || [];

  const deckIds = {
    gesamt: ['Titel', 'Bruecke', 'LiveBeispiele', 'Agenda', 'Kontrollmuster', 'Zielbild', 'Arbeitsrhythmus', 'Tempo', 'Whiteboard', 'Contract'],
    input: ['Titel', 'Bruecke', 'LiveBeispiele', 'Agenda', 'Architektur', 'Belege', 'Kontrollmuster', 'Zielbild', 'Arbeitsrhythmus'],
    'drill-06': ['Drill6Start', 'Drill6Los', 'Drill6Cockpit', 'Drill6Auftrag', 'Checkpoints'],
    'drill-07': ['Drill7Start', 'Drill7Kontext', 'Drill7Auftrag', 'Checkpoints'],
    'drill-08': ['Drill8Start', 'Drill8Review', 'Drill8Auftrag', 'Checkpoints'],
    'drill-09': ['Drill9Start', 'Drill9Queue', 'Drill9Auftrag', 'Checkpoints'],
    'drill-10': ['Drill10Start', 'Drill10Daten', 'Drill10Auftrag'],
    abschluss: ['Whiteboard', 'Contract'],
    agentisch: agentisch.map(slide => slide.id),
    management: management.map(slide => slide.id)
  };
  const allSlides = [...slides, ...agentisch, ...management];
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
      : `<div class="day-frame ${slide.visual ? 'visual' : ''}">${slide.study ? '<div class="day-stripe"></div>' : ''}<div class="day-head"><div class="caption ${slide.study ? 'mint' : ''}">${slide.eyebrow}</div><img class="day-logo" src="${logo}" alt="Universität St.Gallen"></div><div class="day-heading"><h2>${slide.title}</h2>${slide.subtitle ? `<p>${slide.subtitle}</p>` : ''}</div><div class="day-content">${slide.body}</div>${avatar}<div class="day-source">${slide.source || source}</div><div class="day-foot"><div>${footerLabel}</div><div>${slide.type} · <strong>${String(index + 1).padStart(2, '0')} / ${selectedSlides.length}</strong></div></div></div>`;
    return `<section data-id="${slide.id}">${frame}<aside class="notes"><p>${slide.notes}</p></aside></section>`;
  }

  sourceSlides.innerHTML = selectedSlides.map(render).join('');

  document.addEventListener('click', event => {
    const review = event.target.closest('[data-review]');
    if (review) {
      const status = document.getElementById('review-status');
      const states = {
        approve: ['Explizit freigegeben · Demo', '#9FE3C4'],
        reject: ['Abgelehnt · zurück in Bearbeitung', '#F8D2CE'],
        edit: ['Text geändert · Freigabe ungültig', '#F9D949']
      };
      const [label, color] = states[review.dataset.review];
      status.textContent = label;
      status.style.background = color;
    }
    const queue = event.target.closest('[data-queue]');
    if (!queue) return;
    if (queue.dataset.queue === 'advance') {
      document.querySelectorAll('.day-queue-row').forEach(row => {
        if (row.dataset.state !== 'queued') return;
        row.dataset.state = 'sent';
        row.querySelector('.day-queue-state').textContent = 'Auto-versendet · Demo';
        row.querySelector('.day-queue-time').textContent = '00:00 h';
        row.querySelectorAll('button').forEach(button => { button.disabled = true; });
      });
      return;
    }
    const row = queue.closest('.day-queue-row');
    if (queue.dataset.queue === 'edit') {
      row.dataset.state = 'edited';
      row.querySelector('.day-queue-state').textContent = 'Bearbeitet · neu prüfen';
      row.querySelector('.day-queue-time').textContent = 'pausiert';
    }
    if (queue.dataset.queue === 'remove') {
      row.dataset.state = 'removed';
      row.querySelector('.day-queue-state').textContent = 'Entfernt';
      row.querySelector('.day-queue-time').textContent = '—';
      row.querySelectorAll('button').forEach(button => { button.disabled = true; });
    }
  });
})();
