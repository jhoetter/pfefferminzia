import {
  AlertTriangle, Archive, Bot, Check, CheckCircle2, ChevronRight, Clock3, FileText,
  HeartPulse, Inbox, Mail, Menu, Paperclip, RefreshCw, Search, Send, Shield,
  SlidersHorizontal, Sparkles, UserCheck, UserRound, X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { api } from "./api";
import { categoryLabel, dateTime, fileSize, priorityLabel, productLabel, relativeTime, statusLabel } from "./labels";
import {
  categories, priorities, productLines, type DashboardData, type ProductLine,
  type TariffDocument, type Ticket, type TicketCategory, type TicketDetail,
  type TicketPriority, type TicketStatus,
} from "./types";

type QueueKey = "active" | TicketStatus;
const queueItems: { key: QueueKey; label: string; icon: typeof Inbox }[] = [
  { key: "active", label: "Alle offenen", icon: Inbox },
  { key: "new", label: "Eingang", icon: Mail },
  { key: "in_progress", label: "In Bearbeitung", icon: SlidersHorizontal },
  { key: "awaiting_human", label: "Prüfung", icon: UserCheck },
  { key: "scheduled", label: "Geplant", icon: Clock3 },
  { key: "sent", label: "Gesendet", icon: Send },
  { key: "closed", label: "Archiv", icon: Archive },
];
const statusOrder: TicketStatus[] = ["new", "in_progress", "awaiting_human", "scheduled", "sent", "closed"];

function BrandMark() { return <span className="brand-mark" aria-hidden="true"><span /></span>; }
function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) { return <span className={`badge badge-${tone}`}>{children}</span>; }
function productTone(product: ProductLine) { return product === "liability" ? "liability" : product === "life" ? "life" : "neutral"; }
function statusTone(status: TicketStatus) {
  if (status === "new") return "new";
  if (status === "awaiting_human") return "review";
  if (status === "scheduled") return "scheduled";
  if (status === "sent" || status === "closed") return "success";
  return "progress";
}
const emptyCounts = (): DashboardData["counts"] => ({ new: 0, in_progress: 0, awaiting_human: 0, scheduled: 0, sent: 0, closed: 0 });

