const workshopState = {
  dashboard: null,
  todos: [],
  verification: null,
  error: null,
  fetchedAt: Date.now(),
};

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function hasCapability(name) {
  return workshopState.dashboard?.workshop?.checkpoint?.capabilities?.includes(name);
}

function checkpointName() {
  return workshopState.dashboard?.workshop?.checkpoint?.name || "loading";
}

function applyStageVisibility() {
  const name = checkpointName();
  [...document.body.classList]
    .filter((item) => item.startsWith("checkpoint-"))
    .forEach((item) => document.body.classList.remove(item));
  document.body.classList.add(`checkpoint-${name}`);

  const order = workshopState.dashboard?.workshop?.checkpoint?.order || 12;
  document.documentElement.dataset.stage = String(order);
  document.querySelectorAll(".sidebar nav button").forEach((button) => {
    const label = button.textContent || "";
    const hidden =
      (order < 9 && (label.includes("Kunden 360") || label.includes("Tarife"))) ||
      (order < 10 && (label.includes("Schäden") || label.includes("Prüfung"))) ||
      (order < 11 && label.includes("Geplant"));
    button.style.display = hidden ? "none" : "";
  });
  document.querySelectorAll("button").forEach((button) => {
    if (button.closest(".workshop-panel")) return;
    const label = (button.textContent || "").trim();
    if (order < 10 && label.includes("Prüfung anfordern")) button.style.display = "none";
    if (order < 10 && (label === "Prüfung" || label === "Geplant")) button.style.display = "none";
    if (order < 11 && label === "Haftpflicht") button.style.display = "none";
    if (order < 11 && (label.includes("In 24h einplanen") || label.includes("Jetzt senden"))) {
      button.style.display = "none";
    }
  });
  const brandMark = document.querySelector(".sidebar .brand .brand-mark");
  if (brandMark && !brandMark.querySelector("img")) {
    brandMark.innerHTML = '<img src="/favicon.svg" alt="" width="30" height="30">';
  }
}

async function refresh(render = true) {
  try {
    const [dashboard, todos] = await Promise.all([
      request("/api/dashboard"),
      request("/api/todos").catch(() => []),
    ]);
    workshopState.dashboard = dashboard;
    workshopState.todos = todos;
    workshopState.fetchedAt = Date.now();
    workshopState.error = null;
  } catch (error) {
    workshopState.error = error.message;
  }
  applyStageVisibility();
  renderRibbon();
  const panel = document.querySelector(".workshop-panel");
  if (render && (!panel?.contains(document.activeElement) || render === "force")) renderPanel();
}

function renderRibbon() {
  let ribbon = document.querySelector(".workshop-ribbon");
  if (!ribbon) {
    ribbon = document.createElement("div");
    ribbon.className = "workshop-ribbon";
    document.body.append(ribbon);
  }
  const profile = workshopState.dashboard?.workshop?.checkpoint;
  ribbon.innerHTML = `<img src="/favicon.svg" alt="" width="20" height="20">${escapeHtml(profile ? `Drill ${profile.drill} · ${profile.title}` : "Workshop wird geladen…")}`;
}

function taskMarkup(todo) {
  return `<div class="workshop-todo ${escapeHtml(todo.status)}">
    <div><strong>${escapeHtml(todo.title)}</strong><small>${escapeHtml(todo.ticketNumber || todo.kind)}</small></div>
    <button class="action" data-action="todo" data-id="${todo.id}" data-status="${todo.status === "open" ? "completed" : "open"}">
      ${todo.status === "open" ? "Erledigt" : "Öffnen"}
    </button>
  </div>`;
}

function queueMarkup(ticket) {
  return `<div class="workshop-queue-item">
    <div><strong>${escapeHtml(ticket.ticketNumber)} · ${escapeHtml(ticket.subject)}</strong>
      <small>${escapeHtml(ticket.customerName || ticket.customerEmail)}</small>
      <span class="workshop-countdown" data-scheduled="${escapeHtml(ticket.scheduledFor)}">berechnet…</span>
    </div>
    <div class="workshop-actions"><button class="action" data-action="open-ticket" data-ticket="${escapeHtml(ticket.ticketNumber)}">Bearbeiten</button><button class="action danger" data-action="remove-queue" data-ticket="${escapeHtml(ticket.ticketNumber)}">Stoppen</button></div>
  </div>`;
}

function reviewMarkup(ticket) {
  return `<div class="workshop-queue-item">
    <div><strong>${escapeHtml(ticket.ticketNumber)} · ${escapeHtml(ticket.subject)}</strong>
      <small>${ticket.isDemo ? "Demo: kein echter Versand" : "Externe Wirkung bleibt bis zur Freigabe blockiert"}</small>
    </div>
    <div class="workshop-actions">
      <button class="action danger" data-action="reject" data-ticket="${escapeHtml(ticket.ticketNumber)}">Ablehnen</button>
      ${ticket.humanApprovedAt ? '<span class="workshop-approved">Freigegeben</span>' : `<button class="action" data-action="approve" data-ticket="${escapeHtml(ticket.ticketNumber)}">Freigeben</button>`}
      <button class="action" data-action="send" data-ticket="${escapeHtml(ticket.ticketNumber)}" ${ticket.isDemo || !ticket.humanApprovedAt ? "disabled" : ""}>Senden</button>
    </div>
  </div>`;
}

