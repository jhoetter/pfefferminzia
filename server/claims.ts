import type { DatabaseSync } from "node:sqlite";
import type {
  ClaimAction,
  ClaimDetail,
  ClaimEvent,
  ClaimRecommendation,
  ClaimStatus,
  ClaimSummary,
  ClaimTask,
} from "../src/types";
import { claimActions, claimStatuses } from "../src/types";
import { getDatabase } from "./database";
import { listContractDocuments } from "./store";

type Row = Record<string, unknown>;
const rows = <T extends Row>(value: unknown) => value as T[];
const one = <T extends Row>(value: unknown) => value as T | undefined;
const nullable = (value: unknown) => value == null || value === "" ? null : String(value);
const now = () => new Date().toISOString();

const CLAIM_SELECT = `SELECT c.*,
  COALESCE(p.firmenname, TRIM(COALESCE(p.vorname, '') || ' ' || COALESCE(p.nachname, ''))) AS customer_name,
  COALESCE(pr.marktname, v.produkt_id) AS product_name,
  v.tarifgeneration_id,
  t.ticket_number
  FROM workshop_claims c
  JOIN core_partner p ON p.partner_id = c.policyholder_id
  JOIN core_vertrag v ON v.vertrag_id = c.contract_id
  LEFT JOIN core_produkt pr ON pr.produkt_id = v.produkt_id
  LEFT JOIN tickets t ON t.id = c.ticket_id`;