export default function App() {
  const [dashboard, setDashboard] = useState<DashboardData>({ tickets: [], counts: emptyCounts(), connectedInbox: null, lastSyncAt: null, autoSendEnabled: false });
  const [queue, setQueue] = useState<QueueKey>("active");
  const [product, setProduct] = useState<ProductLine | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [selected, setSelected] = useState<TicketDetail | null>(null);
  const [view, setView] = useState<"tickets" | "tariffs">("tickets");
  const [tariffs, setTariffs] = useState<TariffDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const data = await api.dashboard();
    setDashboard(data);
    if (selectedNumber) setSelected(await api.ticket(selectedNumber));
  };

  useEffect(() => {
    Promise.all([api.dashboard(), api.tariffs()])
      .then(([data, docs]) => { setDashboard(data); setTariffs(docs); })
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      void api.dashboard().then(setDashboard).catch(() => undefined);
    }, 10_000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  useEffect(() => {
    if (!selectedNumber) { setSelected(null); return; }
    api.ticket(selectedNumber).then(setSelected).catch((cause: Error) => setError(cause.message));
  }, [selectedNumber]);

  const filtered = useMemo(() => dashboard.tickets.filter((ticket) => {
    const queueMatch = queue === "active" ? !["sent", "closed"].includes(ticket.status) : ticket.status === queue;
    const productMatch = product === "all" || ticket.productLine === product;
    const needle = search.trim().toLowerCase();
    const searchMatch = !needle || [ticket.ticketNumber, ticket.subject, ticket.customerName, ticket.customerEmail, ticket.summary]
      .filter(Boolean).join(" ").toLowerCase().includes(needle);
    return queueMatch && productMatch && searchMatch;
  }), [dashboard.tickets, product, queue, search]);
  const groups = useMemo(() => statusOrder
    .map((status) => ({ status, tickets: filtered.filter((ticket) => ticket.status === status) }))
    .filter((group) => group.tickets.length), [filtered]);

  const sync = async () => {
    setSyncing(true); setError(null);
    try {
      const result = await api.sync();
      await refresh();
      setNotice(`${result.importedTickets} neue Tickets · ${result.importedMessages} Nachrichten gespiegelt`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setSyncing(false); }
  };
  const updateSelected = async (operation: () => Promise<TicketDetail>, message?: string) => {
    setError(null);
    try {
      const ticket = await operation();
      setSelected(ticket);
      setDashboard(await api.dashboard());
      if (message) setNotice(message);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  const navigate = (next: "tickets" | "tariffs", nextQueue?: QueueKey) => {
    setView(next); if (nextQueue) setQueue(nextQueue); setSidebarOpen(false);
  };
  const activeCount = dashboard.counts.new + dashboard.counts.in_progress + dashboard.counts.awaiting_human + dashboard.counts.scheduled;

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><BrandMark /><span>pfefferminzia</span><button className="mobile-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button></div>
      <div className="workspace-switch"><div className="workspace-icon">PF</div><div><strong>Kundenservice</strong><small>Versicherungspost</small></div><ChevronRight size={15} /></div>
      <nav aria-label="Ticket-Warteschlangen">
        <div className="nav-heading">Arbeitskorb</div>
        {queueItems.map((item) => {
          const Icon = item.icon;
          const count = item.key === "active" ? activeCount : dashboard.counts[item.key];
          return <button key={item.key} className={view === "tickets" && queue === item.key ? "active" : ""} onClick={() => navigate("tickets", item.key)}>
            <Icon size={16} /><span>{item.label}</span><em>{count}</em>
          </button>;
        })}
        <div className="nav-heading nav-heading-spaced">Wissen</div>
        <button className={view === "tariffs" ? "active" : ""} onClick={() => navigate("tariffs")}><FileText size={16} /><span>Tarife</span><em>{tariffs.length}</em></button>
      </nav>
      <div className="sidebar-footer"><div className={`connection-dot ${dashboard.connectedInbox ? "online" : ""}`} /><div><strong>{dashboard.connectedInbox || "AgentMail bereit"}</strong><small>{dashboard.lastSyncAt ? `Sync ${relativeTime(dashboard.lastSyncAt)}` : "Noch nicht synchronisiert"}</small></div></div>
    </aside>
    {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Navigation schließen" />}

    <main>
      <header className="topbar">
        <button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Navigation öffnen"><Menu size={19} /></button>
        <div className="breadcrumbs"><span>Kundenservice</span><ChevronRight size={14} /><strong>{view === "tickets" ? "Tickets" : "Tarife"}</strong></div>
        <div className="topbar-actions">{view === "tickets" && <button className="sync-button" onClick={sync} disabled={syncing}><RefreshCw size={15} className={syncing ? "spin" : ""} />{syncing ? "Synchronisiert…" : "AgentMail Sync"}</button>}<div className="avatar">TH</div></div>
      </header>
      {notice && <div className="toast toast-success"><Check size={16} />{notice}<button onClick={() => setNotice(null)}><X size={14} /></button></div>}
      {error && <div className="toast toast-error"><AlertTriangle size={16} />{error}<button onClick={() => setError(null)}><X size={14} /></button></div>}

      {view === "tickets" ? <div className="page">
        <section className="page-heading"><div><p className="eyebrow">OPERATIONS · EINGEHENDE ANFRAGEN</p><h1>Kundenpost</h1><p>Jede E-Mail wird als nachvollziehbarer Vorgang in Pfefferminzia gespiegelt.</p></div><div className="policy-chip"><span className={dashboard.autoSendEnabled ? "live" : "safe"} />Auto-Versand {dashboard.autoSendEnabled ? "aktiv" : "simuliert"}</div></section>
        <section className="metrics" aria-label="Übersicht">
          <Metric icon={<Inbox size={18} />} label="Offene Vorgänge" value={activeCount} detail={`${dashboard.counts.new} neu eingegangen`} tone="mint" />
          <Metric icon={<UserCheck size={18} />} label="Menschliche Prüfung" value={dashboard.counts.awaiting_human} detail="Leben wird nie auto-versandt" tone="violet" />
          <Metric icon={<Clock3 size={18} />} label="24h-Kontrollfenster" value={dashboard.counts.scheduled} detail="Haftpflicht-Entwürfe" tone="amber" />
        </section>
        <section className="ticket-surface">
          <div className="toolbar"><div className="search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tickets durchsuchen…" aria-label="Tickets durchsuchen" /></div><div className="filter-pills">{(["all", "liability", "life"] as const).map((value) => <button key={value} className={product === value ? "active" : ""} onClick={() => setProduct(value)}>{value === "all" ? "Alle Produkte" : productLabel[value]}</button>)}</div><span className="result-count">{filtered.length} Vorgänge</span></div>
          {loading ? <div className="empty-state"><RefreshCw className="spin" /><h3>Tickets werden geladen</h3></div> : groups.length ? groups.map((group) => <TicketGroup key={group.status} status={group.status} tickets={group.tickets} onSelect={setSelectedNumber} />) : <div className="empty-state"><CheckCircle2 /><h3>Dieser Arbeitskorb ist leer</h3><p>Es gibt keine Vorgänge für die aktuelle Auswahl.</p></div>}
        </section>
      </div> : <TariffView tariffs={tariffs} />}
    </main>

    {selectedNumber && <button className="drawer-scrim" onClick={() => setSelectedNumber(null)} aria-label="Ticket schließen" />}
    <aside className={`ticket-drawer ${selectedNumber ? "open" : ""}`} aria-hidden={!selectedNumber}>{selected ? <TicketDrawer key={`${selected.ticketNumber}-${selected.updatedAt}`} ticket={selected} onClose={() => setSelectedNumber(null)} update={updateSelected} /> : <div className="drawer-loading"><RefreshCw className="spin" /></div>}</aside>
  </div>;
}

function Metric({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: number; detail: string; tone: string }) {
  return <article className="metric"><div className={`metric-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}

function TicketGroup({ status, tickets, onSelect }: { status: TicketStatus; tickets: Ticket[]; onSelect: (ticketNumber: string) => void }) {
  return <section className="ticket-group"><div className="group-heading"><span className={`status-dot ${status}`} /><h2>{statusLabel[status]}</h2><em>{tickets.length}</em><div /></div><div className="ticket-list">{tickets.map((ticket) => <button className="ticket-row" key={ticket.ticketNumber} onClick={() => onSelect(ticket.ticketNumber)}><span className={`priority-bar ${ticket.priority}`} /><div className="ticket-id">{ticket.ticketNumber}</div><div className="ticket-copy"><strong>{ticket.subject}</strong><span>{ticket.customerName || ticket.customerEmail} · {ticket.summary || "Noch nicht zusammengefasst"}</span></div><div className="row-badges"><Badge tone={productTone(ticket.productLine)}>{productLabel[ticket.productLine]}</Badge><Badge>{categoryLabel[ticket.category]}</Badge></div>{ticket.attachmentCount > 0 && <span className="attachment-count"><Paperclip size={14} />{ticket.attachmentCount}</span>}<time>{relativeTime(ticket.lastMessageAt)}</time><ChevronRight className="row-chevron" size={16} /></button>)}</div></section>;
}

function TicketDrawer({ ticket, onClose, update }: { ticket: TicketDetail; onClose: () => void; update: (operation: () => Promise<TicketDetail>, message?: string) => Promise<void> }) {
  const [productLine, setProductLine] = useState(ticket.productLine);
  const [category, setCategory] = useState(ticket.category);
  const [priority, setPriority] = useState(ticket.priority);
  const [summary, setSummary] = useState(ticket.summary || "");
  const [draft, setDraft] = useState(ticket.draft?.body || "");
  const [rationale, setRationale] = useState(ticket.draft?.rationale || "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const replyLocked = ticket.status === "sent" || ticket.status === "closed";
  const run = async (action: () => Promise<TicketDetail>, message?: string) => { setBusy(true); await update(action, message); setBusy(false); };
  const classify = (event: FormEvent) => { event.preventDefault(); void run(() => api.classify(ticket.ticketNumber, { productLine, category, priority, summary }), "Klassifizierung gespeichert"); };
  const saveReply = () => run(() => api.draft(ticket.ticketNumber, { body: draft, rationale }), "Antwortentwurf gespeichert");
  const submit = async () => {
    await api.classify(ticket.ticketNumber, { productLine, category, priority, summary: summary || ticket.subject });
    await api.draft(ticket.ticketNumber, { body: draft, rationale });
    return api.submit(ticket.ticketNumber);
  };

  return <><header className="drawer-header"><div><span className="drawer-id">{ticket.ticketNumber}</span><Badge tone={statusTone(ticket.status)}>{statusLabel[ticket.status]}</Badge>{ticket.isDemo && <Badge tone="demo">Demo</Badge>}</div><button onClick={onClose} aria-label="Schließen"><X size={20} /></button></header><div className="drawer-body">
    <section className="ticket-title"><p>{ticket.customerName || ticket.customerEmail}</p><h2>{ticket.subject}</h2><div className="ticket-meta"><Mail size={14} />{ticket.customerEmail}<span>·</span>{dateTime(ticket.createdAt)}</div></section>
    <PolicyBox ticket={ticket} />
    <section className="drawer-section"><div className="section-heading"><div><Sparkles size={16} /><h3>Klassifizierung</h3></div><span>{ticket.classificationSource === "mcp-agent" ? "via MCP" : ticket.classificationSource || "offen"}</span></div><form className="classification-grid" onSubmit={classify}>
      <label>Produkt<select value={productLine} onChange={(event) => setProductLine(event.target.value as ProductLine)}>{productLines.map((value) => <option key={value} value={value}>{productLabel[value]}</option>)}</select></label>
      <label>Art der Anfrage<select value={category} onChange={(event) => setCategory(event.target.value as TicketCategory)}>{categories.map((value) => <option key={value} value={value}>{categoryLabel[value]}</option>)}</select></label>
      <label>Priorität<select value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority)}>{priorities.map((value) => <option key={value} value={value}>{priorityLabel[value]}</option>)}</select></label>
      <label className="summary-field">Zusammenfassung<textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Kurze, sachliche Einordnung…" rows={3} /></label><button className="secondary-button" disabled={busy || !summary.trim()}><Check size={15} />Klassifizierung speichern</button>
    </form></section>
    <section className="drawer-section"><div className="section-heading"><div><Mail size={16} /><h3>Konversation</h3></div><span>{ticket.messages.length} Nachricht{ticket.messages.length === 1 ? "" : "en"}</span></div><div className="conversation">{ticket.messages.map((message) => <article key={message.id} className={`message-card ${message.direction}`}><div className="message-avatar">{message.direction === "inbound" ? <UserRound size={16} /> : <Bot size={16} />}</div><div><header><strong>{message.direction === "inbound" ? message.sender : "Pfefferminzia"}</strong><time>{dateTime(message.sentAt)}</time></header><p>{message.textBody || "Kein Textinhalt verfügbar."}</p></div></article>)}</div>{ticket.attachments.length > 0 && <div className="attachments"><h4>Anhänge</h4>{ticket.attachments.map((attachment) => <a key={attachment.id} href={`/api/attachments/${attachment.id}/download`}><span><FileText size={17} /></span><div><strong>{attachment.filename}</strong><small>{attachment.contentType} · {fileSize(attachment.sizeBytes)}</small></div><ChevronRight size={15} /></a>)}</div>}</section>
    <section className="drawer-section reply-section"><div className="section-heading"><div><Bot size={16} /><h3>{replyLocked ? "Gesendete Antwort" : "Antwortentwurf"}</h3></div>{ticket.draft && <span>Zuletzt {relativeTime(ticket.draft.updatedAt)}</span>}</div><label className="field-label">Kundenantwort<textarea className="reply-editor" value={draft} disabled={replyLocked} onChange={(event) => setDraft(event.target.value)} rows={9} placeholder="Antwort an den Kunden formulieren…" /></label><label className="field-label">Interne Begründung<input value={rationale} disabled={replyLocked} onChange={(event) => setRationale(event.target.value)} placeholder="Tarifgrundlage und Prüfschritte…" /></label>{replyLocked ? <div className="sent-receipt"><CheckCircle2 size={16} /><span>Diese Antwort wurde versendet und ist gegen erneuten Versand gesperrt.</span></div> : <div className="reply-actions"><button className="secondary-button" disabled={busy || !draft.trim()} onClick={() => void saveReply()}><Check size={15} />Entwurf speichern</button><button className="primary-button" disabled={busy || !draft.trim() || productLine === "unknown"} onClick={() => void run(submit, productLine === "life" ? "Zur menschlichen Prüfung eingereicht" : "Für Versand in 24 Stunden eingeplant")}>{productLine === "life" ? <UserCheck size={15} /> : <Clock3 size={15} />}{productLine === "life" ? "Prüfung anfordern" : "In 24h einplanen"}</button></div>}
      {ticket.status === "awaiting_human" && ticket.draft && <div className="approval-row"><div><UserCheck size={17} /><span><strong>Menschliche Entscheidung</strong><small>Freigabe ist für Lebensversicherung verbindlich.</small></span></div><button disabled={busy} onClick={() => void run(() => api.approve(ticket.ticketNumber), "Entwurf menschlich freigegeben")}>Freigeben</button><button className="send-now" disabled={busy || ticket.isDemo} title={ticket.isDemo ? "Demo-Tickets senden keine echte E-Mail" : undefined} onClick={() => void run(() => api.send(ticket.ticketNumber), "Antwort gesendet")}>Freigeben & senden</button></div>}
      {ticket.status === "scheduled" && ticket.draft && <div className="approval-row schedule-override"><div><Clock3 size={17} /><span><strong>Kontrollfenster läuft</strong><small>Entwurf stoppen, bearbeiten oder sofort senden.</small></span></div><button disabled={busy} onClick={() => void run(() => api.status(ticket.ticketNumber, "in_progress"), "Planung gestoppt")}>Stoppen</button><button className="send-now" disabled={busy || ticket.isDemo} title={ticket.isDemo ? "Demo-Tickets senden keine echte E-Mail" : undefined} onClick={() => void run(() => api.send(ticket.ticketNumber), "Antwort gesendet")}>Jetzt senden</button></div>}
    </section>
    <section className="drawer-section"><div className="section-heading"><div><SlidersHorizontal size={16} /><h3>Interne Notiz</h3></div></div><div className="note-composer"><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Prüfhinweis hinzufügen…" /><button disabled={!note.trim() || busy} onClick={() => void run(() => api.note(ticket.ticketNumber, note).then((result) => { setNote(""); return result; }), "Notiz hinzugefügt")}>Hinzufügen</button></div><div className="timeline">{ticket.events.slice(0, 8).map((event) => <div key={event.id}><span /><p><strong>{eventName(event.type)}</strong><small>{event.actor} · {relativeTime(event.createdAt)}</small>{event.type === "internal_note" && typeof event.details.body === "string" && <em>{event.details.body}</em>}</p></div>)}</div></section>
  </div></>;
}

function PolicyBox({ ticket }: { ticket: TicketDetail }) {
  if (ticket.productLine === "life") return <div className="policy-box life"><HeartPulse size={19} /><div><strong>Menschliche Prüfung vorgeschrieben</strong><p>Lebensversicherungs-Kommunikation kann vorbereitet, aber niemals automatisch versendet werden.</p></div></div>;
  if (ticket.productLine === "liability") return <div className="policy-box liability"><Shield size={19} /><div><strong>24-Stunden-Kontrollfenster</strong><p>Nach Einreichung wird der Entwurf geplant und kann bis zum Versand manuell überschrieben werden.</p>{ticket.scheduledFor && <small>Geplant für {dateTime(ticket.scheduledFor)}</small>}</div></div>;
  return <div className="policy-box unknown"><AlertTriangle size={19} /><div><strong>Produkt noch ungeklärt</strong><p>Vor einer Antwort muss das Ticket klassifiziert und der passende Tarif geprüft werden.</p></div></div>;
}

function eventName(type: string) {
  return ({ ticket_imported: "Ticket angelegt", classified: "Klassifiziert", draft_saved: "Entwurf gespeichert", human_review_required: "Prüfung angefordert", reply_scheduled: "Versand geplant", schedule_cancelled: "Planung aufgehoben", draft_approved: "Entwurf freigegeben", reply_sent: "Antwort gesendet", internal_note: "Interne Notiz", status_changed: "Status geändert" } as Record<string, string>)[type] || type;
}

function TariffView({ tariffs }: { tariffs: TariffDocument[] }) {
  const [active, setActive] = useState(tariffs[0]?.id || "");
  const selected = tariffs.find((tariff) => tariff.id === active) || tariffs[0];
  return <div className="page tariff-page"><section className="page-heading"><div><p className="eyebrow">WISSENSBASIS · MVP-TARIFE</p><h1>Tarifbibliothek</h1><p>Dieselben Dokumente stehen UI und MCP als interne Wissensquelle zur Verfügung.</p></div></section><div className="tariff-layout"><div className="tariff-list">{tariffs.map((tariff) => <button key={tariff.id} className={tariff.id === selected?.id ? "active" : ""} onClick={() => setActive(tariff.id)}><span className={`tariff-icon ${tariff.productLine}`}>{tariff.productLine === "life" ? <HeartPulse /> : <Shield />}</span><div><strong>{tariff.title}</strong><small>{productLabel[tariff.productLine]} · PDF</small></div><ChevronRight /></button>)}</div>{selected && <article className="tariff-reader"><header><Badge tone={productTone(selected.productLine)}>{productLabel[selected.productLine]}</Badge><a href={`/api/tariffs/${selected.id}/download`}><FileText size={15} />PDF öffnen</a></header><h2>{selected.title}</h2><p className="tariff-summary">{selected.summary}</p><div className="document-text">{selected.textContent.split("\n").map((line, index) => line.startsWith("# ") ? <h2 key={index}>{line.slice(2)}</h2> : line.startsWith("## ") ? <h3 key={index}>{line.slice(3)}</h3> : line.startsWith("> ") ? <blockquote key={index}>{line.slice(2)}</blockquote> : line.startsWith("- ") ? <p className="list-line" key={index}>• {line.slice(2)}</p> : line ? <p key={index}>{line}</p> : null)}</div></article>}</div></div>;
}
