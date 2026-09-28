/* Pfefferminzia cockpit: one small app, served as-is by Python (no build step). */
const app = document.querySelector('#app');
const state = {
  dashboard: null, todos: [], ticket: null, evidence: null, view: 'inbox', selected: null,
  bestand: { overview: null, tab: 'customers', query: '', customers: [], tariffs: [], claims: [], customer: null, contracts: {} },
  dialog: null, toast: null, busy: false, fetchedAt: Date.now(),
};

/* ---------- helpers ---------- */
const html = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const lines = value => html(value).replaceAll('\n', '<br>');
const url = value => encodeURIComponent(value);
const has = capability => state.dashboard?.workshop?.checkpoint?.capabilities?.includes(capability);
const drill = () => state.dashboard?.workshop?.checkpoint?.drill ?? 6;
const shortDate = value => {
  if (!value) return '';
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
};
const longDate = value => value ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const initials = value => (value || '?').replace(/<.*>/, '').trim().split(/[\s.@]+/).filter(Boolean).slice(0, 2)
  .map(part => part[0].toUpperCase()).join('') || '?';

const STATUS = {
  new: ['Neu', 'new'], in_progress: ['In Arbeit', 'progress'], awaiting_human: ['Wartet auf Freigabe', 'review'],
  scheduled: ['Eingeplant', 'scheduled'], sent: ['Beantwortet', 'done'], closed: ['Geschlossen', 'closed'],
};
const LINE = { life: 'Leben', liability: 'Haftpflicht', unknown: '' };
const EVENTS = {
  ticket_imported: 'Mail empfangen', workshop_fixture_loaded: 'Fall angelegt', draft_saved: 'Entwurf gespeichert',
  human_review_required: 'Zur Freigabe vorgelegt', draft_approved: 'Freigegeben', draft_rejected: 'Abgelehnt',
  review_invalidated: 'Freigabe erloschen', reply_scheduled: 'Eingeplant', schedule_cancelled: 'Termin abgebrochen',
  queue_removed: 'Versand gestoppt', earlier_reply_imported: 'Frühere Antwort übernommen', reply_sent: 'Antwort gesendet', internal_note: 'Notiz',
  status_changed: 'Status geändert', classification_updated: 'Sparte zugeordnet', ticket_routed: 'Weitergeleitet',
  customer_linked: 'Kunde verknüpft', contract_linked: 'Vertrag verknüpft',
};
const ACTORS = { 'mcp-agent': 'Claude', 'human-ui': 'Du', human: 'Du', 'agentmail-sync': 'Posteingang',
  'auto-send-worker': 'Automatik', 'workshop-fixture': 'System' };
const actor = value => ACTORS[value] || (String(value).startsWith('mcp') ? 'Claude' : 'System');

const ICON = {
  inbox: '<path d="M3 12h4l2 3h6l2-3h4M5 5h14l2 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
  tasks: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  review: '<path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  queue: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  slides: '<rect x="3.5" y="5" width="17" height="11" rx="1.5"/><path d="M12 16v4M8 20h8"/>',
  report: '<path d="M5 19V9M12 19V5M19 19v-7"/>',
  bestand: '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 13a8 8 0 0 0 14.3 4.9L20 16M4 4v4h4M20 20v-4h-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', back: '<path d="m15 18-6-6 6-6"/>',
};
const icon = (name, size = 16) => `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;
const statusIcon = status => `<span class="status-icon ${STATUS[status]?.[1] || 'new'}" title="${html(STATUS[status]?.[0] || status)}"></span>`;

async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Aktion fehlgeschlagen (${response.status})`);
  return body;
}

/* ---------- data ---------- */
function ticketsFor(view) {
  const tickets = (state.dashboard?.tickets || []).slice().sort((a, b) => String(b.lastMessageAt).localeCompare(String(a.lastMessageAt)));
  if (view === 'reviews') return tickets.filter(t => t.productLine === 'life' && t.status === 'awaiting_human');
  if (view === 'queue') return tickets.filter(t => t.status === 'scheduled');
  return tickets;
}
const openTodos = () => state.todos.filter(todo => todo.status === 'open');

function draftChanged() {
  const input = document.querySelector('#draft-body');
  return Boolean(input && input.value !== (state.ticket?.draft?.body || ''));
}

