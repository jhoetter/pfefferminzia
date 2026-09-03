import { describe, expect, it } from "vitest";
import { sendTicketDraft } from "../server/agentmail";
import { createDatabase } from "../server/database";
import { ensureSeedData } from "../server/seed";
import { listTariffs, listTickets, saveDraft, submitDraft, updateClassification } from "../server/store";

function seededDatabase() {
  const db = createDatabase(":memory:");
  ensureSeedData(db);
  const stamp = new Date().toISOString();
  const insert = db.prepare(`INSERT INTO tickets
    (ticket_number, source, customer_email, subject, status, product_line, category, priority, is_demo, created_at, updated_at, last_message_at)
    VALUES (?, ?, ?, ?, ?, ?, 'unknown', 'normal', ?, ?, ?, ?)`);
  insert.run("PF-9001", "manual", "liability@test.invalid", "Test liability", "new", "liability", 0, stamp, stamp, stamp);
  insert.run("PF-9002", "manual", "life@test.invalid", "Test life", "new", "life", 0, stamp, stamp, stamp);
  insert.run("PF-9003", "manual", "scheduled@test.invalid", "Test scheduled", "scheduled", "liability", 0, stamp, stamp, stamp);
  insert.run("PF-9004", "demo", "blocked@test.invalid", "Test blocked", "in_progress", "liability", 1, stamp, stamp, stamp);
  const scheduledId = (db.prepare("SELECT id FROM tickets WHERE ticket_number = 'PF-9003'").get() as { id: number }).id;
  db.prepare(`INSERT INTO reply_drafts (ticket_id, body, rationale, status, scheduled_for, created_at, updated_at)
    VALUES (?, 'Scheduled test response', 'Test rationale', 'scheduled', ?, ?, ?)`)
    .run(scheduledId, new Date(Date.now() + 3_600_000).toISOString(), stamp, stamp);
  return db;
}

describe("Pfefferminzia workflow", () => {
  it("loads tariff knowledge without creating product tickets", () => {
    const db = seededDatabase();
    expect(listTickets({}, db)).toHaveLength(4);
    expect(listTariffs(db).map((tariff) => tariff.productLine)).toEqual(["liability", "life"]);
    db.close();
  });

  it("moves a liability draft into the 24-hour control window", () => {
    const db = seededDatabase();
    const before = Date.now();
    saveDraft("PF-9001", "Vielen Dank. Wir prüfen den Schaden.", "Tarif PHK-2026", "test-agent", db);
    const result = submitDraft("PF-9001", "test-agent", 24, db);
    expect(result.status).toBe("scheduled");
    expect(result.draft?.status).toBe("scheduled");
    expect(new Date(result.draft!.scheduledFor!).getTime()).toBeGreaterThanOrEqual(before + 23.9 * 3_600_000);
    db.close();
  });

  it("always routes life-insurance drafts to human review", () => {
    const db = seededDatabase();
    saveDraft("PF-9002", "Unser Beileid. Wir prüfen die Unterlagen.", "Tarif LS-2045", "test-agent", db);
    const result = submitDraft("PF-9002", "test-agent", 24, db);
    expect(result.status).toBe("awaiting_human");
    expect(result.draft?.scheduledFor).toBeNull();
    expect(result.events[0]?.type).toBe("human_review_required");
    db.close();
  });

  it("cancels a scheduled send when its draft is manually changed", () => {
    const db = seededDatabase();
    const result = saveDraft("PF-9003", "Überarbeitete Antwort.", "Manueller Eingriff", "human-ui", db);
    expect(result.status).toBe("in_progress");
    expect(result.draft?.status).toBe("draft");
    expect(result.draft?.scheduledFor).toBeNull();
    expect(result.events.some((event) => event.type === "schedule_cancelled")).toBe(true);
    db.close();
  });

  it("audits MCP-style classification and blocks real sends for demo tickets", async () => {
    const db = seededDatabase();
    const result = updateClassification({
      ticketNumber: "PF-9001",
      productLine: "liability",
      category: "claim",
      priority: "urgent",
      summary: "Notebook-Schaden mit offenem Reparaturbeleg.",
      confidence: 0.92,
      actor: "mcp-agent",
    }, db);
    expect(result.classificationSource).toBe("mcp-agent");
    expect(result.events[0]?.actor).toBe("mcp-agent");
    saveDraft("PF-9004", "Blocked demo response", "Test", "test-agent", db);
    await expect(sendTicketDraft("PF-9004", "test", db)).rejects.toThrow("Demo tickets");
    db.close();
  });
});
