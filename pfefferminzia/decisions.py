"""Leistungsentscheidung: what a human approves in Drill 8.

A person should approve the substance – outcome, amount, basis, reasoning –
not every comma of a letter. Claude proposes a structured decision; the
person approves or rejects it in the cockpit. Approving seals it into a PDF
(Entscheidungsbeleg) with a checksum. The reply text stays free to edit;
it can only be sent with an approved decision, and the PDF goes along as an
attachment. If Claude changes the decision, the approval lapses and the new
version needs a fresh one.
"""

from __future__ import annotations

import hashlib
import sqlite3
from typing import Any

from .checkpoints import require_capability
from .constants import STATE_ROOT
from .database import get_database
from .todos import complete_ticket_todos, create_todo
from .util import utc_now

OUTCOMES = {
    "anerkannt": "Leistung anerkannt",
    "abgelehnt": "Leistung abgelehnt",
    "nachfordern": "Unterlagen nachfordern",
}


def _ticket(ticket_number: str, db: sqlite3.Connection) -> sqlite3.Row:
    row = db.execute("SELECT * FROM tickets WHERE ticket_number = ?", (ticket_number,)).fetchone()
    if not row:
        raise ValueError(f"Ticket not found: {ticket_number}")
    return row


def _event(ticket_id: int, kind: str, actor: str, details: dict[str, Any], db: sqlite3.Connection) -> None:
    from .store import add_event

    add_event(ticket_id, kind, actor, details, db)


def get_decision(ticket_id: int, db: sqlite3.Connection | None = None) -> dict[str, Any] | None:
    db = db or get_database()
    row = db.execute("SELECT d.*, t.ticket_number FROM decisions d JOIN tickets t ON t.id = d.ticket_id WHERE d.ticket_id = ?", (ticket_id,)).fetchone()
    if not row:
        return None
    return {
        "version": int(row["version"]),
        "outcome": row["outcome"],
        "outcomeLabel": OUTCOMES.get(row["outcome"], row["outcome"]),
        "amount": row["amount"],
        "currency": row["currency"],
        "basis": row["basis"],
        "rationale": row["rationale"],
        "proposedBy": row["proposed_by"],
        "proposedAt": row["proposed_at"],
        "approvedBy": row["approved_by"],
        "approvedAt": row["approved_at"],
        "rejectedNote": row["rejected_note"],
        "documentSha256": row["document_sha256"],
        "documentName": f"Entscheidung-{row['ticket_number']}-v{row['version']}.pdf" if row["document_path"] else None,
        "documentUrl": f"/api/tickets/{row['ticket_number']}/decision.pdf" if row["document_path"] else None,
    }


def propose_decision(
    ticket_number: str,
    outcome: str,
    basis: str,
    rationale: str,
    amount: float | None = None,
    currency: str | None = None,
    actor: str = "mcp-agent",
    db: sqlite3.Connection | None = None,
) -> dict[str, Any]:
    db = db or get_database()
    require_capability("life_review", db)
    if outcome not in OUTCOMES:
        raise ValueError(f"Outcome must be one of {', '.join(OUTCOMES)}")
    if not basis.strip() or not rationale.strip():
        raise ValueError("A decision needs a basis (tariff generation and section) and a rationale")
    ticket = _ticket(ticket_number, db)
    if ticket["product_line"] != "life":
        raise ValueError("Leistungsentscheidungen gibt es für Lebensfälle; bitte zuerst die Sparte Leben zuordnen")
    if ticket["status"] in ("sent", "closed"):
        raise ValueError("Sent or closed tickets cannot get a new decision")
    previous = db.execute("SELECT version, approved_at FROM decisions WHERE ticket_id = ?", (ticket["id"],)).fetchone()
    version = int(previous["version"]) + 1 if previous else 1
    stamp = utc_now()
    db.execute(
        """INSERT INTO decisions (ticket_id, version, outcome, amount, currency, basis, rationale, proposed_by, proposed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ticket_id) DO UPDATE SET version = excluded.version, outcome = excluded.outcome, amount = excluded.amount,
          currency = excluded.currency, basis = excluded.basis, rationale = excluded.rationale,
          proposed_by = excluded.proposed_by, proposed_at = excluded.proposed_at,
          approved_by = NULL, approved_at = NULL, rejected_note = NULL, document_path = NULL, document_sha256 = NULL""",
        (ticket["id"], version, outcome, amount, currency, basis.strip(), rationale.strip(), actor, stamp),
    )
    db.execute(
        "UPDATE tickets SET status = 'awaiting_human', human_approved_at = NULL, updated_at = ? WHERE id = ?",
        (stamp, ticket["id"]),
    )
    _event(ticket["id"], "human_review_required", actor, {"subject": "decision", "version": version}, db)
    if previous and previous["approved_at"]:
        # Newest event on purpose: the case should say the approval lapsed until the new version is approved.
        _event(ticket["id"], "review_invalidated", actor, {"reason": "decision_changed", "version": version}, db)
    complete_ticket_todos(ticket_number, "review", db)
    create_todo(
        f"Entscheidung {ticket_number} prüfen",
        "Leistungsentscheidung freigeben oder mit Begründung ablehnen. Versand bleibt bis zur Freigabe gesperrt.",
        kind="review", ticket_number=ticket_number, actor=actor,
        idempotency_key=f"decision:{ticket_number}:{version}", db=db,
    )
    return get_decision(ticket["id"], db)  # type: ignore[return-value]