async function refresh({ quiet = false } = {}) {
  const editing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (state.busy || (quiet && (state.dialog || editing || draftChanged()))) return;
  try {
    const [dashboard, todos] = await Promise.all([request('/api/dashboard'), request('/api/todos')]);
    state.dashboard = dashboard;
    state.todos = todos;
    state.fetchedAt = Date.now();
    if (state.view !== 'tasks' && state.selected && !ticketsFor(state.view).some(t => t.ticketNumber === state.selected)) state.selected = null;
    state.ticket = state.selected ? await request(`/api/tickets/${url(state.selected)}`) : null;
    await loadEvidence();
  } catch (error) { toast(error.message, 'error'); }
  render();
}

/* ---------- sidebar ---------- */
function navItem(view, label, iconName, count) {
  const active = state.view === view;
  return `<button type="button" class="nav-item ${active ? 'active' : ''}" data-view="${view}" aria-current="${active ? 'page' : 'false'}">
    ${icon(iconName)}<span>${label}</span>${count ? `<span class="count">${count}</span>` : ''}</button>`;
}

function sidebar() {
  const workshop = state.dashboard.workshop;
  const mail = workshop.agentMail;
  const sync = workshop.lastInboxSync;
  const open = state.dashboard.tickets.filter(t => !['sent', 'closed'].includes(t.status)).length;
  return `<aside class="sidebar">
    <div class="workspace-name"><img src="/favicon.svg" alt="" width="22" height="22"><span>Pfefferminzia</span></div>
    <nav aria-label="Bereiche">
      ${navItem('inbox', 'Posteingang', 'inbox', open)}
      ${navItem('tasks', 'Aufgaben', 'tasks', openTodos().length)}
      ${has('knowledge') ? navItem('bestand', 'Bestand', 'bestand') : ''}
      ${has('life_review') ? navItem('reviews', 'Freigaben', 'review', ticketsFor('reviews').length) : ''}
      ${has('intervention_queue') ? navItem('queue', 'Eingriffsfenster', 'queue', ticketsFor('queue').length) : ''}
    </nav>
    <div class="sidebar-foot">
      <div class="inbox-chip ${mail.ready ? 'ok' : 'off'}" title="${sync ? `Zuletzt abgeglichen ${longDate(sync.at)}` : ''}">
        <span class="dot"></span><span class="address">${html(mail.inboxId || 'Postfach nicht verbunden')}</span>
        <button type="button" class="icon-button" data-action="sync" ${mail.ready ? '' : 'disabled'} aria-label="Posteingang abgleichen" title="Abgleichen">${icon('sync', 14)}</button>
      </div>
      ${has('management_report') ? `<a class="nav-item small" href="/slides/index.html?deck=management" target="_blank" rel="noopener">${icon('report', 14)}<span>Report</span></a>` : ''}
      <span class="drill-tag">Drill ${drill()}</span>
    </div>
  </aside>`;
}

/* ---------- lists ---------- */
function ticketRow(ticket) {
  const active = ticket.ticketNumber === state.selected;
  const line = has('life_review') ? LINE[ticket.productLine] : '';
  const due = ticket.status === 'scheduled' ? `<span class="countdown" data-scheduled="${html(ticket.scheduledFor)}"></span>` : '';
  return `<button type="button" class="row ${active ? 'active' : ''} ${ticket.status === 'new' ? 'unread' : ''}" data-ticket="${html(ticket.ticketNumber)}">
    ${statusIcon(ticket.status)}<span class="row-id">${html(ticket.ticketNumber)}</span>
    <span class="row-title"><span class="row-subject">${html(ticket.subject)}</span><span class="row-from">${html(ticket.customerName || ticket.customerEmail || '')}</span></span>
    ${line ? `<span class="label ${ticket.productLine}">${line}</span>` : ''}
    ${due || `<span class="row-date">${shortDate(ticket.lastMessageAt)}</span>`}</button>`;
}

function ticketList() {
  const tickets = ticketsFor(state.view);
  const inbox = state.dashboard.workshop.agentMail.inboxId;
  const empty = {
    inbox: inbox ? `Noch keine Mails. Neue Mails an ${html(inbox)} erscheinen hier.` : 'Noch keine Mails.',
    reviews: 'Nichts wartet auf deine Freigabe.',
    queue: 'Keine Antwort ist eingeplant.',
  }[state.view];
  return tickets.length ? tickets.map(ticketRow).join('') : `<p class="empty">${empty}</p>`;
}

function taskRow(todo) {
  const done = todo.status === 'completed';
  return `<div class="row task ${done ? 'done' : ''}">
    <button type="button" class="check ${done ? 'on' : ''}" data-action="todo" data-id="${todo.id}" data-status="${done ? 'open' : 'completed'}" aria-label="${done ? 'Wieder öffnen' : 'Erledigt'}"></button>
    <span class="row-title">${html(todo.title)}</span>
    ${todo.ticketNumber ? `<button type="button" class="ticket-chip" data-open-ticket="${html(todo.ticketNumber)}">${html(todo.ticketNumber)}</button>` : ''}
    <span class="row-date">${shortDate(todo.createdAt)}</span></div>`;
}

