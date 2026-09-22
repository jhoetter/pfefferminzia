from __future__ import annotations

import html
import json
import os
import re
import sqlite3
import unicodedata
import urllib.request
from collections.abc import Mapping
from datetime import datetime
from pathlib import Path
from typing import Any

from agentmail import AgentMail

from .constants import ROOT
from .crm import auto_link_exact_customer
from .database import get_database
from .store import add_event, get_ticket, list_tickets
from .util import utc_now


def _mapping(value: Any) -> dict[str, Any]:
    if isinstance(value, Mapping):
        return dict(value)
    if hasattr(value, "model_dump"):
        return value.model_dump(by_alias=False)
    if hasattr(value, "dict"):
        return value.dict(by_alias=False)
    raise TypeError(f"Unsupported AgentMail response type: {type(value).__name__}")


def _value(data: Mapping[str, Any], snake: str, camel: str | None = None, default: Any = None) -> Any:
    return data.get(snake, data.get(camel or snake, default))


def _client() -> AgentMail:
    api_key = os.getenv("AGENTMAIL_API_KEY")
    if not api_key:
        raise RuntimeError("AGENTMAIL_API_KEY is not configured")
    return AgentMail(api_key=api_key)


def _address_part(value: str) -> str:
    match = re.search(r"<([^>]+)>", value)
    return (match.group(1) if match else value).strip().lower()


def _display_part(value: str) -> str | None:
    match = re.match(r'^\s*([^<]+?)\s*<[^>]+>', value)
    return match.group(1).strip().strip('"') if match else None


def _system_message(sender: str, subject: str | None) -> bool:
    return _address_part(sender) == "admin@agentmail.to" and bool(re.match(r"^Welcome to AgentMail", subject or "", re.I))


