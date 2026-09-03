import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_DB_PATH = path.join(ROOT, ".data", "pfefferminzia.db");

export function createDatabase(dbPath = process.env.PFEFFERMINZIA_DB_PATH || DEFAULT_DB_PATH) {
  if (dbPath !== ":memory:") mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  if (dbPath !== ":memory:") db.exec("PRAGMA journal_mode = WAL;");
  migrate(db);
  return db;
}

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL CHECK(source IN ('agentmail', 'demo', 'manual')),
      source_inbox_id TEXT,
      source_thread_id TEXT,
      customer_email TEXT NOT NULL,
      customer_name TEXT,
      subject TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      product_line TEXT NOT NULL DEFAULT 'unknown',
      category TEXT NOT NULL DEFAULT 'unknown',
      priority TEXT NOT NULL DEFAULT 'normal',
      summary TEXT,
      classification_confidence REAL,
      classification_source TEXT,
      assigned_to TEXT,
      is_demo INTEGER NOT NULL DEFAULT 0,
      human_approved_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_message_at TEXT NOT NULL,
      UNIQUE(source_inbox_id, source_thread_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      external_message_id TEXT UNIQUE,
      direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
      sender TEXT NOT NULL,
      recipients_json TEXT NOT NULL DEFAULT '[]',
      subject TEXT,
      text_body TEXT NOT NULL DEFAULT '',
      html_body TEXT,
      sent_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      external_attachment_id TEXT,
      filename TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      size_bytes INTEGER NOT NULL DEFAULT 0,
      storage_path TEXT NOT NULL,
      extracted_text TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(message_id, external_attachment_id)
    );

    CREATE TABLE IF NOT EXISTS reply_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      rationale TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      scheduled_for TEXT,
      sent_message_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      actor TEXT NOT NULL,
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      product_line TEXT NOT NULL,
      filename TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      summary TEXT NOT NULL,
      text_content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inbox_id TEXT,
      imported_messages INTEGER NOT NULL DEFAULT 0,
      imported_tickets INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      error TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_product_line ON tickets(product_line);
    CREATE INDEX IF NOT EXISTS idx_messages_ticket ON messages(ticket_id, sent_at);
    CREATE INDEX IF NOT EXISTS idx_events_ticket ON ticket_events(ticket_id, created_at);
  `);
}

let singleton: DatabaseSync | undefined;
export function getDatabase() {
  singleton ??= createDatabase();
  return singleton;
}
