import { describe, expect, it } from "vitest";
import { sendTicketDraft } from "../server/agentmail";
import { getClaim, reviewClaimAction } from "../server/claims";
import { createDatabase } from "../server/database";
import { ensureSeedData } from "../server/seed";
import { getTicket, listTickets } from "../server/store";
import { importFalkDataset } from "../server/upstream";
import { ensureWorkshopFixtures, getWorkshopStatus, resetWorkshopFixtures } from "../server/workshop";

function workshopDatabase() {
  const db = createDatabase(":memory:");
  importFalkDataset(db, true);
  ensureSeedData(db);
  resetWorkshopFixtures(db);
  return db;
}

describe("participant workshop fixtures", () => {
  it("loads four non-sendable tickets with customer, policy, and claim context", async () => {
    const db = workshopDatabase();
    expect(getWorkshopStatus(db)).toMatchObject({
      profile: "participant", syntheticDataOnly: true, demoTickets: 4, workshopClaims: 4, importedTruthTables: 0,
    });
    const pieper = getTicket("PF-10008", db)!;
    expect(pieper.source).toBe("demo");
    expect(pieper.isDemo).toBe(true);
    expect(pieper.parties[0]?.partnerId).toBe("PTR-00000008");
    expect(pieper.linkedContracts[0]?.contractId).toBe("VTR-00000801");
    expect(getClaim("SCH-00000810", db)?.ticketNumber).toBe("PF-10008");
    await expect(sendTicketDraft("PF-10008", "test", db)).rejects.toThrow("Demo tickets");
    db.close();
  });

  it("resets only workshop-owned state and preserves non-demo tickets", () => {
    const db = workshopDatabase();
    const stamp = "2026-09-04T00:00:00Z";
    db.prepare(`INSERT INTO tickets
      (ticket_number, source, customer_email, subject, status, product_line, category, priority, is_demo, created_at, updated_at, last_message_at)
      VALUES ('PF-99999', 'manual', 'preserve@workshop.invalid', 'Preserve me', 'new', 'unknown', 'unknown', 'normal', 0, ?, ?, ?)`)
      .run(stamp, stamp, stamp);
    const pieper = getClaim("SCH-00000810", db)!;
    reviewClaimAction({ claimId: pieper.claimId, recommendationId: pieper.recommendations[0].id, decision: "reject",
      note: "Corrected during exercise.", idempotencyKey: "reset-test-pieper", actor: "test" }, db);
    expect(getClaim(pieper.claimId, db)?.status).toBe("triage");
    const result = resetWorkshopFixtures(db);
    expect(result.demoTickets).toBe(4);
    expect(getClaim(pieper.claimId, db)?.recommendations[0].status).toBe("blocked");
    expect(listTickets({ q: "PF-99999" }, db)).toHaveLength(1);
    expect(() => ensureWorkshopFixtures(db)).not.toThrow();
    expect(listTickets({}, db).filter((ticket) => ticket.source === "demo")).toHaveLength(4);
    db.close();
  });
});