function taskList() {
  const open = openTodos();
  const done = state.todos.filter(todo => todo.status !== 'open');
  return `<form class="new-task" data-form="todo">${icon('plus', 14)}
      <input name="title" placeholder="Neue Aufgabe…" maxlength="300" required aria-label="Neue Aufgabe">
      <select name="ticketNumber" aria-label="Zu Ticket"><option value="">Ohne Ticket</option>${state.dashboard.tickets.map(t => `<option value="${html(t.ticketNumber)}">${html(t.ticketNumber)}</option>`).join('')}</select></form>
    ${open.length ? open.map(taskRow).join('') : '<p class="empty">Keine offenen Aufgaben.</p>'}
    ${done.length ? `<div class="group-label">Erledigt</div>${done.slice(0, 20).map(taskRow).join('')}` : ''}`;
}

/* ---------- detail ---------- */
function message(item) {
  const outbound = item.direction === 'outbound';
  return `<article class="message ${outbound ? 'outbound' : ''}">
    <div class="avatar ${outbound ? 'us' : ''}">${outbound ? 'P' : initials(item.sender)}</div>
    <div class="message-body"><div class="message-head"><strong>${html(outbound ? 'Pfefferminzia' : senderName(item.sender))}</strong><span>${longDate(item.sentAt)}</span></div>
    <div class="message-text">${lines(item.textBody || '')}</div></div></article>`;
}

const senderName = value => {
  const match = String(value || '').match(/^\s*"?([^"<]+?)"?\s*<(.+)>\s*$/);
  return match ? match[1] : value;
};

function primaryAction(ticket) {
  const noSend = ticket.isDemo ? 'disabled title="Demo-Fall: kein Versand"' : '';
  if (ticket.status === 'scheduled') return `<span class="hint countdown" data-scheduled="${html(ticket.scheduledFor)}"></span><button type="button" data-action="remove">Versand stoppen</button>`;
  if (!ticket.draft) return '';
  if (ticket.productLine === 'life' && has('life_review')) {
    if (ticket.status !== 'awaiting_human') return '<button type="button" class="primary" data-action="submit">Zur Freigabe vorlegen</button>';
    return ticket.humanApprovedAt
      ? `<span class="hint ok">Freigegeben</span><button type="button" class="primary" data-action="send" ${noSend}>Senden</button>`
      : '<button type="button" data-action="reject">Ablehnen</button><button type="button" class="primary" data-action="approve">Freigeben</button>';
  }
  if (ticket.productLine === 'liability' && has('intervention_queue')) return '<button type="button" class="primary" data-action="schedule">Für 24 h einplanen</button>';
  if (has('manual_send')) return `<button type="button" class="primary" data-action="send" ${noSend}>Senden</button>`;
  return '';
}

function composer(ticket) {
  if (!has('draft') || ['sent', 'closed'].includes(ticket.status)) return '';
  const draft = ticket.draft;
  const author = actor(ticket.events?.find(event => event.type === 'draft_saved')?.actor);
  const notice = ticket.controlNotice ? `<div class="notice-bar">${html(ticket.controlNotice.text)}</div>` : '';
  return `<section class="composer">${notice}
    <form data-form="draft">
      <textarea id="draft-body" name="body" rows="${draft ? 7 : 3}" placeholder="Antwort an ${html(ticket.customerEmail || 'Absender')} …">${html(draft?.body || '')}</textarea>
      <div class="composer-foot">
        <span class="hint">${draft ? `Entwurf von ${html(author)}${draft.rationale ? ` · ${html(draft.rationale)}` : ''}` : 'Selbst schreiben oder Claude um einen Entwurf bitten'}</span>
        <button type="submit" class="ghost">Speichern</button>${primaryAction(ticket)}
      </div>
    </form></section>`;
}

const property = (label, value) => `<div class="prop"><span>${label}</span><div>${value}</div></div>`;

