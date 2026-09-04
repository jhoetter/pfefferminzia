import type { DatabaseSync } from "node:sqlite";
import type {
  ContractCoverage,
  ContractDetail,
  ContractSummary,
  CustomerDetail,
  CustomerResolutionCandidate,
  CustomerSummary,
  TicketParty,
} from "../src/types";
import { getDatabase } from "./database";
import { addEvent, getTicket, listTickets } from "./store";

type Row = Record<string, unknown>;
const rows = <T extends Row>(value: unknown) => value as T[];
const one = <T extends Row>(value: unknown) => value as T | undefined;
const bool = (value: unknown) => value === true || value === 1 || String(value).toLowerCase() === "true";
const nullable = (value: unknown) => value == null || value === "" ? null : String(value);
const displayName = (row: Row) => nullable(row.firmenname) || [nullable(row.vorname), nullable(row.nachname)].filter(Boolean).join(" ");

function mapCustomerSummary(row: Row): CustomerSummary {
  return {
    partnerId: String(row.partner_id),
    displayName: String(row.display_name || displayName(row)),
    partnerType: row.partner_typ as CustomerSummary["partnerType"],
    status: String(row.status),
    country: String(row.land_wohnsitz),
    city: nullable(row.ort),
    segment: String(row.kundensegment),
    primarySystem: String(row.quellsystem_primaer),
    isPersona: bool(row.ist_persona),
    aiConsent: bool(row.datenschutz_ki_ok),
    contractCount: Number(row.contract_count ?? 0),
    activeContractCount: Number(row.active_contract_count ?? 0),
    openTicketCount: Number(row.open_ticket_count ?? 0),
  };
}

const CUSTOMER_SELECT = `SELECT p.*,
  COALESCE(p.firmenname, TRIM(COALESCE(p.vorname, '') || ' ' || COALESCE(p.nachname, ''))) AS display_name,
  a.ort,
  (SELECT COUNT(*) FROM core_vertrag v WHERE v.versicherungsnehmer_id = p.partner_id) AS contract_count,
  (SELECT COUNT(*) FROM core_vertrag v WHERE v.versicherungsnehmer_id = p.partner_id AND v.status = 'AKTIV') AS active_contract_count,
  (SELECT COUNT(DISTINCT tp.ticket_id) FROM ticket_parties tp JOIN tickets t ON t.id = tp.ticket_id
    WHERE tp.partner_id = p.partner_id AND t.status NOT IN ('sent', 'closed')) AS open_ticket_count
  FROM core_partner p
  LEFT JOIN core_partner_adresse a ON a.partner_id = p.partner_id AND a.ist_aktuell = 'true'`;

export function searchCustomers(input: { query?: string; country?: string; productId?: string; limit?: number } = {}, db = getDatabase()) {
  const where: string[] = [];
  const params: Record<string, string | number> = { limit: Math.max(1, Math.min(input.limit ?? 50, 200)) };
  if (input.query?.trim()) {
    params.query = `%${input.query.trim()}%`;
    where.push(`(p.partner_id LIKE :query OR p.vorname LIKE :query OR p.nachname LIKE :query OR p.firmenname LIKE :query
      OR a.ort LIKE :query OR EXISTS (SELECT 1 FROM core_partner_kontakt k WHERE k.partner_id = p.partner_id AND k.wert LIKE :query)
      OR EXISTS (SELECT 1 FROM core_vertrag v WHERE v.versicherungsnehmer_id = p.partner_id AND v.vertrag_id LIKE :query))`);
  }
  if (input.country) { params.country = input.country; where.push("p.land_wohnsitz = :country"); }
  if (input.productId) {
    params.productId = input.productId;
    where.push("EXISTS (SELECT 1 FROM core_vertrag v WHERE v.versicherungsnehmer_id = p.partner_id AND v.produkt_id = :productId)");
  }
  return rows(db.prepare(`${CUSTOMER_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY p.ist_persona DESC, display_name COLLATE NOCASE LIMIT :limit`).all(params)).map(mapCustomerSummary);
}

function mapContract(row: Row): ContractSummary {
  return {
    contractId: String(row.vertrag_id), productId: String(row.produkt_id), productName: String(row.produkt_name || row.produkt_id),
    line: row.sparte as "HP" | "LV", tariffGenerationId: String(row.tarifgeneration_id),
    tariffName: String(row.tarif_name || row.tarifgeneration_id), market: String(row.markt), currency: String(row.waehrung),
    status: String(row.status), startDate: String(row.beginn), endDate: nullable(row.ablauf),
    annualPremium: Number(row.jahrespraemie_brutto ?? 0), insuredSum: Number(row.versicherungssumme ?? 0),
    sourceSystem: String(row.quellsystem), handlerId: nullable(row.sachbearbeiter_id),
  };
}

const CONTRACT_SELECT = `SELECT v.*, pr.marktname AS produkt_name, tg.bezeichnung AS tarif_name
  FROM core_vertrag v LEFT JOIN core_produkt pr ON pr.produkt_id = v.produkt_id
  LEFT JOIN core_tarifgeneration tg ON tg.tarifgeneration_id = v.tarifgeneration_id`;

