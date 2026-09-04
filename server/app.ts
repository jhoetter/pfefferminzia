import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { approveDraft, addInternalNote, dashboardMeta, getAttachmentRecord, getDocumentRecord, getTicket, listContractDocuments, listTariffs, listTickets, readStoredFile, resolveStoragePath, saveDraft, submitDraft, updateClassification, updateTicketStatus } from "./store";
import { sendTicketDraft, syncAgentMail } from "./agentmail";
import { categories, claimActions, claimStatuses, priorities, productLines, ticketStatuses } from "../src/types";
import { getContract, getCustomer, linkTicketContract, linkTicketParty, resolveTicketCustomer, searchCustomers } from "./crm";
import { getUpstreamStatus } from "./upstream";
import { createClaimFromTicket, createClaimTask, getClaim, listClaims, proposeClaimAction, reviewClaimAction } from "./claims";

const classificationSchema = z.object({
  productLine: z.enum(productLines),
  category: z.enum(categories),
  priority: z.enum(priorities).optional(),
  summary: z.string().min(1).max(2_000),
  confidence: z.number().min(0).max(1).optional(),
});
const draftSchema = z.object({ body: z.string().min(1).max(50_000), rationale: z.string().max(5_000).optional() });

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true, service: "pfefferminzia" }));

  app.get("/api/data-source", (_req, res) => res.json(getUpstreamStatus()));

  app.get("/api/customers", (req, res) => res.json(searchCustomers({
    query: typeof req.query.q === "string" ? req.query.q : undefined,
    country: typeof req.query.country === "string" ? req.query.country : undefined,
    productId: typeof req.query.productId === "string" ? req.query.productId : undefined,
    limit: typeof req.query.limit === "string" ? Number(req.query.limit) : undefined,
  })));

  app.get("/api/customers/:partnerId", (req, res) => {
    const customer = getCustomer(String(req.params.partnerId));
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(customer);
  });

  app.get("/api/contracts/:contractId", (req, res) => {
    const contract = getContract(String(req.params.contractId));
    if (!contract) return res.status(404).json({ error: "Contract not found" });
    res.json(contract);
  });

  app.get("/api/contracts/:contractId/documents", (req, res) => res.json(listContractDocuments(String(req.params.contractId))));

  app.get("/api/claims", (req, res) => res.json(listClaims({
    status: typeof req.query.status === "string" && claimStatuses.includes(req.query.status as never) ? req.query.status as (typeof claimStatuses)[number] : undefined,
    riskLevel: typeof req.query.riskLevel === "string" && ["low", "medium", "high", "critical"].includes(req.query.riskLevel)
      ? req.query.riskLevel as "low" | "medium" | "high" | "critical" : undefined,
    partnerId: typeof req.query.partnerId === "string" ? req.query.partnerId : undefined,
    contractId: typeof req.query.contractId === "string" ? req.query.contractId : undefined,
    q: typeof req.query.q === "string" ? req.query.q : undefined,
  })));

  app.get("/api/claims/:claimId", (req, res) => {
    const claim = getClaim(String(req.params.claimId));
    if (!claim) return res.status(404).json({ error: "Claim not found" });
    res.json(claim);
  });

  app.post("/api/tickets/:ticketNumber/claim", (req, res) => {
    const input = z.object({
      title: z.string().min(1).max(300), eventDate: z.string().date(), reportedAmount: z.number().nonnegative(),
      idempotencyKey: z.string().min(8).max(200),
    }).parse(req.body);
    res.status(201).json(createClaimFromTicket({ ticketNumber: String(req.params.ticketNumber), ...input, actor: "human-ui" }));
  });

  app.post("/api/claims/:claimId/recommendations", (req, res) => {
    const input = z.object({
      action: z.enum(claimActions), amount: z.number().positive().optional(), rationale: z.string().min(1).max(5_000),
      confidence: z.number().min(0).max(1), ruleVersion: z.string().min(1).max(100), idempotencyKey: z.string().min(8).max(200),
    }).parse(req.body);
    res.status(201).json(proposeClaimAction({ claimId: String(req.params.claimId), ...input, actor: "human-ui" }));
  });

  app.post("/api/claims/:claimId/recommendations/:recommendationId/review", (req, res) => {
    const input = z.object({
      decision: z.enum(["approve", "reject"]), note: z.string().min(1).max(2_000),
      idempotencyKey: z.string().min(8).max(200),
    }).parse(req.body);
    res.json(reviewClaimAction({ claimId: String(req.params.claimId), recommendationId: Number(req.params.recommendationId),
      ...input, actor: "human-ui" }));
  });

  app.post("/api/claims/:claimId/tasks", (req, res) => {
    const input = z.object({
      type: z.string().min(1).max(100), description: z.string().min(1).max(2_000), assignedTo: z.string().max(200).optional(),
      dueAt: z.string().datetime().optional(), idempotencyKey: z.string().min(8).max(200),
    }).parse(req.body);
    res.status(201).json(createClaimTask({ claimId: String(req.params.claimId), ...input, actor: "human-ui" }));
  });

  app.get("/api/tickets/:ticketNumber/customer-candidates", (req, res) => res.json(resolveTicketCustomer(String(req.params.ticketNumber))));

  app.put("/api/tickets/:ticketNumber/parties/:partnerId", (req, res) => {
    const input = z.object({
      role: z.enum(["CORRESPONDENT", "VERSICHERUNGSNEHMER", "VERSICHERTE_PERSON", "GESCHAEDIGTER", "VERTRETER"]),
      primary: z.boolean().default(true), confidence: z.number().min(0).max(1).default(1), matchMethod: z.string().default("manual"),
    }).parse(req.body ?? {});
    res.json(linkTicketParty({ ticketNumber: String(req.params.ticketNumber), partnerId: String(req.params.partnerId), ...input, actor: "human-ui" }));
  });

  app.put("/api/tickets/:ticketNumber/contracts/:contractId", (req, res) => {
    const input = z.object({ confidence: z.number().min(0).max(1).default(1), matchMethod: z.string().default("manual") }).parse(req.body ?? {});
    res.json(linkTicketContract({ ticketNumber: String(req.params.ticketNumber), contractId: String(req.params.contractId), ...input, actor: "human-ui" }));
  });

  app.get("/api/dashboard", (_req, res) => {
    const meta = dashboardMeta();
    res.json({
      tickets: listTickets(),
      ...meta,
      autoSendEnabled: process.env.AUTO_SEND_ENABLED === "true",
    });
  });

  app.get("/api/tickets", (req, res) => {
    const statuses = typeof req.query.status === "string"
      ? req.query.status.split(",").filter((value): value is (typeof ticketStatuses)[number] => ticketStatuses.includes(value as never))
      : undefined;
    const productLine = typeof req.query.productLine === "string" && productLines.includes(req.query.productLine as never)
      ? req.query.productLine as (typeof productLines)[number]
      : undefined;
    const category = typeof req.query.category === "string" && categories.includes(req.query.category as never)
      ? req.query.category as (typeof categories)[number]
      : undefined;
    res.json(listTickets({ statuses, productLine, category, q: typeof req.query.q === "string" ? req.query.q : undefined }));
  });

  app.get("/api/tickets/:ticketNumber", (req, res) => {
    const ticket = getTicket(String(req.params.ticketNumber));
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.json(ticket);
  });

  app.post("/api/tickets/:ticketNumber/classify", (req, res) => {
    const input = classificationSchema.parse(req.body);
    res.json(updateClassification({ ticketNumber: String(req.params.ticketNumber), ...input, actor: "human-ui" }));
  });

  app.patch("/api/tickets/:ticketNumber/status", (req, res) => {
    const input = z.object({ status: z.enum(["new", "in_progress", "closed"]) }).parse(req.body);
    res.json(updateTicketStatus(String(req.params.ticketNumber), input.status, "human-ui"));
  });

  app.put("/api/tickets/:ticketNumber/draft", (req, res) => {
    const input = draftSchema.parse(req.body);
    res.json(saveDraft(String(req.params.ticketNumber), input.body, input.rationale, "human-ui"));
  });

  app.post("/api/tickets/:ticketNumber/notes", (req, res) => {
    const input = z.object({ body: z.string().min(1).max(10_000) }).parse(req.body);
    res.json(addInternalNote(String(req.params.ticketNumber), input.body, "human-ui"));
  });

  app.post("/api/tickets/:ticketNumber/submit", (req, res) => {
    const input = z.object({ delayHours: z.number().int().min(1).max(168).default(24) }).parse(req.body ?? {});
    res.json(submitDraft(String(req.params.ticketNumber), "human-ui", input.delayHours));
  });

  app.post("/api/tickets/:ticketNumber/approve", (req, res) => {
    res.json(approveDraft(String(req.params.ticketNumber), "human-ui"));
  });

  app.post("/api/tickets/:ticketNumber/send", async (req, res) => {
    const ticketNumber = String(req.params.ticketNumber);
    const ticket = getTicket(ticketNumber);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (ticket.isDemo) return res.status(400).json({ error: "Demo tickets can never send real email" });
    approveDraft(ticketNumber, "human-ui");
    res.json(await sendTicketDraft(ticketNumber, "human-ui"));
  });

  app.post("/api/sync", async (_req, res) => res.json(await syncAgentMail()));

  app.get("/api/tariffs", (_req, res) => res.json(listTariffs()));
  app.get("/api/tariffs/:id/download", (req, res) => {
    const record = getDocumentRecord(String(req.params.id));
    if (!record) return res.status(404).json({ error: "Tariff not found" });
    res.download(resolveStoragePath(String(record.storage_path)), String(record.filename));
  });

  app.get("/api/attachments/:id/download", (req, res) => {
    const id = Number(req.params.id);
    const record = Number.isInteger(id) ? getAttachmentRecord(id) : undefined;
    if (!record) return res.status(404).json({ error: "Attachment not found" });
    res.setHeader("Content-Type", String(record.content_type));
    res.setHeader("Content-Disposition", `attachment; filename="${String(record.filename).replace(/["\r\n]/g, "_")}"`);
    res.send(readStoredFile(String(record.storage_path)));
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = error instanceof Error ? error.message : String(error);
    const status = error instanceof z.ZodError ? 400 : /not found/iu.test(message) ? 404 : 500;
    if (status === 500) console.error(error);
    res.status(status).json({ error: message });
  });

  return app;
}
