/* One editable browser workspace for all drills. No frontend build step. */
const app = document.querySelector('#app');
const state = { dashboard: null, todos: [], ticket: null, view: 'inbox', selected: null,
  filter: 'all', verification: null, dialog: null, error: '', notice: '', busy: false, fetchedAt: Date.now() };

const html = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const lines = value => html(value).replaceAll('\n', '<br>');
const stage = () => state.dashboard?.workshop?.checkpoint?.drill ?? 8;
const has = capability => state.dashboard?.workshop?.checkpoint?.capabilities?.includes(capability);
const url = ticket => encodeURIComponent(ticket);
const date = value => value ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';
const statusNames = { new: 'Neu', in_progress: 'In Arbeit', awaiting_human: 'Wartet auf Freigabe',
  scheduled: 'Im Eingriffsfenster', sent: 'Gesendet', closed: 'Abgeschlossen' };
const productNames = { life: 'Leben', liability: 'Haftpflicht', unknown: 'Noch offen' };

async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Aktion fehlgeschlagen (${response.status})`);
  return body;
}

function visibleTickets() {
  const tickets = state.dashboard?.tickets || [];
  if (state.view === 'reviews') return tickets.filter(ticket => ticket.productLine === 'life' && ticket.status === 'awaiting_human');
  if (state.view === 'queue') return tickets.filter(ticket => ticket.status === 'scheduled');
  if (state.filter === 'mail') return tickets.filter(ticket => !ticket.isDemo);
  return tickets;
}

async function refresh({ quiet = false } = {}) {
  const draftInput = document.querySelector('#draft-body');
  const unsavedDraft = draftInput && draftInput.value !== (state.ticket?.draft?.body || '');
  if (state.busy || (quiet && (state.dialog || unsavedDraft || app.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)))) return;
  try {
    const [dashboard, todos] = await Promise.all([request('/api/dashboard'), request('/api/todos')]);
    state.dashboard = dashboard;
    state.todos = todos;
    state.fetchedAt = Date.now();
    const visible = visibleTickets();
    if (!visible.some(ticket => ticket.ticketNumber === state.selected)) state.selected = visible[0]?.ticketNumber || null;
    state.ticket = state.selected ? await request(`/api/tickets/${url(state.selected)}`) : null;
    state.error = '';
  } catch (error) { state.error = error.message; }
  render();
}

function badge(label, kind = '') { return `<span class="badge ${kind}">${html(label)}</span>`; }
function button(label, action, extra = '') { return `<button type="button" data-action="${action}" ${extra}>${label}</button>`; }
function actionButton(label, action, extra = '') { return `<button type="button" class="primary" data-action="${action}" ${extra}>${label}</button>`; }

function header() {
  const profile = state.dashboard.workshop.checkpoint;
  const mail = state.dashboard.workshop.agentMail;
  return `<header class="topbar"><div class="brand"><img src="/favicon.svg" alt="" width="32" height="32">
      <span>Pfefferminzia<small>Die Versicherungs-Werkstatt</small></span></div>
    <div class="topbar-right"><span class="checkpoint">Drill ${profile.drill} <span>·</span> ${html(profile.title)}</span>
      ${badge(mail.ready ? 'Inbox verbunden' : 'Inbox einrichten', mail.ready ? 'good' : 'attention')}</div></header>`;
}

function navigation() {
  const tickets = state.dashboard.tickets;
  const views = [ ['inbox', 'Eingang', tickets.length] ];
  if (has('life_review')) views.push(['reviews', 'Freigaben', tickets.filter(t => t.productLine === 'life' && t.status === 'awaiting_human').length]);
  if (has('intervention_queue') && stage() !== 12) views.push(['queue', 'Eingriffsfenster', tickets.filter(t => t.status === 'scheduled').length]);
  return `<nav class="tabs" aria-label="Arbeitsbereiche">${views.map(([key, label, count]) =>
    `<button type="button" data-view="${key}" class="${state.view === key ? 'active' : ''}" aria-current="${state.view === key ? 'page' : 'false'}">${label}<span>${count}</span></button>`).join('')}
    ${stage() === 12 ? '<a href="/slides/index.html?deck=management" target="_blank" rel="noopener">Management-Report ↗</a>' : ''}</nav>`;
}

function inboxBar() {
  if (state.view !== 'inbox') return '';
  const mail = state.dashboard.workshop.agentMail;
  const sync = state.dashboard.workshop.lastInboxSync;
  return `<div class="inbox-bar"><div><strong>${mail.inboxId ? html(mail.inboxId) : 'Noch keine persönliche Inbox'}</strong>
    <span>${mail.inboxId ? 'Testmail an diese Adresse senden. Danach hier synchronisieren.' : 'Bitte Claude, deine Workshop-Inbox einzurichten.'}</span>
    ${sync ? `<small>Letzter Abgleich ${date(sync.at)} · ${sync.importedTickets} neue Tickets${sync.status === 'error' ? ` · ${html(sync.error)}` : ''}</small>` : ''}</div>
    ${button('Synchronisieren', 'sync', mail.ready ? '' : 'disabled')}</div>`;
}

function ticketRow(ticket) {
  const active = ticket.ticketNumber === state.selected;
  const when = ticket.status === 'scheduled' ? `<span class="countdown" data-scheduled="${html(ticket.scheduledFor)}">Zeit wird berechnet</span>` : '';
  return `<button type="button" class="ticket-row ${active ? 'selected' : ''}" data-ticket="${html(ticket.ticketNumber)}" aria-current="${active ? 'true' : 'false'}">
    <span class="ticket-row-top"><span class="ticket-id">${html(ticket.ticketNumber)}</span>${badge(productNames[ticket.productLine] || ticket.productLine)}${ticket.isDemo ? '<span class="muted">Demo</span>' : '<span class="mail-source">Inbox</span>'}</span>
    <strong>${html(ticket.subject)}</strong><span class="ticket-row-bottom">${html(ticket.customerName || ticket.customerEmail || 'Unbekannt')}<span>${html(statusNames[ticket.status] || ticket.status)}</span></span>${when}</button>`;
}

function todoSection() {
  if (stage() !== 8 || state.view !== 'inbox') return '';
  const todos = state.todos;
  const inboxTickets = state.dashboard.tickets.filter(ticket => !ticket.isDemo);
  return `<section class="todo-section"><div class="section-head"><h3>Nächster Prüfschritt</h3><span>${todos.filter(todo => todo.status === 'open').length} offen</span></div>
    <p>Ein Todo ist nur sinnvoll, wenn es aus einem konkreten Ticket entsteht.</p>
    ${todos.map(todo => `<div class="todo-row"><span><strong class="${todo.status === 'completed' ? 'done' : ''}">${html(todo.title)}</strong><small>${html(todo.ticketNumber || '')}</small></span>
      ${button(todo.status === 'open' ? 'Erledigt' : 'Wieder öffnen', 'todo', `data-id="${todo.id}" data-status="${todo.status === 'open' ? 'completed' : 'open'}"`)}</div>`).join('')}
    ${inboxTickets.length ? `<form data-form="todo"><input name="title" aria-label="Konkreter nächster Prüfschritt" placeholder="Zum Beispiel: PF-123 · Anliegen prüfen" maxlength="300" required>
      <select name="ticketNumber" aria-label="Ticket auswählen" required><option value="">Ticket auswählen</option>${inboxTickets.map(t => `<option value="${html(t.ticketNumber)}">${html(t.ticketNumber)}</option>`).join('')}</select>
      <button type="submit">Todo anlegen</button></form>` : '<p class="todo-wait">Sende zuerst eine Testmail und öffne ihr Ticket. Dann kannst du hier einen passenden Prüfschritt festhalten.</p>'}</section>`;
}

function listPane() {
  const tickets = visibleTickets();
  const labels = { inbox: 'Eingang', reviews: 'Auf deine Entscheidung wartend', queue: 'Vor dem automatischen Versand' };
  const empty = state.view === 'inbox' ? (state.filter === 'mail' ? 'Noch keine importierte Mail. Sende eine Testmail an deine Inbox und synchronisiere.' : 'Noch keine Fälle. Beginne mit einer Testmail.')
    : state.view === 'reviews' ? 'Keine Lebensantwort wartet auf Freigabe. Bitte Claude, einen Entwurf zur Prüfung vorzulegen.'
      : 'Keine Antwort ist eingeplant. Bitte Claude, einen Haftpflichtfall für das Eingriffsfenster vorzubereiten.';
  return `<div class="list-pane"><div class="section-head"><h2>${labels[state.view]}</h2><span>${tickets.length} Fälle</span></div>
    ${inboxBar()}${state.view === 'inbox' ? `<div class="filters" aria-label="Eingang filtern">${button('Alle', 'filter-all', state.filter === 'all' ? 'class="selected"' : '')}${button('Meine Mails', 'filter-mail', state.filter === 'mail' ? 'class="selected"' : '')}</div>` : ''}
    <div class="ticket-list">${tickets.length ? tickets.map(ticketRow).join('') : `<p class="empty-state">${empty}</p>`}</div>
    ${state.view === 'queue' ? `<div class="queue-clock"><p>Der Timer gehört zum Workshop. Prüfe zuerst, was noch in der Queue liegt.</p>${actionButton('Workshop-Zeit +24 h', 'clock', state.dashboard.autoSendEnabled ? '' : 'disabled title="Auto-Versand ist in diesem Checkpoint aus"')}</div>` : ''}
    ${todoSection()}</div>`;
}

function mailText(ticket) {
  const inbound = (ticket.messages || []).filter(message => message.direction === 'inbound');
  return inbound.length ? inbound.map(message => `<article class="message"><div><strong>${html(message.sender)}</strong><small>${date(message.sentAt)}</small></div>
    <p>${lines(message.textBody || '(Kein Textkörper)')}</p></article>`).join('') : '<p class="empty-state">Noch keine eingehende Nachricht.</p>';
}

function context(ticket) {
  const contracts = ticket.linkedContracts || [];
  if (!has('knowledge')) return '';
  return `<div class="context"><span>Vertrag & Tarifgeneration</span>${contracts.length ? contracts.map(contract =>
    `<strong>${html(contract.contractId)} · ${html(contract.tariffGenerationId)}</strong>`).join('') : '<strong>Noch nicht zugeordnet – mit Claude und MCP prüfen.</strong>'}</div>`;
}

function draftArea(ticket) {
  if (!has('draft') || ['sent', 'closed'].includes(ticket.status)) return '';
  const draft = ticket.draft;
  const life = ticket.productLine === 'life';
  const liability = ticket.productLine === 'liability';
  let next = '';
  if (life && has('life_review')) {
    next = ticket.status === 'awaiting_human'
      ? `<div class="decision-bar"><div><strong>${ticket.humanApprovedAt ? 'Freigegeben – Versand bleibt ein eigener Schritt' : 'Deine Entscheidung ist erforderlich'}</strong><span>${ticket.isDemo ? 'Demo-Fall: Freigabe/Ablehnung üben, kein echter Versand.' : 'Ohne aktuelle Freigabe verlässt nichts den Fall.'}</span></div>
        ${ticket.humanApprovedAt ? actionButton('Antwort senden', 'send', ticket.isDemo ? 'disabled' : '') : `${button('Ablehnen', 'reject')}${actionButton('Freigeben', 'approve')}`}</div>`
      : draft ? actionButton('Zur Freigabe vorlegen', 'submit') : '';
  } else if (life && draft) next = actionButton('Antwort bewusst senden', 'send', ticket.isDemo ? 'disabled' : '');
  else if (liability && stage() === 11 && draft && ticket.status !== 'scheduled') next = actionButton('Für 24 h einplanen', 'schedule');
  if (ticket.status === 'scheduled') next = `<div class="decision-bar"><div><strong>Im Eingriffsfenster</strong><span>Bearbeiten entwertet die Planung. Stoppen nimmt die Antwort aus der Queue.</span></div>${button('Aus Queue nehmen', 'remove')}</div>`;
  return `<section class="draft-section"><div class="section-head"><h3>Antwortentwurf</h3>${draft ? badge(draft.status || 'Entwurf') : ''}</div>
    <p class="section-help">${draft ? 'Lies den genauen Text und die Quelle, bevor du handelst.' : 'Bitte Claude um einen belegten Entwurf – oder schreibe einen eigenen.'}</p>
    <form data-form="draft"><label for="draft-body">Text an ${html(ticket.customerEmail || 'Empfänger')}</label>
      <textarea id="draft-body" name="body" rows="${['awaiting_human', 'scheduled'].includes(ticket.status) ? 6 : 9}" placeholder="Noch kein Entwurf…" required>${html(draft?.body || '')}</textarea>
      <div class="draft-footer"><span>${draft?.rationale ? `Begründung: ${html(draft.rationale)}` : 'Fundstellen mit Claude und MCP prüfen.'}</span><button type="submit">Entwurf speichern</button></div></form>
    ${next ? `<div class="next-action">${next}</div>` : ''}</section>`;
}

function classification(ticket) {
  if (!has('draft') || ticket.status === 'sent') return '';
  const options = stage() >= 11 ? ['life', 'liability'] : ['life'];
  return `<details class="subtle-details"><summary>Sparte prüfen oder ändern</summary><form data-form="classify"><label for="product-line">Welcher Pfad passt?</label>
    <select id="product-line" name="productLine">${options.map(value => `<option value="${value}" ${ticket.productLine === value ? 'selected' : ''}>${productNames[value]}</option>`).join('')}</select>
    <button type="submit">Zuordnen</button></form><p>Kundentext ist eine Behauptung. Quelle und Kontrollregel separat prüfen.</p></details>`;
}

function detailPane() {
  const ticket = state.ticket;
  if (!ticket) return `<div class="detail-pane empty-detail"><span>↖</span><h2>Wähle einen Fall</h2><p>Eine Mail, ein Ticket, ein nächster Schritt.</p></div>`;
  const actionFocus = (state.view === 'reviews' && ticket.status === 'awaiting_human') ||
    (state.view === 'queue' && ticket.status === 'scheduled');
  const message = `<section class="message-section"><div class="section-head"><h3>Nachricht</h3><span>${ticket.messages?.length || 0}</span></div>${mailText(ticket)}</section>`;
  return `<article class="detail-pane"><div class="detail-top"><span>${html(ticket.ticketNumber)} · ${html(productNames[ticket.productLine] || ticket.productLine)}</span>
    ${badge(statusNames[ticket.status] || ticket.status, ticket.status === 'awaiting_human' ? 'attention' : ticket.status === 'sent' ? 'good' : '')}</div>
    <h2>${html(ticket.subject)}</h2><p class="detail-subtitle">${ticket.isDemo ? 'Vorbereiteter Demo-Fall · kein echter Versand' : `Eingang von ${html(ticket.customerEmail || 'unbekannt')}`} · ${date(ticket.lastMessageAt)}</p>
    ${context(ticket)}${actionFocus ? `${draftArea(ticket)}<details class="source-details"><summary>Originalnachricht und Kontext prüfen</summary>${message}</details>` : `${message}${classification(ticket)}${draftArea(ticket)}`}
    <details class="audit"><summary>Verlauf & Belege <span>${ticket.events?.length || 0}</span></summary><ol>${(ticket.events || []).map(event =>
      `<li><strong>${html(event.type)}</strong><span>${date(event.createdAt)} · ${html(event.actor)}</span></li>`).join('')}</ol></details></article>`;
}

function guide() {
  const workshop = state.dashboard.workshop;
  const brief = workshop.drillBrief;
  const profile = workshop.checkpoint;
  const first = brief.dialogueSteps?.[0];
  return `<aside class="guide"><div class="guide-label">Dein Drill · ${profile.drill}</div><h2>${html(profile.title)}</h2>
    <p>${html(brief.learningObjective)}</p><div class="guide-block"><span>Fertig, wenn</span><strong>${html(brief.doneWhen)}</strong></div>
    <div class="guide-block"><span>Selbst bauen</span><strong>${html(brief.buildTaskShort || brief.buildTask)}</strong></div>
    <details><summary>Bauauftrag im Detail</summary><p>${html(brief.buildTask)}</p></details>
    <details><summary>Mit Claude starten</summary><p>„${html(first?.askClaude || 'Was ist mein nächster Schritt?')}“</p>
      <small>Claude soll dich führen, nicht den ganzen Drill in einem Zug erledigen.</small></details>
    <details><summary>Alle Etappen & Prüfung</summary><ol>${(brief.dialogueSteps || []).map(step =>
      `<li><strong>${html(step.phase)}</strong><p>„${html(step.askClaude)}“</p><small>${html(step.yourMove)}</small></li>`).join('')}</ol>
      ${button('Lokal prüfen', 'verify')}${button('Inbox-Verbindung prüfen', 'verify-external')}
      ${state.verification ? `<p>${state.verification.ok ? 'Startbereitschaft geprüft.' : `Noch offen: ${html(state.verification.nextAction)}`}</p>` : ''}</details>
    <a class="guide-link" href="/slides/decks.html" target="_blank" rel="noopener">Folien & Drill-Karten ↗</a></aside>`;
}

function dialogMarkup() {
  const dialog = state.dialog;
  if (!dialog) return '';
  const ticket = state.ticket;
  const descriptions = {
    send: ['Antwort versenden?', 'Dieser genaue Text geht an die angezeigte Adresse. Das ist eine externe Wirkung.'],
    reject: ['Freigabe ablehnen', 'Nenne den Grund. Der Entwurf geht zurück in Bearbeitung.'],
    remove: ['Aus Queue nehmen?', 'Diese Antwort wird nicht automatisch versendet. Nenne den Grund.'],
    schedule: ['Automatisch nach 24 Stunden?', 'Nach dem sichtbaren Eingriffsfenster kann die Antwort ohne weitere Freigabe versendet werden.'],
    clock: ['Workshop-Zeit vorspulen?', 'Fällige Antworten können dadurch wirklich an erlaubte Workshop-Adressen versendet werden.'],
  };
  const [title, copy] = descriptions[dialog] || ['Bestätigen?', ''];
  const reason = ['reject', 'remove'].includes(dialog);
  return `<div class="dialog-backdrop"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
    <form data-form="confirm"><span class="dialog-eyebrow">Bewusster Eingriff</span><h2 id="dialog-title">${title}</h2><p>${copy}</p>
    ${ticket && dialog !== 'clock' ? `<div class="dialog-preview"><strong>${html(ticket.ticketNumber)} → ${html(ticket.customerEmail || 'kein Empfänger')}</strong><p>${lines(ticket.draft?.body || 'Kein Entwurf')}</p></div>` : ''}
    ${reason ? '<label for="reason">Begründung</label><textarea id="reason" name="reason" rows="3" maxlength="2000" required></textarea>' : ''}
    <div class="dialog-actions">${button('Zurück', 'cancel')}<button type="submit" class="${dialog === 'send' || dialog === 'clock' ? 'danger' : 'primary'}">${dialog === 'send' ? 'Jetzt senden' : dialog === 'clock' ? 'Zeit vorspulen' : 'Bestätigen'}</button></div>
    </form></div></div>`;
}

function render() {
  if (!state.dashboard) { app.innerHTML = `<main class="loading">${state.error ? html(state.error) : 'Pfefferminzia wird geladen…'}</main>`; return; }
  const profile = state.dashboard.workshop.checkpoint;
  app.innerHTML = `${header()}<main class="page"><div class="page-intro"><div><span class="overline">WORKSHOP · ${html(profile.name)}</span>
    <h1>Ein Fall. Ein nächster Schritt.</h1><p>Arbeite im Cockpit. Baue mit Claude am Code. Prüfe die Wirkung hier und im MCP.</p></div>
    <a href="/slides/index.html?deck=drill-${String(profile.drill).padStart(2, '0')}" target="_blank" rel="noopener">Drill-Folien ↗</a></div>
    ${navigation()}${state.error ? `<p class="alert" role="alert">${html(state.error)}</p>` : ''}${state.notice ? `<p class="notice" role="status">${html(state.notice)}</p>` : ''}
    <div class="workspace">${listPane()}${detailPane()}${guide()}</div></main>${dialogMarkup()}`;
  updateCountdowns();
  if (state.dialog) document.querySelector('.dialog [name="reason"]')?.focus();
}

function updateCountdowns() {
  const base = Date.parse(state.dashboard?.workshop?.clock?.now || new Date().toISOString());
  const now = base + Date.now() - state.fetchedAt;
  document.querySelectorAll('[data-scheduled]').forEach(node => {
    const seconds = Math.max(0, Math.floor((Date.parse(node.dataset.scheduled) - now) / 1000));
    const hours = Math.floor(seconds / 3600);
    node.textContent = seconds ? `Noch ${hours} h ${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')} min` : 'Jetzt fällig';
  });
}