export function getContract(contractId: string, db = getDatabase()): ContractDetail | null {
  const row = one(db.prepare(`${CONTRACT_SELECT} WHERE v.vertrag_id = ?`).get(contractId));
  if (!row) return null;
  const coverages: ContractCoverage[] = rows(db.prepare("SELECT * FROM core_deckung WHERE vertrag_id = ? ORDER BY deckung_id").all(contractId)).map((item) => ({
    id: String(item.deckung_id), type: String(item.deckungsart), component: nullable(item.baustein),
    sum: item.summe == null ? null : Number(item.summe), deductible: item.selbstbehalt == null ? null : Number(item.selbstbehalt),
    deductibleType: nullable(item.selbstbehalt_typ),
  }));
  const riskObjects = rows(db.prepare("SELECT * FROM core_risiko_objekt WHERE vertrag_id = ? ORDER BY risiko_objekt_id").all(contractId))
    .map((item) => Object.fromEntries(Object.entries(item).map(([key, value]) => [key, nullable(value)])));
  const parties = rows(db.prepare(`SELECT r.*, p.vorname, p.nachname, p.firmenname FROM core_vertrag_partner_rolle r
    LEFT JOIN core_partner p ON p.partner_id = r.partner_id WHERE r.vertrag_id = ? ORDER BY r.rolle, r.partner_id`).all(contractId)).map((item) => ({
      partnerId: nullable(item.partner_id), displayName: item.partner_id ? displayName(item) : null, role: String(item.rolle),
      share: item.anteil_pct == null ? null : Number(item.anteil_pct),
    }));
  return {
    ...mapContract(row), policyholderId: String(row.versicherungsnehmer_id), intermediaryId: nullable(row.vermittler_id),
    channel: String(row.kanal), paymentFrequency: String(row.zahlungsweise), paymentMethod: String(row.zahlungsart),
    applicationId: nullable(row.antrag_id), coverages, riskObjects, parties,
  };
}

