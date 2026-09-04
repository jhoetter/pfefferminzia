import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { AgentMailClient } from "agentmail";
import { getDatabase, ROOT } from "./database";
import { addEvent, getTicket, listTickets } from "./store";
import { autoLinkExactCustomer } from "./crm";

function client() {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) throw new Error("AGENTMAIL_API_KEY is not configured");
  return new AgentMailClient({ apiKey });
}

function addressPart(value: string) {
  const match = value.match(/<([^>]+)>/u);
  return (match?.[1] ?? value).trim().toLowerCase();
}

function displayPart(value: string) {
  const match = value.match(/^\s*([^<]+?)\s*<[^>]+>/u);
  return match?.[1]?.replace(/^"|"$/g, "").trim() || null;
}

function isAgentMailSystemMessage(sender: string, subject?: string) {
  return addressPart(sender) === "admin@agentmail.to" && /^Welcome to AgentMail/iu.test(subject || "");
}

function safeFilename(value: string) {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "attachment";
}

function nextTicketNumber(db: DatabaseSync) {
  const row = db.prepare("SELECT COALESCE(MAX(id), 0) + 1001 AS next FROM tickets").get() as { next: number };
  return `PF-${row.next}`;
}

export interface SyncResult {
  inboxes: string[];
  importedTickets: number;
  importedMessages: number;
  importedAttachments: number;
}

let syncInFlight: Promise<SyncResult> | null = null;

export function syncAgentMail(db = getDatabase()): Promise<SyncResult> {
  syncInFlight ??= performAgentMailSync(db).finally(() => { syncInFlight = null; });
  return syncInFlight;
}

