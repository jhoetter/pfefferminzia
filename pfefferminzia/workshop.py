from __future__ import annotations

import json
import os
import sqlite3
from typing import Any

from .claims import ensure_workshop_claims
from .database import get_database

PROFILE = "participant"


def assert_participant_profile() -> str:
    configured = os.getenv("WORKSHOP_PROFILE", PROFILE)
    if configured != PROFILE:
        raise RuntimeError(
            f"Unsupported WORKSHOP_PROFILE={configured}. The operational service only supports the participant "
            "profile and never exposes instructor truth data."
        )
    return PROFILE


DEMO_TICKETS = [
    {
        "ticketNumber": "PF-10001", "partnerId": "PTR-00000001", "contractId": "VTR-00000101", "claimId": "SCH-00000118",
        "email": "simone.niederberger@mail.example", "customerName": "Simone Niederberger", "subject": "E-Bike des Nachbarn beschädigt",
        "status": "in_progress", "category": "coverage_question", "priority": "normal",
        "summary": "Kundin fragt nach Deckung für den durch ihr Kind verursachten E-Bike-Schaden.",
        "body": "Guten Tag\n\nmein Sohn hat beim Spielen das E-Bike unseres Nachbarn umgestossen. Ich habe drei Fotos und den Kostenvoranschlag. Können Sie mir kurz sagen, ob das versichert ist?\n\nFreundliche Grüsse\nSimone Niederberger",
        "createdAt": "2025-05-18T09:15:00Z",
    },
    {
        "ticketNumber": "PF-10003", "partnerId": "PTR-00000003", "contractId": "VTR-00000301", "claimId": "SCH-00000318",
        "email": "broker.kaufmann@workshop.invalid", "customerName": "Schreinerei Kaufmann + Söhne GmbH", "subject": "Grossschaden Wasser – Entscheidung Teilzahlung",
        "status": "awaiting_human", "category": "claim", "priority": "high",
        "summary": "Makler fordert eine Teilzahlung; Schadenhöhe und Regressursache benötigen Kompetenzfreigabe.",
        "body": "Sehr geehrte Damen und Herren\n\nzum Wasserschaden unseres Kunden liegt das Gutachten vor. Wir erwarten Ihre Stellungnahme zur beantragten Teilzahlung und zur weiteren Regressprüfung.\n\nFreundliche Grüsse\nBroker Mittelland AG",
        "createdAt": "2024-06-18T08:10:00Z",
    },
    {
        "ticketNumber": "PF-10008", "partnerId": "PTR-00000008", "contractId": "VTR-00000801", "claimId": "SCH-00000810",
        "email": "hpieper@bluemail.example", "customerName": "Hans-Georg Pieper", "subject": "BESCHWERDE – SCHADEN SCH-00000810",
        "status": "awaiting_human", "category": "complaint", "priority": "urgent",
        "summary": "Kunde widerspricht der systemseitigen Ablehnung und verweist auf den Hundehalter-Baustein seit 2019.",
        "body": "BESCHWERDE – SCHADEN NR. SCH-00000810\n\nIch lasse mir das nicht gefallen. Den Hundehalter-Baustein bezahle ich seit 2019. Prüfen Sie Ihre Unterlagen und bestätigen Sie mir binnen 14 Tagen die Regulierung.\n\nHochachtungsvoll\nH.-G. Pieper",
        "createdAt": "2025-03-28T10:00:00Z",
    },
    {
        "ticketNumber": "PF-10009", "partnerId": "PTR-00000009", "contractId": "VTR-00000901", "claimId": "SCH-00000918",
        "email": "marcel.grimm@workshop.invalid", "customerName": "Transportlogistik Grimm e.K.", "subject": "Wasserschaden beim Transport – Rechnung anbei",
        "status": "in_progress", "category": "claim", "priority": "urgent",
        "summary": "Serienschaden mit Beleg- und Zeitabweichungen; Signale erfordern SIU- und Fairness-Prüfung.",
        "body": "hallo\n\nschaden ist passiert beim entladen, wasserkanister ist umgekippt. hab alles hochgeladen, kunde will sein geld.\n\nGruß Marcel",
        "createdAt": "2024-08-29T12:20:00Z",
    },
]


