from __future__ import annotations

import json
import sqlite3
from datetime import timedelta
from pathlib import Path
from typing import Any

from .constants import CATEGORIES, PRIORITIES, PRODUCT_LINES, ROOT, TICKET_STATUSES
from .checkpoints import checkpoint_profile
from .database import get_database
from .todos import complete_ticket_todos, create_todo
from .util import utc_now
from .workshop_clock import workshop_now

TICKET_SELECT = """
  SELECT t.*,
    (SELECT COUNT(*) FROM messages m WHERE m.ticket_id = t.id) AS message_count,
    (SELECT COUNT(*) FROM attachments a WHERE a.ticket_id = t.id) AS attachment_count,
    EXISTS(SELECT 1 FROM reply_drafts d WHERE d.ticket_id = t.id) AS has_draft,
    (SELECT scheduled_for FROM reply_drafts d WHERE d.ticket_id = t.id) AS scheduled_for
  FROM tickets t"""


def _map_ticket(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": int(row["id"]),
        "ticketNumber": row["ticket_number"],
        "source": row["source"],
        "sourceInboxId": row["source_inbox_id"],
        "sourceThreadId": row["source_thread_id"],
        "customerEmail": row["customer_email"],
        "customerName": row["customer_name"],
        "subject": row["subject"],
        "status": row["status"],
        "productLine": row["product_line"],
        "category": row["category"],
        "priority": row["priority"],
        "summary": row["summary"],
        "classificationConfidence": row["classification_confidence"],
        "classificationSource": row["classification_source"],
        "assignedTo": row["assigned_to"],
        "isDemo": bool(row["is_demo"]),
        "workshopMinStage": int(row["workshop_min_stage"]),
        "humanApprovedAt": row["human_approved_at"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "lastMessageAt": row["last_message_at"],
        "messageCount": int(row["message_count"] or 0),
        "attachmentCount": int(row["attachment_count"] or 0),
        "hasDraft": bool(row["has_draft"]),
        "scheduledFor": row["scheduled_for"],
    }


def list_tickets(
    *,
    statuses: list[str] | tuple[str, ...] | None = None,
    product_line: str | None = None,
    category: str | None = None,
    query: str | None = None,
    limit: int = 200,
    db: sqlite3.Connection | None = None,
) -> list[dict[str, Any]]:
    db = db or get_database()
    where: list[str] = []
    params: dict[str, Any] = {"workshop_stage": checkpoint_profile(db)["order"]}
    where.append("(t.is_demo = 0 OR t.workshop_min_stage <= :workshop_stage)")
    if statuses:
        if any(status not in TICKET_STATUSES for status in statuses):
            raise ValueError("Invalid status")
        names = []
        for index, status in enumerate(statuses):
            name = f"status{index}"
            names.append(f":{name}")
            params[name] = status
        where.append(f"t.status IN ({', '.join(names)})")
    if product_line:
        if product_line not in PRODUCT_LINES:
            raise ValueError(f"Invalid product line: {product_line}")
        where.append("t.product_line = :product_line")
        params["product_line"] = product_line
    if category:
        if category not in CATEGORIES:
            raise ValueError(f"Invalid category: {category}")
        where.append("t.category = :category")
        params["category"] = category
    if query and query.strip():
        where.append("(t.subject LIKE :query OR t.customer_email LIKE :query OR t.ticket_number LIKE :query OR t.summary LIKE :query)")
        params["query"] = f"%{query.strip()}%"
    params["limit"] = max(1, min(limit, 500))
    statement = f"""{TICKET_SELECT} {'WHERE ' + ' AND '.join(where) if where else ''}
        ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
          t.last_message_at DESC LIMIT :limit"""
    return [_map_ticket(row) for row in db.execute(statement, params).fetchall()]


def get_ticket(identifier: str | int, db: sqlite3.Connection | None = None) -> dict[str, Any] | None:
    db = db or get_database()
    field = "t.id" if isinstance(identifier, int) else "t.ticket_number"
    row = db.execute(
        f"{TICKET_SELECT} WHERE {field} = ? AND (t.is_demo = 0 OR t.workshop_min_stage <= ?)",
        (identifier, checkpoint_profile(db)["order"]),
    ).fetchone()
    if not row:
        return None
    ticket = _map_ticket(row)
    ticket_id = ticket["id"]
    ticket["messages"] = [
        {
            "id": int(item["id"]),
            "direction": item["direction"],
            "sender": item["sender"],
            "recipients": json.loads(item["recipients_json"]),
            "subject": item["subject"],
            "textBody": item["text_body"],
            "htmlBody": item["html_body"],
            "sentAt": item["sent_at"],
            "externalMessageId": item["external_message_id"],
        }
        for item in db.execute("SELECT * FROM messages WHERE ticket_id = ? ORDER BY sent_at ASC", (ticket_id,))
    ]
    ticket["attachments"] = [
        {
            "id": int(item["id"]),
            "messageId": int(item["message_id"]),
            "filename": item["filename"],
            "contentType": item["content_type"],
            "sizeBytes": int(item["size_bytes"]),
            "extractedText": item["extracted_text"],
            "resourceUri": f"pfefferminzia://attachments/{item['id']}",
        }
        for item in db.execute("SELECT * FROM attachments WHERE ticket_id = ? ORDER BY id", (ticket_id,))
    ]
    draft = db.execute("SELECT * FROM reply_drafts WHERE ticket_id = ?", (ticket_id,)).fetchone()
    ticket["draft"] = (
        {
            "body": draft["body"],
            "rationale": draft["rationale"],
            "status": draft["status"],
            "scheduledFor": draft["scheduled_for"],
            "sentMessageId": draft["sent_message_id"],
            "updatedAt": draft["updated_at"],
        }
        if draft
        else None
    )
    ticket["events"] = [
        {
            "id": int(item["id"]),
            "type": item["type"],
            "actor": item["actor"],
            "details": json.loads(item["details_json"]),
            "createdAt": item["created_at"],
        }
        for item in db.execute(
            "SELECT * FROM ticket_events WHERE ticket_id = ? ORDER BY created_at DESC, id DESC", (ticket_id,)
        )
    ]
    has_upstream = db.execute("SELECT 1 FROM source_datasets LIMIT 1").fetchone() is not None
    if has_upstream:
        ticket["parties"] = [
            {
                "partnerId": item["partner_id"],
                "displayName": item["firmenname"] or " ".join(filter(None, (item["vorname"], item["nachname"]))),
                "role": item["role"],
                "isPrimary": bool(item["is_primary"]),
                "matchMethod": item["match_method"],
                "confidence": float(item["confidence"]),
            }
            for item in db.execute(
                """SELECT tp.*, p.vorname, p.nachname, p.firmenname
                FROM ticket_parties tp JOIN core_partner p ON p.partner_id = tp.partner_id
                WHERE tp.ticket_id = ? ORDER BY tp.is_primary DESC, tp.role""",
                (ticket_id,),
            )
        ]
        ticket["linkedContracts"] = [
            {
                "contractId": item["vertrag_id"],
                "productId": item["produkt_id"],
                "tariffGenerationId": item["tarifgeneration_id"],
                "relation": item["relation"],
                "matchMethod": item["match_method"],
                "confidence": float(item["confidence"]),
            }
            for item in db.execute(
                """SELECT tc.*, v.produkt_id, v.tarifgeneration_id
                FROM ticket_contracts tc JOIN core_vertrag v ON v.vertrag_id = tc.vertrag_id
                WHERE tc.ticket_id = ? ORDER BY tc.created_at""",
                (ticket_id,),
            )
        ]
    else:
        ticket["parties"] = []
        ticket["linkedContracts"] = []
    return ticket


def add_event(
    ticket_id: int,
    event_type: str,
    actor: str,
    details: dict[str, Any] | None = None,
    db: sqlite3.Connection | None = None,
) -> None:
    db = db or get_database()
    db.execute(
        "INSERT INTO ticket_events (ticket_id, type, actor, details_json, created_at) VALUES (?, ?, ?, ?, ?)",
        (ticket_id, event_type, actor, json.dumps(details or {}, ensure_ascii=False), utc_now()),
    )


def update_classification(
    ticket_number: str,
    product_line: str,
    category: str,
    summary: str,
    priority: str | None = None,
    confidence: float | None = None,
    actor: str = "human",
    db: sqlite3.Connection | None = None,
) -> dict[str, Any]:
    db = db or get_database()
    if product_line not in PRODUCT_LINES:
        raise ValueError("Invalid product line")
    if category not in CATEGORIES:
        raise ValueError("Invalid category")
    if priority and priority not in PRIORITIES:
        raise ValueError("Invalid priority")
    ticket = get_ticket(ticket_number, db)
    if not ticket:
        raise ValueError(f"Ticket not found: {ticket_number}")
    stamp = utc_now()
    chosen_priority = priority or ticket["priority"]
    db.execute(
        """UPDATE tickets SET product_line = ?, category = ?, priority = ?, summary = ?,
        classification_confidence = ?, classification_source = ?,
        status = CASE WHEN status = 'new' THEN 'in_progress' ELSE status END, updated_at = ? WHERE id = ?""",
        (product_line, category, chosen_priority, summary, confidence, actor, stamp, ticket["id"]),
    )
    add_event(
        ticket["id"],
        "classified",
        actor,
        {"productLine": product_line, "category": category, "priority": chosen_priority, "confidence": confidence},
        db,
    )
    return get_ticket(ticket["id"], db)  # type: ignore[return-value]


def route_ticket(
    ticket_number: str,
    route: str,
    category: str,
    summary: str,
    confidence: float,
    actor: str = "agent",
    db: sqlite3.Connection | None = None,
) -> dict[str, Any]:
    if route not in ("life_mandatory_review", "liability_intervention_window"):
        raise ValueError("Invalid route")
    product_line = "life" if route == "life_mandatory_review" else "liability"
    db = db or get_database()
    ticket = update_classification(
        ticket_number, product_line, category, summary, None, confidence, actor, db
    )
    add_event(
        ticket["id"],
        "control_route_selected",
        actor,
        {"route": route, "controlPolicy": "mandatory_human_approval" if product_line == "life" else "intervention_window"},
        db,
    )
    return get_ticket(ticket["id"], db)  # type: ignore[return-value]


def update_ticket_status(
    ticket_number: str, status: str, actor: str = "human", db: sqlite3.Connection | None = None
) -> dict[str, Any]:
    db = db or get_database()
    if status not in TICKET_STATUSES:
        raise ValueError("Invalid status")
    ticket = get_ticket(ticket_number, db)
    if not ticket:
        raise ValueError(f"Ticket not found: {ticket_number}")
    if ticket["status"] == status:
        return ticket
    db.execute("UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?", (status, utc_now(), ticket["id"]))
    add_event(ticket["id"], "status_changed", actor, {"from": ticket["status"], "to": status}, db)
    return get_ticket(ticket["id"], db)  # type: ignore[return-value]


def save_draft(
    ticket_number: str,
    body: str,
    rationale: str | None = None,
    actor: str = "human",
    db: sqlite3.Connection | None = None,
) -> dict[str, Any]:
    db = db or get_database()
    ticket = get_ticket(ticket_number, db)
    if not ticket:
        raise ValueError(f"Ticket not found: {ticket_number}")
    if ticket["status"] in ("sent", "closed"):
        raise ValueError("Sent or closed tickets cannot modify their reply draft")
    if not body.strip():
        raise ValueError("Draft body cannot be empty")
    stamp = utc_now()
    db.execute(
        """INSERT INTO reply_drafts (ticket_id, body, rationale, status, created_at, updated_at)
        VALUES (?, ?, ?, 'draft', ?, ?)
        ON CONFLICT(ticket_id) DO UPDATE SET body = excluded.body, rationale = excluded.rationale,
          status = 'draft', scheduled_for = NULL, updated_at = excluded.updated_at""",
        (ticket["id"], body.strip(), rationale.strip() if rationale and rationale.strip() else None, stamp, stamp),
    )
    db.execute(
        """UPDATE tickets SET updated_at = ?, human_approved_at = NULL,
        status = CASE WHEN status IN ('scheduled', 'awaiting_human') THEN 'in_progress' ELSE status END WHERE id = ?""",
        (stamp, ticket["id"]),
    )
    if ticket["status"] == "scheduled":
        add_event(ticket["id"], "schedule_cancelled", actor, {"reason": "draft_changed"}, db)
        complete_ticket_todos(ticket_number, "queue_intervention", db)
    if ticket["status"] == "awaiting_human":
        add_event(ticket["id"], "review_invalidated", actor, {"reason": "draft_changed"}, db)
        complete_ticket_todos(ticket_number, "review", db)
    add_event(ticket["id"], "draft_saved", actor, {"rationale": rationale.strip() if rationale else None}, db)
    return get_ticket(ticket["id"], db)  # type: ignore[return-value]


def add_internal_note(
    ticket_number: str, body: str, actor: str = "human", db: sqlite3.Connection | None = None
) -> dict[str, Any]:
    db = db or get_database()
    ticket = get_ticket(ticket_number, db)
    if not ticket:
        raise ValueError(f"Ticket not found: {ticket_number}")
    if not body.strip():
        raise ValueError("Note cannot be empty")
    add_event(ticket["id"], "internal_note", actor, {"body": body.strip()}, db)
    return get_ticket(ticket["id"], db)  # type: ignore[return-value]


def submit_draft(
    ticket_number: str,
    actor: str = "agent",
    delay_hours: int = 24,
    db: sqlite3.Connection | None = None,
) -> dict[str, Any]:
    db = db or get_database()
    ticket = get_ticket(ticket_number, db)
    if not ticket:
        raise ValueError(f"Ticket not found: {ticket_number}")
    if not ticket["draft"]:
        raise ValueError("Save a reply draft before submitting it")
    if ticket["status"] in ("sent", "closed") or ticket["draft"]["status"] == "sent":
        raise ValueError("Sent or closed tickets cannot be submitted again")
    if ticket["productLine"] == "unknown":
        raise ValueError("Classify the product line before submitting a draft")
    stamp = utc_now()
    if ticket["productLine"] == "life":
        db.execute(
            "UPDATE reply_drafts SET status = 'draft', scheduled_for = NULL, updated_at = ? WHERE ticket_id = ?",
            (stamp, ticket["id"]),
        )
        db.execute(
            "UPDATE tickets SET status = 'awaiting_human', human_approved_at = NULL, updated_at = ? WHERE id = ?",
            (stamp, ticket["id"]),
        )
        add_event(ticket["id"], "human_review_required", actor, {"policy": "life-always-human"}, db)
        create_todo(
            f"Lebensantwort {ticket_number} prüfen",
            "Entwurf freigeben, ablehnen oder bearbeiten. Versand bleibt bis zur expliziten Freigabe blockiert.",
            kind="review",
            ticket_number=ticket_number,
            actor=actor,
            idempotency_key=f"review:{ticket_number}:{ticket['draft']['updatedAt']}",
            db=db,
        )
    else:
        scheduled = workshop_now(db) + timedelta(hours=max(1, delay_hours))
        scheduled_for = scheduled.isoformat(timespec="milliseconds").replace("+00:00", "Z")
        db.execute(
            "UPDATE reply_drafts SET status = 'scheduled', scheduled_for = ?, updated_at = ? WHERE ticket_id = ?",
            (scheduled_for, stamp, ticket["id"]),
        )
        db.execute(
            "UPDATE tickets SET status = 'scheduled', human_approved_at = NULL, updated_at = ? WHERE id = ?",
            (stamp, ticket["id"]),
        )
        add_event(
            ticket["id"],
            "reply_scheduled",
            actor,
            {"scheduledFor": scheduled_for, "policy": "liability-delay-window"},
            db,
        )
        create_todo(
            f"Eingriffsfenster {ticket_number}",
            "Antwort läuft automatisch aus. Bei Bedarf bearbeiten, stoppen oder aus der Queue nehmen.",
            kind="queue_intervention",
            ticket_number=ticket_number,
            actor=actor,
            idempotency_key=f"queue:{ticket_number}:{scheduled_for}",
            db=db,
        )
    return get_ticket(ticket["id"], db)  # type: ignore[return-value]


def approve_draft(
    ticket_number: str, actor: str = "human", db: sqlite3.Connection | None = None
) -> dict[str, Any]:
    db = db or get_database()
    ticket = get_ticket(ticket_number, db)
    if not ticket or not ticket["draft"]:
        raise ValueError(f"Ticket or draft not found: {ticket_number}")
    if ticket["status"] in ("sent", "closed") or ticket["draft"]["status"] == "sent":
        raise ValueError("Sent or closed tickets cannot be approved again")
    stamp = utc_now()
    db.execute(
        "UPDATE reply_drafts SET status = 'approved', scheduled_for = NULL, updated_at = ? WHERE ticket_id = ?",
        (stamp, ticket["id"]),
    )
    db.execute("UPDATE tickets SET human_approved_at = ?, updated_at = ? WHERE id = ?", (stamp, stamp, ticket["id"]))
    add_event(ticket["id"], "draft_approved", actor, {}, db)
    complete_ticket_todos(ticket_number, "review", db)
    return get_ticket(ticket["id"], db)  # type: ignore[return-value]


def reject_draft(
    ticket_number: str,
    note: str,
    actor: str = "human",
    db: sqlite3.Connection | None = None,
) -> dict[str, Any]:
    db = db or get_database()
    ticket = get_ticket(ticket_number, db)
    if not ticket or not ticket["draft"]:
        raise ValueError(f"Ticket or draft not found: {ticket_number}")
    if ticket["status"] in ("sent", "closed"):
        raise ValueError("Sent or closed tickets cannot be rejected")
    if not note.strip():
        raise ValueError("A rejection note is required")
    stamp = utc_now()
    db.execute(
        "UPDATE reply_drafts SET status = 'draft', scheduled_for = NULL, updated_at = ? WHERE ticket_id = ?",
        (stamp, ticket["id"]),
    )
    db.execute(
        "UPDATE tickets SET status = 'in_progress', human_approved_at = NULL, updated_at = ? WHERE id = ?",
        (stamp, ticket["id"]),
    )
    add_event(ticket["id"], "draft_rejected", actor, {"note": note.strip()}, db)
    complete_ticket_todos(ticket_number, "review", db)
    return get_ticket(ticket["id"], db)  # type: ignore[return-value]


def remove_from_send_queue(
    ticket_number: str,
    reason: str,
    actor: str = "human",
    db: sqlite3.Connection | None = None,
) -> dict[str, Any]:
    db = db or get_database()
    ticket = get_ticket(ticket_number, db)
    if not ticket or not ticket["draft"]:
        raise ValueError(f"Ticket or draft not found: {ticket_number}")
    if ticket["status"] != "scheduled":
        raise ValueError("Only scheduled tickets can be removed from the send queue")
    if not reason.strip():
        raise ValueError("A queue removal reason is required")
    stamp = utc_now()
    db.execute(
        "UPDATE reply_drafts SET status = 'draft', scheduled_for = NULL, updated_at = ? WHERE ticket_id = ?",
        (stamp, ticket["id"]),
    )
    db.execute(
        "UPDATE tickets SET status = 'in_progress', human_approved_at = NULL, updated_at = ? WHERE id = ?",
        (stamp, ticket["id"]),
    )
    add_event(ticket["id"], "queue_removed", actor, {"reason": reason.strip()}, db)
    complete_ticket_todos(ticket_number, "queue_intervention", db)
    return get_ticket(ticket["id"], db)  # type: ignore[return-value]


def _map_tariff(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "title": row["title"],
        "productLine": row["product_line"],
        "filename": row["filename"],
        "summary": row["summary"],
        "textContent": row["text_content"],
        "resourceUri": f"pfefferminzia://tariffs/{row['id']}",
        "documentType": row["document_type"],
        "productIds": json.loads(row["product_ids_json"] or "[]"),
        "tariffGenerationId": row["tariff_generation_id"],
        "market": row["market"],
        "validFrom": row["valid_from"],
        "validTo": row["valid_to"],
        "revision": row["revision"],
        "sourceCommit": row["source_commit"],
        "workshopExtension": bool(row["workshop_extension"]),
    }


def list_tariffs(db: sqlite3.Connection | None = None) -> list[dict[str, Any]]:
    db = db or get_database()
    return [_map_tariff(row) for row in db.execute("SELECT * FROM documents ORDER BY product_line, title")]


def get_tariff(tariff_id: str, db: sqlite3.Connection | None = None) -> dict[str, Any] | None:
    return next((item for item in list_tariffs(db) if item["id"] == tariff_id), None)


def list_contract_documents(contract_id: str, db: sqlite3.Connection | None = None) -> list[dict[str, Any]]:
    db = db or get_database()
    contract = db.execute("SELECT tarifgeneration_id, markt FROM core_vertrag WHERE vertrag_id = ?", (contract_id,)).fetchone()
    if not contract:
        raise ValueError(f"Contract not found: {contract_id}")
    return [
        document
        for document in list_tariffs(db)
        if document["tariffGenerationId"] == contract["tarifgeneration_id"] and document["market"] == contract["markt"]
    ]


def get_attachment_record(attachment_id: int, db: sqlite3.Connection | None = None) -> sqlite3.Row | None:
    db = db or get_database()
    return db.execute("SELECT * FROM attachments WHERE id = ?", (attachment_id,)).fetchone()


def list_attachment_records(db: sqlite3.Connection | None = None) -> list[sqlite3.Row]:
    db = db or get_database()
    return db.execute(
        """SELECT a.*, t.ticket_number, t.subject FROM attachments a
        JOIN tickets t ON t.id = a.ticket_id ORDER BY a.id"""
    ).fetchall()


def get_document_record(document_id: str, db: sqlite3.Connection | None = None) -> sqlite3.Row | None:
    db = db or get_database()
    return db.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()


def resolve_storage_path(storage_path: str) -> Path:
    resolved = (ROOT / storage_path).resolve()
    try:
        resolved.relative_to(ROOT.resolve())
    except ValueError as error:
        raise ValueError("Invalid storage path") from error
    return resolved


def read_stored_file(storage_path: str) -> bytes:
    return resolve_storage_path(storage_path).read_bytes()


def dashboard_meta(db: sqlite3.Connection | None = None) -> dict[str, Any]:
    db = db or get_database()
    counts = {status: 0 for status in TICKET_STATUSES}
    stage = checkpoint_profile(db)["order"]
    for row in db.execute(
        """SELECT status, COUNT(*) AS count FROM tickets
        WHERE is_demo = 0 OR workshop_min_stage <= ? GROUP BY status""",
        (stage,),
    ):
        counts[row["status"]] = int(row["count"])
    sync = db.execute("SELECT * FROM sync_runs WHERE status = 'success' ORDER BY created_at DESC LIMIT 1").fetchone()
    return {
        "counts": counts,
        "connectedInbox": sync["inbox_id"] if sync else None,
        "lastSyncAt": sync["created_at"] if sync else None,
    }
