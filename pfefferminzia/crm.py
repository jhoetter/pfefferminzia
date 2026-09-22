from __future__ import annotations

import sqlite3
from typing import Any

from .claims import list_claims
from .database import get_database
from .store import add_event, get_ticket, list_tickets
from .util import as_bool, nullable, utc_now

CUSTOMER_SELECT = """SELECT p.*,
  COALESCE(p.firmenname, TRIM(COALESCE(p.vorname, '') || ' ' || COALESCE(p.nachname, ''))) AS display_name,
  a.ort,
  (SELECT COUNT(*) FROM core_vertrag v WHERE v.versicherungsnehmer_id = p.partner_id) AS contract_count,
  (SELECT COUNT(*) FROM core_vertrag v WHERE v.versicherungsnehmer_id = p.partner_id AND v.status = 'AKTIV') AS active_contract_count,
  (SELECT COUNT(DISTINCT tp.ticket_id) FROM ticket_parties tp JOIN tickets t ON t.id = tp.ticket_id
    WHERE tp.partner_id = p.partner_id AND t.status NOT IN ('sent', 'closed')) AS open_ticket_count
  FROM core_partner p
  LEFT JOIN core_partner_adresse a ON a.partner_id = p.partner_id AND a.ist_aktuell = 'true'"""

CONTRACT_SELECT = """SELECT v.*, pr.marktname AS produkt_name, tg.bezeichnung AS tarif_name
  FROM core_vertrag v LEFT JOIN core_produkt pr ON pr.produkt_id = v.produkt_id
  LEFT JOIN core_tarifgeneration tg ON tg.tarifgeneration_id = v.tarifgeneration_id"""


def _display_name(row: sqlite3.Row) -> str:
    return nullable(row["firmenname"]) or " ".join(
        value for value in (nullable(row["vorname"]), nullable(row["nachname"])) if value
    )


def _map_customer_summary(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "partnerId": row["partner_id"],
        "displayName": row["display_name"] or _display_name(row),
        "partnerType": row["partner_typ"],
        "status": row["status"],
        "country": row["land_wohnsitz"],
        "city": nullable(row["ort"]),
        "segment": row["kundensegment"],
        "primarySystem": row["quellsystem_primaer"],
        "isPersona": as_bool(row["ist_persona"]),
        "aiConsent": as_bool(row["datenschutz_ki_ok"]),
        "contractCount": int(row["contract_count"] or 0),
        "activeContractCount": int(row["active_contract_count"] or 0),
        "openTicketCount": int(row["open_ticket_count"] or 0),
    }


def search_customers(
    *,
    query: str | None = None,
    country: str | None = None,
    product_id: str | None = None,
    limit: int = 50,
    db: sqlite3.Connection | None = None,
) -> list[dict[str, Any]]:
    db = db or get_database()
    where: list[str] = []
    params: dict[str, Any] = {"limit": max(1, min(limit, 200))}
    if query and query.strip():
        params["query"] = f"%{query.strip()}%"
        where.append(
            """(p.partner_id LIKE :query OR p.vorname LIKE :query OR p.nachname LIKE :query OR p.firmenname LIKE :query
            OR a.ort LIKE :query OR EXISTS (SELECT 1 FROM core_partner_kontakt k WHERE k.partner_id = p.partner_id AND k.wert LIKE :query)
            OR EXISTS (SELECT 1 FROM core_vertrag v WHERE v.versicherungsnehmer_id = p.partner_id AND v.vertrag_id LIKE :query))"""
        )
    if country:
        params["country"] = country
        where.append("p.land_wohnsitz = :country")
    if product_id:
        params["product_id"] = product_id
        where.append(
            "EXISTS (SELECT 1 FROM core_vertrag v WHERE v.versicherungsnehmer_id = p.partner_id AND v.produkt_id = :product_id)"
        )
    statement = f"""{CUSTOMER_SELECT} {'WHERE ' + ' AND '.join(where) if where else ''}
      ORDER BY p.ist_persona DESC, display_name COLLATE NOCASE LIMIT :limit"""
    return [_map_customer_summary(row) for row in db.execute(statement, params)]


