import type { DatabaseSync } from "node:sqlite";
import { getDatabase } from "./database";
import { ensureWorkshopClaims } from "./claims";

const PROFILE = "participant" as const;

export function assertParticipantProfile() {
  const configured = process.env.WORKSHOP_PROFILE || PROFILE;
  if (configured !== PROFILE) {
    throw new Error(`Unsupported WORKSHOP_PROFILE=${configured}. The operational service only supports the participant profile and never exposes instructor truth data.`);
  }
  return PROFILE;
}

interface DemoTicket {
  ticketNumber: string;
  partnerId: string;
  contractId: string;
  claimId: string;
  email: string;
  customerName: string;
  subject: string;
  status: "in_progress" | "awaiting_human";
  category: "coverage_question" | "claim" | "complaint";
  priority: "normal" | "high" | "urgent";
  summary: string;
  body: string;
  createdAt: string;
}

const demoTickets: DemoTicket[] = [
  {
    ticketNumber: "PF-10001", partnerId: "PTR-00000001", contractId: "VTR-00000101", claimId: "SCH-00000118",
    email: "simone.niederberger@mail.example", customerName: "Simone Niederberger", subject: "E-Bike des Nachbarn beschädigt",
    status: "in_progress", category: "coverage_question", priority: "normal",
    summary: "Kundin fragt nach Deckung für den durch ihr Kind verursachten E-Bike-Schaden.",
    body: "Guten Tag\n\nmein Sohn hat beim Spielen das E-Bike unseres Nachbarn umgestossen. Ich habe drei Fotos und den Kostenvoranschlag. Können Sie mir kurz sagen, ob das versichert ist?\n\nFreundliche Grüsse\nSimone Niederberger",
    createdAt: "2025-05-18T09:15:00Z",
  },
  {
    ticketNumber: "PF-10003", partnerId: "PTR-00000003", contractId: "VTR-00000301", claimId: "SCH-00000318",
    email: "broker.kaufmann@workshop.invalid", customerName: "Schreinerei Kaufmann + Söhne GmbH", subject: "Grossschaden Wasser – Entscheidung Teilzahlung",
    status: "awaiting_human", category: "claim", priority: "high",
    summary: "Makler fordert eine Teilzahlung; Schadenhöhe und Regressursache benötigen Kompetenzfreigabe.",
    body: "Sehr geehrte Damen und Herren\n\nzum Wasserschaden unseres Kunden liegt das Gutachten vor. Wir erwarten Ihre Stellungnahme zur beantragten Teilzahlung und zur weiteren Regressprüfung.\n\nFreundliche Grüsse\nBroker Mittelland AG",
    createdAt: "2024-06-18T08:10:00Z",
  },
  {
    ticketNumber: "PF-10008", partnerId: "PTR-00000008", contractId: "VTR-00000801", claimId: "SCH-00000810",
    email: "hpieper@bluemail.example", customerName: "Hans-Georg Pieper", subject: "BESCHWERDE – SCHADEN SCH-00000810",
    status: "awaiting_human", category: "complaint", priority: "urgent",
    summary: "Kunde widerspricht der systemseitigen Ablehnung und verweist auf den Hundehalter-Baustein seit 2019.",
    body: "BESCHWERDE – SCHADEN NR. SCH-00000810\n\nIch lasse mir das nicht gefallen. Den Hundehalter-Baustein bezahle ich seit 2019. Prüfen Sie Ihre Unterlagen und bestätigen Sie mir binnen 14 Tagen die Regulierung.\n\nHochachtungsvoll\nH.-G. Pieper",
    createdAt: "2025-03-28T10:00:00Z",
  },
  {
    ticketNumber: "PF-10009", partnerId: "PTR-00000009", contractId: "VTR-00000901", claimId: "SCH-00000918",
    email: "marcel.grimm@workshop.invalid", customerName: "Transportlogistik Grimm e.K.", subject: "Wasserschaden beim Transport – Rechnung anbei",
    status: "in_progress", category: "claim", priority: "urgent",
    summary: "Serienschaden mit Beleg- und Zeitabweichungen; Signale erfordern SIU- und Fairness-Prüfung.",
    body: "hallo\n\nschaden ist passiert beim entladen, wasserkanister ist umgekippt. hab alles hochgeladen, kunde will sein geld.\n\nGruß Marcel",
    createdAt: "2024-08-29T12:20:00Z",
  },
];

