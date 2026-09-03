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

export interface TicketDetail extends Ticket {
  messages: TicketMessage[];
  attachments: TicketAttachment[];
  draft: ReplyDraft | null;
  events: TicketEvent[];
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
