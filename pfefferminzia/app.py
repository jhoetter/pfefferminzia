from __future__ import annotations

import asyncio
import os
from contextlib import asynccontextmanager, suppress
from datetime import date, datetime
from pathlib import Path
from typing import Annotated, Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .agentmail_service import agentmail_configuration, dispatch_due_replies, send_ticket_draft, sync_agentmail
from .checkpoints import require_capability, verify_checkpoint
from .claims import create_claim_from_ticket, create_claim_task, ensure_workshop_claims, get_claim, list_claims, propose_claim_action, review_claim_action
from .constants import ROOT
from .crm import get_contract, get_customer, link_ticket_contract, link_ticket_party, resolve_ticket_customer, search_customers
from .mcp_server import create_mcp_server
from .seed import ensure_seed_data
from .store import (
    add_internal_note,
    approve_draft,
    dashboard_meta,
    get_attachment_record,
    get_document_record,
    get_ticket,
    list_contract_documents,
    list_tariffs,
    list_tickets,
    reject_draft,
    remove_from_send_queue,
    resolve_storage_path,
    route_ticket,
    save_draft,
    submit_draft,
    update_classification,
    update_ticket_status,
)
from .todos import create_todo, list_todos, update_todo
from .upstream import get_upstream_status, import_falk_dataset
from .workshop import ensure_workshop_fixtures, get_workshop_status
from .workshop_clock import advance_workshop_clock

load_dotenv(ROOT / ".env")
WEB_ROOT = ROOT / "web"
SLIDES_ROOT = ROOT / "slides"


def initialize_application() -> dict[str, Any]:
    upstream = import_falk_dataset()
    ensure_seed_data()
    ensure_workshop_claims()
    ensure_workshop_fixtures()
    return upstream


async def _periodic(seconds: int, function: Any) -> None:
    while True:
        try:
            await asyncio.to_thread(function)
        except Exception as error:  # pragma: no cover - background integration logging
            print(f"Pfefferminzia background task failed: {error}", flush=True)
        await asyncio.sleep(seconds)


def _lifespan(mcp_server):
    @asynccontextmanager
    async def lifespan(_: FastAPI):
        initialize_application()
        tasks: list[asyncio.Task[None]] = []
        agentmail_ready = False
        if os.getenv("AGENTMAIL_API_KEY"):
            configuration = await asyncio.to_thread(agentmail_configuration, True)
            if not configuration["ready"]:
                raise RuntimeError(
                    "AgentMail setup is incomplete; configure AGENTMAIL_INBOX_ID and WORKSHOP_ALLOWED_RECIPIENTS"
                )
            agentmail_ready = True
        async with mcp_server.session_manager.run():
            if agentmail_ready:
                tasks.append(asyncio.create_task(_periodic(max(15, int(os.getenv("AGENTMAIL_POLL_SECONDS", "30"))), sync_agentmail)))
            if os.getenv("AUTO_SEND_ENABLED") == "true":
                tasks.append(asyncio.create_task(_periodic(60, dispatch_due_replies)))
            yield
            for task in tasks:
                task.cancel()
            for task in tasks:
                with suppress(asyncio.CancelledError):
                    await task

    return lifespan


class ClassificationInput(BaseModel):
    productLine: Literal["unknown", "liability", "life"]
    category: Literal["unknown", "general_question", "coverage_question", "claim", "contract_change", "cancellation", "complaint"]
    priority: Literal["low", "normal", "high", "urgent"] | None = None
    summary: Annotated[str, Field(min_length=1, max_length=2000)]
    confidence: Annotated[float | None, Field(ge=0, le=1)] = None


class DraftInput(BaseModel):
    body: Annotated[str, Field(min_length=1, max_length=50000)]
    rationale: Annotated[str | None, Field(max_length=5000)] = None


class ClaimInput(BaseModel):
    title: Annotated[str, Field(min_length=1, max_length=300)]
    eventDate: date
    reportedAmount: Annotated[float, Field(ge=0)]
    idempotencyKey: Annotated[str, Field(min_length=8, max_length=200)]


class RecommendationInput(BaseModel):
    action: Literal["PAY", "DENY", "REQUEST_INFORMATION", "ESCALATE_COMPLEX", "REFER_SIU"]
    amount: Annotated[float | None, Field(gt=0)] = None
    rationale: Annotated[str, Field(min_length=1, max_length=5000)]
    confidence: Annotated[float, Field(ge=0, le=1)]
    ruleVersion: Annotated[str, Field(min_length=1, max_length=100)]
    idempotencyKey: Annotated[str, Field(min_length=8, max_length=200)]


class ReviewInput(BaseModel):
    decision: Literal["approve", "reject"]
    note: Annotated[str, Field(min_length=1, max_length=2000)]
    idempotencyKey: Annotated[str, Field(min_length=8, max_length=200)]