/** Add deterministic, non-sendable participant exercises without changing imported Falk tables. */
export function ensureWorkshopFixtures(db = getDatabase()) {
  assertParticipantProfile();
  const insertTicket = db.prepare(`INSERT INTO tickets
    (ticket_number, source, customer_email, customer_name, subject, status, product_line, category, priority, summary,
     classification_confidence, classification_source, is_demo, created_at, updated_at, last_message_at)
    VALUES (?, 'demo', ?, ?, ?, ?, 'liability', ?, ?, ?, 1, 'workshop-fixture', 1, ?, ?, ?)
    ON CONFLICT(ticket_number) DO NOTHING`);
  for (const fixture of demoTickets) {
    const inserted = insertTicket.run(fixture.ticketNumber, fixture.email, fixture.customerName, fixture.subject, fixture.status,
      fixture.category, fixture.priority, fixture.summary, fixture.createdAt, fixture.createdAt, fixture.createdAt);
    const ticket = db.prepare("SELECT id FROM tickets WHERE ticket_number = ? AND source = 'demo'").get(fixture.ticketNumber) as { id: number } | undefined;
    if (!ticket) throw new Error(`Workshop ticket number is occupied by a non-demo record: ${fixture.ticketNumber}`);
    db.prepare(`INSERT OR IGNORE INTO messages
      (ticket_id, external_message_id, direction, sender, recipients_json, subject, text_body, sent_at, created_at)
      VALUES (?, ?, 'inbound', ?, '["service@pfefferminzia.invalid"]', ?, ?, ?, ?)`)
      .run(ticket.id, `workshop:${fixture.ticketNumber}:message:1`, fixture.email, fixture.subject, fixture.body, fixture.createdAt, fixture.createdAt);
    db.prepare(`INSERT OR IGNORE INTO ticket_parties
      (ticket_id, partner_id, role, is_primary, match_method, confidence, confirmed_by, created_at)
      VALUES (?, ?, 'CORRESPONDENT', 1, 'workshop_fixture', 1, 'workshop-fixture', ?)`)
      .run(ticket.id, fixture.partnerId, fixture.createdAt);
    db.prepare(`INSERT OR IGNORE INTO ticket_contracts
      (ticket_id, vertrag_id, relation, match_method, confidence, confirmed_by, created_at)
      VALUES (?, ?, 'BETRIFFT', 'workshop_fixture', 1, 'workshop-fixture', ?)`)
      .run(ticket.id, fixture.contractId, fixture.createdAt);
    db.prepare("UPDATE workshop_claims SET ticket_id = ? WHERE claim_id = ? AND ticket_id IS NULL").run(ticket.id, fixture.claimId);
    if (Number(inserted.changes) > 0) {
      db.prepare("INSERT INTO ticket_events (ticket_id, type, actor, details_json, created_at) VALUES (?, 'workshop_fixture_loaded', 'workshop-fixture', ?, ?)")
        .run(ticket.id, JSON.stringify({ partnerId: fixture.partnerId, contractId: fixture.contractId, claimId: fixture.claimId }), fixture.createdAt);
    }
  }
  return getWorkshopStatus(db);
}

export function getWorkshopStatus(db = getDatabase()) {
  const demoTicketsCount = Number((db.prepare("SELECT COUNT(*) AS count FROM tickets WHERE source = 'demo'").get() as { count: number }).count);
  const claimsCount = Number((db.prepare("SELECT COUNT(*) AS count FROM workshop_claims").get() as { count: number }).count);
  const truthTables = Number((db.prepare("SELECT COUNT(*) AS count FROM source_tables WHERE layer = 'truth'").get() as { count: number }).count);
  return {
    profile: assertParticipantProfile(), syntheticDataOnly: true, workshopPurposeOnly: true,
    demoTickets: demoTicketsCount, workshopClaims: claimsCount, importedTruthTables: truthTables,
    externalEffects: { demoEmailSendBlocked: true, claimPaymentsImplemented: false, claimDecisionCommunicationImplemented: false },
  };
}

/** Reset only local demo records and workshop claims. AgentMail/manual tickets and imported Falk tables are preserved. */
export function resetWorkshopFixtures(db = getDatabase()) {
  assertParticipantProfile();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("DELETE FROM workshop_claims").run();
    db.prepare("DELETE FROM tickets WHERE source = 'demo'").run();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  ensureWorkshopClaims(db);
  return ensureWorkshopFixtures(db);
}
