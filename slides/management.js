/* Participant-editable Drill-12 report. Reveal and D3 are already embedded in index.html. */
(() => {
  window.PFEFFERMINZIA_MANAGEMENT_SLIDES = [
    {
      id: 'ManagementTitel', type: 'Management-Report', eyebrow: 'Drill 12 · Lokale Simulation',
      title: 'Was hat unser Agent getan?',
      subtitle: 'Ein kurzer Bericht aus genau einer Pfefferminzia-Workshop-Instanz.',
      source: 'Quelle: lokaler aggregierter Workshop-Schnappschuss · keine Unternehmenskennzahlen',
      body: `<div class="day-grid two">
        <div class="day-card mint-card"><h3>Beobachtet</h3><p id="report-tickets" class="day-emphasis">Lade lokale Zählwerte …</p><p>Tickets im übernommenen Drill-11-Schnappschuss</p></div>
        <div class="day-card"><h3>Einordnung</h3><p>Dies ist eine Simulation, keine repräsentative Aussage über ein Versicherungsunternehmen.</p><p>Demo-Fälle und Inbox-Fälle bleiben unterscheidbar.</p></div>
      </div>`,
      notes: 'ZEIT: 20 Sekunden. Den Bericht aus dem eigenen Fork zeigen. Keine Namen, Mailtexte oder erfundenen Kosten-/Zeitersparnisse nennen.'
    },
    {
      id: 'ManagementDaten', type: 'D3 · Daten', eyebrow: 'Beobachtung',
      title: 'Welche Fälle hat unsere Instanz gesehen?',
      subtitle: 'D3 zeichnet die Zählwerte; die Zahlen stammen aus dem lokalen Python-Schnappschuss.',
      source: 'Quelle: /api/management-report · lokale Simulation',
      body: `<div class="day-card mint-card"><svg id="report-chart" role="img" aria-label="Ticket-Zählwerte nach Sparte und Herkunft" viewBox="0 0 900 300" style="width:100%;height:270px"></svg><p class="day-small" id="report-chart-note">Lade Daten …</p></div>`,
      notes: 'ZEIT: 40 Sekunden. Die Balken unterscheiden Demo-Fixtures und importierte Workshop-Inbox-Fälle. Wer schneller ist, ergänzt eine zweite eigene D3-Ansicht oder bessere Nullfall-Beschriftung.'
    },
    {
      id: 'ManagementEntscheidung', type: 'Management · Entscheidung', eyebrow: 'Interpretation',
      title: 'Die Kontrolle ist die eigentliche Management-Frage.',
      subtitle: 'Beobachtung, Empfehlung und Unsicherheit auf einer Folie.',
      source: 'Quelle: lokales Activity Log, nur aggregierte Kontrollereignisse',
      body: `<div class="day-grid two">
        <div class="day-card"><h3>Beleg aus dem Ablauf</h3><p id="report-controls">Lade Kontrollereignisse …</p><p>Freigabe, Ablehnung und Eingriff sind getrennte Ereignisse.</p></div>
        <div class="day-card mint-card"><h3>Deine Empfehlung</h3><p id="report-recommendation">Ergänze hier mit Claude deine begründete Empfehlung: Wo bleibt Pflichtfreigabe, wo genügt ein sichtbares Eingriffsfenster?</p><p class="day-small">Grenze: kleine lokale Simulation, kein Wirksamkeitsnachweis.</p></div>
      </div>`,
      notes: 'ZEIT: 60 Sekunden. Der Platzhalter ist absichtlich die Bauaufgabe. Teilnehmer formulieren eine eigene Empfehlung und nennen Datenlücke sowie verantwortliche menschliche Rolle.'
    }
  ];

  if (new URLSearchParams(window.location.search).get('deck') !== 'management') return;

  const sum = (items, predicate) => items.filter(predicate).reduce((total, item) => total + item.count, 0);
  const label = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  };

  function draw(data) {
    const svg = window.d3?.select('#report-chart');
    if (!svg || svg.empty()) return;
    svg.selectAll('*').remove();
    const rows = [
      {key: 'life', name: 'Leben'},
      {key: 'liability', name: 'Haftpflicht'},
      {key: 'unknown', name: 'Noch offen'}
    ].map(row => ({
      ...row,
      demo: sum(data.tickets, item => item.productLine === row.key && item.demo),
      inbox: sum(data.tickets, item => item.productLine === row.key && !item.demo)
    }));
    const max = Math.max(1, ...rows.map(row => row.demo + row.inbox));
    const scale = d3.scaleLinear().domain([0, max]).range([0, 630]);
    const group = svg.selectAll('g.report-row').data(rows).join('g')
      .attr('class', 'report-row').attr('transform', (_, index) => `translate(0, ${44 + index * 94})`);
    group.append('text').attr('x', 8).attr('y', 29).attr('font-size', 20)
      .attr('fill', '#171717').text(row => row.name);
    group.append('rect').attr('x', 190).attr('y', 0).attr('width', row => scale(row.demo))
      .attr('height', 42).attr('fill', '#9fe3c4');
    group.append('rect').attr('x', row => 190 + scale(row.demo)).attr('y', 0)
      .attr('width', row => scale(row.inbox)).attr('height', 42).attr('fill', '#2456c7');
    group.append('text').attr('x', row => 200 + scale(row.demo + row.inbox)).attr('y', 29)
      .attr('font-size', 20).attr('font-weight', 700).attr('fill', '#171717')
      .text(row => row.demo + row.inbox);
    label('#report-chart-note', 'Mint = vorbereitete Demo-Fälle · Blau = importierte Workshop-Tickets. Null bedeutet: hier nicht beobachtet.');
  }

  fetch('/api/management-report', {cache: 'no-store'})
    .then(response => {
      if (!response.ok) throw new Error('Schnappschuss nicht verfügbar');
      return response.json();
    })
    .then(data => {
      label('#report-tickets', String(sum(data.tickets, () => true)));
      const count = type => sum(data.events, event => event.type === type);
      const auto = sum(data.events, event => event.type === 'reply_sent' && event.mode === 'automatic');
      label('#report-controls', `${count('draft_approved')} Freigabe(n) · ${count('draft_rejected')} Ablehnung(en) · ${count('queue_removed')} Queue-Stopp(s) · ${auto} Auto-Versand(e).`);
      draw(data);
    })
    .catch(() => {
      label('#report-tickets', 'Kein Schnappschuss');
      label('#report-controls', 'Lade zuerst den offiziellen Drill-12-Checkpoint aus deinem Drill-11-Arbeitsstand.');
      label('#report-chart-note', 'Keine Daten. Prüfe /api/management-report und den aktiven Checkpoint.');
    });
})();
