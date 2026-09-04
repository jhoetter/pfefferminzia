export const ticketStatuses = [
  "new",
  "in_progress",
  "awaiting_human",
  "scheduled",
  "sent",
  "closed",
] as const;
export type TicketStatus = (typeof ticketStatuses)[number];

export const productLines = ["unknown", "liability", "life"] as const;
export type ProductLine = (typeof productLines)[number];

export const categories = [
  "unknown",
  "general_question",
  "coverage_question",
  "claim",
  "contract_change",
  "cancellation",
  "complaint",
] as const;
export type TicketCategory = (typeof categories)[number];

export const priorities = ["low", "normal", "high", "urgent"] as const;
export type TicketPriority = (typeof priorities)[number];

export interface Ticket {
  id: number;
  ticketNumber: string;
  source: "agentmail" | "demo" | "manual";
  sourceInboxId: string | null;
  sourceThreadId: string | null;
  customerEmail: string;
  customerName: string | null;
  subject: string;
  status: TicketStatus;
  productLine: ProductLine;
  category: TicketCategory;
  priority: TicketPriority;
  summary: string | null;
  classificationConfidence: number | null;
  classificationSource: string | null;
  assignedTo: string | null;
  isDemo: boolean;
  humanApprovedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messageCount: number;
  attachmentCount: number;
  hasDraft: boolean;
  scheduledFor: string | null;
}

export interface TicketMessage {
  id: number;
  direction: "inbound" | "outbound";
  sender: string;
  recipients: string[];
  subject: string | null;
  textBody: string;
  htmlBody: string | null;
  sentAt: string;
  externalMessageId: string | null;
}

export interface TicketAttachment {
  id: number;
  messageId: number;
  filename: string;
  contentType: string;
  sizeBytes: number;
  extractedText: string | null;
  resourceUri: string;
}

export interface ReplyDraft {
  body: string;
  rationale: string | null;
  status: "draft" | "scheduled" | "approved" | "sent";
  scheduledFor: string | null;
  sentMessageId: string | null;
  updatedAt: string;
}

export interface TicketEvent {
  id: number;
  type: string;
  actor: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface TicketParty {
  partnerId: string;
  displayName: string;
  role: "CORRESPONDENT" | "VERSICHERUNGSNEHMER" | "VERSICHERTE_PERSON" | "GESCHAEDIGTER" | "VERTRETER";
  isPrimary: boolean;
  matchMethod: string;
  confidence: number;
}

export interface LinkedContract {
  contractId: string;
  productId: string;
  tariffGenerationId: string;
  relation: string;
  matchMethod: string;
  confidence: number;
}

export interface TicketDetail extends Ticket {
  messages: TicketMessage[];
  attachments: TicketAttachment[];
  draft: ReplyDraft | null;
  events: TicketEvent[];
  parties: TicketParty[];
  linkedContracts: LinkedContract[];
}

export interface CustomerSummary {
  partnerId: string;
  displayName: string;
  partnerType: "NATUERLICH" | "JURISTISCH";
  status: string;
  country: string;
  city: string | null;
  segment: string;
  primarySystem: string;
  isPersona: boolean;
  aiConsent: boolean;
  contractCount: number;
  activeContractCount: number;
  openTicketCount: number;
}

export interface CustomerContact { id: string; type: string; value: string; primary: boolean }
export interface CustomerAddress {
  id: string; type: string; street: string; houseNumber: string; postalCode: string;
  city: string; region: string; country: string; current: boolean;
}
export interface ContractSummary {
  contractId: string; productId: string; productName: string; line: "HP" | "LV";
  tariffGenerationId: string; tariffName: string; market: string; currency: string;
  status: string; startDate: string; endDate: string | null; annualPremium: number;
  insuredSum: number; sourceSystem: string; handlerId: string | null;
}
export interface ContractCoverage {
  id: string; type: string; component: string | null; sum: number | null;
  deductible: number | null; deductibleType: string | null;
}
export interface CustomerRelationship { partnerId: string; displayName: string; relationship: string; direction: "from" | "to" }
export interface CustomerTimelineItem { id: string; type: string; title: string; date: string; detail: string | null }
export interface SourceReference { system: string; sourceId: string; matchMethod: string; matchScore: number; validFrom: string | null; validTo: string | null }

export interface CustomerDetail extends CustomerSummary {
  salutation: string | null;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  birthDate: string | null;
  language: string;
  marketingConsent: boolean;
  contacts: CustomerContact[];
  addresses: CustomerAddress[];
  relationships: CustomerRelationship[];
  contracts: ContractSummary[];
  tickets: Ticket[];
  timeline: CustomerTimelineItem[];
  sourceReferences: SourceReference[];
}

export interface ContractDetail extends ContractSummary {
  policyholderId: string;
  intermediaryId: string | null;
  channel: string;
  paymentFrequency: string;
  paymentMethod: string;
  applicationId: string | null;
  coverages: ContractCoverage[];
  riskObjects: Record<string, string | null>[];
  parties: { partnerId: string | null; displayName: string | null; role: string; share: number | null }[];
}

export interface CustomerResolutionCandidate extends CustomerSummary {
  score: number;
  reason: string;
}

export interface TariffDocument {
  id: string;
  title: string;
  productLine: Exclude<ProductLine, "unknown">;
  filename: string;
  summary: string;
  textContent: string;
  resourceUri: string;
}

export interface DashboardData {
  tickets: Ticket[];
  counts: Record<TicketStatus, number>;
  connectedInbox: string | null;
  lastSyncAt: string | null;
  autoSendEnabled: boolean;
}
