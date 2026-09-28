"""Drill 9 reference solution: sort incoming mail by line with keywords.

The participant may also choose AI instead (Claude sorts by her criteria);
this is the keyword way. A case is sorted only when exactly one line
matches; otherwise it stays open and a person gets the task to decide.
"""

from __future__ import annotations

import sqlite3

from .store import get_ticket, list_tickets, route_ticket
from .todos import create_todo

KEYWORDS = {
    "liability": ("haftpflicht", "schaden", "beschädigt", "wasserschaden", "e-bike", "beschwerde", "teilzahlung", "gutachten"),
    "life": ("risikoleben", "bezugsberecht", "leistungsprüfung", "leistungsentscheidung", "begünstigt", "todesfall"),
}
ROUTES = {"liability": "liability_intervention_window", "life": "life_mandatory_review"}


def sort_unsorted(db: sqlite3.Connection) -> list[dict]:
    sorted_cases = []
    for item in list_tickets(include_samples=False, db=db):
        if item["productLine"] != "unknown" or item["status"] in ("sent", "closed"):
            continue
        ticket = get_ticket(item["ticketNumber"], db)
        text = " ".join([ticket["subject"] or "", *(m.get("textBody") or "" for m in ticket["messages"])]).lower()
        hits = {line: [word for word in words if word in text] for line, words in KEYWORDS.items()}
        matched = [line for line, words in hits.items() if words]
        if len(matched) == 1:
            line = matched[0]
            route_ticket(ticket["ticketNumber"], ROUTES[line], "claim" if line == "liability" else "contract_change",
                         f"Automatisch nach Stichwort „{hits[line][0]}“ einsortiert", 0.8, "auto-sort", db)
            sorted_cases.append({"ticketNumber": ticket["ticketNumber"], "line": line, "keyword": hits[line][0]})
        else:
            create_todo(f"Sparte zuordnen: {ticket['subject']}", "Die Vorsortierung war sich nicht sicher.",
                        ticket_number=ticket["ticketNumber"], actor="auto-sort",
                        idempotency_key=f"sort:{ticket['ticketNumber']}", db=db)
    return sorted_cases