function properties(ticket) {
  const todos = state.todos.filter(todo => todo.ticketNumber === ticket.ticketNumber);
  const editable = has('life_review') && !['sent', 'closed'].includes(ticket.status);
  const lineValue = editable
    ? `<select data-classify aria-label="Sparte"><option value="" ${ticket.productLine === 'unknown' ? 'selected' : ''}>Offen</option>${['life', 'liability'].map(v => `<option value="${v}" ${ticket.productLine === v ? 'selected' : ''}>${LINE[v]}</option>`).join('')}</select>`
    : html(LINE[ticket.productLine] || 'Offen');
  const party = ticket.parties?.[0];
  const contracts = ticket.linkedContracts || [];
  return `<aside class="props">
    ${property('Status', `${statusIcon(ticket.status)} ${html(STATUS[ticket.status]?.[0] || ticket.status)}`)}
    ${has('life_review') ? property('Sparte', lineValue) : ''}
    ${property('Von', html(ticket.customerEmail || '—'))}
    ${has('knowledge') ? property('Kunde', party ? html(party.displayName) : '<span class="muted">Nicht zugeordnet</span>') : ''}
    ${has('knowledge') ? property('Vertrag', contracts.length ? contracts.map(c => `${html(c.contractId)} <span class="muted">${html(c.tariffGenerationId)}</span>`).join('<br>') : '<span class="muted">—</span>') : ''}
    ${property('Eingang', longDate(ticket.createdAt))}
    <div class="props-group">Aufgaben</div>
    ${todos.length ? todos.map(todo => `<button type="button" class="mini-task ${todo.status === 'completed' ? 'done' : ''}" data-action="todo" data-id="${todo.id}" data-status="${todo.status === 'completed' ? 'open' : 'completed'}"><span class="check ${todo.status === 'completed' ? 'on' : ''}"></span>${html(todo.title)}</button>`).join('') : '<span class="muted small">Keine</span>'}
  </aside>`;
}

const money = (value, currency) => value == null ? '—' : `${Number(value).toLocaleString('de-CH')} ${html(currency || '')}`;
const fact = (label, value) => value ? `<div class="fact"><span>${label}</span><div>${value}</div></div>` : '';

function evidence(ticket) {
  const data = state.evidence;
  if (!has('knowledge') || !data || data.ticketNumber !== ticket.ticketNumber) return '';
  const sample = data.isSample ? '<p class="muted small">Beispielfall – zum Üben; von hier wird nichts gesendet.</p>' : '';
  const intro = '<p class="muted small">Nachgeschlagen im Bestand – das steht nicht in der Mail, sondern in den Daten des Versicherers.</p>';
  if (!data.customers.length && !data.contracts.length) {
    return `<section class="evidence"><div class="group-label">Aus dem Bestand</div>${sample}<p class="muted">Noch keine Kundin und kein Vertrag zugeordnet. Bitte Claude, im Bestand nachzuschlagen und den Fall zuzuordnen.</p></section>`;
  }
  const customers = data.customers.map(c => `<details class="source" open><summary><strong>Kunde</strong> ${html(c.name)}
    <button type="button" class="link" data-open-customer="${html(c.partnerId)}">im Bestand ansehen</button></summary>
    ${fact('Zugeordnet', html(c.linkedBy))}${fact('Geboren', html(c.birthDate))}${fact('Wohnort', html(c.residence))}${fact('E-Mail', html(c.email))}${fact('Telefon', html(c.phone))}</details>`).join('');
  const contracts = data.contracts.map(c => contractCard(c)).join('');
  return `<section class="evidence"><div class="group-label">Aus dem Bestand</div>${sample}${intro}${customers}${contracts}</section>`;
}

function contractCard(c) {
  return `<details class="source" open><summary><strong>Vertrag</strong> ${html(c.contractId)} · ${html(c.product)}</summary>
    ${fact('Zugeordnet', html(c.linkedBy))}${fact('Tarifgeneration', `<strong>${html(c.tariffGenerationId)}</strong> <span class="muted">${html(c.tariffName)}</span>`)}
    ${fact('Status', html(c.status))}${fact('Laufzeit', `${html(c.start)} – ${html(c.end || 'offen')}`)}
    ${fact('Summe', money(c.insuredSum, c.currency))}${fact('Jahresprämie', money(c.annualPremium, c.currency))}
    ${fact('Begünstigte', c.beneficiaries.map(b => `${html(b.name)}${b.share != null ? ` (${b.share} %)` : ''}`).join('<br>'))}
    ${fact('Bausteine', c.modules.map(html).join(', '))}
    ${fact('Tarifunterlagen', c.documents.map(d => `<a href="${html(d.url)}" target="_blank" rel="noopener">${html(d.title)}</a>`).join('<br>'))}
    ${(c.claims || []).map(k => `<div class="claim"><strong>Schadenfall ${html(k.claimId)}</strong> · ${html(k.title)} <span class="label">${html(k.status)}</span>
      <p>${html(k.summary)}</p>
      <p class="muted small">Gemeldet ${money(k.reported, k.currency)} · Reserve ${money(k.reserve, k.currency)} · Bezahlt ${money(k.paid, k.currency)}</p>
      ${k.recommendation ? `<p class="small">Empfehlung: <strong>${html(k.recommendation.action)}</strong> (${html(k.recommendation.status)}) – ${html(k.recommendation.rationale)}</p>` : ''}</div>`).join('')}
    </details>`;
}

