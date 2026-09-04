import { readFileSync } from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import {
  categories,
  priorities,
  productLines,
  ticketStatuses,
  type ProductLine,
  type ReplyDraft,
  type TariffDocument,
  type Ticket,
  type TicketAttachment,
  type TicketCategory,
  type TicketDetail,
  type TicketPriority,
  type TicketStatus,
} from "../src/types";
import { getDatabase, ROOT } from "./database";

type Row = Record<string, unknown>;
const now = () => new Date().toISOString();

function one<T extends Row>(value: unknown): T | undefined {
  return value as T | undefined;
}

function rows<T extends Row>(value: unknown): T[] {
  return value as T[];
}

function mapTicket(row: Row): Ticket {
  return {
    id: Number(row.id),
    ticketNumber: String(row.ticket_number),
    source: row.source as Ticket["source"],
    sourceInboxId: row.source_inbox_id ? String(row.source_inbox_id) : null,
    sourceThreadId: row.source_thread_id ? String(row.source_thread_id) : null,
    customerEmail: String(row.customer_email),
    customerName: row.customer_name ? String(row.customer_name) : null,
    subject: String(row.subject),
    status: row.status as TicketStatus,
    productLine: row.product_line as ProductLine,
    category: row.category as TicketCategory,
    priority: row.priority as TicketPriority,
    summary: row.summary ? String(row.summary) : null,
    classificationConfidence: row.classification_confidence == null ? null : Number(row.classification_confidence),
    classificationSource: row.classification_source ? String(row.classification_source) : null,
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    isDemo: Boolean(row.is_demo),
    humanApprovedAt: row.human_approved_at ? String(row.human_approved_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastMessageAt: String(row.last_message_at),
    messageCount: Number(row.message_count ?? 0),
    attachmentCount: Number(row.attachment_count ?? 0),
    hasDraft: Boolean(row.has_draft),
    scheduledFor: row.scheduled_for ? String(row.scheduled_for) : null,
  };
}

const TICKET_SELECT = `
  SELECT t.*,
    (SELECT COUNT(*) FROM messages m WHERE m.ticket_id = t.id) AS message_count,
    (SELECT COUNT(*) FROM attachments a WHERE a.ticket_id = t.id) AS attachment_count,
    EXISTS(SELECT 1 FROM reply_drafts d WHERE d.ticket_id = t.id) AS has_draft,
    (SELECT scheduled_for FROM reply_drafts d WHERE d.ticket_id = t.id) AS scheduled_for
  FROM tickets t`;

export interface TicketQuery {
  statuses?: TicketStatus[];
  productLine?: ProductLine;
  category?: TicketCategory;
  q?: string;
  limit?: number;
}

export function listTickets(query: TicketQuery = {}, db = getDatabase()): Ticket[] {
  const where: string[] = [];
  const params: Record<string, string | number> = {};
  if (query.statuses?.length) {
    query.statuses.forEach((status) => {
      if (!ticketStatuses.includes(status)) throw new Error(`Invalid status: ${status}`);
    });
    where.push(`t.status IN (${query.statuses.map((_, index) => `:status${index}`).join(", ")})`);
    query.statuses.forEach((status, index) => (params[`status${index}`] = status));
  }
  if (query.productLine) {
    if (!productLines.includes(query.productLine)) throw new Error(`Invalid product line: ${query.productLine}`);
    where.push("t.product_line = :productLine");
    params.productLine = query.productLine;
  }
  if (query.category) {
    if (!categories.includes(query.category)) throw new Error(`Invalid category: ${query.category}`);
    where.push("t.category = :category");
    params.category = query.category;
  }
  if (query.q?.trim()) {
    where.push("(t.subject LIKE :q OR t.customer_email LIKE :q OR t.ticket_number LIKE :q OR t.summary LIKE :q)");
    params.q = `%${query.q.trim()}%`;
  }
  const limit = Math.max(1, Math.min(query.limit ?? 200, 500));
  params.limit = limit;
  const sql = `${TICKET_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
      t.last_message_at DESC LIMIT :limit`;
  return rows(db.prepare(sql).all(params)).map(mapTicket);
}

export function getTicket(identifier: string | number, db = getDatabase()): TicketDetail | null {
  const row = one(db.prepare(`${TICKET_SELECT} WHERE ${typeof identifier === "number" ? "t.id = ?" : "t.ticket_number = ?"}`).get(identifier));
  if (!row) return null;
  const ticket = mapTicket(row);
  const messages = rows(db.prepare("SELECT * FROM messages WHERE ticket_id = ? ORDER BY sent_at ASC").all(ticket.id)).map((item) => ({
    id: Number(item.id),
    direction: item.direction as "inbound" | "outbound",
    sender: String(item.sender),
    recipients: JSON.parse(String(item.recipients_json)) as string[],
    subject: item.subject ? String(item.subject) : null,
    textBody: String(item.text_body),
    htmlBody: item.html_body ? String(item.html_body) : null,
    sentAt: String(item.sent_at),
    externalMessageId: item.external_message_id ? String(item.external_message_id) : null,
  }));
  const attachments: TicketAttachment[] = rows(db.prepare("SELECT * FROM attachments WHERE ticket_id = ? ORDER BY id").all(ticket.id)).map((item) => ({
    id: Number(item.id),
    messageId: Number(item.message_id),
    filename: String(item.filename),
    contentType: String(item.content_type),
    sizeBytes: Number(item.size_bytes),
    extractedText: item.extracted_text ? String(item.extracted_text) : null,
    resourceUri: `pfefferminzia://attachments/${item.id}`,
  }));
  const draftRow = one(db.prepare("SELECT * FROM reply_drafts WHERE ticket_id = ?").get(ticket.id));
  const draft: ReplyDraft | null = draftRow ? {
    body: String(draftRow.body),
    rationale: draftRow.rationale ? String(draftRow.rationale) : null,
    status: draftRow.status as ReplyDraft["status"],
    scheduledFor: draftRow.scheduled_for ? String(draftRow.scheduled_for) : null,
    sentMessageId: draftRow.sent_message_id ? String(draftRow.sent_message_id) : null,
    updatedAt: String(draftRow.updated_at),
  } : null;
  const events = rows(db.prepare("SELECT * FROM ticket_events WHERE ticket_id = ? ORDER BY created_at DESC, id DESC").all(ticket.id)).map((item) => ({
    id: Number(item.id),
    type: String(item.type),
    actor: String(item.actor),
    details: JSON.parse(String(item.details_json)) as Record<string, unknown>,
    createdAt: String(item.created_at),
  }));
  const hasUpstreamData = Boolean(db.prepare("SELECT 1 FROM source_datasets LIMIT 1").get());
  const parties = hasUpstreamData ? rows(db.prepare(`SELECT tp.*, p.vorname, p.nachname, p.firmenname
    FROM ticket_parties tp JOIN core_partner p ON p.partner_id = tp.partner_id
    WHERE tp.ticket_id = ? ORDER BY tp.is_primary DESC, tp.role`).all(ticket.id)).map((item) => ({
      partnerId: String(item.partner_id),
      displayName: item.firmenname ? String(item.firmenname) : [item.vorname, item.nachname].filter(Boolean).join(" "),
      role: item.role as TicketDetail["parties"][number]["role"],
      isPrimary: Boolean(item.is_primary),
      matchMethod: String(item.match_method),
      confidence: Number(item.confidence),
    })) : [];
  const linkedContracts = hasUpstreamData ? rows(db.prepare(`SELECT tc.*, v.produkt_id, v.tarifgeneration_id
    FROM ticket_contracts tc JOIN core_vertrag v ON v.vertrag_id = tc.vertrag_id
    WHERE tc.ticket_id = ? ORDER BY tc.created_at`).all(ticket.id)).map((item) => ({
      contractId: String(item.vertrag_id), productId: String(item.produkt_id), tariffGenerationId: String(item.tarifgeneration_id),
      relation: String(item.relation), matchMethod: String(item.match_method), confidence: Number(item.confidence),
    })) : [];
  return { ...ticket, messages, attachments, draft, events, parties, linkedContracts };
}

export function addEvent(ticketId: number, type: string, actor: string, details: Record<string, unknown> = {}, db = getDatabase()) {
  db.prepare("INSERT INTO ticket_events (ticket_id, type, actor, details_json, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(ticketId, type, actor, JSON.stringify(details), now());
}

export function updateClassification(input: {
  ticketNumber: string;
  productLine: ProductLine;
  category: TicketCategory;
  priority?: TicketPriority;
  summary: string;
  confidence?: number;
  actor?: string;
}, db = getDatabase()) {
  if (!productLines.includes(input.productLine)) throw new Error("Invalid product line");
  if (!categories.includes(input.category)) throw new Error("Invalid category");
  if (input.priority && !priorities.includes(input.priority)) throw new Error("Invalid priority");
  const ticket = getTicket(input.ticketNumber, db);
  if (!ticket) throw new Error(`Ticket not found: ${input.ticketNumber}`);
  const stamp = now();
  db.prepare(`UPDATE tickets SET product_line = ?, category = ?, priority = ?, summary = ?,
    classification_confidence = ?, classification_source = ?, status = CASE WHEN status = 'new' THEN 'in_progress' ELSE status END,
    updated_at = ? WHERE id = ?`).run(
      input.productLine,
      input.category,
      input.priority ?? ticket.priority,
      input.summary,
      input.confidence ?? null,
      input.actor ?? "human",
      stamp,
      ticket.id,
    );
  addEvent(ticket.id, "classified", input.actor ?? "human", {
    productLine: input.productLine,
    category: input.category,
    priority: input.priority ?? ticket.priority,
    confidence: input.confidence,
  }, db);
  return getTicket(ticket.id, db)!;
}

export function updateTicketStatus(ticketNumber: string, status: TicketStatus, actor = "human", db = getDatabase()) {
  if (!ticketStatuses.includes(status)) throw new Error("Invalid status");
  const ticket = getTicket(ticketNumber, db);
  if (!ticket) throw new Error(`Ticket not found: ${ticketNumber}`);
  if (ticket.status === status) return ticket;
  db.prepare("UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?").run(status, now(), ticket.id);
  addEvent(ticket.id, "status_changed", actor, { from: ticket.status, to: status }, db);
  return getTicket(ticket.id, db)!;
}

export function saveDraft(ticketNumber: string, body: string, rationale: string | undefined, actor = "human", db = getDatabase()) {
  const ticket = getTicket(ticketNumber, db);
  if (!ticket) throw new Error(`Ticket not found: ${ticketNumber}`);
  if (ticket.status === "sent" || ticket.status === "closed") throw new Error("Sent or closed tickets cannot modify their reply draft");
  if (!body.trim()) throw new Error("Draft body cannot be empty");
  const stamp = now();
  db.prepare(`INSERT INTO reply_drafts (ticket_id, body, rationale, status, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', ?, ?)
    ON CONFLICT(ticket_id) DO UPDATE SET body = excluded.body, rationale = excluded.rationale,
      status = 'draft', scheduled_for = NULL, updated_at = excluded.updated_at`)
    .run(ticket.id, body.trim(), rationale?.trim() || null, stamp, stamp);
  db.prepare("UPDATE tickets SET updated_at = ?, human_approved_at = NULL, status = CASE WHEN status = 'scheduled' THEN 'in_progress' ELSE status END WHERE id = ?").run(stamp, ticket.id);
  if (ticket.status === "scheduled") addEvent(ticket.id, "schedule_cancelled", actor, { reason: "draft_changed" }, db);
  addEvent(ticket.id, "draft_saved", actor, { rationale: rationale?.trim() || undefined }, db);
  return getTicket(ticket.id, db)!;
}

export function addInternalNote(ticketNumber: string, body: string, actor = "human", db = getDatabase()) {
  const ticket = getTicket(ticketNumber, db);
  if (!ticket) throw new Error(`Ticket not found: ${ticketNumber}`);
  if (!body.trim()) throw new Error("Note cannot be empty");
  addEvent(ticket.id, "internal_note", actor, { body: body.trim() }, db);
  return getTicket(ticket.id, db)!;
}

export function submitDraft(ticketNumber: string, actor = "agent", delayHours = 24, db = getDatabase()) {
  const ticket = getTicket(ticketNumber, db);
  if (!ticket) throw new Error(`Ticket not found: ${ticketNumber}`);
  if (!ticket.draft) throw new Error("Save a reply draft before submitting it");
  if (ticket.status === "sent" || ticket.status === "closed" || ticket.draft.status === "sent") throw new Error("Sent or closed tickets cannot be submitted again");
  if (ticket.productLine === "unknown") throw new Error("Classify the product line before submitting a draft");
  const stamp = now();
  if (ticket.productLine === "life") {
    db.prepare("UPDATE reply_drafts SET status = 'draft', scheduled_for = NULL, updated_at = ? WHERE ticket_id = ?").run(stamp, ticket.id);
    db.prepare("UPDATE tickets SET status = 'awaiting_human', human_approved_at = NULL, updated_at = ? WHERE id = ?").run(stamp, ticket.id);
    addEvent(ticket.id, "human_review_required", actor, { policy: "life-always-human" }, db);
  } else {
    const scheduledFor = new Date(Date.now() + Math.max(1, delayHours) * 3_600_000).toISOString();
    db.prepare("UPDATE reply_drafts SET status = 'scheduled', scheduled_for = ?, updated_at = ? WHERE ticket_id = ?")
      .run(scheduledFor, stamp, ticket.id);
    db.prepare("UPDATE tickets SET status = 'scheduled', human_approved_at = NULL, updated_at = ? WHERE id = ?").run(stamp, ticket.id);
    addEvent(ticket.id, "reply_scheduled", actor, { scheduledFor, policy: "liability-delay-window" }, db);
  }
  return getTicket(ticket.id, db)!;
}

export function approveDraft(ticketNumber: string, actor = "human", db = getDatabase()) {
  const ticket = getTicket(ticketNumber, db);
  if (!ticket?.draft) throw new Error(`Ticket or draft not found: ${ticketNumber}`);
  if (ticket.status === "sent" || ticket.status === "closed" || ticket.draft.status === "sent") throw new Error("Sent or closed tickets cannot be approved again");
  const stamp = now();
  db.prepare("UPDATE reply_drafts SET status = 'approved', scheduled_for = NULL, updated_at = ? WHERE ticket_id = ?").run(stamp, ticket.id);
  db.prepare("UPDATE tickets SET human_approved_at = ?, updated_at = ? WHERE id = ?").run(stamp, stamp, ticket.id);
  addEvent(ticket.id, "draft_approved", actor, {}, db);
  return getTicket(ticket.id, db)!;
}

export function listTariffs(db = getDatabase()): TariffDocument[] {
  return rows(db.prepare("SELECT * FROM documents ORDER BY product_line, title").all()).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    productLine: row.product_line as "liability" | "life",
    filename: String(row.filename),
    summary: String(row.summary),
    textContent: String(row.text_content),
    resourceUri: `pfefferminzia://tariffs/${row.id}`,
    documentType: String(row.document_type),
    productIds: JSON.parse(String(row.product_ids_json || "[]")) as string[],
    tariffGenerationId: row.tariff_generation_id ? String(row.tariff_generation_id) : null,
    market: row.market as "CH" | "DE" | null,
    validFrom: row.valid_from ? String(row.valid_from) : null,
    validTo: row.valid_to ? String(row.valid_to) : null,
    revision: row.revision ? String(row.revision) : null,
    sourceCommit: row.source_commit ? String(row.source_commit) : null,
    workshopExtension: Boolean(row.workshop_extension),
  }));
}

