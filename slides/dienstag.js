/* Tuesday deck content. Falk's HTML remains the visual and reveal.js base. */
(() => {
  const sourceSlides = document.querySelector('.slides');
  const logo = sourceSlides.querySelector('img[src^="data:image/png"]')?.getAttribute('src') || '';
  const johannesAvatar = sourceSlides.querySelector('svg[aria-label^="Comicfigur Johannes"]')?.outerHTML || '';
  const deckName = new URLSearchParams(window.location.search).get('deck') || 'gesamt';
  const source = deckName === 'agentisch'
    ? 'Inhalt: Johannes Hötter, „Arbeiten in Agentischen Teams“ (Juni 2026) · Gestaltung nach Falk Uebernickel'
    : 'Gestaltung: Falk Uebernickel · Fiktive Pfefferminzia-Workshopfälle';
  const pill = (text, tone = '') => `<span class="day-pill ${tone}">${text}</span>`;
  const card = (title, content, extra = '') => `<div class="day-card ${extra}"><h3>${title}</h3>${content}</div>`;
  const grid = (items, columns = 'two') => `<div class="day-grid ${columns}">${items.join('')}</div>`;
  const prompt = text => `<div class="day-prompt">${text}</div>`;
  const dialogueStep = (number, label, ask, human) => `<div class="day-dialogue-step"><strong>${number} · ${label}</strong><p>Claude: „${ask}“</p><small>DEIN SCHRITT: ${human}</small></div>`;
  const code = text => `<div class="day-command">${text}</div>`;
  const stage = (number, headline, summary, tags) => `<div class="day-big-num">${number}</div><div class="day-stage-title">DRILL ${number}</div><div class="day-stage-summary"><strong>${headline}</strong><br>${summary}</div><div class="day-stage-bottom">${tags.map(x => pill(x, 'mint')).join('')}</div>`;

  const slides = [
    {
      id: 'Titel', type: 'Titel', eyebrow: 'Dienstag · 29. September 2026', cover: true,
      body: `<div class="day-cover-title">VOM AGENTEN<br>ZUM SYSTEM</div><div class="day-cover-sub">Wenn KI im Versicherungsprozess handelt.</div><div class="day-cover-ribbon">AI AUTOMATION · INSURANCE EDITION</div><div class="day-cover-burst"><strong>4</strong><span>DRILLS</span></div>`,
      notes: 'ZEIT: 1 Minute. SAGEN: Gestern haben wir mit Daten und Urteilen gearbeitet. Heute geben wir dem Agenten kontrollierte operative Fähigkeiten. ÜBERLEITUNG: Wo genau kippt Assistenz in Wirkung? NICHT: Die vollständige Lösung vorwegnehmen.'
    },
    {
      id: 'Bruecke', type: 'Statement', eyebrow: 'Von Montag zu Dienstag', title: 'Aus einer guten Antwort wird heute eine echte Handlung.',
      subtitle: 'Der Unterschied ist nicht die Qualität des Textes, sondern die Wirkung ausserhalb des Chats.',
      body: grid([
        card('Montag · verstehen', `<p class="day-emphasis">Claude untersucht Daten und macht Vorschläge.</p><p>Kundensicht, Schadenfall, Underwriting und Frühwarnliste bleiben zunächst im Arbeitsraum.</p>${pill('Augmentation', 'blue')}`),
        card('Dienstag · handeln', `<p class="day-emphasis">Claude nutzt Fachfunktionen und bewegt Fälle weiter.</p><p>Ein Postfach empfängt, ein Entwurf wird versendet, eine Queue löst später aus.</p>${pill('Automation', 'red')}`)
      ]),
      notes: 'ZEIT: 3 Minuten. SAGEN: Das Ende von Drill 7 war die wöchentliche Storno-Frühwarnliste. Wenn sie ohne menschlichen Start läuft, ist der Kontrollpunkt neu zu verhandeln. FRAGE: Welche Aktion würde bei Ihnen erstmals jemand anderem auffallen?'
    },
    {
      id: 'Agenda', type: 'Agenda · Tag', eyebrow: 'Der Dienstag in einem Blick', title: 'Wir bauen vier Stufen auf dasselbe Zielsystem.',
      subtitle: 'Jeder Drill startet an einer offiziellen Grenze – die Teilnehmenden entwickeln den nächsten Schritt selbst.',
      body: `<div class="day-timeline">
        <div class="day-timeline-row"><strong>08:30–09:45</strong><em>Input</em><span>Vom Assistenten zum Agenten; MCP, Kontrolle, Verifizierbarkeit</span></div>
        <div class="day-timeline-row"><strong>10:00–11:15</strong><em>Drill 8</em><span>Kommandozentrale und persönliche Inbox</span></div>
        <div class="day-timeline-row"><strong>11:30–12:45</strong><em>Drill 9</em><span>Leben: Agent bereitet vor, Mensch bearbeitet und sendet</span></div>
        <div class="day-timeline-row"><strong>13:45–15:00</strong><em>Drill 10</em><span>Leben: Agent bearbeitet, Mensch gibt frei oder lehnt ab</span></div>
        <div class="day-timeline-row"><strong>15:15–16:30</strong><em>Drill 11</em><span>Haftpflicht: sichtbares Eingriffsfenster vor Auto-Versand</span></div>
        <div class="day-timeline-row"><strong>16:45–18:00</strong><em>Whiteboard</em><span>Wo darf der Agent handeln? Automation Contract</span></div>
      </div>`,
      notes: 'ZEIT: 2 Minuten. SAGEN: Es gibt vier 75-Minuten-Drills. Die Stufen sind keine vorgeführte Featureliste, sondern eigene Entwicklungsaufgaben. Am Ende gehen die Laptops zu und wir zeichnen den Prozess.'
    },
    {
      id: 'Wirkung', type: 'Inhalt', eyebrow: 'Der neue Einsatzpunkt', title: 'Ein Agent braucht nicht mehr Text, sondern begrenzte Rechte.',
      subtitle: 'Operative Fähigkeiten machen aus einem Vorschlag einen Prozess mit Zuständen und Konsequenzen.',
      body: grid([
        card('Was der Agent darf', `<p>Nachrichten lesen, Fälle zuordnen, Daten und Tarifbelege holen, Entwürfe erstellen.</p><p>Je nach Pfad: Review anfordern oder einen Versand terminieren.</p>`),
        card('Was das System begrenzt', `<p>Freigaberegel, Empfänger-Allowlist, idempotente Aktionen, Aktivitätsprotokoll und sichtbare Queue.</p><p>Die Grenze wird <strong>technisch erzwungen</strong>, nicht nur im Prompt erbeten.</p>`, 'red-card')
      ]),
      notes: 'ZEIT: 4 Minuten. SAGEN: Ein Prompt allein ist keine Berechtigungsschranke. Zeigen, dass eine klare API-/MCP-Funktion und ein gespeicherter Zustand entscheidend sind. FRAGE: Wer verhindert den Versand, wenn der Agent sich irrt?'
    },
    {
      id: 'Architektur', type: 'Inhalt', eyebrow: 'MCP-first-Betriebsmodell', title: 'Mensch und Agent benutzen dieselben Fachfunktionen.',
      subtitle: 'Claude Code ist der Arbeitspartner; Python stellt kontrollierte Aktionen und prüfbare Zustände bereit.',
      body: `<div class="day-flow">
        <div class="day-flow-step"><b>Mensch</b><span>prüft und steuert<br>im Cockpit</span></div><div class="day-arrow">↔</div>
        <div class="day-flow-step"><b>Claude Code</b><span>plant und nutzt<br>MCP-Werkzeuge</span></div><div class="day-arrow">↔</div>
        <div class="day-flow-step"><b>Python-App</b><span>Fachlogik, Rechte,<br>Audit und Queue</span></div><div class="day-arrow">↔</div>
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
        card('Haftpflicht · Opt-out', `<p class="day-emphasis">Nach sichtbarer Frist geht die Antwort standardmässig raus.</p><p>Im Eingriffsfenster kann der Mensch editieren, stoppen oder aus der Queue nehmen.</p>${pill('Eingriff ist möglich', 'mint')}`, 'mint-card')
      ]),
      notes: 'ZEIT: 6 Minuten. SAGEN: Das ist keine pauschale Aussage über Versicherungsprodukte. Im Workshop simulieren wir zwei Kontrollmuster an synthetischen Fällen. Die Gruppe soll den Unterschied erleben. FRAGE: Welche Fehlerklasse wird durch jedes Muster abgefangen?'
    },
    {
      id: 'Zielbild', type: 'Inhalt', eyebrow: 'Rückwärts vom Zielbild', title: 'Am Ende können wir beide Kontrollmuster live vergleichen.',
      subtitle: 'Die vier Startzustände sind bewusst begrenzt, obwohl das Zielsystem technisch vorbereitet ist.',
      body: grid([
        card('Der gemeinsame Kern', `<p>Eingang → Router → Kunde und Vertrag → Tarifbelege → Antwortvorschlag → Audit.</p><p>Die Kontrollregel liegt <strong>zwischen Vorschlag und externer Wirkung</strong>.</p>`),
        card('Die vier Grenzen', `<p><strong>8</strong> Cockpit &amp; Inbox<br><strong>9</strong> Mensch sendet Leben<br><strong>10</strong> Mensch genehmigt Leben<br><strong>11</strong> Haftpflicht-Queue mit Timer</p>`, 'mint-card')
      ]),
      notes: 'ZEIT: 4 Minuten. SAGEN: Checkpoints sind keine Musterlösung zum Anschauen. Jeder Startzustand zeigt nur die Fähigkeiten des aktuellen Drills. Die Teilnehmenden bauen im eigenen Branch weiter; eine Recovery liegt getrennt, ohne ihre Arbeit zu überschreiben.'
    },
    {
      id: 'Arbeitsrhythmus', type: 'Inhalt', eyebrow: 'So arbeiten wir', title: 'Jeder Drill hat einen Fall, einen Mini-Build und einen Beleg.',
      subtitle: 'Claude darf helfen; die fachliche Entscheidung und der Nachweis bleiben bei Ihnen.',
      body: grid([
        card('75 Minuten', `<p><strong>1.</strong> Einen echten Workshop-Fall durchlaufen.<br><strong>2.</strong> Eine kleine Verbesserung selbst mit Claude coden.<br><strong>3.</strong> Zustand und Test belegen.</p><p>Die Zeitanteile stehen auf der jeweiligen Drill-Karte.</p>`),
        card('Wenn es hakt', `<p>Claude nach dem nächsten kleinen Schritt fragen. Tool-Resultat und Cockpit vergleichen.</p><p>Offiziellen Checkpoint erst planen, erhaltenen Pfad lesen und <strong>nach Rückfrage</strong> laden.</p>`, 'mint-card')
      ]),
      notes: 'ZEIT: 3 Minuten. SAGEN: Paararbeit ist möglich, jede Person behält ihre lokale Instanz und Inbox. Vor dem Reset wird der eigene Stand nicht überschrieben. Wer schnell ist, vertieft den aktuellen Drill, statt künftige Stufen vorwegzunehmen.'
    },
    {
      id: 'Drill8Start', type: 'Kapitel', eyebrow: '10:00–11:15 · Meilenstein 1', title: 'Die Kommandozentrale', study: true,
      body: stage('8', 'Vom leeren Checkout zur ersten Nachricht.', 'Python-App starten, Claude via MCP anbinden und die eigene AgentMail-Inbox im Cockpit sehen.', ['Start: drill-08-start', 'Ziel: Postfach verbunden']),
      notes: 'ZEIT: 1 Minute. SAGEN: Bis zum Ende dieses Drills muss jede Person die eigene Inbox sehen und eine Nachricht empfangen haben. Noch kein CRM, kein Entwurf, keine Freigabe, kein Timer.'
    },
    {
      id: 'Drill8Cockpit', type: 'Screenshot', eyebrow: 'Drill 8 · Das Cockpit', title: 'Die erste Nachricht wird zum bearbeitbaren Fall.',
      subtitle: 'Die Ansicht ist eine Foliendemo des Pfefferminzia-Cockpits; im Drill arbeiten alle in ihrer eigenen Instanz.', study: true,
      body: `<div class="day-app"><div class="day-app-top"><span>Pfefferminzia · Versicherungspost</span><span class="day-app-badge">Inbox verbunden · 1 neu</span></div>
        <div class="day-app-main"><div class="day-app-left"><div class="day-app-label">Posteingang</div><div class="day-ticket selected"><strong>Neue Anfrage zur Police</strong><span>Mara Keller · heute 09:58</span></div><div class="day-ticket"><strong>Rückfrage zum Vertrag</strong><span>Max Berger · gestern</span></div></div>
        <div class="day-app-mid"><div class="day-app-label">Nachricht</div><h3>Neue Anfrage zur Police</h3><p>Guten Tag, ich habe eine Frage zu meinem bestehenden Vertrag. Können Sie mir weiterhelfen?</p><div class="day-app-meta"><span>eingegangen</span><span>unbearbeitet</span></div><p class="day-app-note">Im ersten Schritt zählt: Eingang sehen, Status verstehen, eine Aufgabe anlegen.</p></div>
        <div class="day-app-right"><div class="day-app-label">Workshop</div><h3>Checkpunkt 8</h3><p>Eine persönliche Inbox.<br>Ein lokales System.<br>Ein sichtbares Ereignis.</p><span class="day-app-badge">MCP bereit</span></div></div></div>`,
      notes: 'ZEIT: 3 Minuten. SAGEN: Diese Folie ist eine schematische App-Ansicht, keine Live-Verbindung. Danach zur echten Instanz wechseln. Die genaue Kundenzuordnung ist erst Drill 9.'
    },
    {
      id: 'Drill8Auftrag', type: 'Drill', eyebrow: 'Drill 8 · Dialog statt Zauberprompt', title: 'Fragen. Selber prüfen. Dann weiterbauen.',
      subtitle: 'Eine Nachricht wandert durch AgentMail, Cockpit und MCP – du hältst nach jeder Etappe kurz an.', study: true,
      body: grid([
        card('1–2 · Eingang', `${dialogueStep(1, 'Start', 'Was fehlt für App, MCP und Inbox?', 'Eigene Werte eintragen; externen Test erlauben.')}${dialogueStep(2, 'Mail', 'Zeig mir dieselbe Ticket-ID in MCP und Cockpit.', 'Vorher Testmail senden; danach Ticket-Todo prüfen.')}`, 'mint-card'),
        card('3–4 · Eigenes Werk', `${dialogueStep(3, 'Bauen', 'Wo entsteht ein Ticket? Gib mir zuerst einen Test.', 'Automatisches Prüfen-Todo selbst mit Claude coden.')}${dialogueStep(4, 'Belegen', 'Prüfe zwei Syncs und den Todo-Status.', 'Gleiche Ticket-ID und grünen Test zeigen.')}`)
      ]),
      notes: 'ZEIT: 2 Minuten. SAGEN: Die vier kurzen Prompts sind Gesprächsetappen, nicht ein Block zum Kopieren. Nach jeder Antwort handelt oder prüft die Person selbst. Keine echten Kundendaten. Eine persönliche Inbox, kein geteilter Schlüssel. Den temporären inboxgebundenen Workshop-Key darf Claude im individuellen Workshop-Chat erhalten und lokal eintragen; für echte Geheimnisse wäre das tabu. Die Outbound-Allowlist ist kein Eingangsfilter. Ein grüner Preflight ist nur Startbereitschaft. 20 Minuten Setup/Mail, 10 Minuten Ticket erkunden, 25 Minuten selbst bauen, 15 Minuten nachweisen, 5 Minuten reflektieren.'
    },
    {
      id: 'Drill9Start', type: 'Kapitel', eyebrow: '11:30–12:45 · Meilenstein 2', title: 'Der Mensch bearbeitet', study: true,
      body: stage('9', 'Der Agent bereitet vor; der Mensch versendet.', 'Leben-Fall zu Kunde, Vertrag und Tarifgeneration auflösen, Antwortentwurf redigieren und bewusst selbst senden.', ['Start: drill-09-start', 'Ziel: menschlicher Versand']),
      notes: 'ZEIT: 1 Minute. SAGEN: Wir gewinnen operative Geschwindigkeit, aber die Entscheidung und der Versand bleiben in der Hand des Menschen.'
    },
    {
      id: 'Drill9Kontext', type: 'Screenshot', eyebrow: 'Drill 9 · App-Komponenten', title: 'Ein guter Entwurf beginnt bei der richtigen Tarifgeneration.',
      subtitle: 'Die Oberfläche macht Kunde, Police, Quelle und Antwort nebeneinander prüfbar.', study: true,
      body: `<div class="day-app"><div class="day-app-top"><span>Pfefferminzia · Leben</span><span class="day-app-badge">Entwurf · nicht versendet</span></div>
        <div class="day-app-main"><div class="day-app-left"><div class="day-app-label">Fallkontext</div><h3>Mara Keller</h3><p>Lebensversicherung<br>Police LV-2048-17</p><div class="day-app-meta"><span>Treffer geprüft</span></div><p class="day-app-note">Ähnliche Namen? Vertragsnummer fehlt? Erst Identität klären.</p></div>
        <div class="day-app-mid"><div class="day-app-label">Antwortentwurf</div><h3>Ihre Anfrage zur Police</h3><p>Sehr geehrte Frau Keller, wir haben Ihre Frage geprüft. Nach der für Ihren Vertrag gültigen Tarifgeneration …</p><p>Mit freundlichen Grüssen<br>Pfefferminzia</p><button class="day-app-button secondary" type="button" disabled>Entwurf bearbeiten</button><button class="day-app-button" type="button" disabled>Als Mensch senden</button></div>
        <div class="day-app-right"><div class="day-app-label">Belege</div><h3>Tarif 2021</h3><p>Dokument und Fundstelle sind am Fall verlinkt.</p><span class="day-app-badge">Quelle geprüft</span></div></div></div>`,
      notes: 'ZEIT: 3 Minuten. SAGEN: Die Knöpfe auf der Folie sind absichtlich deaktiviert; die Übung findet in der App statt. Betonen: Nicht die erstbeste Tarif-PDF, sondern die zum Vertrag passende Generation.'
    },
    {
      id: 'Drill9Auftrag', type: 'Drill', eyebrow: 'Drill 9 · Dialog statt Zauberprompt', title: 'Erst Quelle. Dann Entwurf. Dann du.',
      subtitle: 'Der Mensch prüft Person und Tarif, redigiert und löst den Versand bewusst selbst aus.', study: true,
      body: grid([
        card('1–2 · Leben-Fall', `${dialogueStep(1, 'Quelle', 'Welche Person, Police und Tarifgeneration passen?', 'Zuordnung und Fundstelle selbst bestätigen.')}${dialogueStep(2, 'Entwurf', 'Formuliere mit Beleg. Nicht versenden.', 'Selbst editieren, Empfänger prüfen und senden.')}`, 'mint-card'),
        card('3–4 · Eigenes Werk', `${dialogueStep(3, 'Bauen', 'Wo fällt eine falsche Tarifgeneration auf?', 'Erst Test, dann kleine Schutzregel ergänzen.')}${dialogueStep(4, 'Belegen', 'Zeig mir Quelle, Edit, Versand und Test.', 'Audit und grünen Test selbst kontrollieren.')}`)
      ]),
      notes: 'ZEIT: 2 Minuten. SAGEN: Nicht alle Fragen zugleich eingeben. Die Person bestätigt erst Quelle und Identität, bevor der Entwurf beginnt. Hier endet Augmentation im operativen Prozess. Challenge Card für Schnelle: ähnliche Namen oder veraltete Tarifgeneration. Keine Freigabe-Queue aus Drill 10 vorwegnehmen.'
    },
    {
      id: 'Drill10Start', type: 'Kapitel', eyebrow: '13:45–15:00 · Meilenstein 3', title: 'Der Mensch gibt frei', study: true,
      body: stage('10', 'Der Agent bearbeitet; der Mensch kontrolliert.', 'Entscheidungsvorlage und Antwort stehen fertig bereit. Freigabe, Ablehnung oder neuer Kontext starten den nächsten Schritt.', ['Start: drill-10-start', 'Ziel: explizite Freigabe']),
      notes: 'ZEIT: 1 Minute. SAGEN: Der Mensch schreibt nicht mehr jeden Satz. Er verantwortet die Stopplinie vor jeder externen Wirkung. Eine Ablehnung ist ein vollwertiger Erfolgspfad.'
    },
    {
      id: 'Drill10Review', type: 'Screenshot', eyebrow: 'Drill 10 · Review-Komponente', title: 'Ohne aktuelle Freigabe bleibt der Lebensfall intern.',
      subtitle: 'Foliendemo: Klicken Sie auf Freigeben oder Ablehnen – es wird nichts an AgentMail gesendet.', study: true,
      body: `<div class="day-review"><div class="day-card mint-card"><h3>Entscheidungsvorlage</h3><p><strong>Fall:</strong> fiktive Lebensanfrage · Mara Keller</p><p><strong>Vorschlag:</strong> Antwort vorbereiten und Tarifbeleg zitieren.</p><p><strong>Prüfpunkt:</strong> Ist der Schluss durch die Quelle gedeckt?</p><div class="day-review-status" id="review-status" aria-live="polite">Wartet auf menschliche Freigabe</div></div>
        <div class="day-card"><h3>Ihre Kontrolloptionen</h3><p>Der Mensch kann genehmigen, mit Begründung ablehnen oder neuen Kontext ergänzen.</p><button type="button" class="day-app-button" data-review="approve">Freigeben</button><button type="button" class="day-app-button danger" data-review="reject">Ablehnen</button><button type="button" class="day-app-button secondary" data-review="edit">Text ändern</button><p class="day-small" style="margin-top:15px">Eine Änderung macht eine frühere Freigabe ungültig.</p><span class="day-sim-banner">Foliendemo · keine echte Aktion</span></div></div>`,
      notes: 'ZEIT: 4 Minuten. SAGEN: Die Foliendemo simuliert die Zustandslogik. Freigabe ist explizit; Ablehnung führt zurück in den Agenten-Loop; Bearbeitung widerruft die frühere Freigabe. In der echten App sind alle drei Wege im Audit sichtbar.'
    },
    {
      id: 'Drill10Auftrag', type: 'Drill', eyebrow: 'Drill 10 · Dialog statt Zauberprompt', title: 'Claude bereitet vor. Du entscheidest.',
      subtitle: 'Eine aktuelle menschliche Freigabe ist die Stopplinie vor jeder externen Wirkung.', study: true,
      body: grid([
        card('1–2 · Review', `${dialogueStep(1, 'Vorlage', 'Bereite zwei Fälle nur bis zur Review vor.', 'Belege selbst prüfen; nichts geht raus.')}${dialogueStep(2, 'Entscheidung', 'Zeig mir die Optionen, führe noch nichts aus.', 'Einen freigeben, einen begründet ablehnen.')}`, 'mint-card'),
        card('3–4 · Eigenes Werk', `${dialogueStep(3, 'Bauen', 'Wie zeigen wir Ablehnung oder Freigabeverlust klarer?', 'Kleine UI- oder Teständerung selbst umsetzen.')}${dialogueStep(4, 'Belegen', 'Was zeigt das Audit nach Edit und Ablehnung?', 'Alte Freigabe muss ungültig sein.')}`)
      ]),
      notes: 'ZEIT: 2 Minuten. SAGEN: Das sind vier Gesprächsetappen mit menschlichem Stopp dazwischen, kein einmaliger Auftrag. Nicht nur den Happy Path testen. Die Ablehnung muss dokumentiert sein und einen neuen Agenten-Loop auslösen. Versand bleibt eine eigene Bestätigung. Challenge: Freigabe durch Änderung invalidieren.'
    },
    {
      id: 'Drill11Start', type: 'Kapitel', eyebrow: '15:15–16:30 · Meilenstein 4', title: 'Das Eingriffsfenster', study: true,
      body: stage('11', 'Automatisch, solange niemand widerspricht.', 'Der Router erkennt Haftpflicht. Antworten stehen sichtbar in einer Queue und gehen nach der Frist automatisch raus.', ['Start: drill-11-start', 'Ziel: Timer + Eingriff']),
      notes: 'ZEIT: 1 Minute. SAGEN: Jetzt ändert sich die Voreinstellung. Ohne Eingriff findet eine externe Wirkung statt. Darum müssen Queue und Frist für Menschen sichtbar und beeinflussbar sein.'
    },
    {
      id: 'Drill11Queue', type: 'Screenshot', eyebrow: 'Drill 11 · Queue-Komponente', title: 'Die Queue zeigt nicht nur Zeit, sondern Eingriffsmacht.',
      subtitle: 'Foliendemo: Bearbeiten, Entfernen und Uhr +24 h verändern nur diese Folie.', study: true,
      body: `<div class="day-queue"><div class="day-queue-head"><span>Versand-Queue · Haftpflicht</span><button type="button" class="day-app-button secondary" data-queue="advance">Workshop-Uhr +24 h</button></div>
        <div class="day-queue-row" data-item="1" data-state="queued"><span>01</span><span><strong>Rückfrage zum Schaden</strong><small>Fall HP-2301 · fiktiv</small></span><span class="day-queue-state">Geplant</span><span class="day-queue-time">23:59 h</span><span class="day-queue-actions"><button type="button" class="day-app-button secondary" data-queue="edit">Bearbeiten</button><button type="button" class="day-app-button danger" data-queue="remove">Entfernen</button></span></div>
        <div class="day-queue-row" data-item="2" data-state="queued"><span>02</span><span><strong>Deckungsfrage</strong><small>Fall HP-2302 · fiktiv</small></span><span class="day-queue-state">Geplant</span><span class="day-queue-time">23:59 h</span><span class="day-queue-actions"><button type="button" class="day-app-button secondary" data-queue="edit">Bearbeiten</button><button type="button" class="day-app-button danger" data-queue="remove">Entfernen</button></span></div>
        <div class="day-queue-row" data-item="3" data-state="queued"><span>03</span><span><strong>Nachfrage zur Police</strong><small>Fall HP-2303 · fiktiv</small></span><span class="day-queue-state">Geplant</span><span class="day-queue-time">23:59 h</span><span class="day-queue-actions"><button type="button" class="day-app-button secondary" data-queue="edit">Bearbeiten</button><button type="button" class="day-app-button danger" data-queue="remove">Entfernen</button></span></div>
        <p style="font-size:15px;margin:9px 0 0;color:#6B5B3A">Nur Demonstration – die echten Aktionen finden ausschliesslich im lokalen Cockpit statt.</p></div>`,
      notes: 'ZEIT: 4 Minuten. SAGEN: Erst die drei Eingriffe vorführen: eine Nachricht laufen lassen, eine bearbeiten, eine entfernen. Danach Uhr vorspulen. Der Knopf auf der Folie sendet nicht; im Workshop muss die echte App mit freigegebenen synthetischen Empfängern getestet werden.'
    },
    {
      id: 'Drill11Auftrag', type: 'Drill', eyebrow: 'Drill 11 · Dialog statt Zauberprompt', title: 'Die Queue ist sichtbar. Die Wirkung kommt später.',
      subtitle: 'Du siehst den Countdown, greifst ein und bestätigst erst dann den Zeitsprung.', study: true,
      body: grid([
        card('1–2 · Eingriffsfenster', `${dialogueStep(1, 'Routing', 'Welche Fälle sind Haftpflicht? Noch nichts planen.', 'Sparte, Quellen und Empfänger prüfen.')}${dialogueStep(2, 'Queue', 'Zeig die +24h-Queue; Uhr nicht vorspulen.', 'Einen editieren, einen stoppen, einen belassen.')}`, 'mint-card'),
        card('3–4 · Eigenes Werk', `${dialogueStep(3, 'Bauen', 'Wie machen wir Stopp oder Duplikatschutz klarer?', 'Erst Test, dann kleine Änderung selbst coden.')}${dialogueStep(4, 'Wirkung', 'Was geht nach dem Zeitsprung wirklich raus?', 'Uhr ausdrücklich bestätigen; Audit prüfen.')}`)
      ]),
      notes: 'ZEIT: 2 Minuten. SAGEN: Jede Frage stoppt vor einer menschlichen Prüfung. Der offizielle Drill-11-Checkpoint aktiviert Auto-Send im neuen Worktree; niemand editiert dafür manuell .env. Auto-Send nur an freigegebene Workshop-Adressen. Den 24-Stunden-Sprung erst nach sichtbarer Queue und expliziter Bestätigung ausführen. Challenge: idempotentes Handling oder Timer-Reset nach Edit.'
    },
    {
      id: 'Checkpoints', type: 'Code', eyebrow: 'Sicheres Aufholen', title: 'Ein Checkpoint rettet den Tag, nicht auf Kosten Ihrer Arbeit.',
      subtitle: 'Claude plant den Wechsel zuerst und fragt vor dem Laden ausdrücklich nach.',
      body: grid([
        card('An Claude sagen', `${prompt('„Hilf mir, den offiziellen Checkpoint für meinen Drill zu laden. Zeig mir vorher, was erhalten bleibt, und frag mich noch einmal.“')}<p class="day-small">Der neue Stand landet in einem eigenen Worktree.</p>`, 'mint-card'),
        card('Selbst prüfen', `${code('uv run pfefferminzia checkpoint status\nuv run pfefferminzia checkpoint verify')}<p class="day-small" style="margin-top:14px">Eigener Branch, uncommittete Dateien und lokale Datenbank bleiben im ursprünglichen Ordner.</p>`)
      ]),
      notes: 'ZEIT: 3 Minuten. SAGEN: Niemand muss einen kaputten Zwischenstand wegwerfen. Die Plan-Funktion ist read-only; erst ein klares Ja aktiviert einen neuen Worktree. Wer aufholen muss, prüft den neuen Zustand und arbeitet dort weiter.'
    },
    {
      id: 'Tempo', type: 'Inhalt', eyebrow: 'Zwei Sicherheitsnetze', title: 'Schnelle vertiefen; bei Tokenlimits bleibt niemand stehen.',
      subtitle: 'Die Challenge Cards greifen nur den aktuellen Drill auf und verraten den nächsten nicht.',
      body: grid([
        card('Wenn Sie schnell sind', `<p><strong>8</strong> Falsche Inbox-ID diagnostizieren.<br><strong>9</strong> Ähnliche Namen oder Prompt-Injection-Anhang.<br><strong>10</strong> Freigabe durch Edit invalidieren.<br><strong>11</strong> Idempotenz oder Timer-Reset prüfen.</p><p>Danach als Buddy Fragen stellen – Tastatur bleibt beim Team.</p>`, 'mint-card'),
        card('Wenn Tokens knapp sind', `<p>Vor jedem Drill Nutzung prüfen und Reservezugänge organisiert bereithalten.</p><p>Zu zweit mit einer aktiven Claude-Session arbeiten; Hint Card und offiziellen Checkpoint als Fallback nutzen.</p><p><strong>Echte Daten nie in Chat, Folien oder Git.</strong></p>`, 'red-card')
      ]),
      notes: 'ZEIT: 2 Minuten. SAGEN: Die Lehrenden organisieren Reserve-Sitze und Konten. Bei Tokenlimits nicht improvisiert Passwörter teilen. Pair Mode, Hint Cards und Checkpoint-Recovery halten die Lernerfahrung aufrecht.'
    },
    {
      id: 'Whiteboard', type: 'Schluss', eyebrow: '16:45 · Laptops zu', title: 'Wo darf der Agent handeln?',
      subtitle: 'Wir zeichnen den heute erlebten Prozess – und markieren die Stopplinien.',
      body: `<div class="day-flow"><div class="day-flow-step"><b>E-Mail</b><span>Auslöser</span></div><div class="day-arrow">→</div><div class="day-flow-step"><b>Belege</b><span>Kontext</span></div><div class="day-arrow">→</div><div class="day-flow-step"><b>Agent</b><span>Vorschlag</span></div><div class="day-arrow">→</div><div class="day-flow-step"><b>Kontrolle</b><span>Freigabe oder<br>Eingriffsfenster</span></div><div class="day-arrow">→</div><div class="day-flow-step"><b>Wirkung</b><span>Versand + Audit</span></div></div>`,
      notes: 'ZEIT: 2 Minuten, dann Beamer aus. SAGEN: Kein weiterer Vortrag. Gemeinsam den Prozess auf Whiteboard rekonstruieren. Die Gruppe entscheidet, welche Wirkungen nur nach Freigabe und welche mit Eingriffsfenster vertretbar sind.'
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

  const deckIds = {
    gesamt: ['Titel', 'Bruecke', 'Wirkung', 'Kontrollmuster', 'Zielbild', 'Arbeitsrhythmus', 'Tempo', 'Whiteboard', 'Contract'],
    input: ['Titel', 'Bruecke', 'Wirkung', 'Architektur', 'Belege', 'Kontrollmuster', 'Zielbild', 'Arbeitsrhythmus'],
    'drill-08': ['Drill8Start', 'Drill8Cockpit', 'Drill8Auftrag', 'Checkpoints'],
    'drill-09': ['Drill9Start', 'Drill9Kontext', 'Drill9Auftrag', 'Checkpoints'],
    'drill-10': ['Drill10Start', 'Drill10Review', 'Drill10Auftrag', 'Checkpoints'],
    'drill-11': ['Drill11Start', 'Drill11Queue', 'Drill11Auftrag', 'Checkpoints'],
    abschluss: ['Whiteboard', 'Contract'],
    agentisch: agentisch.map(slide => slide.id)
  };
  const allSlides = [...slides, ...agentisch];
  const selectedIds = deckIds[deckName] || deckIds.gesamt;
  const selectedSlides = selectedIds.map(id => allSlides.find(slide => slide.id === id));
  document.title = `Pfefferminzia · ${deckName === 'agentisch' ? 'Agentisch arbeiten' : deckName === 'gesamt' ? 'Gesamtkontext' : deckName}`;
  const footerLabel = deckName === 'agentisch'
    ? 'Arbeiten in agentischen Teams · Johannes Hötter'
    : 'AI Studio and the Future of Work · Insurance Edition · Johannes Hötter';

  function render(slide, index) {
    const avatar = johannesAvatar && (slide.cover || slide.avatar || slide.id.endsWith('Start') || slide.id === 'AgentischBruecke')
      ? `<div class="day-avatar-sticker ${slide.cover ? 'cover' : ''}">${johannesAvatar}<div class="day-avatar-bubble">${slide.avatarBubble || (slide.id === 'AgentischTitel' ? 'Moin, ich bin Johannes.' : slide.study ? 'Nur dieser Drill. Versprochen.' : 'Kontrolle ist kein Prompt.')}</div></div>`
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