def ensure_workshop_fixtures(db: sqlite3.Connection | None = None) -> dict[str, Any]:
    db = db or get_database()
    assert_participant_profile()
    for fixture in DEMO_TICKETS:
        cursor = db.execute(
            """INSERT INTO tickets
              (ticket_number, source, customer_email, customer_name, subject, status, product_line, category, priority, summary,
               classification_confidence, classification_source, is_demo, created_at, updated_at, last_message_at)
              VALUES (?, 'demo', ?, ?, ?, ?, 'liability', ?, ?, ?, 1, 'workshop-fixture', 1, ?, ?, ?)
              ON CONFLICT(ticket_number) DO NOTHING""",
            (
                fixture["ticketNumber"], fixture["email"], fixture["customerName"], fixture["subject"], fixture["status"],
                fixture["category"], fixture["priority"], fixture["summary"], fixture["createdAt"], fixture["createdAt"], fixture["createdAt"],
            ),
        )
        ticket = db.execute(
            "SELECT id FROM tickets WHERE ticket_number = ? AND source = 'demo'", (fixture["ticketNumber"],)
        ).fetchone()
        if not ticket:
            raise RuntimeError(f"Workshop ticket number is occupied by a non-demo record: {fixture['ticketNumber']}")
        db.execute(
            """INSERT OR IGNORE INTO messages
              (ticket_id, external_message_id, direction, sender, recipients_json, subject, text_body, sent_at, created_at)
              VALUES (?, ?, 'inbound', ?, '["service@pfefferminzia.invalid"]', ?, ?, ?, ?)""",
            (
                ticket["id"], f"workshop:{fixture['ticketNumber']}:message:1", fixture["email"], fixture["subject"],
                fixture["body"], fixture["createdAt"], fixture["createdAt"],
            ),
        )
        db.execute(
            """INSERT OR IGNORE INTO ticket_parties
              (ticket_id, partner_id, role, is_primary, match_method, confidence, confirmed_by, created_at)
              VALUES (?, ?, 'CORRESPONDENT', 1, 'workshop_fixture', 1, 'workshop-fixture', ?)""",
            (ticket["id"], fixture["partnerId"], fixture["createdAt"]),
        )
        db.execute(
            """INSERT OR IGNORE INTO ticket_contracts
              (ticket_id, vertrag_id, relation, match_method, confidence, confirmed_by, created_at)
              VALUES (?, ?, 'BETRIFFT', 'workshop_fixture', 1, 'workshop-fixture', ?)""",
            (ticket["id"], fixture["contractId"], fixture["createdAt"]),
        )
        db.execute(
            "UPDATE workshop_claims SET ticket_id = ? WHERE claim_id = ? AND ticket_id IS NULL",
            (ticket["id"], fixture["claimId"]),
        )
        if cursor.rowcount > 0:
            db.execute(
                """INSERT INTO ticket_events (ticket_id, type, actor, details_json, created_at)
                VALUES (?, 'workshop_fixture_loaded', 'workshop-fixture', ?, ?)""",
                (
                    ticket["id"],
                    json.dumps({"partnerId": fixture["partnerId"], "contractId": fixture["contractId"], "claimId": fixture["claimId"]}),
                    fixture["createdAt"],
                ),
            )
    return get_workshop_status(db)


def get_workshop_status(db: sqlite3.Connection | None = None) -> dict[str, Any]:
    db = db or get_database()
    demo_tickets = db.execute("SELECT COUNT(*) AS count FROM tickets WHERE source = 'demo'").fetchone()["count"]
    claims = db.execute("SELECT COUNT(*) AS count FROM workshop_claims").fetchone()["count"]
    truth_tables = db.execute("SELECT COUNT(*) AS count FROM source_tables WHERE layer = 'truth'").fetchone()["count"]
    return {
        "profile": assert_participant_profile(),
        "syntheticDataOnly": True,
        "workshopPurposeOnly": True,
        "demoTickets": demo_tickets,
        "workshopClaims": claims,
        "importedTruthTables": truth_tables,
        "externalEffects": {
            "demoEmailSendBlocked": True,
            "claimPaymentsImplemented": False,
            "claimDecisionCommunicationImplemented": False,
        },
    }


def reset_workshop_fixtures(db: sqlite3.Connection | None = None) -> dict[str, Any]:
    db = db or get_database()
    assert_participant_profile()
    db.execute("BEGIN IMMEDIATE")
    try:
        db.execute("DELETE FROM workshop_claims")
        db.execute("DELETE FROM tickets WHERE source = 'demo'")
        db.execute("COMMIT")
    except Exception:
        db.execute("ROLLBACK")
        raise
    ensure_workshop_claims(db)
    return ensure_workshop_fixtures(db)