export function getTariff(id: string, db = getDatabase()) {
  return listTariffs(db).find((document) => document.id === id) ?? null;
}

export function listContractDocuments(contractId: string, db = getDatabase()) {
  const contract = one(db.prepare("SELECT tarifgeneration_id, markt FROM core_vertrag WHERE vertrag_id = ?").get(contractId));
  if (!contract) throw new Error(`Contract not found: ${contractId}`);
  return listTariffs(db).filter((document) => document.tariffGenerationId === contract.tarifgeneration_id && document.market === contract.markt);
}

export function getAttachmentRecord(id: number, db = getDatabase()) {
  return one(db.prepare("SELECT * FROM attachments WHERE id = ?").get(id));
}

export function listAttachmentRecords(db = getDatabase()) {
  return rows(db.prepare(`SELECT a.*, t.ticket_number, t.subject
    FROM attachments a JOIN tickets t ON t.id = a.ticket_id ORDER BY a.id`).all());
}

export function getDocumentRecord(id: string, db = getDatabase()) {
  return one(db.prepare("SELECT * FROM documents WHERE id = ?").get(id));
}

export function resolveStoragePath(storagePath: string) {
  const resolved = path.resolve(ROOT, storagePath);
  if (!resolved.startsWith(`${ROOT}${path.sep}`)) throw new Error("Invalid storage path");
  return resolved;
}

export function readStoredFile(storagePath: string) {
  return readFileSync(resolveStoragePath(storagePath));
}

export function dashboardMeta(db = getDatabase()) {
  const countRows = rows(db.prepare("SELECT status, COUNT(*) AS count FROM tickets GROUP BY status").all());
  const counts = Object.fromEntries(ticketStatuses.map((status) => [status, 0])) as Record<TicketStatus, number>;
  for (const row of countRows) counts[row.status as TicketStatus] = Number(row.count);
  const sync = one(db.prepare("SELECT * FROM sync_runs WHERE status = 'success' ORDER BY created_at DESC LIMIT 1").get());
  return {
    counts,
    connectedInbox: sync?.inbox_id ? String(sync.inbox_id) : null,
    lastSyncAt: sync?.created_at ? String(sync.created_at) : null,
  };
}