export function getCustomer(partnerId: string, db = getDatabase()): CustomerDetail | null {
  const row = one(db.prepare(`${CUSTOMER_SELECT} WHERE p.partner_id = ?`).get(partnerId));
  if (!row) return null;
  const contacts = rows(db.prepare("SELECT * FROM core_partner_kontakt WHERE partner_id = ? ORDER BY ist_primaer DESC, kontakt_typ").all(partnerId)).map((item) => ({
    id: String(item.kontakt_id), type: String(item.kontakt_typ), value: String(item.wert), primary: bool(item.ist_primaer),
  }));
  const addresses = rows(db.prepare("SELECT * FROM core_partner_adresse WHERE partner_id = ? ORDER BY ist_aktuell DESC, gueltig_von DESC").all(partnerId)).map((item) => ({
    id: String(item.adresse_id), type: String(item.adresse_typ), street: String(item.strasse), houseNumber: String(item.hausnummer),
    postalCode: String(item.plz), city: String(item.ort), region: String(item.region), country: String(item.land), current: bool(item.ist_aktuell),
  }));
  const relationships = rows(db.prepare(`SELECT r.*, p.partner_id AS related_id, p.vorname, p.nachname, p.firmenname,
      CASE WHEN r.partner_id_von = ? THEN 'from' ELSE 'to' END AS direction
    FROM core_partner_beziehung r JOIN core_partner p ON p.partner_id = CASE WHEN r.partner_id_von = ? THEN r.partner_id_zu ELSE r.partner_id_von END
    WHERE r.partner_id_von = ? OR r.partner_id_zu = ? ORDER BY r.beziehung`).all(partnerId, partnerId, partnerId, partnerId)).map((item) => ({
      partnerId: String(item.related_id), displayName: displayName(item), relationship: String(item.beziehung), direction: item.direction as "from" | "to",
    }));
  const contracts = rows(db.prepare(`${CONTRACT_SELECT} WHERE v.versicherungsnehmer_id = ? OR EXISTS
    (SELECT 1 FROM core_vertrag_partner_rolle r WHERE r.vertrag_id = v.vertrag_id AND r.partner_id = ?)
    ORDER BY v.status = 'AKTIV' DESC, v.beginn DESC`).all(partnerId, partnerId)).map(mapContract);
  const ticketIds = rows<{ ticket_id: number }>(db.prepare("SELECT DISTINCT ticket_id FROM ticket_parties WHERE partner_id = ?").all(partnerId)).map((item) => Number(item.ticket_id));
  const tickets = ticketIds.map((id) => listTickets({ limit: 500 }, db).find((ticket) => ticket.id === id)).filter((ticket): ticket is NonNullable<typeof ticket> => Boolean(ticket));
  const sourceReferences = rows(db.prepare("SELECT * FROM migration_partner_xref WHERE curated_id = ? ORDER BY quellsystem, gueltig_von").all(partnerId)).map((item) => ({
    system: String(item.quellsystem), sourceId: String(item.quell_id), matchMethod: String(item.match_methode), matchScore: Number(item.match_score),
    validFrom: nullable(item.gueltig_von), validTo: nullable(item.gueltig_bis),
  }));
  const timeline = [
    ...contracts.map((contract) => ({ id: `contract-${contract.contractId}`, type: "contract", title: `${contract.productName} ${contract.status}`,
      date: contract.startDate, detail: `${contract.contractId} · ${contract.tariffGenerationId}` })),
    ...tickets.map((ticket) => ({ id: `ticket-${ticket.id}`, type: "ticket", title: ticket.subject, date: ticket.createdAt, detail: ticket.ticketNumber })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  return {
    ...mapCustomerSummary(row), salutation: nullable(row.anrede), firstName: nullable(row.vorname), lastName: nullable(row.nachname),
    companyName: nullable(row.firmenname), birthDate: nullable(row.geburtsdatum), language: String(row.sprache),
    marketingConsent: bool(row.datenschutz_werbung_ok), contacts, addresses, relationships, contracts, tickets, timeline, sourceReferences,
  };
}

export function resolveTicketCustomer(ticketNumber: string, db = getDatabase()): CustomerResolutionCandidate[] {
  const ticket = getTicket(ticketNumber, db);
  if (!ticket) throw new Error(`Ticket not found: ${ticketNumber}`);
  const exact = rows(db.prepare(`${CUSTOMER_SELECT} WHERE EXISTS (SELECT 1 FROM core_partner_kontakt k
    WHERE k.partner_id = p.partner_id AND k.kontakt_typ = 'EMAIL' AND LOWER(k.wert) = LOWER(?))`).all(ticket.customerEmail))
    .map((row) => ({ ...mapCustomerSummary(row), score: 1, reason: "exact_email" }));
  if (exact.length) return exact;
  if (!ticket.customerName) return [];
  return searchCustomers({ query: ticket.customerName, limit: 8 }, db).map((customer) => ({ ...customer, score: 0.65, reason: "name_candidate" }));
}

export function linkTicketParty(input: {
  ticketNumber: string; partnerId: string; role: TicketParty["role"]; primary?: boolean;
  matchMethod?: string; confidence?: number; actor?: string;
}, db = getDatabase()) {
  const ticket = getTicket(input.ticketNumber, db);
  if (!ticket) throw new Error(`Ticket not found: ${input.ticketNumber}`);
  if (!getCustomer(input.partnerId, db)) throw new Error(`Customer not found: ${input.partnerId}`);
  const actor = input.actor || "human";
  const confidence = input.confidence ?? 1;
  const stamp = new Date().toISOString();
  if (input.primary !== false) db.prepare("UPDATE ticket_parties SET is_primary = 0 WHERE ticket_id = ?").run(ticket.id);
  db.prepare(`INSERT INTO ticket_parties (ticket_id, partner_id, role, is_primary, match_method, confidence, confirmed_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(ticket_id, partner_id, role) DO UPDATE SET is_primary = excluded.is_primary,
      match_method = excluded.match_method, confidence = excluded.confidence, confirmed_by = excluded.confirmed_by`)
    .run(ticket.id, input.partnerId, input.role, input.primary === false ? 0 : 1, input.matchMethod || "manual", confidence, actor, stamp);
  addEvent(ticket.id, "customer_linked", actor, { partnerId: input.partnerId, role: input.role, confidence, matchMethod: input.matchMethod || "manual" }, db);
  return getTicket(ticket.id, db)!;
}

export function linkTicketContract(input: { ticketNumber: string; contractId: string; actor?: string; confidence?: number; matchMethod?: string }, db = getDatabase()) {
  const ticket = getTicket(input.ticketNumber, db);
  if (!ticket) throw new Error(`Ticket not found: ${input.ticketNumber}`);
  if (!getContract(input.contractId, db)) throw new Error(`Contract not found: ${input.contractId}`);
  const actor = input.actor || "human";
  const confidence = input.confidence ?? 1;
  db.prepare(`INSERT INTO ticket_contracts (ticket_id, vertrag_id, relation, match_method, confidence, confirmed_by, created_at)
    VALUES (?, ?, 'BETRIFFT', ?, ?, ?, ?)
    ON CONFLICT(ticket_id, vertrag_id) DO UPDATE SET match_method = excluded.match_method,
      confidence = excluded.confidence, confirmed_by = excluded.confirmed_by`)
    .run(ticket.id, input.contractId, input.matchMethod || "manual", confidence, actor, new Date().toISOString());
  addEvent(ticket.id, "contract_linked", actor, { contractId: input.contractId, confidence, matchMethod: input.matchMethod || "manual" }, db);
  return getTicket(ticket.id, db)!;
}

export function autoLinkExactCustomer(ticketNumber: string, db = getDatabase()) {
  const candidates = resolveTicketCustomer(ticketNumber, db);
  if (candidates.length !== 1 || candidates[0].score !== 1) return null;
  return linkTicketParty({ ticketNumber, partnerId: candidates[0].partnerId, role: "CORRESPONDENT", primary: true,
    matchMethod: "exact_email", confidence: 1, actor: "identity-resolver" }, db);
}
