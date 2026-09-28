"""What a human needs to see to check a case: the sources behind a draft.

From Drill 7 on, Claude looks up customers, contracts and tariffs. The person
who checks, edits and sends must see the same sources in the cockpit, or
"Behauptung gegen Beleg" cannot be judged. Claims join from Drill 8 on.
"""

from __future__ import annotations

import sqlite3
from typing import Any

from .checkpoints import capability_enabled
from .claims import get_claim, list_claims
from .crm import get_contract, get_customer
from .database import get_database
from .store import get_ticket, list_contract_documents

MODULES = {
    "BS-TIER-HUND": "Hundehalter", "BS-TIER-PFERD": "Pferdehalter", "BS-GEBAEUDE": "Gebäude",
    "BS-SCHLUESSEL": "Schlüsselverlust", "BS-AUSFALL": "Forderungsausfall", "BS-PRODUKT": "Produkthaftung",
    "BS-UMWELT": "Umwelt", "BS-DROHNE": "Drohne", "BS-OELTANK": "Öltank", "BS-BAUHERR": "Bauherr",
    "BS-KINDER": "Deliktunfähige Kinder", "BS-IT-DATEN": "IT und Daten", "BS-RUECKRUF": "Rückruf",
    "BS-OBJEKT": "Objekt", "LV-EU": "Erwerbsunfähigkeit",
}
CONTRACT_STATUS = {
    "AKTIV": "aktiv", "STORNIERT": "storniert", "ABGELAUFEN": "abgelaufen", "GEKUENDIGT_VN": "vom Kunden gekündigt",
    "GEKUENDIGT_VU": "vom Versicherer gekündigt", "RUECKKAUF": "zurückgekauft", "LEISTUNG_ERBRACHT": "Leistung erbracht",
}
CLAIM_STATUS = {
    "triage": "Erstprüfung", "investigation": "in Prüfung", "awaiting_human": "wartet auf menschliche Entscheidung",
    "approved_for_payment": "zur Zahlung freigegeben", "settled": "abgeschlossen", "denied": "abgelehnt", "closed": "geschlossen",
}
ACTIONS = {"PAY": "zahlen", "DENY": "ablehnen", "REQUEST_INFORMATION": "Unterlagen nachfordern", "ESCALATE_COMPLEX": "an die Teamleitung", "REFER_SIU": "an die Ermittlung"}
LINKED_BY = {
    "exact_email": "automatisch beim Abrufen – die Absender-Adresse steht so im Bestand",
    "mcp_confirmed": "von Claude nachgeschlagen und zugeordnet",
    "manual": "von Hand zugeordnet",
    "workshop_fixture": "Beispielfall – schon zugeordnet",
}
RECOMMENDATION_STATUS = {
    "pending_review": "wartet auf Prüfung", "approved": "freigegeben", "rejected": "abgelehnt", "blocked": "gestoppt",
}


def _customer(partner_id: str, db: sqlite3.Connection, method: str | None = None) -> dict[str, Any] | None:
    record = get_customer(partner_id, db)
    if not record:
        return None
    address = next((item for item in record.get("addresses", []) if item.get("current")), None)
    contact = {item["type"]: item["value"] for item in record.get("contacts", []) if item.get("primary")}
    return {
        "partnerId": record["partnerId"],
        "name": record["displayName"],
        "birthDate": record.get("birthDate"),
        "residence": f"{address['postalCode']} {address['city']}" if address else record.get("city"),
        "email": contact.get("EMAIL"),
        "phone": contact.get("TELEFON"),
        "linkedBy": LINKED_BY.get(method or "", method),
    }


def _claim(item: dict[str, Any], db: sqlite3.Connection) -> dict[str, Any]:
    detail = get_claim(item["claimId"], db) or item
    latest = (detail.get("recommendations") or [None])[0]
    return {
        "claimId": item["claimId"],
        "title": item["title"],
        "status": CLAIM_STATUS.get(item["status"], item["status"]),
        "currency": item["currency"],
        "reported": item["reportedAmount"],
        "reserve": item["reserveAmount"],
        "paid": item["paidAmount"],
        "summary": item["summary"],
        "recommendation": {
            "action": ACTIONS.get(latest["action"], latest["action"]),
            "status": RECOMMENDATION_STATUS.get(latest["status"], latest["status"]),
            "rationale": latest["rationale"],
        } if latest else None,
    }


def _contract(contract_id: str, db: sqlite3.Connection, with_claims: bool, method: str | None = None) -> dict[str, Any] | None:
    record = get_contract(contract_id, db)
    if not record:
        return None
    return {
        "contractId": record["contractId"],
        "linkedBy": LINKED_BY.get(method or "", method),
        "product": record["productName"],
        "tariffGenerationId": record["tariffGenerationId"],
        "tariffName": record["tariffName"],
        "status": CONTRACT_STATUS.get(record["status"], record["status"]),
        "start": record["startDate"],
        "end": record["endDate"],
        "currency": record["currency"],
        "insuredSum": record["insuredSum"],
        "annualPremium": record["annualPremium"],
        "beneficiaries": [
            {"name": party["displayName"], "share": party.get("share")}
            for party in record.get("parties", []) if party.get("role") == "BEGUENSTIGT"
        ],
        "modules": [
            MODULES.get(item["component"], item["component"])
            for item in record.get("coverages", []) if item.get("component")
        ],
        "documents": [
            {"id": item["id"], "title": item["title"], "url": f"/api/tariffs/{item['id']}/download?inline=1"}
            for item in list_contract_documents(contract_id, db)
        ],
        "claims": [_claim(item, db) for item in list_claims(contract_id=contract_id, db=db)] if with_claims else None,
    }


def ticket_evidence(ticket_number: str, db: sqlite3.Connection | None = None) -> dict[str, Any]:
    db = db or get_database()
    ticket = get_ticket(ticket_number, db)
    if not ticket:
        raise ValueError(f"Ticket not found: {ticket_number}")
    with_claims = capability_enabled("claims", db)
    customers = [_customer(party["partnerId"], db, party.get("matchMethod")) for party in ticket.get("parties", [])[:2]]
    contracts = [
        _contract(item["contractId"], db, with_claims, item.get("matchMethod")) for item in ticket.get("linkedContracts", [])
    ]
    return {
        "ticketNumber": ticket_number,
        "isSample": bool(ticket.get("isDemo")),
        "customers": [item for item in customers if item],
        "contracts": [item for item in contracts if item],
        "claimsVisible": with_claims,
    }


def customer_card(partner_id: str, db: sqlite3.Connection | None = None) -> dict[str, Any] | None:
    """A customer as the Bestand view shows her: master data and her contracts at a glance."""
    db = db or get_database()
    card = _customer(partner_id, db)
    if not card:
        return None
    record = get_customer(partner_id, db) or {}
    card.pop("linkedBy", None)
    card["contracts"] = [
        {
            "contractId": item["contractId"], "product": item["productName"], "tariffGenerationId": item["tariffGenerationId"],
            "status": CONTRACT_STATUS.get(item["status"], item["status"]),
        }
        for item in record.get("contracts", [])
    ]
    return card


def contract_card(contract_id: str, db: sqlite3.Connection | None = None) -> dict[str, Any] | None:
    db = db or get_database()
    card = _contract(contract_id, db, capability_enabled("claims", db))
    if card:
        card.pop("linkedBy", None)
    return card