/* ---------- Bestand (from Drill 7): the insurer's data from Monday ---------- */
async function loadBestand() {
  const b = state.bestand;
  const q = encodeURIComponent(b.query || '');
  const [overview, customers, tariffs, claims] = await Promise.all([
    request('/api/bestand'), request(`/api/customers?limit=60&q=${q}`), request('/api/tariffs'),
    has('claims') ? request('/api/claims') : Promise.resolve([]),
  ]);
  Object.assign(b, { overview, customers, tariffs, claims });
}

async function openCustomer(partnerId) {
  state.view = 'bestand';
  state.bestand.tab = 'customers';
  state.selected = null;
  try {
    if (!state.bestand.overview) await loadBestand();
    state.bestand.customer = await request(`/api/bestand/customers/${url(partnerId)}`);
  } catch (error) { toast(error.message, 'error'); }
  render();
}

async function openContract(contractId) {
  try { state.bestand.contracts[contractId] = await request(`/api/bestand/contracts/${url(contractId)}`); }
  catch (error) { toast(error.message, 'error'); }
  render();
}

function bestandList() {
  const b = state.bestand;
  const tabs = [['customers', 'Kunden'], ['tariffs', 'Tarife'], ...(has('claims') ? [['claims', 'Schäden']] : [])];
  const tabBar = `<div class="tabs">${tabs.map(([key, label]) => `<button type="button" class="tab ${b.tab === key ? 'active' : ''}" data-bestand-tab="${key}">${label}</button>`).join('')}</div>`;
  if (b.tab === 'tariffs') {
    return tabBar + b.tariffs.map(t => `<a class="row" href="/api/tariffs/${url(t.id)}/download?inline=1" target="_blank" rel="noopener">
      <span class="row-id">${html(t.tariffGenerationId || '')}</span><span class="row-title"><span class="row-subject">${html(t.title)}</span>
      <span class="row-from">${html(t.summary || '')}</span></span></a>`).join('');
  }
  if (b.tab === 'claims') {
    return tabBar + b.claims.map(k => `<div class="row"><span class="row-id">${html(k.claimId)}</span><span class="row-title">
      <span class="row-subject">${html(k.title)}</span><span class="row-from">${html(k.customerName)} · ${html(k.contractId)}</span></span>
      <span class="row-date">${money(k.reportedAmount, k.currency)}</span></div>`).join('');
  }
  return tabBar + `<form class="new-task" data-form="bestand-search"><input name="q" value="${html(b.query)}" placeholder="Name, Ort oder Vertragsnummer suchen …" aria-label="Im Bestand suchen"></form>`
    + (b.customers.length ? b.customers.map(c => `<button type="button" class="row ${b.customer?.partnerId === c.partnerId ? 'active' : ''}" data-open-customer="${html(c.partnerId)}">
      <span class="row-id">${html(c.partnerId)}</span><span class="row-title"><span class="row-subject">${html(c.displayName)}</span>
      <span class="row-from">${html(c.city || '')}</span></span><span class="row-date">${c.contractCount} Vertr.</span></button>`).join('')
      : '<p class="empty">Keine Treffer.</p>');
}

function bestandDetail() {
  const b = state.bestand;
  const source = b.overview ? `<div class="bestand-source"><strong>Woher kommen die Daten?</strong> ${html(b.overview.source)}.
    Eingelesen: ${b.overview.customers.toLocaleString('de-CH')} Kundinnen und Kunden, ${b.overview.contracts.toLocaleString('de-CH')} Verträge,
    ${b.overview.tariffSheets} Tarifblätter${b.overview.claims != null ? `, ${b.overview.claims} Schadenfälle` : ''}. Claude liest hier nach – ändern kann es nichts.</div>` : '';
  const c = b.customer;
  if (!c || b.tab !== 'customers') return `<div class="detail"><div class="thread">${source}<p class="muted">Links eine Kundin wählen oder oben suchen.</p></div></div>`;
  return `<div class="detail"><div class="thread">${source}<h1>${html(c.name)}</h1>
    <section class="evidence"><details class="source" open><summary><strong>Stammdaten</strong></summary>
      ${fact('Kundennummer', html(c.partnerId))}${fact('Geboren', html(c.birthDate))}${fact('Wohnort', html(c.residence))}${fact('E-Mail', html(c.email))}${fact('Telefon', html(c.phone))}</details>
    <div class="group-label">Verträge</div>
    ${c.contracts.map(k => b.contracts[k.contractId] ? contractCard(b.contracts[k.contractId])
      : `<button type="button" class="row" data-open-contract="${html(k.contractId)}"><span class="row-id">${html(k.contractId)}</span>
        <span class="row-title"><span class="row-subject">${html(k.product)} · ${html(k.tariffGenerationId)}</span><span class="row-from">${html(k.status)}</span></span></button>`).join('')}
    </section></div></div>`;
}