def _safe_filename(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", normalized).strip("-")[:100]
    return cleaned or "attachment"


def _timestamp(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat().replace("+00:00", "Z")
    return str(value)


def _next_ticket_number(db: sqlite3.Connection) -> str:
    value = db.execute("SELECT COALESCE(MAX(id), 0) + 1001 AS next FROM tickets").fetchone()["next"]
    return f"PF-{value}"


def sync_agentmail(db: sqlite3.Connection | None = None) -> dict[str, Any]:
    db = db or get_database()
    client = _client()
    result = {"inboxes": [], "importedTickets": 0, "importedMessages": 0, "importedAttachments": 0}
    active_inbox: str | None = None
    try:
        inboxes = _value(_mapping(client.inboxes.list(limit=100)), "inboxes", default=[])
        for inbox_value in inboxes:
            inbox = _mapping(inbox_value)
            active_inbox = str(_value(inbox, "inbox_id", "inboxId"))
            inbox_email = str(_value(inbox, "email", default=active_inbox))
            result["inboxes"].append(inbox_email)
            inbox_address = _address_part(inbox_email)
            response = client.inboxes.messages.list(active_inbox, limit=100, ascending=True)
            for item_value in _value(_mapping(response), "messages", default=[]):
                item = _mapping(item_value)
                message_id = str(_value(item, "message_id", "messageId"))
                if db.execute("SELECT id FROM messages WHERE external_message_id = ?", (message_id,)).fetchone():
                    continue
                message = _mapping(client.inboxes.messages.get(active_inbox, message_id))
                sender = str(_value(message, "from_", "from", ""))
                subject = _value(message, "subject")
                direction = "outbound" if _address_part(sender) == inbox_address else "inbound"
                thread_id = str(_value(message, "thread_id", "threadId"))
                ticket = db.execute(
                    "SELECT id, ticket_number FROM tickets WHERE source_inbox_id = ? AND source_thread_id = ?",
                    (active_inbox, thread_id),
                ).fetchone()
                if not ticket and (direction == "outbound" or _system_message(sender, subject)):
                    continue
                message_stamp = _timestamp(_value(message, "timestamp", default=utc_now()))
                if not ticket:
                    ticket_number = _next_ticket_number(db)
                    cursor = db.execute(
                        """INSERT INTO tickets
                          (ticket_number, source, source_inbox_id, source_thread_id, customer_email, customer_name, subject,
                           status, product_line, category, priority, is_demo, created_at, updated_at, last_message_at)
                          VALUES (?, 'agentmail', ?, ?, ?, ?, ?, 'new', 'unknown', 'unknown', 'normal', 0, ?, ?, ?)""",
                        (
                            ticket_number, active_inbox, thread_id, _address_part(sender), _display_part(sender),
                            subject or "(Ohne Betreff)", message_stamp, message_stamp, message_stamp,
                        ),
                    )
                    ticket_id = cursor.lastrowid
                    add_event(ticket_id, "ticket_imported", "agentmail-sync", {"inboxId": active_inbox, "threadId": thread_id}, db)
                    auto_link_exact_customer(ticket_number, db)
                    result["importedTickets"] += 1
                else:
                    ticket_id = ticket["id"]
                    ticket_number = ticket["ticket_number"]
                stamp = utc_now()
                recipients = _value(message, "to", default=[])
                cursor = db.execute(
                    """INSERT INTO messages
                      (ticket_id, external_message_id, direction, sender, recipients_json, subject, text_body, html_body, sent_at, created_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        ticket_id, message_id, direction, sender, json.dumps(recipients), subject,
                        _value(message, "extracted_text", "extractedText") or _value(message, "text") or _value(message, "preview") or "",
                        _value(message, "extracted_html", "extractedHtml") or _value(message, "html"), message_stamp, stamp,
                    ),
                )
                local_message_id = cursor.lastrowid
                db.execute(
                    """UPDATE tickets SET updated_at = ?, last_message_at = ?,
                    status = CASE WHEN ? = 'inbound' AND status IN ('sent', 'closed') THEN 'new' ELSE status END WHERE id = ?""",
                    (stamp, message_stamp, direction, ticket_id),
                )
                result["importedMessages"] += 1
                for attachment_value in _value(message, "attachments", default=[]) or []:
                    attachment = _mapping(attachment_value)
                    attachment_id = str(_value(attachment, "attachment_id", "attachmentId"))
                    metadata = _mapping(client.inboxes.messages.get_attachment(active_inbox, message_id, attachment_id))
                    download_url = str(_value(metadata, "download_url", "downloadUrl"))
                    with urllib.request.urlopen(download_url, timeout=30) as response_data:  # noqa: S310 - URL comes from AgentMail SDK
                        content = response_data.read()
                    folder = ROOT / ".data" / "attachments" / ticket_number
                    folder.mkdir(parents=True, exist_ok=True)
                    original_name = str(_value(attachment, "filename", default="attachment"))
                    filename = f"{_safe_filename(attachment_id)}-{_safe_filename(original_name)}"
                    absolute = folder / filename
                    absolute.write_bytes(content)
                    content_type = str(_value(attachment, "content_type", "contentType", "application/octet-stream"))
                    extracted = content.decode("utf-8") if re.match(r"^(text/|application/(json|xml))", content_type) and len(content) <= 1_000_000 else None
                    db.execute(
                        """INSERT OR IGNORE INTO attachments
                          (ticket_id, message_id, external_attachment_id, filename, content_type, size_bytes, storage_path, extracted_text, created_at)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (ticket_id, local_message_id, attachment_id, original_name, content_type, len(content), str(absolute.relative_to(ROOT)), extracted, stamp),
                    )
                    result["importedAttachments"] += 1
        db.execute(
            "INSERT INTO sync_runs (inbox_id, imported_messages, imported_tickets, status, created_at) VALUES (?, ?, ?, 'success', ?)",
            (", ".join(result["inboxes"]) or None, result["importedMessages"], result["importedTickets"], utc_now()),
        )
        return result
    except Exception as error:
        db.execute(
            """INSERT INTO sync_runs (inbox_id, imported_messages, imported_tickets, status, error, created_at)
            VALUES (?, ?, ?, 'error', ?, ?)""",
            (active_inbox, result["importedMessages"], result["importedTickets"], str(error), utc_now()),
        )
        raise


def send_ticket_draft(
    ticket_number: str, actor: str = "human", db: sqlite3.Connection | None = None
) -> dict[str, Any]:
    db = db or get_database()
    ticket = get_ticket(ticket_number, db)
    if not ticket:
        raise ValueError(f"Ticket not found: {ticket_number}")
    if ticket["isDemo"]:
        raise ValueError("Demo tickets can never send real email")
    if not ticket["draft"]:
        raise ValueError(f"Reply draft not found: {ticket_number}")
    if not ticket["sourceInboxId"]:
        raise ValueError("Ticket has no AgentMail inbox binding")
    if ticket["productLine"] == "life" and not ticket["humanApprovedAt"]:
        raise ValueError("Life insurance replies require explicit human approval")
    if ticket["draft"]["status"] == "sent":
        raise ValueError("This draft has already been sent")
    inbound = next(
        (message for message in reversed(ticket["messages"]) if message["direction"] == "inbound" and message["externalMessageId"]),
        None,
    )
    if not inbound:
        raise ValueError("No inbound AgentMail message available to reply to")
    body = ticket["draft"]["body"]
    response = _mapping(
        _client().inboxes.messages.reply(
            ticket["sourceInboxId"],
            inbound["externalMessageId"],
            text=body,
            html=f"<p>{html.escape(body).replace(chr(10), '<br>')}</p>",
        )
    )
    message_id = str(_value(response, "message_id", "messageId"))
    stamp = utc_now()
    db.execute(
        """INSERT INTO messages
          (ticket_id, external_message_id, direction, sender, recipients_json, subject, text_body, sent_at, created_at)
          VALUES (?, ?, 'outbound', ?, ?, ?, ?, ?, ?)""",
        (ticket["id"], message_id, ticket["sourceInboxId"], json.dumps([ticket["customerEmail"]]), f"Re: {ticket['subject']}", body, stamp, stamp),
    )
    db.execute(
        "UPDATE reply_drafts SET status = 'sent', sent_message_id = ?, scheduled_for = NULL, updated_at = ? WHERE ticket_id = ?",
        (message_id, stamp, ticket["id"]),
    )
    db.execute(
        "UPDATE tickets SET status = 'sent', updated_at = ?, last_message_at = ? WHERE id = ?",
        (stamp, stamp, ticket["id"]),
    )
    add_event(ticket["id"], "reply_sent", actor, {"messageId": message_id}, db)
    return get_ticket(ticket["id"], db)  # type: ignore[return-value]


def dispatch_due_replies(db: sqlite3.Connection | None = None) -> dict[str, Any]:
    db = db or get_database()
    if os.getenv("AUTO_SEND_ENABLED") != "true":
        return {"enabled": False, "sent": 0, "skipped": 0}
    sent = 0
    skipped = 0
    now = utc_now()
    due = [
        ticket
        for ticket in list_tickets(statuses=["scheduled"], db=db)
        if ticket["scheduledFor"] and ticket["scheduledFor"] <= now
    ]
    for ticket in due:
        if ticket["isDemo"] or ticket["productLine"] != "liability":
            skipped += 1
            continue
        send_ticket_draft(ticket["ticketNumber"], "auto-send-worker", db)
        sent += 1
    return {"enabled": True, "sent": sent, "skipped": skipped}