async function mutate(work, notice) {
  if (state.busy) return;
  state.busy = true;
  state.error = '';
  state.dialog = null;
  let actionError = '';
  try { await work(); state.notice = notice || ''; }
  catch (error) { actionError = error.message; state.notice = ''; }
  finally {
    state.busy = false;
    await refresh();
    if (actionError) { state.error = actionError; render(); }
  }
}

async function selectTicket(number) {
  state.selected = number;
  state.ticket = null;
  try { state.ticket = await request(`/api/tickets/${url(number)}`); state.error = ''; }
  catch (error) { state.error = error.message; }
  render();
}

app.addEventListener('click', async event => {
  if (event.target.classList.contains('dialog-backdrop')) { state.dialog = null; render(); return; }
  const view = event.target.closest('[data-view]');
  if (view) { state.view = view.dataset.view; state.selected = null; await refresh(); return; }
  const row = event.target.closest('[data-ticket]');
  if (row) { await selectTicket(row.dataset.ticket); return; }
  const control = event.target.closest('[data-action]');
  if (!control || control.disabled) return;
  const action = control.dataset.action;
  const ticket = state.ticket?.ticketNumber;
  const draftInput = document.querySelector('#draft-body');
  if (draftInput && ['send', 'approve', 'submit', 'schedule'].includes(action) &&
      draftInput.value !== (state.ticket?.draft?.body || '')) {
    state.error = 'Du hast ungespeicherte Änderungen. Speichere den Entwurf und prüfe die Wirkung erneut.';
    document.querySelector('.alert')?.remove();
    const alert = document.createElement('p');
    alert.className = 'alert';
    alert.setAttribute('role', 'alert');
    alert.textContent = state.error;
    document.querySelector('.tabs').after(alert);
    draftInput.focus();
    return;
  }
  if (action === 'filter-all' || action === 'filter-mail') { state.filter = action.slice(7); state.selected = null; await refresh(); return; }
  if (action === 'cancel') { state.dialog = null; render(); return; }
  if (['send', 'reject', 'remove', 'schedule', 'clock'].includes(action)) { state.dialog = action; render(); return; }
  if (action === 'sync') return mutate(() => request('/api/sync', { method: 'POST', body: '{}' }), 'Inbox synchronisiert.');
  if (action === 'todo') return mutate(() => request(`/api/todos/${control.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ status: control.dataset.status }) }), 'Todo aktualisiert.');
  if (action === 'submit') return mutate(() => request(`/api/tickets/${url(ticket)}/submit`, { method: 'POST', body: '{}' }), 'Zur menschlichen Freigabe vorgelegt.');
  if (action === 'approve') return mutate(() => request(`/api/tickets/${url(ticket)}/approve`, { method: 'POST', body: '{}' }), 'Freigegeben. Der Versand bleibt ein eigener Schritt.');
  if (action === 'verify') return mutate(async () => { state.verification = await request('/api/workshop/verify'); }, 'Startbereitschaft geprüft.');
  if (action === 'verify-external') { if (window.confirm('Darf die konfigurierte AgentMail-Inbox jetzt extern geprüft werden?'))
    return mutate(async () => { state.verification = await request('/api/workshop/verify?external=true'); }, 'Inbox geprüft.'); }
});

app.addEventListener('submit', event => {
  const form = event.target.closest('[data-form]');
  if (!form) return;
  event.preventDefault();
  const values = new FormData(form);
  const ticket = state.ticket?.ticketNumber;
  if (form.dataset.form === 'todo') return mutate(() => request('/api/todos', { method: 'POST',
    body: JSON.stringify({ title: values.get('title'), ticketNumber: values.get('ticketNumber') || null }) }), 'Todo angelegt.');
  if (form.dataset.form === 'draft') return mutate(() => request(`/api/tickets/${url(ticket)}/draft`, { method: 'PUT',
    body: JSON.stringify({ body: values.get('body') }) }), 'Entwurf gespeichert.');
  if (form.dataset.form === 'classify') {
    const productLine = values.get('productLine');
    const path = stage() >= 11 ? 'route' : 'classify';
    const payload = stage() >= 11
      ? { route: productLine === 'life' ? 'life_mandatory_review' : 'liability_intervention_window', category: state.ticket.category === 'unknown' ? 'general_question' : state.ticket.category, summary: state.ticket.summary || state.ticket.subject, confidence: 1 }
      : { productLine, category: state.ticket.category === 'unknown' ? 'general_question' : state.ticket.category, summary: state.ticket.summary || state.ticket.subject };
    return mutate(() => request(`/api/tickets/${url(ticket)}/${path}`, { method: 'POST', body: JSON.stringify(payload) }), 'Sparte zugeordnet.');
  }
  if (form.dataset.form === 'confirm') {
    const action = state.dialog;
    const reason = String(values.get('reason') || '');
    if (action === 'send') return mutate(() => request(`/api/tickets/${url(ticket)}/send`, { method: 'POST', body: '{}' }), 'Antwort versendet.');
    if (action === 'reject') return mutate(() => request(`/api/tickets/${url(ticket)}/reject`, { method: 'POST', body: JSON.stringify({ note: reason }) }), 'Freigabe abgelehnt.');
    if (action === 'remove') return mutate(() => request(`/api/tickets/${url(ticket)}/schedule`, { method: 'DELETE', body: JSON.stringify({ reason }) }), 'Aus der Queue genommen.');
    if (action === 'schedule') return mutate(() => request(`/api/tickets/${url(ticket)}/submit`, { method: 'POST', body: JSON.stringify({ delayHours: 24 }) }), 'Für das Eingriffsfenster eingeplant.');
    if (action === 'clock') return mutate(() => request('/api/workshop/clock/advance', { method: 'POST', body: JSON.stringify({ hours: 24, confirmAdvance: true }) }), 'Workshop-Zeit vorgespult. Audit prüfen.');
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && state.dialog) { state.dialog = null; render(); }
});

refresh();
window.setInterval(() => refresh({ quiet: true }), 10000);
window.setInterval(updateCountdowns, 1000);