class TaskInput(BaseModel):
    type: Annotated[str, Field(min_length=1, max_length=100)]
    description: Annotated[str, Field(min_length=1, max_length=2000)]
    assignedTo: Annotated[str | None, Field(max_length=200)] = None
    dueAt: datetime | None = None
    idempotencyKey: Annotated[str, Field(min_length=8, max_length=200)]


class PartyLinkInput(BaseModel):
    role: Literal["CORRESPONDENT", "VERSICHERUNGSNEHMER", "VERSICHERTE_PERSON", "GESCHAEDIGTER", "VERTRETER"]
    primary: bool = True
    confidence: Annotated[float, Field(ge=0, le=1)] = 1
    matchMethod: str = "manual"


class ContractLinkInput(BaseModel):
    confidence: Annotated[float, Field(ge=0, le=1)] = 1
    matchMethod: str = "manual"


class TodoInput(BaseModel):
    title: Annotated[str, Field(min_length=1, max_length=300)]
    description: Annotated[str, Field(max_length=2000)] = ""
    assignedTo: Annotated[str | None, Field(max_length=200)] = None
    idempotencyKey: Annotated[str | None, Field(min_length=8, max_length=200)] = None


class TodoStatusInput(BaseModel):
    status: Literal["open", "completed", "cancelled"]


class RejectionInput(BaseModel):
    note: Annotated[str, Field(min_length=1, max_length=2000)]


class QueueRemovalInput(BaseModel):
    reason: Annotated[str, Field(min_length=1, max_length=2000)]


class ClockAdvanceInput(BaseModel):
    hours: Annotated[int, Field(ge=1, le=168)] = 24
    confirmAdvance: Literal[True]


class RouteInput(BaseModel):
    route: Literal["life_mandatory_review", "liability_intervention_window"]
    category: Literal["unknown", "general_question", "coverage_question", "claim", "contract_change", "cancellation", "complaint"]
    summary: Annotated[str, Field(min_length=1, max_length=2000)]
    confidence: Annotated[float, Field(ge=0, le=1)]