function activity(ticket) {
  const events = (ticket.events || []).slice().reverse();
  return `<section class="activity"><div class="group-label">Aktivität</div>${events.map(event => `<div class="event">
    <span class="event-dot"></span><strong>${html(actor(event.actor))}</strong> ${html(EVENTS[event.type] || event.type)}
    ${event.details?.note || event.details?.reason ? `<span class="muted">– ${html(event.details.note || event.details.reason)}</span>` : ''}
    <span class="event-time">${shortDate(event.createdAt)}</span></div>`).join('')}</section>`;
}

function detail() {
  const ticket = state.ticket;
  if (!ticket) return '<div class="detail empty-detail"><p>Wähle eine Mail aus.</p></div>';
  return `<div class="detail"><header class="detail-head">
      <button type="button" class="icon-button back" data-action="close" aria-label="Zurück">${icon('back')}</button>
      <span>${html(ticket.ticketNumber)}</span>${ticket.isDemo ? '<span class="label">Beispielfall</span>' : ''}</header>
    <div class="detail-grid"><div class="thread">
      <h1>${html(ticket.subject)}</h1>
      ${(ticket.messages || []).map(message).join('') || '<p class="empty">Keine Nachricht.</p>'}
      ${evidence(ticket)}${composer(ticket)}${activity(ticket)}
    </div>${properties(ticket)}</div></div>`;
}

/* ---------- dialogs & toast ---------- */
function dialogMarkup() {
  if (!state.dialog) return '';
  const ticket = state.ticket;
  const [title, copy, confirm, kind] = {
    send: ['Antwort senden?', `Der Text geht jetzt an ${html(ticket?.customerEmail || '')}.`, 'Senden', 'danger'],
    reject: ['Ablehnen', 'Warum? Claude überarbeitet den Entwurf danach.', 'Ablehnen', 'primary'],
    remove: ['Versand stoppen?', 'Die Antwort wird nicht automatisch gesendet. Warum?', 'Stoppen', 'primary'],
    schedule: ['Für 24 Stunden einplanen?', 'Danach geht die Antwort automatisch raus – außer jemand greift vorher ein.', 'Einplanen', 'primary'],
    clock: ['Workshop-Zeit um 24 h vorspulen?', 'Fällige Antworten werden dann wirklich gesendet.', 'Vorspulen', 'danger'],
  }[state.dialog];
  const reason = ['reject', 'remove'].includes(state.dialog);
  return `<div class="backdrop" data-backdrop><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
    <form data-form="confirm"><h2 id="dialog-title">${title}</h2><p>${copy}</p>
    ${ticket && ['send', 'schedule'].includes(state.dialog) ? `<blockquote>${lines(ticket.draft?.body || '')}</blockquote>` : ''}
    ${reason ? '<textarea name="reason" rows="3" maxlength="2000" required aria-label="Begründung"></textarea>' : ''}
    <div class="dialog-actions"><button type="button" class="ghost" data-action="cancel">Abbrechen</button><button type="submit" class="${kind}">${confirm}</button></div>
    </form></div></div>`;
}

function toast(text, kind = 'ok') {
  state.toast = { text, kind };
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { state.toast = null; render(); }, kind === 'error' ? 6000 : 2600);
}