def _map_contract(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "contractId": row["vertrag_id"],
        "productId": row["produkt_id"],
        "productName": row["produkt_name"] or row["produkt_id"],
        "line": row["sparte"],
        "tariffGenerationId": row["tarifgeneration_id"],
        "tariffName": row["tarif_name"] or row["tarifgeneration_id"],
        "market": row["markt"],
        "currency": row["waehrung"],
        "status": row["status"],
        "startDate": row["beginn"],
        "endDate": nullable(row["ablauf"]),
        "annualPremium": float(row["jahrespraemie_brutto"] or 0),
        "insuredSum": float(row["versicherungssumme"] or 0),
        "sourceSystem": row["quellsystem"],
        "handlerId": nullable(row["sachbearbeiter_id"]),
    }


def get_contract(contract_id: str, db: sqlite3.Connection | None = None) -> dict[str, Any] | None:
    db = db or get_database()
    row = db.execute(f"{CONTRACT_SELECT} WHERE v.vertrag_id = ?", (contract_id,)).fetchone()
    if not row:
        return None
    contract = _map_contract(row)
    contract.update(
        {
            "policyholderId": row["versicherungsnehmer_id"],
            "intermediaryId": nullable(row["vermittler_id"]),
            "channel": row["kanal"],
            "paymentFrequency": row["zahlungsweise"],
            "paymentMethod": row["zahlungsart"],
            "applicationId": nullable(row["antrag_id"]),
            "coverages": [
                {
                    "id": item["deckung_id"],
                    "type": item["deckungsart"],
                    "component": nullable(item["baustein"]),
                    "sum": float(item["summe"]) if item["summe"] is not None else None,
                    "deductible": float(item["selbstbehalt"]) if item["selbstbehalt"] is not None else None,
                    "deductibleType": nullable(item["selbstbehalt_typ"]),
                }
                for item in db.execute("SELECT * FROM core_deckung WHERE vertrag_id = ? ORDER BY deckung_id", (contract_id,))
            ],
            "riskObjects": [
                {key: nullable(value) for key, value in dict(item).items()}
                for item in db.execute(
                    "SELECT * FROM core_risiko_objekt WHERE vertrag_id = ? ORDER BY risiko_objekt_id", (contract_id,)
                )
            ],
            "parties": [
                {
                    "partnerId": nullable(item["partner_id"]),
                    "displayName": _display_name(item) if item["partner_id"] else None,
                    "role": item["rolle"],
                    "share": float(item["anteil_pct"]) if item["anteil_pct"] is not None else None,
                }
                for item in db.execute(
                    """SELECT r.*, p.vorname, p.nachname, p.firmenname FROM core_vertrag_partner_rolle r
                    LEFT JOIN core_partner p ON p.partner_id = r.partner_id
                    WHERE r.vertrag_id = ? ORDER BY r.rolle, r.partner_id""",
                    (contract_id,),
                )
            ],
        }
    )
    return contract