function manualOutboxMarkup(ticket) {
  return `<div class="workshop-queue-item">
    <div><strong>${escapeHtml(ticket.ticketNumber)} · ${escapeHtml(ticket.subject)}</strong>
      <small>${ticket.isDemo ? "Demo bleibt lokal" : "Entwurf vom Menschen prüfen und bewusst versenden"}</small>
    </div>
    <button class="action" data-action="send" data-ticket="${escapeHtml(ticket.ticketNumber)}" ${ticket.isDemo ? "disabled" : ""}>Manuell senden</button>
  </div>`;
}

function verificationMarkup() {
  if (!workshopState.verification) return "";
  return `<div class="workshop-verify-results">${workshopState.verification.checks
    .map((item) => `<div class="workshop-check ${item.passed ? "" : "failed"}">${escapeHtml(item.detail)}</div>`)
    .join("")}</div>`;
}

function renderPanel() {
  const panel = document.querySelector(".workshop-panel");
  if (!panel || !workshopState.dashboard) return;
  const workshop = workshopState.dashboard.workshop;
  const profile = workshop.checkpoint;
  const openTodos = workshopState.todos.filter((todo) => todo.status === "open");
  const scheduled = workshopState.dashboard.tickets.filter((ticket) => ticket.status === "scheduled");
  const reviews = workshopState.dashboard.tickets.filter((ticket) => ticket.status === "awaiting_human" && ticket.productLine === "life");
  const manualOutbox = workshopState.dashboard.tickets.filter((ticket) => ticket.hasDraft && ticket.productLine === "life" && !["sent", "closed", "awaiting_human"].includes(ticket.status));
  panel.innerHTML = `<header>
      <p class="eyebrow">${escapeHtml(profile.name)}</p>
      <h2>Drill ${profile.drill} · ${escapeHtml(profile.title)}</h2>
      <p>${escapeHtml(profile.goal)}</p>
      <button data-action="close" aria-label="Workshop-Cockpit schließen">×</button>
    </header>
    <div class="workshop-body">
      <div class="workshop-status">
        <span>AgentMail<strong class="${workshop.agentMail.ready ? "ok" : "warn"}">${workshop.agentMail.ready ? "konfiguriert" : "Setup fehlt"}</strong></span>
        <span>Auto-Versand<strong class="${workshopState.dashboard.autoSendEnabled ? "ok" : "warn"}">${workshopState.dashboard.autoSendEnabled ? "aktiv" : "deaktiviert"}</strong></span>
      </div>
      <section class="workshop-card"><h3>Erfolgskriterien</h3><ol>${profile.successCriteria.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></section>
      <section class="workshop-card"><h3>Todos <small>${openTodos.length} offen</small></h3>
        ${workshopState.todos.length ? workshopState.todos.map(taskMarkup).join("") : '<p class="empty">Noch keine Todos. Lege das erste mit Claude oder hier an.</p>'}
        <form class="workshop-todo-form"><input name="title" maxlength="300" placeholder="Neues Workshop-Todo…" required><button>Anlegen</button></form>
      </section>
      ${hasCapability("manual_send") && !hasCapability("life_review") ? `<section class="workshop-card"><h3>Menschlicher Postausgang</h3>${manualOutbox.length ? manualOutbox.map(manualOutboxMarkup).join("") : '<p class="empty">Noch kein versandbereiter Lebensentwurf.</p>'}</section>` : ""}
      ${hasCapability("life_review") ? `<section class="workshop-card"><h3>Verpflichtende Freigabe <small>${reviews.length}</small></h3>${reviews.length ? reviews.map(reviewMarkup).join("") : '<p class="empty">Keine Lebensantwort wartet auf Prüfung.</p>'}</section>` : ""}
      ${hasCapability("intervention_queue") ? `<section class="workshop-card"><h3>Eingriffsfenster <small>${scheduled.length}</small></h3>${scheduled.length ? scheduled.map(queueMarkup).join("") : '<p class="empty">Keine Haftpflichtantwort ist eingeplant.</p>'}
        <div class="workshop-actions"><button class="action" data-action="advance-clock">Workshop-Zeit +24h</button></div>
      </section>` : ""}
      <section class="workshop-card"><h3>Startbereitschaft prüfen</h3><p class="empty">Prüft den Startzustand, nicht den Abschluss des Drills. Der externe Inbox-Test liest erst nach gesonderter Bestätigung.</p>
        <div class="workshop-actions"><button class="action" data-action="verify">Lokal prüfen</button><button class="action" data-action="verify-external">Inbox prüfen</button></div>
        ${verificationMarkup()}${workshopState.error ? `<p class="workshop-error" role="alert">${escapeHtml(workshopState.error)}</p>` : ""}
      </section>
    </div>`;
  updateCountdowns();
}

