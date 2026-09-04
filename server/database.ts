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

    CREATE TABLE IF NOT EXISTS source_datasets (
      id TEXT PRIMARY KEY,
      upstream_commit TEXT NOT NULL,
      manifest_sha256 TEXT NOT NULL,
      dataset_version TEXT NOT NULL,
      schema_version TEXT NOT NULL,
      scale TEXT NOT NULL,
      source_generated_at TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      attribution TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS source_tables (
      source_path TEXT PRIMARY KEY,
      local_table TEXT NOT NULL UNIQUE,
      layer TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      sha256 TEXT NOT NULL,
      imported_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_parties (
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      partner_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('CORRESPONDENT', 'VERSICHERUNGSNEHMER', 'VERSICHERTE_PERSON', 'GESCHAEDIGTER', 'VERTRETER')),
      is_primary INTEGER NOT NULL DEFAULT 0,
      match_method TEXT NOT NULL,
      confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
      confirmed_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (ticket_id, partner_id, role)
    );

    CREATE TABLE IF NOT EXISTS ticket_contracts (
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      vertrag_id TEXT NOT NULL,
      relation TEXT NOT NULL DEFAULT 'BETRIFFT',
      match_method TEXT NOT NULL,
      confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
      confirmed_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (ticket_id, vertrag_id)
    );

    CREATE TABLE IF NOT EXISTS workshop_claims (
      claim_id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL,
      policyholder_id TEXT NOT NULL,
      ticket_id INTEGER UNIQUE REFERENCES tickets(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      event_date TEXT NOT NULL,
      notified_at TEXT NOT NULL,
      product_line TEXT NOT NULL CHECK(product_line IN ('liability', 'life')),
      market TEXT NOT NULL CHECK(market IN ('CH', 'DE')),
      currency TEXT NOT NULL CHECK(currency IN ('CHF', 'EUR')),
      reported_amount REAL NOT NULL DEFAULT 0,
      reserve_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK(status IN ('new', 'triage', 'awaiting_information', 'awaiting_human', 'investigation', 'approved', 'settled', 'closed')),
      risk_level TEXT NOT NULL CHECK(risk_level IN ('low', 'medium', 'high', 'critical')),
      assigned_team TEXT NOT NULL,
      summary TEXT NOT NULL,
      scenario TEXT NOT NULL,
      source_reference TEXT NOT NULL,
      workshop_extension INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workshop_claim_recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_id TEXT NOT NULL REFERENCES workshop_claims(claim_id) ON DELETE CASCADE,
      action TEXT NOT NULL CHECK(action IN ('PAY', 'DENY', 'REQUEST_INFORMATION', 'ESCALATE_COMPLEX', 'REFER_SIU')),
      amount REAL,
      rationale TEXT NOT NULL,
      confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
      rule_version TEXT NOT NULL,
      proposed_by TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending_review', 'approved', 'rejected', 'blocked')),
      reviewed_by TEXT,
      reviewer_note TEXT,
      created_at TEXT NOT NULL,
      reviewed_at TEXT,
      idempotency_key TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS workshop_claim_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_id TEXT NOT NULL REFERENCES workshop_claims(claim_id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('open', 'completed', 'cancelled')) DEFAULT 'open',
      assigned_to TEXT,
      due_at TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      idempotency_key TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS workshop_claim_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_id TEXT NOT NULL REFERENCES workshop_claims(claim_id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      actor TEXT NOT NULL,
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workshop_claim_commands (
      idempotency_key TEXT PRIMARY KEY,
      claim_id TEXT NOT NULL REFERENCES workshop_claims(claim_id) ON DELETE CASCADE,
      command TEXT NOT NULL,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_product_line ON tickets(product_line);
    CREATE INDEX IF NOT EXISTS idx_messages_ticket ON messages(ticket_id, sent_at);
    CREATE INDEX IF NOT EXISTS idx_events_ticket ON ticket_events(ticket_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_ticket_parties_partner ON ticket_parties(partner_id, ticket_id);
    CREATE INDEX IF NOT EXISTS idx_ticket_contracts_contract ON ticket_contracts(vertrag_id, ticket_id);
    CREATE INDEX IF NOT EXISTS idx_workshop_claims_customer ON workshop_claims(policyholder_id, event_date);
    CREATE INDEX IF NOT EXISTS idx_workshop_claims_contract ON workshop_claims(contract_id, event_date);
    CREATE INDEX IF NOT EXISTS idx_workshop_claims_status ON workshop_claims(status, risk_level);
    CREATE INDEX IF NOT EXISTS idx_workshop_claim_events ON workshop_claim_events(claim_id, created_at);
  `);
  const documentColumns = new Set((db.prepare("PRAGMA table_info(documents)").all() as { name: string }[]).map((column) => column.name));
  const additions: Record<string, string> = {
    document_type: "TEXT NOT NULL DEFAULT 'BEDINGUNGSWERK'",
    product_ids_json: "TEXT NOT NULL DEFAULT '[]'",
    tariff_generation_id: "TEXT",
    market: "TEXT",
    valid_from: "TEXT",
    valid_to: "TEXT",
    revision: "TEXT",
    source_commit: "TEXT",
    workshop_extension: "INTEGER NOT NULL DEFAULT 1",
  };
  for (const [name, definition] of Object.entries(additions)) {
    if (!documentColumns.has(name)) db.exec(`ALTER TABLE documents ADD COLUMN ${name} ${definition}`);
  }
}

let singleton: DatabaseSync | undefined;
export function getDatabase() {
  singleton ??= createDatabase();
  return singleton;
}