function mapClaim(row: Row, db: DatabaseSync): ClaimSummary {
  return {
    claimId: String(row.claim_id),
    contractId: String(row.contract_id),
    policyholderId: String(row.policyholder_id),
    customerName: String(row.customer_name),
    productName: String(row.product_name),
    tariffGenerationId: String(row.tarifgeneration_id),
    policyDocumentIds: listContractDocuments(String(row.contract_id), db).map((document) => document.id),
    ticketNumber: nullable(row.ticket_number),
    title: String(row.title),
    eventDate: String(row.event_date),
    notifiedAt: String(row.notified_at),
    productLine: row.product_line as ClaimSummary["productLine"],
    market: row.market as ClaimSummary["market"],
    currency: row.currency as ClaimSummary["currency"],
    reportedAmount: Number(row.reported_amount),
    reserveAmount: Number(row.reserve_amount),
    paidAmount: Number(row.paid_amount),
    status: row.status as ClaimStatus,
    riskLevel: row.risk_level as ClaimSummary["riskLevel"],
    assignedTeam: String(row.assigned_team),
    summary: String(row.summary),
    scenario: String(row.scenario),
    sourceReference: String(row.source_reference),
    workshopExtension: Boolean(row.workshop_extension),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapRecommendation(row: Row): ClaimRecommendation {
  return {
    id: Number(row.id), action: row.action as ClaimAction,
    amount: row.amount == null ? null : Number(row.amount), rationale: String(row.rationale),
    confidence: Number(row.confidence), ruleVersion: String(row.rule_version), proposedBy: String(row.proposed_by),
    status: row.status as ClaimRecommendation["status"], reviewedBy: nullable(row.reviewed_by),
    reviewerNote: nullable(row.reviewer_note), createdAt: String(row.created_at), reviewedAt: nullable(row.reviewed_at),
  };
}

function mapTask(row: Row): ClaimTask {
  return {
    id: Number(row.id), type: String(row.type), description: String(row.description), status: row.status as ClaimTask["status"],
    assignedTo: nullable(row.assigned_to), dueAt: nullable(row.due_at), createdBy: String(row.created_by),
    createdAt: String(row.created_at), completedAt: nullable(row.completed_at),
  };
}

function mapEvent(row: Row): ClaimEvent {
  return {
    id: Number(row.id), type: String(row.type), actor: String(row.actor),
    details: JSON.parse(String(row.details_json)) as Record<string, unknown>, createdAt: String(row.created_at),
  };
}

export interface ClaimQuery {
  status?: ClaimStatus;
  riskLevel?: ClaimSummary["riskLevel"];
  partnerId?: string;
  contractId?: string;
  q?: string;
  limit?: number;
}

export function listClaims(query: ClaimQuery = {}, db = getDatabase()): ClaimSummary[] {
  const where: string[] = [];
  const params: Record<string, string | number> = {};
  if (query.status) {
    if (!claimStatuses.includes(query.status)) throw new Error(`Invalid claim status: ${query.status}`);
    where.push("c.status = :status"); params.status = query.status;
  }
  if (query.riskLevel) {
    if (!["low", "medium", "high", "critical"].includes(query.riskLevel)) throw new Error(`Invalid risk level: ${query.riskLevel}`);
    where.push("c.risk_level = :riskLevel"); params.riskLevel = query.riskLevel;
  }
  if (query.partnerId) { where.push("c.policyholder_id = :partnerId"); params.partnerId = query.partnerId; }
  if (query.contractId) { where.push("c.contract_id = :contractId"); params.contractId = query.contractId; }
  if (query.q?.trim()) {
    where.push("(c.claim_id LIKE :q OR c.title LIKE :q OR c.summary LIKE :q OR c.contract_id LIKE :q OR c.policyholder_id LIKE :q)");
    params.q = `%${query.q.trim()}%`;
  }
  params.limit = Math.max(1, Math.min(query.limit ?? 100, 500));
  return rows(db.prepare(`${CLAIM_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY CASE c.risk_level WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      c.updated_at DESC LIMIT :limit`).all(params)).map((row) => mapClaim(row, db));
}

export function getClaim(claimId: string, db = getDatabase()): ClaimDetail | null {
  const row = one(db.prepare(`${CLAIM_SELECT} WHERE c.claim_id = ?`).get(claimId));
  if (!row) return null;
  return {
    ...mapClaim(row, db),
    recommendations: rows(db.prepare("SELECT * FROM workshop_claim_recommendations WHERE claim_id = ? ORDER BY created_at DESC, id DESC").all(claimId)).map(mapRecommendation),
    tasks: rows(db.prepare("SELECT * FROM workshop_claim_tasks WHERE claim_id = ? ORDER BY status = 'open' DESC, created_at DESC, id DESC").all(claimId)).map(mapTask),
    events: rows(db.prepare("SELECT * FROM workshop_claim_events WHERE claim_id = ? ORDER BY created_at DESC, id DESC").all(claimId)).map(mapEvent),
    humanReviewRequired: true,
    automationBoundary: "AI may retrieve evidence, create tasks, and propose an action. A human must approve every new claim decision; approval does not send messages or execute payments.",
  };
}

function addClaimEvent(claimId: string, type: string, actor: string, details: Record<string, unknown>, db: DatabaseSync, createdAt = now()) {
  db.prepare("INSERT INTO workshop_claim_events (claim_id, type, actor, details_json, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(claimId, type, actor, JSON.stringify(details), createdAt);
}

function priorCommand(idempotencyKey: string, command: string, claimId: string | undefined, db: DatabaseSync) {
  const existing = one(db.prepare("SELECT * FROM workshop_claim_commands WHERE idempotency_key = ?").get(idempotencyKey));
  if (!existing) return null;
  if (existing.command !== command || (claimId && existing.claim_id !== claimId)) {
    throw new Error("Idempotency key was already used for a different claim command");
  }
  return getClaim(String(existing.claim_id), db);
}

function recordCommand(idempotencyKey: string, claimId: string, command: string, actor: string, db: DatabaseSync, createdAt = now()) {
  db.prepare("INSERT INTO workshop_claim_commands (idempotency_key, claim_id, command, actor, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(idempotencyKey, claimId, command, actor, createdAt);
}

export function createClaimFromTicket(input: {
  ticketNumber: string; title: string; eventDate: string; reportedAmount: number;
  idempotencyKey: string; actor?: string;
}, db = getDatabase()): ClaimDetail {
  const replay = priorCommand(input.idempotencyKey, "create_from_ticket", undefined, db);
  if (replay) return replay;
  const ticket = one(db.prepare("SELECT * FROM tickets WHERE ticket_number = ?").get(input.ticketNumber));
  if (!ticket) throw new Error(`Ticket not found: ${input.ticketNumber}`);
  if (ticket.category !== "claim") throw new Error("Ticket must be classified as a claim before claim creation");
  const contracts = rows(db.prepare(`SELECT v.* FROM ticket_contracts tc JOIN core_vertrag v ON v.vertrag_id = tc.vertrag_id
    WHERE tc.ticket_id = ? ORDER BY tc.created_at`).all(Number(ticket.id)));
  if (contracts.length !== 1) throw new Error("Ticket must be linked to exactly one contract before claim creation");
  const contract = contracts[0];
  const sequence = Number((one(db.prepare("SELECT COUNT(*) AS count FROM workshop_claims WHERE claim_id LIKE 'WKS-%'").get())?.count ?? 0)) + 1;
  const claimId = `WKS-${String(sequence).padStart(6, "0")}`;
  const actor = input.actor || "human";
  const stamp = now();
  const productLine = contract.sparte === "LV" ? "life" : "liability";
  const riskLevel = productLine === "life" || input.reportedAmount > 25_000 ? "high" : input.reportedAmount > 5_000 ? "medium" : "low";
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`INSERT INTO workshop_claims
      (claim_id, contract_id, policyholder_id, ticket_id, title, event_date, notified_at, product_line, market, currency,
       reported_amount, reserve_amount, paid_amount, status, risk_level, assigned_team, summary, scenario, source_reference,
       workshop_extension, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'new', ?, ?, ?, 'ticket_intake', ?, 1, ?, ?)`)
      .run(claimId, String(contract.vertrag_id), String(contract.versicherungsnehmer_id), Number(ticket.id), input.title.trim(), input.eventDate, stamp,
        productLine, String(contract.markt), String(contract.waehrung), input.reportedAmount, input.reportedAmount, riskLevel,
        productLine === "life" ? "Claims Life Human Review" : `Claims Liability ${String(contract.markt)}`,
        String(ticket.summary || ticket.subject), `Workshop claim created from ${input.ticketNumber}; no upstream claim record.`, stamp, stamp);
    recordCommand(input.idempotencyKey, claimId, "create_from_ticket", actor, db, stamp);
    addClaimEvent(claimId, "claim_created_from_ticket", actor, { ticketNumber: input.ticketNumber, contractId: String(contract.vertrag_id) }, db, stamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return getClaim(claimId, db)!;
}

export function proposeClaimAction(input: {
  claimId: string; action: ClaimAction; amount?: number; rationale: string; confidence: number;
  ruleVersion: string; idempotencyKey: string; actor?: string;
}, db = getDatabase()): ClaimDetail {
  const replay = priorCommand(input.idempotencyKey, "propose_action", input.claimId, db);
  if (replay) return replay;
  const claim = getClaim(input.claimId, db);
  if (!claim) throw new Error(`Claim not found: ${input.claimId}`);
  if (!claimActions.includes(input.action)) throw new Error(`Invalid claim action: ${input.action}`);
  if (!input.rationale.trim()) throw new Error("Recommendation rationale cannot be empty");
  if (input.confidence < 0 || input.confidence > 1) throw new Error("Confidence must be between 0 and 1");
  if (input.action === "PAY" && (!input.amount || input.amount <= 0)) throw new Error("A positive amount is required for payment recommendations");
  if (input.amount != null && input.amount > claim.reportedAmount) throw new Error("Recommended amount cannot exceed the reported amount");
  const actor = input.actor || "mcp-agent";
  const stamp = now();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`INSERT INTO workshop_claim_recommendations
      (claim_id, action, amount, rationale, confidence, rule_version, proposed_by, status, created_at, idempotency_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?)`)
      .run(input.claimId, input.action, input.amount ?? null, input.rationale.trim(), input.confidence, input.ruleVersion, actor, stamp, input.idempotencyKey);
    db.prepare("UPDATE workshop_claims SET status = 'awaiting_human', updated_at = ? WHERE claim_id = ?").run(stamp, input.claimId);
    recordCommand(input.idempotencyKey, input.claimId, "propose_action", actor, db, stamp);
    addClaimEvent(input.claimId, "action_proposed", actor, { action: input.action, amount: input.amount, confidence: input.confidence, ruleVersion: input.ruleVersion }, db, stamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return getClaim(input.claimId, db)!;
}

export function reviewClaimAction(input: {
  claimId: string; recommendationId: number; decision: "approve" | "reject"; note: string;
  idempotencyKey: string; actor?: string;
}, db = getDatabase()): ClaimDetail {
  const replay = priorCommand(input.idempotencyKey, "review_action", input.claimId, db);
  if (replay) return replay;
  const claim = getClaim(input.claimId, db);
  if (!claim) throw new Error(`Claim not found: ${input.claimId}`);
  const recommendation = one(db.prepare("SELECT * FROM workshop_claim_recommendations WHERE id = ? AND claim_id = ?").get(input.recommendationId, input.claimId));
  if (!recommendation) throw new Error(`Recommendation not found: ${input.recommendationId}`);
  if (recommendation.status !== "pending_review" && recommendation.status !== "blocked") throw new Error("Recommendation was already reviewed");
  if (recommendation.status === "blocked" && input.decision === "approve") throw new Error("A blocked recommendation cannot be approved; reject it and create a corrected proposal");
  if (!input.note.trim()) throw new Error("A human review note is required");
  const actor = input.actor || "human-reviewer";
  const stamp = now();
  const statusByAction: Record<ClaimAction, ClaimStatus> = {
    PAY: "approved", DENY: "closed", REQUEST_INFORMATION: "awaiting_information",
    ESCALATE_COMPLEX: "investigation", REFER_SIU: "investigation",
  };
  const nextStatus = input.decision === "approve" ? statusByAction[recommendation.action as ClaimAction] : "triage";
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`UPDATE workshop_claim_recommendations SET status = ?, reviewed_by = ?, reviewer_note = ?, reviewed_at = ? WHERE id = ?`)
      .run(input.decision === "approve" ? "approved" : "rejected", actor, input.note.trim(), stamp, input.recommendationId);
    db.prepare("UPDATE workshop_claims SET status = ?, updated_at = ? WHERE claim_id = ?").run(nextStatus, stamp, input.claimId);
    recordCommand(input.idempotencyKey, input.claimId, "review_action", actor, db, stamp);
    addClaimEvent(input.claimId, "action_reviewed", actor, { recommendationId: input.recommendationId, decision: input.decision, nextStatus }, db, stamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return getClaim(input.claimId, db)!;
}

export function createClaimTask(input: {
  claimId: string; type: string; description: string; assignedTo?: string; dueAt?: string;
  idempotencyKey: string; actor?: string;
}, db = getDatabase()): ClaimDetail {
  const replay = priorCommand(input.idempotencyKey, "create_task", input.claimId, db);
  if (replay) return replay;
  if (!getClaim(input.claimId, db)) throw new Error(`Claim not found: ${input.claimId}`);
  if (!input.type.trim() || !input.description.trim()) throw new Error("Task type and description are required");
  const actor = input.actor || "mcp-agent";
  const stamp = now();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`INSERT INTO workshop_claim_tasks
      (claim_id, type, description, status, assigned_to, due_at, created_by, created_at, idempotency_key)
      VALUES (?, ?, ?, 'open', ?, ?, ?, ?, ?)`)
      .run(input.claimId, input.type.trim(), input.description.trim(), input.assignedTo || null, input.dueAt || null, actor, stamp, input.idempotencyKey);
    recordCommand(input.idempotencyKey, input.claimId, "create_task", actor, db, stamp);
    addClaimEvent(input.claimId, "task_created", actor, { type: input.type, assignedTo: input.assignedTo, dueAt: input.dueAt }, db, stamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return getClaim(input.claimId, db)!;
}

interface SeedClaim {
  claim: [string, string, string, string, string, string, "liability" | "life", "CH" | "DE", "CHF" | "EUR", number, number, number, ClaimStatus, ClaimSummary["riskLevel"], string, string, string, string, string];
  recommendation: [ClaimAction, number | null, string, number, string, string, ClaimRecommendation["status"], string | null, string | null, string];
  events: [string, string, Record<string, unknown>, string][];
  tasks?: [string, string, string | null, string | null, string][];
}

const seedClaims: SeedClaim[] = [
  {
    claim: ["SCH-00000118", "VTR-00000101", "PTR-00000001", "Damaged neighbour's e-bike", "2025-05-17", "2025-05-18T09:15:00Z", "liability", "CH", "CHF", 2340, 0, 2340, "settled", "low", "Claims Liability CH", "Child knocked over a neighbour's e-bike; display and frame damage documented.", "correct_small_claim_automation", "Falk core_schaden SCH-00000118; operational workshop snapshot", "2025-05-18T09:15:00Z"],
    recommendation: ["PAY", 2340, "Historical workshop snapshot: amount below CHF 5,000 with estimate and follow-up answers available.", 0.96, "MINT-Triage-v2/R08", "historical-workshop-import", "approved", "historical-rule-execution", "Recorded from the public synthetic persona narrative.", "2025-05-21T10:00:00Z"],
    events: [
      ["claim_reported", "customer-app", { channel: "app", photos: 3 }, "2025-05-18T09:15:00Z"],
      ["information_received", "contact-center", { subject: "child_age_and_supervision" }, "2025-05-19T14:00:00Z"],
      ["payment_recorded", "historical-workshop-import", { amount: 2340, currency: "CHF" }, "2025-05-21T10:00:00Z"],
    ],
  },
  {
    claim: ["SCH-00000810", "VTR-00000801", "PTR-00000008", "Dog bite involving cyclist", "2025-03-21", "2025-03-21T15:20:00Z", "liability", "DE", "EUR", 1240, 1240, 0, "awaiting_human", "critical", "Claims Liability DE", "A migrated component mismatch conflicts with the documented dog-owner extension and requires human correction.", "pieper_wrongful_denial_governance", "Falk core_schaden SCH-00000810; operational workshop snapshot", "2025-03-21T15:20:00Z"],
    recommendation: ["DENY", null, "Legacy configuration did not find the animal-owner component in the migrated target field. Source-policy notes contradict this result.", 0.81, "MINT-Triage-v3/legacy-replay", "workshop-legacy-model", "blocked", null, "Blocked by the no-automated-denial control.", "2025-03-24T08:30:00Z"],
    events: [
      ["claim_reported", "contact-center", { keywords: ["dog", "bite", "cyclist", "leash"] }, "2025-03-21T15:20:00Z"],
      ["recommendation_blocked", "governance-control", { policy: "denials_require_human_review", conflict: "migration_source_vs_target" }, "2025-03-24T08:30:00Z"],
    ],
    tasks: [["SOURCE_POLICY_CHECK", "Verify the dog-owner extension against the HAPO source and 2019 advisory record.", "Claims Liability DE", "2025-03-25T16:00:00Z", "2025-03-24T08:31:00Z"]],
  },
  {
    claim: ["SCH-00000318", "VTR-00000301", "PTR-00000003", "Water damage after kitchen installation", "2024-03-12", "2024-03-13T08:00:00Z", "liability", "CH", "CHF", 180000, 172400, 95000, "investigation", "high", "Claims Complex CH", "Water affected three apartments; causation between fitting defect and installation remains material for recourse.", "complex_loss_and_recourse", "Falk core_schaden SCH-00000318; operational workshop snapshot", "2024-03-13T08:00:00Z"],
    recommendation: ["ESCALATE_COMPLEX", null, "Reported amount exceeds delegated authority and causation affects supplier recourse. Preserve expert evidence and require team-lead review.", 0.93, "Complex-Claims-v1/R25K", "workshop-triage-agent", "pending_review", null, null, "2024-03-20T09:00:00Z"],
    events: [
      ["claim_reported", "broker", { channel: "broker" }, "2024-03-13T08:00:00Z"],
      ["reserve_changed", "claims-handler", { from: 0, to: 120000, currency: "CHF" }, "2024-03-20T09:00:00Z"],
      ["partial_payment_recorded", "team-lead", { amount: 95000, currency: "CHF" }, "2024-09-02T10:00:00Z"],
    ],
    tasks: [["RECOURSE_REVIEW", "Assess recovery against the fitting supplier after expert causation review.", "Claims Complex CH", null, "2024-08-01T09:00:00Z"]],
  },
  {
    claim: ["SCH-00000918", "VTR-00000901", "PTR-00000009", "Water damage during transport", "2024-08-29", "2024-08-29T12:20:00Z", "liability", "DE", "EUR", 6800, 6800, 0, "investigation", "critical", "Special Investigation Unit", "Frequency, document-template similarity, and photo timing are signals for investigation, not proof of fraud.", "fraud_signals_and_fairness", "Falk core_schaden SCH-00000918; operational workshop snapshot", "2024-08-29T12:20:00Z"],
    recommendation: ["REFER_SIU", null, "Multiple claims and evidence inconsistencies warrant investigation. Do not treat postcode cluster as a standalone decision feature.", 0.87, "Fraud-Signals-v2/fairness-guard", "workshop-fraud-model", "pending_review", null, null, "2024-09-03T07:45:00Z"],
    events: [
      ["claim_reported", "customer-app", { channel: "app" }, "2024-08-29T12:20:00Z"],
      ["signals_recorded", "workshop-fraud-model", { signals: ["frequency", "document_similarity", "photo_timing"], excludedFromDecision: ["postcode_cluster"] }, "2024-09-03T07:45:00Z"],
    ],
    tasks: [["FAIRNESS_REVIEW", "Review signal contribution and document why geographic proxy data is not used as a sole decision basis.", "AI Compliance", null, "2024-09-03T07:46:00Z"]],
  },
];

/** Project selected upstream claims into a mutable workshop workflow without changing Falk's imported facts. */
export function ensureWorkshopClaims(db = getDatabase()) {
  const contractExists = db.prepare("SELECT 1 FROM core_vertrag WHERE vertrag_id = ?");
  const sourceClaim = db.prepare("SELECT vertrag_id, partner_id FROM core_schaden WHERE schaden_id = ?");
  const insertClaim = db.prepare(`INSERT INTO workshop_claims
    (claim_id, contract_id, policyholder_id, title, event_date, notified_at, product_line, market, currency,
     reported_amount, reserve_amount, paid_amount, status, risk_level, assigned_team, summary, scenario, source_reference,
     workshop_extension, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(claim_id) DO NOTHING`);
  for (const seed of seedClaims) {
    if (!contractExists.get(seed.claim[1])) throw new Error(`Cannot seed workshop claim; Falk contract is missing: ${seed.claim[1]}`);
    const source = sourceClaim.get(seed.claim[0]) as { vertrag_id: string; partner_id: string } | undefined;
    if (!source) throw new Error(`Cannot seed workshop claim; Falk claim is missing: ${seed.claim[0]}`);
    if (source.vertrag_id !== seed.claim[1] || source.partner_id !== seed.claim[2]) {
      throw new Error(`Cannot seed workshop claim; Falk claim linkage differs: ${seed.claim[0]}`);
    }
    const result = insertClaim.run(...seed.claim, seed.claim[18]);
    db.prepare("UPDATE workshop_claims SET source_reference = ? WHERE claim_id = ? AND workshop_extension = 1")
      .run(seed.claim[17], seed.claim[0]);
    if (Number(result.changes) === 0) continue;
    const [action, amount, rationale, confidence, ruleVersion, proposedBy, status, reviewedBy, reviewerNote, createdAt] = seed.recommendation;
    db.prepare(`INSERT INTO workshop_claim_recommendations
      (claim_id, action, amount, rationale, confidence, rule_version, proposed_by, status, reviewed_by, reviewer_note, created_at, reviewed_at, idempotency_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(seed.claim[0], action, amount, rationale, confidence, ruleVersion, proposedBy, status, reviewedBy, reviewerNote, createdAt,
        reviewedBy ? createdAt : null, `seed:${seed.claim[0]}:recommendation`);
    for (const [type, actor, details, eventAt] of seed.events) addClaimEvent(seed.claim[0], type, actor, details, db, eventAt);
    for (const [type, description, assignedTo, dueAt, taskAt] of seed.tasks ?? []) {
      db.prepare(`INSERT INTO workshop_claim_tasks
        (claim_id, type, description, status, assigned_to, due_at, created_by, created_at, idempotency_key)
        VALUES (?, ?, ?, 'open', ?, ?, 'historical-workshop-import', ?, ?)`)
        .run(seed.claim[0], type, description, assignedTo, dueAt, taskAt, `seed:${seed.claim[0]}:task:${type}`);
    }
  }
}