function updateCountdowns() {
  const serverNow = Date.parse(workshopState.dashboard?.workshop?.clock?.now || new Date().toISOString());
  const now = serverNow + (Date.now() - workshopState.fetchedAt);
  document.querySelectorAll("[data-scheduled]").forEach((node) => {
    const seconds = Math.max(0, Math.floor((Date.parse(node.dataset.scheduled) - now) / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    node.textContent = seconds ? `${hours}h ${String(minutes).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s` : "fällig";
  });
}

async function perform(action) {
  workshopState.error = null;
  try {
    await action();
  } catch (error) {
    workshopState.error = error.message;
  }
  await refresh("force");
}

function install() {
  const launcher = document.createElement("button");
  launcher.className = "workshop-launcher";
  launcher.innerHTML = '<img src="/favicon.svg" alt="" width="19" height="19"> Workshop-Cockpit';
  launcher.setAttribute("aria-controls", "workshop-panel");
  launcher.setAttribute("aria-expanded", "false");
  const panel = document.createElement("aside");
  panel.id = "workshop-panel";
  panel.className = "workshop-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Workshop-Cockpit");
  panel.tabIndex = -1;
  panel.inert = true;
  document.body.append(launcher, panel);
  const openPanel = () => {
    panel.inert = false;
    panel.classList.add("open");
    launcher.setAttribute("aria-expanded", "true");
    (panel.querySelector("header button") || panel).focus();
  };
  const closePanel = () => {
    panel.classList.remove("open");
    panel.inert = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  };
  launcher.addEventListener("click", openPanel);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("open")) closePanel();
  });

  panel.addEventListener("submit", (event) => {
    if (!event.target.matches(".workshop-todo-form")) return;
    event.preventDefault();
    const title = new FormData(event.target).get("title");
    perform(() => request("/api/todos", { method: "POST", body: JSON.stringify({ title }) }));
  });

  panel.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const ticket = button.dataset.ticket;
    const actions = {
      close: closePanel,
      todo: () => perform(() => request(`/api/todos/${button.dataset.id}`, { method: "PATCH", body: JSON.stringify({ status: button.dataset.status }) })),
      approve: () => perform(() => request(`/api/tickets/${ticket}/approve`, { method: "POST", body: "{}" })),
      reject: () => {
        const note = window.prompt("Warum wird der Entwurf abgelehnt?");
        if (note) perform(() => request(`/api/tickets/${ticket}/reject`, { method: "POST", body: JSON.stringify({ note }) }));
      },
      send: () => {
        if (window.confirm("Diesen exakten Entwurf jetzt als Mensch freigeben und extern versenden?")) {
          perform(() => request(`/api/tickets/${ticket}/send`, { method: "POST", body: "{}" }));
        }
      },
      "remove-queue": () => {
        const reason = window.prompt("Warum wird die Antwort aus der Queue genommen?");
        if (reason) perform(() => request(`/api/tickets/${ticket}/schedule`, { method: "DELETE", body: JSON.stringify({ reason }) }));
      },
      "open-ticket": () => {
        const row = [...document.querySelectorAll("button.ticket-row")]
          .find((candidate) => candidate.querySelector(".ticket-id")?.textContent?.trim() === ticket);
        if (!row) {
          workshopState.error = `Ticket ${ticket} ist in der aktuellen Liste nicht sichtbar. Öffne die Eingangsübersicht.`;
          renderPanel();
          return;
        }
        closePanel();
        row.click();
      },
      "advance-clock": () => {
        if (window.confirm("Die lokale Workshop-Uhr um 24 Stunden vorspulen und fällige Antworten verarbeiten?")) {
          perform(() => request("/api/workshop/clock/advance", { method: "POST", body: JSON.stringify({ hours: 24, confirmAdvance: true }) }));
        }
      },
      verify: () => perform(async () => { workshopState.verification = await request("/api/workshop/verify"); }),
      "verify-external": () => {
        if (window.confirm("Darf Pfefferminzia die konfigurierte AgentMail-Inbox jetzt erreichen und lesen?")) {
          perform(async () => { workshopState.verification = await request("/api/workshop/verify?external=true"); });
        }
      },
    };
    actions[button.dataset.action]?.();
  });

  const observer = new MutationObserver(() => applyStageVisibility());
  observer.observe(document.getElementById("root"), { childList: true, subtree: true });
  refresh();
  window.setInterval(() => refresh(panel.classList.contains("open")), 5000);
  window.setInterval(updateCountdowns, 1000);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
else install();