def get_customer(partner_id: str, db: sqlite3.Connection | None = None) -> dict[str, Any] | None:
    db = db or get_database()
    row = db.execute(f"{CUSTOMER_SELECT} WHERE p.partner_id = ?", (partner_id,)).fetchone()
    if not row:
        return None
    customer = _map_customer_summary(row)
    customer.update(
        {
            "salutation": nullable(row["anrede"]),
            "firstName": nullable(row["vorname"]),
            "lastName": nullable(row["nachname"]),
            "companyName": nullable(row["firmenname"]),
            "birthDate": nullable(row["geburtsdatum"]),
            "language": row["sprache"],
            "marketingConsent": as_bool(row["datenschutz_werbung_ok"]),
        }
    )
    customer["contacts"] = [
        {"id": item["kontakt_id"], "type": item["kontakt_typ"], "value": item["wert"], "primary": as_bool(item["ist_primaer"])}
        for item in db.execute(
            "SELECT * FROM core_partner_kontakt WHERE partner_id = ? ORDER BY ist_primaer DESC, kontakt_typ", (partner_id,)
        )
    ]
    customer["addresses"] = [
        {
            "id": item["adresse_id"],
            "type": item["adresse_typ"],
            "street": item["strasse"],
            "houseNumber": item["hausnummer"],
            "postalCode": item["plz"],
            "city": item["ort"],
            "region": item["region"],
            "country": item["land"],
            "current": as_bool(item["ist_aktuell"]),
        }
        for item in db.execute(
            "SELECT * FROM core_partner_adresse WHERE partner_id = ? ORDER BY ist_aktuell DESC, gueltig_von DESC", (partner_id,)
        )
    ]
    customer["relationships"] = [
        {
            "partnerId": item["related_id"],
            "displayName": _display_name(item),
            "relationship": item["beziehung"],
            "direction": item["direction"],
        }
        for item in db.execute(
            """SELECT r.*, p.partner_id AS related_id, p.vorname, p.nachname, p.firmenname,
              CASE WHEN r.partner_id_von = ? THEN 'from' ELSE 'to' END AS direction
            FROM core_partner_beziehung r JOIN core_partner p
              ON p.partner_id = CASE WHEN r.partner_id_von = ? THEN r.partner_id_zu ELSE r.partner_id_von END
            WHERE r.partner_id_von = ? OR r.partner_id_zu = ? ORDER BY r.beziehung""",
            (partner_id, partner_id, partner_id, partner_id),
        )
    ]
    customer["contracts"] = [
        _map_contract(item)
        for item in db.execute(
            f"""{CONTRACT_SELECT} WHERE v.versicherungsnehmer_id = ? OR EXISTS
            (SELECT 1 FROM core_vertrag_partner_rolle r WHERE r.vertrag_id = v.vertrag_id AND r.partner_id = ?)
            ORDER BY v.status = 'AKTIV' DESC, v.beginn DESC""",
            (partner_id, partner_id),
        )
    ]
    customer["claims"] = list_claims(partner_id=partner_id, limit=100, db=db)
    ticket_ids = {
        int(item["ticket_id"])
        for item in db.execute("SELECT DISTINCT ticket_id FROM ticket_parties WHERE partner_id = ?", (partner_id,))
    }
    customer["tickets"] = [ticket for ticket in list_tickets(limit=500, db=db) if ticket["id"] in ticket_ids]
    customer["sourceReferences"] = [
        {
            "system": item["quellsystem"],
            "sourceId": item["quell_id"],
            "matchMethod": item["match_methode"],
            "matchScore": float(item["match_score"]),
            "validFrom": nullable(item["gueltig_von"]),
            "validTo": nullable(item["gueltig_bis"]),
        }
        for item in db.execute(
            "SELECT * FROM migration_partner_xref WHERE curated_id = ? ORDER BY quellsystem, gueltig_von", (partner_id,)
        )
    ]
    timeline = [
        {
            "id": f"contract-{contract['contractId']}",
            "type": "contract",
            "title": f"{contract['productName']} {contract['status']}",
            "date": contract["startDate"],
            "detail": f"{contract['contractId']} · {contract['tariffGenerationId']}",
        }
        for contract in customer["contracts"]
    ]
    timeline.extend(
        {
            "id": f"ticket-{ticket['id']}",
            "type": "ticket",
            "title": ticket["subject"],
            "date": ticket["createdAt"],
            "detail": ticket["ticketNumber"],
        }
        for ticket in customer["tickets"]
    )
    timeline.extend(
        {
            "id": f"claim-{claim['claimId']}",
            "type": "claim",
            "title": claim["title"],
            "date": claim["eventDate"],
            "detail": f"{claim['claimId']} · {claim['status']}",
        }
        for claim in customer["claims"]
    )
    customer["timeline"] = sorted(timeline, key=lambda item: item["date"], reverse=True)
    return customer