async function performAgentMailSync(db: DatabaseSync): Promise<SyncResult> {
  const agentmail = client();
  const result: SyncResult = { inboxes: [], importedTickets: 0, importedMessages: 0, importedAttachments: 0 };
  let activeInbox: string | null = null;
  try {
    const inboxResponse = await agentmail.inboxes.list({ limit: 100 });
    for (const inbox of inboxResponse.inboxes) {
      activeInbox = inbox.inboxId;
      result.inboxes.push(inbox.email || inbox.inboxId);
      const inboxAddress = addressPart(inbox.email || inbox.inboxId);
      const messageResponse = await agentmail.inboxes.messages.list(inbox.inboxId, { limit: 100, ascending: true });
      for (const item of messageResponse.messages) {
        const alreadyImported = db.prepare("SELECT id FROM messages WHERE external_message_id = ?").get(item.messageId);
        if (alreadyImported) continue;

        const message = await agentmail.inboxes.messages.get(inbox.inboxId, item.messageId);
        const direction = addressPart(message.from) === inboxAddress ? "outbound" : "inbound";
        let ticketRow = db.prepare("SELECT id, ticket_number FROM tickets WHERE source_inbox_id = ? AND source_thread_id = ?")
          .get(inbox.inboxId, message.threadId) as { id: number; ticket_number: string } | undefined;

        if (!ticketRow && (direction === "outbound" || isAgentMailSystemMessage(message.from, message.subject))) continue;
        if (!ticketRow) {
          const stamp = message.timestamp.toISOString();
          const ticketNumber = nextTicketNumber(db);
          const inserted = db.prepare(`INSERT INTO tickets
            (ticket_number, source, source_inbox_id, source_thread_id, customer_email, customer_name, subject,
             status, product_line, category, priority, is_demo, created_at, updated_at, last_message_at)
            VALUES (?, 'agentmail', ?, ?, ?, ?, ?, 'new', 'unknown', 'unknown', 'normal', 0, ?, ?, ?)`)
            .run(
              ticketNumber,
              inbox.inboxId,
              message.threadId,
              addressPart(message.from),
              displayPart(message.from),
              message.subject || "(Ohne Betreff)",
              stamp,
              stamp,
              stamp,
            );
          ticketRow = { id: Number(inserted.lastInsertRowid), ticket_number: ticketNumber };
          addEvent(ticketRow.id, "ticket_imported", "agentmail-sync", { inboxId: inbox.inboxId, threadId: message.threadId }, db);
          autoLinkExactCustomer(ticketNumber, db);
          result.importedTickets += 1;
        }

        const stamp = new Date().toISOString();
        const messageInsert = db.prepare(`INSERT INTO messages
          (ticket_id, external_message_id, direction, sender, recipients_json, subject, text_body, html_body, sent_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(
            ticketRow.id,
            message.messageId,
            direction,
            message.from,
            JSON.stringify(message.to),
            message.subject || null,
            message.extractedText || message.text || message.preview || "",
            message.extractedHtml || message.html || null,
            message.timestamp.toISOString(),
            stamp,
          );
        const localMessageId = Number(messageInsert.lastInsertRowid);
        db.prepare("UPDATE tickets SET updated_at = ?, last_message_at = ?, status = CASE WHEN ? = 'inbound' AND status IN ('sent', 'closed') THEN 'new' ELSE status END WHERE id = ?")
          .run(stamp, message.timestamp.toISOString(), direction, ticketRow.id);
        result.importedMessages += 1;

        for (const attachment of message.attachments ?? []) {
          const metadata = await agentmail.inboxes.messages.getAttachment(inbox.inboxId, message.messageId, attachment.attachmentId);
          const response = await fetch(metadata.downloadUrl);
          if (!response.ok) throw new Error(`Attachment download failed (${response.status}): ${attachment.filename ?? attachment.attachmentId}`);
          const bytes = Buffer.from(await response.arrayBuffer());
          const folder = path.join(ROOT, ".data", "attachments", ticketRow.ticket_number);
          await mkdir(folder, { recursive: true });
          const filename = `${safeFilename(attachment.attachmentId)}-${safeFilename(attachment.filename || "attachment")}`;
          const absolutePath = path.join(folder, filename);
          await writeFile(absolutePath, bytes);
          const contentType = attachment.contentType || "application/octet-stream";
          const extractedText = /^(text\/|application\/(json|xml))/u.test(contentType) && bytes.length <= 1_000_000
            ? bytes.toString("utf8")
            : null;
          db.prepare(`INSERT OR IGNORE INTO attachments
            (ticket_id, message_id, external_attachment_id, filename, content_type, size_bytes, storage_path, extracted_text, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(
              ticketRow.id,
              localMessageId,
              attachment.attachmentId,
              attachment.filename || "Anhang",
              contentType,
              bytes.length,
              path.relative(ROOT, absolutePath),
              extractedText,
              stamp,
            );
          result.importedAttachments += 1;
        }
      }
    }
    db.prepare("INSERT INTO sync_runs (inbox_id, imported_messages, imported_tickets, status, created_at) VALUES (?, ?, ?, 'success', ?)")
      .run(result.inboxes.join(", ") || null, result.importedMessages, result.importedTickets, new Date().toISOString());
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    db.prepare("INSERT INTO sync_runs (inbox_id, imported_messages, imported_tickets, status, error, created_at) VALUES (?, ?, ?, 'error', ?, ?)")
      .run(activeInbox, result.importedMessages, result.importedTickets, message, new Date().toISOString());
    throw error;
  }
}

export async function sendTicketDraft(ticketNumber: string, actor = "human", db = getDatabase()) {
  const ticket = getTicket(ticketNumber, db);
  if (!ticket?.draft) throw new Error(`Ticket or reply draft not found: ${ticketNumber}`);
  if (ticket.isDemo) throw new Error("Demo tickets can never send real email");
  if (!ticket.sourceInboxId) throw new Error("Ticket has no AgentMail inbox binding");
  if (ticket.productLine === "life" && !ticket.humanApprovedAt) {
    throw new Error("Life insurance replies require explicit human approval");
  }
  if (ticket.draft.status === "sent") throw new Error("This draft has already been sent");
  const lastInbound = [...ticket.messages].reverse().find((message) => message.direction === "inbound" && message.externalMessageId);
  if (!lastInbound?.externalMessageId) throw new Error("No inbound AgentMail message available to reply to");

  const response = await client().inboxes.messages.reply(ticket.sourceInboxId, lastInbound.externalMessageId, {
    text: ticket.draft.body,
    html: `<p>${ticket.draft.body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`,
  });
  const stamp = new Date().toISOString();
  db.prepare(`INSERT INTO messages
    (ticket_id, external_message_id, direction, sender, recipients_json, subject, text_body, sent_at, created_at)
    VALUES (?, ?, 'outbound', ?, ?, ?, ?, ?, ?)`)
    .run(ticket.id, response.messageId, ticket.sourceInboxId, JSON.stringify([ticket.customerEmail]), `Re: ${ticket.subject}`, ticket.draft.body, stamp, stamp);
  db.prepare("UPDATE reply_drafts SET status = 'sent', sent_message_id = ?, scheduled_for = NULL, updated_at = ? WHERE ticket_id = ?")
    .run(response.messageId, stamp, ticket.id);
  db.prepare("UPDATE tickets SET status = 'sent', updated_at = ?, last_message_at = ? WHERE id = ?").run(stamp, stamp, ticket.id);
  addEvent(ticket.id, "reply_sent", actor, { messageId: response.messageId }, db);
  return getTicket(ticket.id, db)!;
}

export async function dispatchDueReplies(db = getDatabase()) {
  if (process.env.AUTO_SEND_ENABLED !== "true") return { enabled: false, sent: 0, skipped: 0 };
  let sent = 0;
  let skipped = 0;
  const due = listTickets({ statuses: ["scheduled"] }, db).filter((ticket) => ticket.scheduledFor && ticket.scheduledFor <= new Date().toISOString());
  for (const ticket of due) {
    if (ticket.isDemo || ticket.productLine !== "liability") {
      skipped += 1;
      continue;
    }
    await sendTicketDraft(ticket.ticketNumber, "auto-send-worker", db);
    sent += 1;
  }
  return { enabled: true, sent, skipped };
}
