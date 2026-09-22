from __future__ import annotations

import sqlite3
from typing import Any

from .database import get_database
from .util import utc_now


TODO_STATUSES = ("open", "completed", "cancelled")
TODO_KINDS = ("general", "review", "queue_intervention")


def _map(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": int(row["id"]),
        "title": row["title"],
        "description": row["description"],
        "status": row["status"],
        "kind": row["kind"],
        "ticketNumber": row["ticket_number"],
        "assignedTo": row["assigned_to"],
        "createdBy": row["created_by"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "completedAt": row["completed_at"],
    }


SELECT = """SELECT wt.*, t.ticket_number FROM workshop_todos wt
LEFT JOIN tickets t ON t.id = wt.ticket_id"""


def list_todos(status: str | None = None, db: sqlite3.Connection | None = None) -> list[dict[str, Any]]:
    db = db or get_database()
    if status and status not in TODO_STATUSES:
        raise ValueError("Invalid todo status")
    where = " WHERE wt.status = ?" if status else ""
    params = (status,) if status else ()
    return [_map(row) for row in db.execute(f"{SELECT}{where} ORDER BY wt.created_at DESC, wt.id DESC", params)]


def create_todo(
    title: str,
    description: str = "",
    *,
    kind: str = "general",
    ticket_number: str | None = None,
    assigned_to: str | None = None,
    actor: str = "human",
    idempotency_key: str | None = None,
    db: sqlite3.Connection | None = None,
) -> dict[str, Any]:
    db = db or get_database()
    if not title.strip():
        raise ValueError("Todo title cannot be empty")
    if kind not in TODO_KINDS:
        raise ValueError("Invalid todo kind")
    if idempotency_key:
        existing = db.execute(f"{SELECT} WHERE wt.idempotency_key = ?", (idempotency_key,)).fetchone()
        if existing:
            return _map(existing)
    ticket_id = None
    if ticket_number:
        ticket = db.execute("SELECT id FROM tickets WHERE ticket_number = ?", (ticket_number,)).fetchone()
        if not ticket:
            raise ValueError(f"Ticket not found: {ticket_number}")
        ticket_id = ticket["id"]
    stamp = utc_now()
    cursor = db.execute(
        """INSERT INTO workshop_todos
        (title, description, status, kind, ticket_id, assigned_to, created_by, idempotency_key, created_at, updated_at)
        VALUES (?, ?, 'open', ?, ?, ?, ?, ?, ?, ?)""",
        (title.strip(), description.strip(), kind, ticket_id, assigned_to, actor, idempotency_key, stamp, stamp),
    )
    return _map(db.execute(f"{SELECT} WHERE wt.id = ?", (cursor.lastrowid,)).fetchone())


def update_todo(todo_id: int, status: str, actor: str = "human", db: sqlite3.Connection | None = None) -> dict[str, Any]:
    del actor
    db = db or get_database()
    if status not in TODO_STATUSES:
        raise ValueError("Invalid todo status")
    row = db.execute("SELECT id FROM workshop_todos WHERE id = ?", (todo_id,)).fetchone()
    if not row:
        raise ValueError(f"Todo not found: {todo_id}")
    stamp = utc_now()
    db.execute(
        "UPDATE workshop_todos SET status = ?, updated_at = ?, completed_at = ? WHERE id = ?",
        (status, stamp, stamp if status == "completed" else None, todo_id),
    )
    return _map(db.execute(f"{SELECT} WHERE wt.id = ?", (todo_id,)).fetchone())


def complete_ticket_todos(ticket_number: str, kind: str, db: sqlite3.Connection | None = None) -> None:
    db = db or get_database()
    stamp = utc_now()
    db.execute(
        """UPDATE workshop_todos SET status = 'completed', updated_at = ?, completed_at = ?
        WHERE status = 'open' AND kind = ? AND ticket_id = (SELECT id FROM tickets WHERE ticket_number = ?)""",
        (stamp, stamp, kind, ticket_number),
    )