/* ---------- render ---------- */
function render() {
  if (!state.dashboard) { app.innerHTML = '<main class="loading">Pfefferminzia lädt …</main>'; return; }
  const titles = { inbox: 'Posteingang', tasks: 'Aufgaben', reviews: 'Freigaben', queue: 'Eingriffsfenster', bestand: 'Bestand' };
  const bestand = state.view === 'bestand';
  const count = state.view === 'tasks' ? openTodos().length : bestand ? '' : ticketsFor(state.view).length;
  const headAction = state.view === 'queue'
    ? `<button type="button" data-action="clock" ${state.dashboard.autoSendEnabled ? '' : 'disabled'}>${icon('queue', 14)} Zeit +24 h</button>` : '';
  const tasks = state.view === 'tasks';
  app.innerHTML = `<div class="shell ${!tasks && (state.selected || (bestand && state.bestand.customer)) ? 'with-detail' : ''}">${sidebar()}
    <main class="main"><header class="main-head"><h2>${titles[state.view]}</h2><span class="muted">${count}</span><div class="spacer"></div>${headAction}</header>
      <div class="split ${tasks ? 'single' : ''}">
        <section class="list" aria-label="${titles[state.view]}">${tasks ? taskList() : bestand ? bestandList() : ticketList()}</section>
        ${tasks ? '' : bestand ? bestandDetail() : detail()}
      </div></main></div>
    ${dialogMarkup()}${state.toast ? `<div class="toast ${state.toast.kind}" role="status">${html(state.toast.text)}</div>` : ''}`;
  updateCountdowns();
  if (state.dialog) document.querySelector('.dialog textarea')?.focus();
}

function updateCountdowns() {
  const base = Date.parse(state.dashboard?.workshop?.clock?.now || new Date().toISOString());
  const now = base + Date.now() - state.fetchedAt;
  document.querySelectorAll('[data-scheduled]').forEach(node => {
    const seconds = Math.max(0, Math.floor((Date.parse(node.dataset.scheduled) - now) / 1000));
    node.textContent = seconds ? `in ${Math.floor(seconds / 3600)} h ${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')} min` : 'fällig';
  });
}

/* ---------- actions ---------- */
async function mutate(work, message) {
  if (state.busy) return;
  state.busy = true;
  state.dialog = null;
  try { await work(); if (message) toast(message); }
  catch (error) { toast(error.message, 'error'); }
  finally { state.busy = false; await refresh(); }
}

async function openTicket(number, view = state.view) {
  state.view = view;
  state.selected = number;
  try { state.ticket = await request(`/api/tickets/${url(number)}`); await loadEvidence(); }
  catch (error) { toast(error.message, 'error'); }
  render();
}

// From Drill 7 on the person checks the same sources Claude uses.
async function loadEvidence() {
  state.evidence = state.ticket && has('knowledge')
    ? await request(`/api/tickets/${url(state.ticket.ticketNumber)}/evidence`).catch(() => null) : null;
}

function moveSelection(step) {
  const tickets = ticketsFor(state.view);
  if (!tickets.length || state.view === 'tasks') return;
  const index = tickets.findIndex(t => t.ticketNumber === state.selected);
  const next = tickets[Math.min(tickets.length - 1, Math.max(0, index + step))];
  if (next) openTicket(next.ticketNumber);
}

const closeDetail = () => { state.selected = null; state.ticket = null; render(); };

