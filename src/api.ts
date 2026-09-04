import type { ContractDetail, CustomerDetail, CustomerResolutionCandidate, CustomerSummary, DashboardData, ProductLine, ReplyDraft, TariffDocument, TicketCategory, TicketDetail, TicketPriority, TicketStatus } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((payload as { error?: string }).error || `Request failed (${response.status})`);
  return payload as T;
}

export const api = {
  dashboard: () => request<DashboardData>("/api/dashboard"),
  ticket: (ticketNumber: string) => request<TicketDetail>(`/api/tickets/${ticketNumber}`),
  tariffs: () => request<TariffDocument[]>("/api/tariffs"),
  customers: (query = "") => request<CustomerSummary[]>(`/api/customers?q=${encodeURIComponent(query)}&limit=100`),
  customer: (partnerId: string) => request<CustomerDetail>(`/api/customers/${partnerId}`),
  contract: (contractId: string) => request<ContractDetail>(`/api/contracts/${contractId}`),
  contractDocuments: (contractId: string) => request<TariffDocument[]>(`/api/contracts/${contractId}/documents`),
  customerCandidates: (ticketNumber: string) => request<CustomerResolutionCandidate[]>(`/api/tickets/${ticketNumber}/customer-candidates`),
  linkCustomer: (ticketNumber: string, partnerId: string) => request<TicketDetail>(`/api/tickets/${ticketNumber}/parties/${partnerId}`, {
    method: "PUT", body: JSON.stringify({ role: "CORRESPONDENT", primary: true, confidence: 1, matchMethod: "manual" }),
  }),
  linkContract: (ticketNumber: string, contractId: string) => request<TicketDetail>(`/api/tickets/${ticketNumber}/contracts/${contractId}`, {
    method: "PUT", body: JSON.stringify({ confidence: 1, matchMethod: "manual" }),
  }),
  sync: () => request<{ importedTickets: number; importedMessages: number; importedAttachments: number }>("/api/sync", { method: "POST" }),
  classify: (ticketNumber: string, input: { productLine: ProductLine; category: TicketCategory; priority: TicketPriority; summary: string }) =>
    request<TicketDetail>(`/api/tickets/${ticketNumber}/classify`, { method: "POST", body: JSON.stringify(input) }),
  status: (ticketNumber: string, status: TicketStatus) =>
    request<TicketDetail>(`/api/tickets/${ticketNumber}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  draft: (ticketNumber: string, input: Pick<ReplyDraft, "body" | "rationale">) =>
    request<TicketDetail>(`/api/tickets/${ticketNumber}/draft`, { method: "PUT", body: JSON.stringify(input) }),
  note: (ticketNumber: string, body: string) =>
    request<TicketDetail>(`/api/tickets/${ticketNumber}/notes`, { method: "POST", body: JSON.stringify({ body }) }),
  submit: (ticketNumber: string) =>
    request<TicketDetail>(`/api/tickets/${ticketNumber}/submit`, { method: "POST", body: JSON.stringify({ delayHours: 24 }) }),
  approve: (ticketNumber: string) =>
    request<TicketDetail>(`/api/tickets/${ticketNumber}/approve`, { method: "POST", body: "{}" }),
  send: (ticketNumber: string) =>
    request<TicketDetail>(`/api/tickets/${ticketNumber}/send`, { method: "POST", body: "{}" }),
};
