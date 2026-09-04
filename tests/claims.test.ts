import { describe, expect, it } from "vitest";
import { createDatabase } from "../server/database";
import {
  createClaimTask, ensureWorkshopClaims, getClaim, listClaims, proposeClaimAction, reviewClaimAction,
} from "../server/claims";
import { getCustomer } from "../server/crm";
import { ensureSeedData } from "../server/seed";
import { importFalkDataset } from "../server/upstream";

function claimsDatabase() {
  const db = createDatabase(":memory:");
  importFalkDataset(db, true);
  ensureSeedData(db);
  ensureWorkshopClaims(db);
  return db;
}

describe("synthetic workshop claims", () => {
  it("links the four public persona scenarios to exact Falk contracts and policy documents", () => {
    const db = claimsDatabase();
    const claims = listClaims({}, db);
    expect(claims.map((claim) => claim.claimId).sort()).toEqual([
      "SCH-00000118", "SCH-00000318", "SCH-00000810", "SCH-00000918",
    ]);
    expect(getClaim("SCH-00000810", db)?.policyDocumentIds).toEqual(["RW-HP-AHB-DE-2013"]);
    expect(getCustomer("PTR-00000008", db)?.claims.map((claim) => claim.claimId)).toContain("SCH-00000810");
    expect(getCustomer("PTR-00000008", db)?.timeline.some((item) => item.id === "claim-SCH-00000810")).toBe(true);
    expect(claims.every((claim) => claim.workshopExtension)).toBe(true);
    expect(claims.every((claim) => claim.sourceReference.startsWith("Falk core_schaden"))).toBe(true);
    db.close();
  });

  it("cannot approve the blocked Pieper denial and audits an idempotent rejection", () => {
    const db = claimsDatabase();
    const initial = getClaim("SCH-00000810", db)!;
    const recommendation = initial.recommendations[0];
    expect(recommendation.status).toBe("blocked");
    expect(() => reviewClaimAction({
      claimId: initial.claimId, recommendationId: recommendation.id, decision: "approve",
      note: "Human checked this decision.", idempotencyKey: "pieper-approve-blocked", actor: "test-reviewer",
    }, db)).toThrow("blocked recommendation cannot be approved");
    const rejected = reviewClaimAction({
      claimId: initial.claimId, recommendationId: recommendation.id, decision: "reject",
      note: "Source-policy evidence contradicts the migrated component field.", idempotencyKey: "pieper-reject-001", actor: "test-reviewer",
    }, db);
    expect(rejected.status).toBe("triage");
    expect(rejected.recommendations[0].status).toBe("rejected");
    const eventCount = rejected.events.length;
    expect(reviewClaimAction({
      claimId: initial.claimId, recommendationId: recommendation.id, decision: "reject",
      note: "This changed note must not execute twice.", idempotencyKey: "pieper-reject-001", actor: "test-reviewer",
    }, db).events).toHaveLength(eventCount);
    db.close();
  });

  it("keeps AI recommendations in human review and tasks idempotent", () => {
    const db = claimsDatabase();
    const proposed = proposeClaimAction({
      claimId: "SCH-00000918", action: "REQUEST_INFORMATION", rationale: "Obtain original invoices and photo metadata.",
      confidence: 0.78, ruleVersion: "workshop-test-v1", idempotencyKey: "grimm-proposal-001", actor: "mcp-agent",
    }, db);
    expect(proposed.status).toBe("awaiting_human");
    expect(proposed.recommendations[0].status).toBe("pending_review");
    expect(proposed.paidAmount).toBe(0);
    const withTask = createClaimTask({
      claimId: proposed.claimId, type: "EVIDENCE_REVIEW", description: "Validate original evidence.",
      idempotencyKey: "grimm-task-001", actor: "mcp-agent",
    }, db);
    const taskCount = withTask.tasks.length;
    expect(createClaimTask({
      claimId: proposed.claimId, type: "EVIDENCE_REVIEW", description: "Changed replay payload.",
      idempotencyKey: "grimm-task-001", actor: "mcp-agent",
    }, db).tasks).toHaveLength(taskCount);
    db.close();
  });
});
