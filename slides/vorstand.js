/* Die Präsentation für den Vorstand (Drill 10) – frei gestaltbar.
   Oben stehen Video und Folien; alles darf umgebaut, ersetzt oder ergänzt werden.
   Regeln: Zahlen nur aus /api/management-report (euer Drill-9-Stand), keine erfundenen
   Kennzahlen, keine Namen oder Mailtexte. */
(() => {
  // Euer Remotion-Video, z. B. 'video/pfefferminzia-2-0.mp4'. Solange null, zeigt die Folie einen Platzhalter.
  const VIDEO = null;

  const slides = [
    {
      kind: 'title',
      eyebrow: 'Vorstand · Oktober 2026',
      title: 'Pfefferminzia 2.0',
      lead: 'Wie ein Agent unsere Kundenpost vorbereitet – und wo der Mensch entscheidet.',
    },
    {
      kind: 'video',
      eyebrow: 'In 60 Sekunden',
      title: 'Das neue System im Einsatz',
    },
    {
      eyebrow: 'Was wir gebaut haben',
      title: 'Ein Agent, der vorbereitet. Menschen, die entscheiden.',
      html: `<div class="columns">
        <div class="card"><h2>Der Agent</h2><p class="placeholder">Was erledigt er heute selbst? (z. B. Mails abholen, Kunden finden, Entwürfe schreiben)</p></div>
        <div class="card mint"><h2>Der Mensch</h2><p class="placeholder">Wo entscheidet ein Mensch – und warum genau dort?</p></div>
      </div>`,
    },
    {
      eyebrow: 'Was unser Probelauf zeigt',
      title: 'Welche Fälle kamen an?',
      html: `<svg id="chart" role="img" aria-label="Fälle nach Sparte" viewBox="0 0 1100 330" style="width:100%;height:330px"></svg>
        <p id="chart-note" class="placeholder">Lade Zahlen …</p>`,
      draw: data => drawCases(data),
    },
    {
      eyebrow: 'Unsere Empfehlung',
      title: 'Was der Vorstand entscheiden soll',
      html: `<div class="columns">
        <div class="card mint"><h2>Empfehlung</h2><p class="placeholder">Eure Empfehlung in zwei Sätzen – worauf sie sich stützt.</p></div>
        <div class="card"><h2>Grenze der Aussage</h2><p>Ein Probelauf mit erfundenen Fällen in einem Workshop – kein Nachweis für Zeitersparnis oder Wirksamkeit.</p></div>
      </div>`,
    },
  ];

  // ---- Grafik: Fälle nach Sparte (aus eurem Drill-9-Stand) ----------------------------------
  const sum = (items, test) => items.filter(test).reduce((total, item) => total + item.count, 0);

  function drawCases(data) {
    const svg = d3.select('#chart');
    svg.selectAll('*').remove();
    const rows = [['life', 'Leben'], ['liability', 'Haftpflicht'], ['unknown', 'Noch offen']]
      .map(([key, name]) => ({name, value: sum(data.tickets, item => item.productLine === key)}));
    const x = d3.scaleLinear().domain([0, Math.max(1, ...rows.map(row => row.value))]).range([0, 760]);
    const row = svg.selectAll('g').data(rows).join('g').attr('transform', (_, i) => `translate(0, ${20 + i * 100})`);
    row.append('text').attr('x', 0).attr('y', 44).attr('font-size', 26).attr('fill', '#173d2c').text(d => d.name);
    row.append('rect').attr('x', 220).attr('y', 10).attr('height', 52).attr('rx', 10)
      .attr('width', d => x(d.value)).attr('fill', '#52b986');
    row.append('text').attr('x', d => 236 + x(d.value)).attr('y', 46).attr('font-size', 28).attr('font-weight', 750)
      .attr('fill', '#173d2c').text(d => d.value);
    note('#chart-note', 'Fälle aus unserem Probelauf, nach Sparte. Null heißt: kam nicht vor.');
  }

  // ---- Ab hier: die Präsentationsmechanik (Pfeiltasten, Leertaste, Klick, F für Vollbild) ----
  const deck = document.getElementById('deck');
  const logo = '<img class="logo" src="./assets/pfefferminzia-logo.svg" alt="Pfefferminzia">';
  const footer = '<footer><span>Pfefferminzia Versicherungen · Vorstand</span><span>Workshop-Probelauf mit erfundenen Fällen</span></footer>';
  deck.innerHTML = slides.map(slide => {
    if (slide.kind === 'video') {
      const body = VIDEO
        ? `<video src="${VIDEO}" controls playsinline preload="metadata"></video>`
        : '<div class="empty">Hier läuft gleich euer Video.<br>Pfad oben in vorstand.js bei VIDEO eintragen.</div>';
      return `<section class="slide">${logo}<div class="eyebrow">${slide.eyebrow}</div><h1>${slide.title}</h1><div class="video-frame">${body}</div>${footer}</section>`;
    }
    return `<section class="slide ${slide.kind || ''}">${logo}<div class="eyebrow">${slide.eyebrow || ''}</div>
      <h1>${slide.title}</h1>${slide.lead ? `<p class="lead">${slide.lead}</p>` : ''}${slide.html || ''}${footer}</section>`;
  }).join('');

  const sections = [...deck.querySelectorAll('.slide')];
  let current = Math.min(sections.length - 1, Math.max(0, (parseInt(location.hash.slice(1), 10) || 1) - 1));
  function show(index) {
    current = Math.min(sections.length - 1, Math.max(0, index));
    sections.forEach((section, i) => section.classList.toggle('active', i === current));
    document.getElementById('counter').textContent = `${current + 1} / ${sections.length}`;
    history.replaceState(null, '', `#${current + 1}`);
  }
  function fit() {
    const scale = Math.min(innerWidth / 1280, innerHeight / 720);
    deck.style.transform = `scale(${scale})`;
  }
  function note(selector, text) {
    const element = document.querySelector(selector);
    if (element) { element.textContent = text; element.classList.remove('placeholder'); }
  }
  addEventListener('resize', fit);
  addEventListener('keydown', event => {
    if (['ArrowRight', 'PageDown', ' '].includes(event.key)) show(current + 1);
    if (['ArrowLeft', 'PageUp'].includes(event.key)) show(current - 1);
    if (event.key === 'f') document.documentElement.requestFullscreen?.();
  });
  document.getElementById('prev').onclick = () => show(current - 1);
  document.getElementById('next').onclick = () => show(current + 1);
  document.getElementById('full').onclick = () => document.documentElement.requestFullscreen?.();
  fit();
  show(current);

  fetch('/api/management-report', {cache: 'no-store'})
    .then(response => { if (!response.ok) throw new Error(); return response.json(); })
    .then(data => slides.forEach(slide => slide.draw?.(data)))
    .catch(() => document.querySelectorAll('[id$="-note"]').forEach(element => {
      element.textContent = 'Noch keine Zahlen: Drill 10 zuerst aus deinem Drill-9-Stand laden.';
    }));
})();