def approve_decision(ticket_number: str, actor: str = "human", db: sqlite3.Connection | None = None) -> dict[str, Any]:
    db = db or get_database()
    ticket = _ticket(ticket_number, db)
    decision = get_decision(ticket["id"], db)
    if not decision:
        raise ValueError("Es liegt noch keine Leistungsentscheidung vor; Claude muss sie zuerst vorlegen")
    if decision["approvedAt"]:
        raise ValueError("Diese Fassung der Entscheidung ist bereits freigegeben")
    if ticket["status"] != "awaiting_human":
        raise ValueError("Die Entscheidung wartet nicht auf Freigabe; bitte neu vorlegen lassen")
    stamp = utc_now()
    pdf = decision_pdf(ticket_number, ticket["subject"], decision, actor, stamp)
    digest = hashlib.sha256(pdf).hexdigest()
    folder = STATE_ROOT / ".data" / "decisions"
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"Entscheidung-{ticket_number}-v{decision['version']}.pdf"
    path.write_bytes(pdf)
    db.execute(
        "UPDATE decisions SET approved_by = ?, approved_at = ?, document_path = ?, document_sha256 = ?, rejected_note = NULL WHERE ticket_id = ?",
        (actor, stamp, str(path.relative_to(STATE_ROOT)), digest, ticket["id"]),
    )
    db.execute("UPDATE tickets SET status = 'in_progress', human_approved_at = ?, updated_at = ? WHERE id = ?", (stamp, stamp, ticket["id"]))
    _event(ticket["id"], "draft_approved", actor, {"subject": "decision", "version": decision["version"], "sha256": digest}, db)
    complete_ticket_todos(ticket_number, "review", db)
    return get_decision(ticket["id"], db)  # type: ignore[return-value]


def reject_decision(ticket_number: str, note: str, actor: str = "human", db: sqlite3.Connection | None = None) -> dict[str, Any]:
    db = db or get_database()
    if not note.strip():
        raise ValueError("A rejection note is required")
    ticket = _ticket(ticket_number, db)
    if not get_decision(ticket["id"], db):
        raise ValueError("Es liegt keine Leistungsentscheidung vor")
    stamp = utc_now()
    db.execute("UPDATE decisions SET approved_by = NULL, approved_at = NULL, rejected_note = ? WHERE ticket_id = ?", (note.strip(), ticket["id"]))
    db.execute("UPDATE tickets SET status = 'in_progress', human_approved_at = NULL, updated_at = ? WHERE id = ?", (stamp, ticket["id"]))
    _event(ticket["id"], "draft_rejected", actor, {"note": note.strip(), "subject": "decision"}, db)
    complete_ticket_todos(ticket_number, "review", db)
    return get_decision(ticket["id"], db)  # type: ignore[return-value]


def decision_document(ticket_number: str, db: sqlite3.Connection | None = None) -> tuple[str, bytes] | None:
    db = db or get_database()
    ticket = _ticket(ticket_number, db)
    row = db.execute("SELECT document_path, version FROM decisions WHERE ticket_id = ? AND approved_at IS NOT NULL", (ticket["id"],)).fetchone()
    if not row or not row["document_path"]:
        return None
    return f"Entscheidung-{ticket_number}-v{row['version']}.pdf", (STATE_ROOT / row["document_path"]).read_bytes()


def decision_pdf(ticket_number: str, subject: str, decision: dict[str, Any], actor: str, stamp: str) -> bytes:
    """A one-page PDF without extra dependencies (Helvetica, WinAnsi so umlauts work)."""
    approver = "Mensch im Cockpit" if actor.startswith("human") else actor
    amount = f"{decision['amount']:,.2f} {decision['currency'] or ''}".replace(",", "'") if decision["amount"] is not None else "–"
    lines: list[tuple[int, str]] = [
        (16, "Pfefferminzia · Leistungsentscheidung"),
        (10, f"Fall {ticket_number} · Fassung {decision['version']}"),
        (10, subject),
        (10, ""),
        (11, f"Ergebnis: {decision['outcomeLabel']}"),
        (11, f"Betrag: {amount}"),
        (11, f"Rechtsgrundlage: {decision['basis']}"),
        (11, "Begründung:"),
    ]
    for paragraph in decision["rationale"].splitlines() or [""]:
        words, line = paragraph.split(), ""
        for word in words:
            if len(line) + len(word) + 1 > 88:
                lines.append((10, line))
                line = word
            else:
                line = f"{line} {word}".strip()
        lines.append((10, line))
    lines += [(10, ""), (10, f"Freigegeben: {approver}, {stamp}"),
              (8, "Synthetischer Workshop-Fall. Nach der Freigabe unveränderlich; jede Änderung braucht eine neue Freigabe.")]

    def escape(text: str) -> bytes:
        raw = text.encode("cp1252", "replace")
        return raw.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")

    y, stream = 800, b"BT\n"
    for size, text in lines:
        stream += b"/F1 %d Tf 1 0 0 1 56 %d Tm (" % (size, y) + escape(text) + b") Tj\n"
        y -= int(size * 1.7)
    stream += b"ET\n"
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"endstream",
    ]
    out, offsets = b"%PDF-1.4\n", []
    for number, body in enumerate(objects, 1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % number + body + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1) + b"".join(b"%010d 00000 n \n" % o for o in offsets)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objects) + 1, xref)
    return out