def create_app() -> FastAPI:
    mcp_server = create_mcp_server()
    mcp_http_app = mcp_server.streamable_http_app(streamable_http_path="/mcp", stateless_http=True, json_response=True)
    app = FastAPI(title="Pfefferminzia", version="0.3.0", lifespan=_lifespan(mcp_server))

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, error: RequestValidationError) -> JSONResponse:
        return JSONResponse(status_code=400, content={"error": str(error)})

    @app.exception_handler(ValueError)
    async def value_error(_: Request, error: ValueError) -> JSONResponse:
        status = 404 if "not found" in str(error).lower() else 400
        return JSONResponse(status_code=status, content={"error": str(error)})

    @app.exception_handler(RuntimeError)
    async def runtime_error(_: Request, error: RuntimeError) -> JSONResponse:
        return JSONResponse(status_code=400, content={"error": str(error)})

    @app.get("/api/health")
    async def health() -> dict[str, Any]:
        return {"ok": True, "service": "pfefferminzia"}

    @app.get("/api/data-source")
    async def data_source() -> dict[str, Any]:
        return get_upstream_status()

    @app.get("/api/workshop")
    async def workshop() -> dict[str, Any]:
        return get_workshop_status()

    @app.get("/api/workshop/verify")
    async def verify_workshop(external: bool = False) -> dict[str, Any]:
        return await asyncio.to_thread(verify_checkpoint, external)

    @app.get("/api/customers")
    async def customers(q: str | None = None, country: str | None = None, productId: str | None = None, limit: int = 50):
        require_capability("knowledge")
        return search_customers(query=q, country=country, product_id=productId, limit=limit)

    @app.get("/api/customers/{partner_id}")
    async def customer(partner_id: str):
        require_capability("knowledge")
        result = get_customer(partner_id)
        return result if result else JSONResponse(status_code=404, content={"error": "Customer not found"})

    @app.get("/api/contracts/{contract_id}")
    async def contract(contract_id: str):
        require_capability("knowledge")
        result = get_contract(contract_id)
        return result if result else JSONResponse(status_code=404, content={"error": "Contract not found"})

    @app.get("/api/contracts/{contract_id}/documents")
    async def contract_documents(contract_id: str):
        require_capability("knowledge")
        return list_contract_documents(contract_id)

    @app.get("/api/claims")
    async def claims(status: str | None = None, riskLevel: str | None = None, partnerId: str | None = None, contractId: str | None = None, q: str | None = None):
        require_capability("claims")
        return list_claims(status=status, risk_level=riskLevel, partner_id=partnerId, contract_id=contractId, query=q)

    @app.get("/api/claims/{claim_id}")
    async def claim(claim_id: str):
        require_capability("claims")
        result = get_claim(claim_id)
        return result if result else JSONResponse(status_code=404, content={"error": "Claim not found"})

    @app.post("/api/tickets/{ticket_number}/claim", status_code=201)
    async def create_claim(ticket_number: str, data: ClaimInput):
        require_capability("claims")
        return create_claim_from_ticket(ticket_number=ticket_number, title=data.title, event_date=str(data.eventDate), reported_amount=data.reportedAmount, idempotency_key=data.idempotencyKey, actor="human-ui")

    @app.post("/api/claims/{claim_id}/recommendations", status_code=201)
    async def propose(claim_id: str, data: RecommendationInput):
        require_capability("claims")
        return propose_claim_action(claim_id=claim_id, action=data.action, amount=data.amount, rationale=data.rationale, confidence=data.confidence, rule_version=data.ruleVersion, idempotency_key=data.idempotencyKey, actor="human-ui")

    @app.post("/api/claims/{claim_id}/recommendations/{recommendation_id}/review")
    async def review(claim_id: str, recommendation_id: int, data: ReviewInput):
        require_capability("claims")
        return review_claim_action(claim_id=claim_id, recommendation_id=recommendation_id, decision=data.decision, note=data.note, idempotency_key=data.idempotencyKey, actor="human-ui")

    @app.post("/api/claims/{claim_id}/tasks", status_code=201)
    async def task(claim_id: str, data: TaskInput):
        require_capability("claims")
        return create_claim_task(claim_id=claim_id, task_type=data.type, description=data.description, assigned_to=data.assignedTo, due_at=data.dueAt.isoformat() if data.dueAt else None, idempotency_key=data.idempotencyKey, actor="human-ui")

    @app.get("/api/tickets/{ticket_number}/customer-candidates")
    async def customer_candidates(ticket_number: str):
        require_capability("knowledge")
        return resolve_ticket_customer(ticket_number)

    @app.put("/api/tickets/{ticket_number}/parties/{partner_id}")
    async def link_party(ticket_number: str, partner_id: str, data: PartyLinkInput):
        require_capability("knowledge")
        return link_ticket_party(ticket_number=ticket_number, partner_id=partner_id, role=data.role, primary=data.primary, confidence=data.confidence, match_method=data.matchMethod, actor="human-ui")

    @app.put("/api/tickets/{ticket_number}/contracts/{contract_id}")
    async def link_contract(ticket_number: str, contract_id: str, data: ContractLinkInput):
        require_capability("knowledge")
        return link_ticket_contract(ticket_number=ticket_number, contract_id=contract_id, confidence=data.confidence, match_method=data.matchMethod, actor="human-ui")

    @app.get("/api/dashboard")
    async def dashboard():
        return {
            "tickets": list_tickets(),
            **dashboard_meta(),
            "autoSendEnabled": os.getenv("AUTO_SEND_ENABLED") == "true",
            "workshop": get_workshop_status(),
        }

    @app.get("/api/todos")
    async def todos(status: Literal["open", "completed", "cancelled"] | None = None):
        require_capability("todos")
        return list_todos(status=status)

    @app.post("/api/todos", status_code=201)
    async def add_todo(data: TodoInput):
        require_capability("todos")
        return create_todo(
            data.title,
            data.description,
            assigned_to=data.assignedTo,
            actor="human-ui",
            idempotency_key=data.idempotencyKey,
        )

    @app.patch("/api/todos/{todo_id}")
    async def set_todo(todo_id: int, data: TodoStatusInput):
        require_capability("todos")
        return update_todo(todo_id, data.status, "human-ui")

    @app.get("/api/tickets")
    async def tickets(status: str | None = None, productLine: str | None = None, category: str | None = None, q: str | None = None):
        statuses = [value for value in status.split(",") if value] if status else None
        return list_tickets(statuses=statuses, product_line=productLine, category=category, query=q)

    @app.get("/api/tickets/{ticket_number}")
    async def ticket(ticket_number: str):
        result = get_ticket(ticket_number)
        return result if result else JSONResponse(status_code=404, content={"error": "Ticket not found"})

    @app.post("/api/tickets/{ticket_number}/classify")
    async def classify(ticket_number: str, data: ClassificationInput):
        require_capability("draft")
        return update_classification(ticket_number, data.productLine, data.category, data.summary, data.priority, data.confidence, "human-ui")

    @app.post("/api/tickets/{ticket_number}/route")
    async def route(ticket_number: str, data: RouteInput):
        require_capability("router")
        return route_ticket(ticket_number, data.route, data.category, data.summary, data.confidence, "human-ui")

    @app.patch("/api/tickets/{ticket_number}/status")
    async def set_status(ticket_number: str, data: dict[str, Literal["new", "in_progress", "closed"]]):
        if "status" not in data:
            raise ValueError("status is required")
        return update_ticket_status(ticket_number, data["status"], "human-ui")

    @app.put("/api/tickets/{ticket_number}/draft")
    async def draft(ticket_number: str, data: DraftInput):
        require_capability("draft")
        return save_draft(ticket_number, data.body, data.rationale, "human-ui")

    @app.post("/api/tickets/{ticket_number}/notes")
    async def note(ticket_number: str, data: dict[str, str]):
        require_capability("draft")
        return add_internal_note(ticket_number, data.get("body", ""), "human-ui")

    @app.post("/api/tickets/{ticket_number}/submit")
    async def submit(ticket_number: str, data: dict[str, int] | None = None):
        ticket_data = get_ticket(ticket_number)
        if not ticket_data:
            raise ValueError(f"Ticket not found: {ticket_number}")
        require_capability("life_review" if ticket_data["productLine"] == "life" else "intervention_queue")
        return submit_draft(ticket_number, "human-ui", (data or {}).get("delayHours", 24))

    @app.post("/api/tickets/{ticket_number}/approve")
    async def approve(ticket_number: str):
        require_capability("life_review")
        return approve_draft(ticket_number, "human-ui")

    @app.post("/api/tickets/{ticket_number}/reject")
    async def reject(ticket_number: str, data: RejectionInput):
        require_capability("life_review")
        return reject_draft(ticket_number, data.note, "human-ui")

    @app.post("/api/tickets/{ticket_number}/send")
    async def send(ticket_number: str):
        require_capability("manual_send")
        ticket_data = get_ticket(ticket_number)
        if not ticket_data:
            return JSONResponse(status_code=404, content={"error": "Ticket not found"})
        if ticket_data["isDemo"]:
            return JSONResponse(status_code=400, content={"error": "Demo tickets can never send real email"})
        approve_draft(ticket_number, "human-ui")
        return await asyncio.to_thread(send_ticket_draft, ticket_number, "human-ui")

    @app.delete("/api/tickets/{ticket_number}/schedule")
    async def remove_schedule(ticket_number: str, data: QueueRemovalInput):
        require_capability("intervention_queue")
        return remove_from_send_queue(ticket_number, data.reason, "human-ui")

    @app.post("/api/workshop/clock/advance")
    async def advance_clock(data: ClockAdvanceInput):
        require_capability("workshop_clock")
        _ = data.confirmAdvance
        clock = advance_workshop_clock(data.hours, "human-ui")
        dispatch = await asyncio.to_thread(dispatch_due_replies)
        return {"clock": clock, "dispatch": dispatch}

    @app.post("/api/sync")
    async def sync():
        require_capability("inbox")
        return await asyncio.to_thread(sync_agentmail)

    @app.get("/api/tariffs")
    async def tariffs():
        require_capability("knowledge")
        return list_tariffs()

    @app.get("/api/tariffs/{tariff_id}/download")
    async def tariff_download(tariff_id: str, inline: Annotated[int, Query()] = 0):
        require_capability("knowledge")
        record = get_document_record(tariff_id)
        if not record:
            return JSONResponse(status_code=404, content={"error": "Tariff not found"})
        return FileResponse(resolve_storage_path(record["storage_path"]), media_type="application/pdf", filename=None if inline == 1 else record["filename"], content_disposition_type="inline" if inline == 1 else "attachment")

    @app.get("/api/attachments/{attachment_id}/download")
    async def attachment_download(attachment_id: int):
        record = get_attachment_record(attachment_id)
        if not record:
            return JSONResponse(status_code=404, content={"error": "Attachment not found"})
        return FileResponse(resolve_storage_path(record["storage_path"]), media_type=record["content_type"], filename=record["filename"])

    if (WEB_ROOT / "assets").exists():
        app.mount("/assets", StaticFiles(directory=WEB_ROOT / "assets"), name="assets")

    if SLIDES_ROOT.exists():
        app.mount("/slides", StaticFiles(directory=SLIDES_ROOT, html=True), name="slides")

    @app.get("/favicon.svg", include_in_schema=False)
    async def favicon():
        return FileResponse(WEB_ROOT / "favicon.svg")

    @app.get("/workshop.js", include_in_schema=False)
    async def workshop_script():
        return FileResponse(WEB_ROOT / "workshop.js", media_type="text/javascript")

    @app.get("/workshop.css", include_in_schema=False)
    async def workshop_styles():
        return FileResponse(WEB_ROOT / "workshop.css", media_type="text/css")

    @app.get("/{path:path}", include_in_schema=False)
    async def frontend(path: str):
        del path
        return FileResponse(WEB_ROOT / "index.html")

    # The MCP ASGI app owns /mcp. Keep this mount last because mounting at /
    # would otherwise shadow the API and browser routes above it.
    app.mount("/", mcp_http_app, name="mcp")

    return app


app = create_app()
