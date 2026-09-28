from __future__ import annotations

import json
import sqlite3
from typing import Any

from .constants import CLAIM_ACTIONS, CLAIM_STATUSES, RISK_LEVELS
from .database import get_database
from .store import list_contract_documents
from .util import utc_now

CLAIM_SELECT = """SELECT c.*,
  COALESCE(p.firmenname, TRIM(COALESCE(p.vorname, '') || ' ' || COALESCE(p.nachname, ''))) AS customer_name,
  COALESCE(pr.marktname, v.produkt_id) AS product_name,
  v.tarifgeneration_id,
  t.ticket_number
  FROM workshop_claims c
  JOIN core_partner p ON p.partner_id = c.policyholder_id
  JOIN core_vertrag v ON v.vertrag_id = c.contract_id
  LEFT JOIN core_produkt pr ON pr.produkt_id = v.produkt_id
  LEFT JOIN tickets t ON t.id = c.ticket_id"""


def _map_claim(row: sqlite3.Row, db: sqlite3.Connection) -> dict[str, Any]:
    return {
        "claimId": row["claim_id"],
        "contractId": row["contract_id"],
        "policyholderId": row["policyholder_id"],
        "customerName": row["customer_name"],
        "productName": row["product_name"],
        "tariffGenerationId": row["tarifgeneration_id"],
        "policyDocumentIds": [document["id"] for document in list_contract_documents(row["contract_id"], db)],
        "ticketNumber": row["ticket_number"],
        "title": row["title"],
        "eventDate": row["event_date"],
        "notifiedAt": row["notified_at"],
        "productLine": row["product_line"],
        "market": row["market"],
        "currency": row["currency"],
        "reportedAmount": float(row["reported_amount"]),
        "reserveAmount": float(row["reserve_amount"]),
        "paidAmount": float(row["paid_amount"]),
        "status": row["status"],
        "riskLevel": row["risk_level"],
        "assignedTeam": row["assigned_team"],
        "summary": row["summary"],
        "scenario": row["scenario"],
        "sourceReference": row["source_reference"],
        "workshopExtension": bool(row["workshop_extension"]),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def _map_recommendation(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": int(row["id"]),
        "action": row["action"],
        "amount": float(row["amount"]) if row["amount"] is not None else None,
        "rationale": row["rationale"],
        "confidence": float(row["confidence"]),
        "ruleVersion": row["rule_version"],
        "proposedBy": row["proposed_by"],
        "status": row["status"],
        "reviewedBy": row["reviewed_by"],
        "reviewerNote": row["reviewer_note"],
        "createdAt": row["created_at"],
        "reviewedAt": row["reviewed_at"],
    }


def _map_task(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": int(row["id"]),
        "type": row["type"],
        "description": row["description"],
        "status": row["status"],
        "assignedTo": row["assigned_to"],
        "dueAt": row["due_at"],
        "createdBy": row["created_by"],
        "createdAt": row["created_at"],
        "completedAt": row["completed_at"],
    }


def _map_event(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": int(row["id"]),
        "type": row["type"],
        "actor": row["actor"],
        "details": json.loads(row["details_json"]),
        "createdAt": row["created_at"],
    }


def list_claims(
    *,
    status: str | None = None,
    risk_level: str | None = None,
    partner_id: str | None = None,
    contract_id: str | None = None,
    query: str | None = None,
    limit: int = 100,
    db: sqlite3.Connection | None = None,
) -> list[dict[str, Any]]:
    db = db or get_database()
    where: list[str] = []
    params: dict[str, Any] = {}
    if status:
        if status not in CLAIM_STATUSES:
            raise ValueError(f"Invalid claim status: {status}")
        where.append("c.status = :status")
        params["status"] = status
    if risk_level:
        if risk_level not in RISK_LEVELS:
            raise ValueError(f"Invalid risk level: {risk_level}")
        where.append("c.risk_level = :risk_level")
        params["risk_level"] = risk_level
    if partner_id:
        where.append("c.policyholder_id = :partner_id")
        params["partner_id"] = partner_id
    if contract_id:
        where.append("c.contract_id = :contract_id")
        params["contract_id"] = contract_id
    if query and query.strip():
        where.append(
            "(c.claim_id LIKE :query OR c.title LIKE :query OR c.summary LIKE :query "
            "OR c.contract_id LIKE :query OR c.policyholder_id LIKE :query)"
        )
        params["query"] = f"%{query.strip()}%"
    params["limit"] = max(1, min(limit, 500))
    statement = f"""{CLAIM_SELECT} {'WHERE ' + ' AND '.join(where) if where else ''}
      ORDER BY CASE c.risk_level WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        c.updated_at DESC LIMIT :limit"""
    return [_map_claim(row, db) for row in db.execute(statement, params)]


def get_claim(claim_id: str, db: sqlite3.Connection | None = None) -> dict[str, Any] | None:
    db = db or get_database()
    row = db.execute(f"{CLAIM_SELECT} WHERE c.claim_id = ?", (claim_id,)).fetchone()
    if not row:
        return None
    claim = _map_claim(row, db)
    claim.update(
        {
            "recommendations": [
                _map_recommendation(item)
                for item in db.execute(
                    "SELECT * FROM workshop_claim_recommendations WHERE claim_id = ? ORDER BY created_at DESC, id DESC",
                    (claim_id,),
                )
            ],
            "tasks": [
                _map_task(item)
                for item in db.execute(
                    "SELECT * FROM workshop_claim_tasks WHERE claim_id = ? ORDER BY status = 'open' DESC, created_at DESC, id DESC",
                    (claim_id,),
                )
            ],
            "events": [
                _map_event(item)
                for item in db.execute(
                    "SELECT * FROM workshop_claim_events WHERE claim_id = ? ORDER BY created_at DESC, id DESC",
                    (claim_id,),
                )
            ],
            "humanReviewRequired": True,
            "automationBoundary": (
                "AI may retrieve evidence, create tasks, and propose an action. A human must approve every new "
                "claim decision; approval does not send messages or execute payments."
            ),
        }
    )
    return claim


def _add_claim_event(
    claim_id: str,
    event_type: str,
    actor: str,
    details: dict[str, Any],
    db: sqlite3.Connection,
    created_at: str | None = None,
) -> None:
    db.execute(
        "INSERT INTO workshop_claim_events (claim_id, type, actor, details_json, created_at) VALUES (?, ?, ?, ?, ?)",
        (claim_id, event_type, actor, json.dumps(details, ensure_ascii=False), created_at or utc_now()),
    )


def _prior_command(
    idempotency_key: str, command: str, claim_id: str | None, db: sqlite3.Connection
) -> dict[str, Any] | None:
    existing = db.execute(
        "SELECT * FROM workshop_claim_commands WHERE idempotency_key = ?", (idempotency_key,)
    ).fetchone()
    if not existing:
        return None
    if existing["command"] != command or (claim_id and existing["claim_id"] != claim_id):
        raise ValueError("Idempotency key was already used for a different claim command")
    return get_claim(existing["claim_id"], db)


def _record_command(
    idempotency_key: str,
    claim_id: str,
    command: str,
    actor: str,
    db: sqlite3.Connection,
    created_at: str | None = None,
) -> None:
    db.execute(
        "INSERT INTO workshop_claim_commands (idempotency_key, claim_id, command, actor, created_at) VALUES (?, ?, ?, ?, ?)",
        (idempotency_key, claim_id, command, actor, created_at or utc_now()),
    )


def create_claim_from_ticket(
    *,
    ticket_number: str,
    title: str,
    event_date: str,
    reported_amount: float,
    idempotency_key: str,
    actor: str = "human",
    db: sqlite3.Connection | None = None,
) -> dict[str, Any]:
    db = db or get_database()
    replay = _prior_command(idempotency_key, "create_from_ticket", None, db)
    if replay:
        return replay
    ticket = db.execute("SELECT * FROM tickets WHERE ticket_number = ?", (ticket_number,)).fetchone()
    if not ticket:
        raise ValueError(f"Ticket not found: {ticket_number}")
    if ticket["category"] != "claim":
        raise ValueError("Ticket must be classified as a claim before claim creation")
    contracts = db.execute(
        """SELECT v.* FROM ticket_contracts tc JOIN core_vertrag v ON v.vertrag_id = tc.vertrag_id
        WHERE tc.ticket_id = ? ORDER BY tc.created_at""",
        (ticket["id"],),
    ).fetchall()
    if len(contracts) != 1:
        raise ValueError("Ticket must be linked to exactly one contract before claim creation")
    contract = contracts[0]
    sequence = db.execute("SELECT COUNT(*) AS count FROM workshop_claims WHERE claim_id LIKE 'WKS-%'").fetchone()["count"] + 1
    claim_id = f"WKS-{sequence:06d}"
    stamp = utc_now()
    product_line = "life" if contract["sparte"] == "LV" else "liability"
    risk_level = "high" if product_line == "life" or reported_amount > 25_000 else "medium" if reported_amount > 5_000 else "low"
    db.execute("BEGIN IMMEDIATE")
    try:
        db.execute(
            """INSERT INTO workshop_claims
              (claim_id, contract_id, policyholder_id, ticket_id, title, event_date, notified_at, product_line, market, currency,
               reported_amount, reserve_amount, paid_amount, status, risk_level, assigned_team, summary, scenario, source_reference,
               workshop_extension, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'new', ?, ?, ?, 'ticket_intake', ?, 1, ?, ?)""",
            (
                claim_id,
                contract["vertrag_id"],
                contract["versicherungsnehmer_id"],
                ticket["id"],
                title.strip(),
                event_date,
                stamp,
                product_line,
                contract["markt"],
                contract["waehrung"],
                reported_amount,
                reported_amount,
                risk_level,
                "Claims Life Human Review" if product_line == "life" else f"Claims Liability {contract['markt']}",
                ticket["summary"] or ticket["subject"],
                f"Workshop claim created from {ticket_number}; no upstream claim record.",
                stamp,
                stamp,
            ),
        )
        _record_command(idempotency_key, claim_id, "create_from_ticket", actor, db, stamp)
        _add_claim_event(
            claim_id,
            "claim_created_from_ticket",
            actor,
            {"ticketNumber": ticket_number, "contractId": contract["vertrag_id"]},
            db,
            stamp,
        )
        db.execute("COMMIT")
    except Exception:
        db.execute("ROLLBACK")
        raise
    return get_claim(claim_id, db)  # type: ignore[return-value]


def propose_claim_action(
    *,
    claim_id: str,
    action: str,
    rationale: str,
    confidence: float,
    rule_version: str,
    idempotency_key: str,
    amount: float | None = None,
    actor: str = "mcp-agent",
    db: sqlite3.Connection | None = None,
) -> dict[str, Any]:
    db = db or get_database()
    replay = _prior_command(idempotency_key, "propose_action", claim_id, db)
    if replay:
        return replay
    claim = get_claim(claim_id, db)
    if not claim:
        raise ValueError(f"Claim not found: {claim_id}")
    if action not in CLAIM_ACTIONS:
        raise ValueError(f"Invalid claim action: {action}")
    if not rationale.strip():
        raise ValueError("Recommendation rationale cannot be empty")
    if not 0 <= confidence <= 1:
        raise ValueError("Confidence must be between 0 and 1")
    if action == "PAY" and (amount is None or amount <= 0):
        raise ValueError("A positive amount is required for payment recommendations")
    if amount is not None and amount > claim["reportedAmount"]:
        raise ValueError("Recommended amount cannot exceed the reported amount")
    stamp = utc_now()
    db.execute("BEGIN IMMEDIATE")
    try:
        db.execute(
            """INSERT INTO workshop_claim_recommendations
              (claim_id, action, amount, rationale, confidence, rule_version, proposed_by, status, created_at, idempotency_key)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?)""",
            (claim_id, action, amount, rationale.strip(), confidence, rule_version, actor, stamp, idempotency_key),
        )
        db.execute("UPDATE workshop_claims SET status = 'awaiting_human', updated_at = ? WHERE claim_id = ?", (stamp, claim_id))
        _record_command(idempotency_key, claim_id, "propose_action", actor, db, stamp)
        _add_claim_event(
            claim_id,
            "action_proposed",
            actor,
            {"action": action, "amount": amount, "confidence": confidence, "ruleVersion": rule_version},
            db,
            stamp,
        )
        db.execute("COMMIT")
    except Exception:
        db.execute("ROLLBACK")
        raise
    return get_claim(claim_id, db)  # type: ignore[return-value]


def review_claim_action(
    *,
    claim_id: str,
    recommendation_id: int,
    decision: str,
    note: str,
    idempotency_key: str,
    actor: str = "human-reviewer",
    db: sqlite3.Connection | None = None,
) -> dict[str, Any]:
    db = db or get_database()
    replay = _prior_command(idempotency_key, "review_action", claim_id, db)
    if replay:
        return replay
    if not get_claim(claim_id, db):
        raise ValueError(f"Claim not found: {claim_id}")
    recommendation = db.execute(
        "SELECT * FROM workshop_claim_recommendations WHERE id = ? AND claim_id = ?", (recommendation_id, claim_id)
    ).fetchone()
    if not recommendation:
        raise ValueError(f"Recommendation not found: {recommendation_id}")
    if recommendation["status"] not in ("pending_review", "blocked"):
        raise ValueError("Recommendation was already reviewed")
    if recommendation["status"] == "blocked" and decision == "approve":
        raise ValueError("A blocked recommendation cannot be approved; reject it and create a corrected proposal")
    if decision not in ("approve", "reject"):
        raise ValueError("Decision must be approve or reject")
    if not note.strip():
        raise ValueError("A human review note is required")
    status_by_action = {
        "PAY": "approved",
        "DENY": "closed",
        "REQUEST_INFORMATION": "awaiting_information",
        "ESCALATE_COMPLEX": "investigation",
        "REFER_SIU": "investigation",
    }
    next_status = status_by_action[recommendation["action"]] if decision == "approve" else "triage"
    stamp = utc_now()
    db.execute("BEGIN IMMEDIATE")
    try:
        db.execute(
            """UPDATE workshop_claim_recommendations SET status = ?, reviewed_by = ?, reviewer_note = ?, reviewed_at = ?
            WHERE id = ?""",
            ("approved" if decision == "approve" else "rejected", actor, note.strip(), stamp, recommendation_id),
        )
        db.execute("UPDATE workshop_claims SET status = ?, updated_at = ? WHERE claim_id = ?", (next_status, stamp, claim_id))
        _record_command(idempotency_key, claim_id, "review_action", actor, db, stamp)
        _add_claim_event(
            claim_id,
            "action_reviewed",
            actor,
            {"recommendationId": recommendation_id, "decision": decision, "nextStatus": next_status},
            db,
            stamp,
        )
        db.execute("COMMIT")
    except Exception:
        db.execute("ROLLBACK")
        raise
    return get_claim(claim_id, db)  # type: ignore[return-value]


def create_claim_task(
    *,
    claim_id: str,
    task_type: str,
    description: str,
    idempotency_key: str,
    assigned_to: str | None = None,
    due_at: str | None = None,
    actor: str = "mcp-agent",
    db: sqlite3.Connection | None = None,
) -> dict[str, Any]:
    db = db or get_database()
    replay = _prior_command(idempotency_key, "create_task", claim_id, db)
    if replay:
        return replay
    if not get_claim(claim_id, db):
        raise ValueError(f"Claim not found: {claim_id}")
    if not task_type.strip() or not description.strip():
        raise ValueError("Task type and description are required")
    stamp = utc_now()
    db.execute("BEGIN IMMEDIATE")
    try:
        db.execute(
            """INSERT INTO workshop_claim_tasks
              (claim_id, type, description, status, assigned_to, due_at, created_by, created_at, idempotency_key)
              VALUES (?, ?, ?, 'open', ?, ?, ?, ?, ?)""",
            (claim_id, task_type.strip(), description.strip(), assigned_to, due_at, actor, stamp, idempotency_key),
        )
        _record_command(idempotency_key, claim_id, "create_task", actor, db, stamp)
        _add_claim_event(
            claim_id,
            "task_created",
            actor,
            {"type": task_type, "assignedTo": assigned_to, "dueAt": due_at},
            db,
            stamp,
        )
        db.execute("COMMIT")
    except Exception:
        db.execute("ROLLBACK")
        raise
    return get_claim(claim_id, db)  # type: ignore[return-value]


SEED_CLAIMS = [
    {
        "claim": ("SCH-00000118", "VTR-00000101", "PTR-00000001", "E-Bike des Nachbarn beschädigt", "2025-05-17", "2025-05-18T09:15:00Z", "liability", "CH", "CHF", 2340, 0, 2340, "settled", "low", "Claims Liability CH", "Kind hat das E-Bike des Nachbarn umgestoßen; Schaden an Display und Rahmen dokumentiert.", "correct_small_claim_automation", "Falk core_schaden SCH-00000118; operational workshop snapshot", "2025-05-18T09:15:00Z"),
        "recommendation": ("PAY", 2340, "Historischer Workshop-Stand: Betrag unter CHF 5000, Kostenvoranschlag und Rückfragen liegen vor.", 0.96, "MINT-Triage-v2/R08", "historical-workshop-import", "approved", "historical-rule-execution", "Aus der synthetischen Persona-Geschichte übernommen.", "2025-05-21T10:00:00Z"),
        "events": [("claim_reported", "customer-app", {"channel": "app", "photos": 3}, "2025-05-18T09:15:00Z"), ("information_received", "contact-center", {"subject": "child_age_and_supervision"}, "2025-05-19T14:00:00Z"), ("payment_recorded", "historical-workshop-import", {"amount": 2340, "currency": "CHF"}, "2025-05-21T10:00:00Z")],
        "tasks": [],
    },
    {
        "claim": ("SCH-00000810", "VTR-00000801", "PTR-00000008", "Hundebiss bei Radfahrer", "2025-03-21", "2025-03-21T15:20:00Z", "liability", "DE", "EUR", 1240, 1240, 0, "awaiting_human", "critical", "Claims Liability DE", "Ein bei der Datenmigration falsch übertragener Baustein widerspricht dem dokumentierten Hundehalter-Baustein; ein Mensch muss korrigieren.", "pieper_wrongful_denial_governance", "Falk core_schaden SCH-00000810; operational workshop snapshot", "2025-03-21T15:20:00Z"),
        "recommendation": ("DENY", None, "Die Altkonfiguration fand den Tierhalter-Baustein im migrierten Feld nicht. Die Notizen zur Ursprungspolice widersprechen diesem Ergebnis.", 0.81, "MINT-Triage-v3/legacy-replay", "workshop-legacy-model", "blocked", None, "Gestoppt durch die Regel: keine automatische Ablehnung.", "2025-03-24T08:30:00Z"),
        "events": [("claim_reported", "contact-center", {"keywords": ["dog", "bite", "cyclist", "leash"]}, "2025-03-21T15:20:00Z"), ("recommendation_blocked", "governance-control", {"policy": "denials_require_human_review", "conflict": "migration_source_vs_target"}, "2025-03-24T08:30:00Z")],
        "tasks": [("SOURCE_POLICY_CHECK", "Verify the dog-owner extension against the HAPO source and 2019 advisory record.", "Claims Liability DE", "2025-03-25T16:00:00Z", "2025-03-24T08:31:00Z")],
    },
    {
        "claim": ("SCH-00000318", "VTR-00000301", "PTR-00000003", "Wasserschaden nach Kücheneinbau", "2024-03-12", "2024-03-13T08:00:00Z", "liability", "CH", "CHF", 180000, 172400, 95000, "investigation", "high", "Claims Complex CH", "Wasser in drei Wohnungen; ob der Schaden am Bauteil oder am Einbau lag, entscheidet über den Regress.", "complex_loss_and_recourse", "Falk core_schaden SCH-00000318; operational workshop snapshot", "2024-03-13T08:00:00Z"),
        "recommendation": ("ESCALATE_COMPLEX", None, "Der Betrag übersteigt die Vollmacht, und die Ursache betrifft den Regress beim Lieferanten. Gutachten sichern, Teamleitung entscheidet.", 0.93, "Complex-Claims-v1/R25K", "workshop-triage-agent", "pending_review", None, None, "2024-03-20T09:00:00Z"),
        "events": [("claim_reported", "broker", {"channel": "broker"}, "2024-03-13T08:00:00Z"), ("reserve_changed", "claims-handler", {"from": 0, "to": 120000, "currency": "CHF"}, "2024-03-20T09:00:00Z"), ("partial_payment_recorded", "team-lead", {"amount": 95000, "currency": "CHF"}, "2024-09-02T10:00:00Z")],
        "tasks": [("RECOURSE_REVIEW", "Assess recovery against the fitting supplier after expert causation review.", "Claims Complex CH", None, "2024-08-01T09:00:00Z")],
    },
    {
        "claim": ("SCH-00000918", "VTR-00000901", "PTR-00000009", "Wasserschaden beim Transport", "2024-08-29", "2024-08-29T12:20:00Z", "liability", "DE", "EUR", 6800, 6800, 0, "investigation", "critical", "Special Investigation Unit", "Häufigkeit, ähnliche Dokumentvorlagen und Zeitpunkt der Fotos sind Hinweise für eine Prüfung, kein Betrugsbeweis.", "fraud_signals_and_fairness", "Falk core_schaden SCH-00000918; operational workshop snapshot", "2024-08-29T12:20:00Z"),
        "recommendation": ("REFER_SIU", None, "Mehrere Schäden und widersprüchliche Belege rechtfertigen eine Prüfung. Die Postleitzahl allein darf kein Entscheidungsmerkmal sein.", 0.87, "Fraud-Signals-v2/fairness-guard", "workshop-fraud-model", "pending_review", None, None, "2024-09-03T07:45:00Z"),
        "events": [("claim_reported", "customer-app", {"channel": "app"}, "2024-08-29T12:20:00Z"), ("signals_recorded", "workshop-fraud-model", {"signals": ["frequency", "document_similarity", "photo_timing"], "excludedFromDecision": ["postcode_cluster"]}, "2024-09-03T07:45:00Z")],
        "tasks": [("FAIRNESS_REVIEW", "Review signal contribution and document why geographic proxy data is not used as a sole decision basis.", "AI Compliance", None, "2024-09-03T07:46:00Z")],
    },
]


# The two Drill 8 life cases. Falk's data has no benefit case for these contracts, so the workshop adds a
# synthetic file: without it Claude would have nothing to ground a Leistungsentscheidung on.
SEED_CLAIMS += [
    {
        "workshopOnly": True,
        "claim": ("LF-2026-0202", "VTR-00000202", "PTR-00000002", "Todesfall nach Verkehrsunfall", "2026-08-14", "2026-08-20T10:30:00Z", "life", "DE", "EUR", 139000, 139000, 0, "investigation", "medium", "Leistung Leben DE", "Die versicherte Person Jana Ortlepp ist am 14.08.2026 bei einem Verkehrsunfall verstorben. Ihr Bruder Martin Ortlepp hat den Todesfall als gesetzlicher Erbe gemeldet. Sterbeurkunde und Polizeibericht (Unfall, Fremdverschulden) liegen vor; der Erbschein wird nachgereicht. Beiträge sind vollständig bezahlt.", "life_benefit_clear", "Workshop-Leistungsakte, synthetisch", "2026-08-20T10:30:00Z"),
        "recommendation": None,
        "events": [("claim_reported", "contact-center", {"channel": "phone", "reportedBy": "Martin Ortlepp (Bruder, gesetzlicher Erbe)"}, "2026-08-20T10:30:00Z"), ("information_received", "contact-center", {"documents": ["Sterbeurkunde", "Polizeibericht"]}, "2026-08-27T09:00:00Z")],
        "tasks": [("DOCUMENT_CHECK", "Erbschein abwarten, dann Leistung an die gesetzlichen Erben entscheiden.", "Leistung Leben DE", None, "2026-08-27T09:01:00Z")],
    },
    {
        "workshopOnly": True,
        "claim": ("LF-2026-0602", "VTR-00000602", "PTR-00000006", "Todesfall nach Herzinfarkt", "2026-06-30", "2026-07-06T08:15:00Z", "life", "DE", "EUR", 314000, 314000, 0, "awaiting_human", "high", "Leistung Leben DE", "Der Versicherungsnehmer und die versicherte Person Farid Nazari ist am 30.06.2026 an einem Herzinfarkt verstorben – ein Jahr nach Vertragsbeginn (01.07.2025). Die Todesbescheinigung nennt eine natürliche Todesursache. Bezugsberechtigt ist Sabine Nazari. Mit Schreiben vom 10.09.2026 wurde ihr eine Ablehnung angekündigt; sie hat widersprochen.", "life_benefit_disputed", "Workshop-Leistungsakte, synthetisch", "2026-07-06T08:15:00Z"),
        "recommendation": ("DENY", None, "Tod innerhalb von drei Jahren nach Vertragsbeginn; Leistung wird nach der Dreijahresfrist abgelehnt. (So am 10.09.2026 angekündigt.)", 0.62, "Leben-Altregel-v1", "sachbearbeitung-alt", "pending_review", None, None, "2026-09-10T14:00:00Z"),
        "events": [("claim_reported", "customer-mail", {"reportedBy": "Sabine Nazari (bezugsberechtigt)"}, "2026-07-06T08:15:00Z"), ("information_received", "customer-mail", {"documents": ["Sterbeurkunde", "Todesbescheinigung: natürliche Todesursache (Herzinfarkt)"]}, "2026-07-14T11:00:00Z"), ("decision_announced", "sachbearbeitung-alt", {"outcome": "Ablehnung angekündigt", "letterDate": "2026-09-10"}, "2026-09-10T14:00:00Z")],
        "tasks": [],
    },
]


def ensure_workshop_claims(db: sqlite3.Connection | None = None) -> None:
    db = db or get_database()
    for seed in SEED_CLAIMS:
        claim = seed["claim"]
        if not db.execute("SELECT 1 FROM core_vertrag WHERE vertrag_id = ?", (claim[1],)).fetchone():
            raise RuntimeError(f"Cannot seed workshop claim; Falk contract is missing: {claim[1]}")
        if not seed.get("workshopOnly"):
            source = db.execute("SELECT vertrag_id, partner_id FROM core_schaden WHERE schaden_id = ?", (claim[0],)).fetchone()
            if not source:
                raise RuntimeError(f"Cannot seed workshop claim; Falk claim is missing: {claim[0]}")
            if source["vertrag_id"] != claim[1] or source["partner_id"] != claim[2]:
                raise RuntimeError(f"Cannot seed workshop claim; Falk claim linkage differs: {claim[0]}")
        cursor = db.execute(
            """INSERT INTO workshop_claims
              (claim_id, contract_id, policyholder_id, title, event_date, notified_at, product_line, market, currency,
               reported_amount, reserve_amount, paid_amount, status, risk_level, assigned_team, summary, scenario, source_reference,
               workshop_extension, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
              ON CONFLICT(claim_id) DO NOTHING""",
            (*claim, claim[18]),
        )
        db.execute(
            "UPDATE workshop_claims SET source_reference = ? WHERE claim_id = ? AND workshop_extension = 1",
            (claim[17], claim[0]),
        )
        if cursor.rowcount == 0:
            continue
        for event_type, actor, details, event_at in seed["events"]:
            _add_claim_event(claim[0], event_type, actor, details, db, event_at)
        if not seed["recommendation"]:
            continue
        action, amount, rationale, confidence, rule_version, proposed_by, status, reviewed_by, reviewer_note, created_at = seed["recommendation"]
        db.execute(
            """INSERT INTO workshop_claim_recommendations
              (claim_id, action, amount, rationale, confidence, rule_version, proposed_by, status, reviewed_by,
               reviewer_note, created_at, reviewed_at, idempotency_key)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (claim[0], action, amount, rationale, confidence, rule_version, proposed_by, status, reviewed_by, reviewer_note,
             created_at, created_at if reviewed_by else None, f"seed:{claim[0]}:recommendation"),
        )
        for task_type, description, assigned_to, due_at, task_at in seed["tasks"]:
            db.execute(
                """INSERT INTO workshop_claim_tasks
                  (claim_id, type, description, status, assigned_to, due_at, created_by, created_at, idempotency_key)
                  VALUES (?, ?, ?, 'open', ?, ?, 'historical-workshop-import', ?, ?)""",
                (claim[0], task_type, description, assigned_to, due_at, task_at, f"seed:{claim[0]}:task:{task_type}"),
            )