app.addEventListener('click', async event => {
  if (event.target.matches('[data-backdrop]')) { state.dialog = null; render(); return; }
  const view = event.target.closest('[data-view]');
  if (view) {
    state.view = view.dataset.view; state.selected = null; state.ticket = null;
    if (state.view === 'bestand') await loadBestand().catch(error => toast(error.message, 'error'));
    await refresh(); return;
  }
  const tab = event.target.closest('[data-bestand-tab]');
  if (tab) { state.bestand.tab = tab.dataset.bestandTab; render(); return; }
  const customer = event.target.closest('[data-open-customer]');
  if (customer) { event.preventDefault(); await openCustomer(customer.dataset.openCustomer); return; }
  const contract = event.target.closest('[data-open-contract]');
  if (contract) { await openContract(contract.dataset.openContract); return; }
  const row = event.target.closest('[data-ticket]');
  if (row) { await openTicket(row.dataset.ticket); return; }
  const chip = event.target.closest('[data-open-ticket]');
  if (chip) { await openTicket(chip.dataset.openTicket, 'inbox'); return; }
  const control = event.target.closest('[data-action]');
  if (!control || control.disabled) return;
  const action = control.dataset.action;
  const ticket = state.ticket?.ticketNumber;
  if (action === 'cancel') { state.dialog = null; render(); return; }
  if (action === 'close') { closeDetail(); return; }
  if (['send', 'approve', 'submit', 'schedule'].includes(action) && draftChanged()) { toast('Erst den geänderten Entwurf speichern.', 'error'); render(); return; }
  if (['send', 'reject', 'remove', 'schedule', 'clock'].includes(action)) { state.dialog = action; render(); return; }
  if (action === 'sync') return mutate(async () => {
    const result = await request('/api/sync', { method: 'POST', body: '{}' });
    toast(result.importedTickets ? `${result.importedTickets} neue Mail(s)` : 'Keine neuen Mails – gleich nochmal versuchen');
  });
  if (action === 'todo') return mutate(() => request(`/api/todos/${control.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ status: control.dataset.status }) }));
  if (action === 'submit') return mutate(() => request(`/api/tickets/${url(ticket)}/submit`, { method: 'POST', body: '{}' }), 'Zur Freigabe vorgelegt');
  if (action === 'approve') return mutate(() => request(`/api/tickets/${url(ticket)}/approve`, { method: 'POST', body: '{}' }), 'Freigegeben');
});

app.addEventListener('change', event => {
  const select = event.target.closest('[data-classify]');
  if (!select || !select.value || !state.ticket) return;
  const ticket = state.ticket;
  const category = ticket.category === 'unknown' ? 'general_question' : ticket.category;
  const payload = has('router')
    ? { route: select.value === 'life' ? 'life_mandatory_review' : 'liability_intervention_window', category, summary: ticket.summary || ticket.subject, confidence: 1 }
    : { productLine: select.value, category, summary: ticket.summary || ticket.subject };
  mutate(() => request(`/api/tickets/${url(ticket.ticketNumber)}/${has('router') ? 'route' : 'classify'}`, { method: 'POST', body: JSON.stringify(payload) }), 'Sparte gesetzt');
});

app.addEventListener('submit', event => {
  const form = event.target.closest('[data-form]');
  if (!form) return;
  event.preventDefault();
  const values = new FormData(form);
  const ticket = state.ticket?.ticketNumber;
  if (form.dataset.form === 'bestand-search') {
    state.bestand.query = String(values.get('q') || '');
    state.bestand.customer = null;
    return loadBestand().then(render).catch(error => toast(error.message, 'error'));
  }
  if (form.dataset.form === 'todo') return mutate(() => request('/api/todos', { method: 'POST',
    body: JSON.stringify({ title: values.get('title'), ticketNumber: values.get('ticketNumber') || null }) }), 'Aufgabe angelegt');
  if (form.dataset.form === 'draft') return mutate(() => request(`/api/tickets/${url(ticket)}/draft`, { method: 'PUT',
    body: JSON.stringify({ body: values.get('body') }) }), 'Entwurf gespeichert');
  if (form.dataset.form === 'confirm') {
    const reason = String(values.get('reason') || '');
    const actions = {
      send: [() => request(`/api/tickets/${url(ticket)}/send`, { method: 'POST', body: '{}' }), 'Antwort gesendet'],
      reject: [() => request(`/api/tickets/${url(ticket)}/reject`, { method: 'POST', body: JSON.stringify({ note: reason }) }), 'Abgelehnt'],
      remove: [() => request(`/api/tickets/${url(ticket)}/schedule`, { method: 'DELETE', body: JSON.stringify({ reason }) }), 'Versand gestoppt'],
      schedule: [() => request(`/api/tickets/${url(ticket)}/submit`, { method: 'POST', body: JSON.stringify({ delayHours: 24 }) }), 'Eingeplant'],
      clock: [() => request('/api/workshop/clock/advance', { method: 'POST', body: JSON.stringify({ hours: 24, confirmAdvance: true }) }), 'Zeit vorgespult'],
    }[state.dialog];
    if (actions) return mutate(...actions);
  }
});

document.addEventListener('keydown', event => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  if (event.key === 'Escape') {
    if (state.dialog) { state.dialog = null; render(); } else if (state.selected && !typing) closeDetail();
    return;
  }
  if (typing || state.dialog) return;
  if (event.key === 'j' || event.key === 'ArrowDown') { event.preventDefault(); moveSelection(1); }
  if (event.key === 'k' || event.key === 'ArrowUp') { event.preventDefault(); moveSelection(-1); }
});

// Claude links straight to a case (/?ticket=PF-1008) or to the Bestand (/?view=bestand&customer=PTR-…).
const params = new URLSearchParams(window.location.search);
const linked = params.get('ticket');
if (linked && /^PF-\d+$/.test(linked)) state.selected = linked;
refresh().then(async () => {
  if (params.get('view') !== 'bestand' || !has('knowledge')) return;
  state.view = 'bestand';
  await loadBestand().catch(error => toast(error.message, 'error'));
  if (params.get('customer')) await openCustomer(params.get('customer')); else render();
});
window.setInterval(() => refresh({ quiet: true }), 8000);
window.setInterval(updateCountdowns, 1000);