def resolve_ticket_customer(ticket_number: str, db: sqlite3.Connection | None = None) -> list[dict[str, Any]]:
    db = db or get_database()
    ticket = get_ticket(ticket_number, db)
    if not ticket:
        raise ValueError(f"Ticket not found: {ticket_number}")
    exact = [
        {**_map_customer_summary(row), "score": 1, "reason": "exact_email"}
        for row in db.execute(
            f"""{CUSTOMER_SELECT} WHERE EXISTS (SELECT 1 FROM core_partner_kontakt k
            WHERE k.partner_id = p.partner_id AND k.kontakt_typ = 'EMAIL' AND LOWER(k.wert) = LOWER(?))""",
            (ticket["customerEmail"],),
        )
    ]
    if exact:
        return exact
    if not ticket["customerName"]:
        return []
    return [
        {**customer, "score": 0.65, "reason": "name_candidate"}
        for customer in search_customers(query=ticket["customerName"], limit=8, db=db)
    ]


def link_ticket_party(
    *,
    ticket_number: str,
    partner_id: str,
    role: str,
    primary: bool = True,
    match_method: str = "manual",
    confidence: float = 1,
    actor: str = "human",
    db: sqlite3.Connection | None = None,
) -> dict[str, Any]:
    db = db or get_database()
    ticket = get_ticket(ticket_number, db)
    if not ticket:
        raise ValueError(f"Ticket not found: {ticket_number}")
    if not get_customer(partner_id, db):
        raise ValueError(f"Customer not found: {partner_id}")
    stamp = utc_now()
    if primary:
        db.execute("UPDATE ticket_parties SET is_primary = 0 WHERE ticket_id = ?", (ticket["id"],))
    db.execute(
        """INSERT INTO ticket_parties (ticket_id, partner_id, role, is_primary, match_method, confidence, confirmed_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ticket_id, partner_id, role) DO UPDATE SET is_primary = excluded.is_primary,
          match_method = excluded.match_method, confidence = excluded.confidence, confirmed_by = excluded.confirmed_by""",
        (ticket["id"], partner_id, role, int(primary), match_method, confidence, actor, stamp),
    )
    add_event(
        ticket["id"],
        "customer_linked",
        actor,
        {"partnerId": partner_id, "role": role, "confidence": confidence, "matchMethod": match_method},
        db,
    )
    return get_ticket(ticket["id"], db)  # type: ignore[return-value]


def link_ticket_contract(
    *,
    ticket_number: str,
    contract_id: str,
    match_method: str = "manual",
    confidence: float = 1,
    actor: str = "human",
    db: sqlite3.Connection | None = None,
) -> dict[str, Any]:
    db = db or get_database()
    ticket = get_ticket(ticket_number, db)
    if not ticket:
        raise ValueError(f"Ticket not found: {ticket_number}")
    if not get_contract(contract_id, db):
        raise ValueError(f"Contract not found: {contract_id}")
    db.execute(
        """INSERT INTO ticket_contracts (ticket_id, vertrag_id, relation, match_method, confidence, confirmed_by, created_at)
        VALUES (?, ?, 'BETRIFFT', ?, ?, ?, ?)
        ON CONFLICT(ticket_id, vertrag_id) DO UPDATE SET match_method = excluded.match_method,
          confidence = excluded.confidence, confirmed_by = excluded.confirmed_by""",
        (ticket["id"], contract_id, match_method, confidence, actor, utc_now()),
    )
    add_event(
        ticket["id"],
        "contract_linked",
        actor,
        {"contractId": contract_id, "confidence": confidence, "matchMethod": match_method},
        db,
    )
    return get_ticket(ticket["id"], db)  # type: ignore[return-value]


def auto_link_exact_customer(ticket_number: str, db: sqlite3.Connection | None = None) -> dict[str, Any] | None:
    db = db or get_database()
    candidates = resolve_ticket_customer(ticket_number, db)
    if len(candidates) != 1 or candidates[0]["score"] != 1:
        return None
    return link_ticket_party(
        ticket_number=ticket_number,
        partner_id=candidates[0]["partnerId"],
        role="CORRESPONDENT",
        primary=True,
        match_method="exact_email",
        confidence=1,
        actor="identity-resolver",
        db=db,
    )
