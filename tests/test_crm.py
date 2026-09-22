from pfefferminzia.crm import get_contract, get_customer, link_ticket_contract, link_ticket_party, resolve_ticket_customer, search_customers
from pfefferminzia.util import utc_now


def test_customer_360_and_audited_ticket_linking(full_db):
    assert "PTR-00000001" in [customer["partnerId"] for customer in search_customers(query="Niederberger", db=full_db)]
    customer = get_customer("PTR-00000001", full_db)
    assert "VTR-00000101" in [contract["contractId"] for contract in customer["contracts"]]
    assert len(customer["sourceReferences"]) > 1
    assert get_contract("VTR-00000101", full_db)["coverages"]
    stamp = utc_now()
    full_db.execute(
        """INSERT INTO tickets
        (ticket_number, source, customer_email, customer_name, subject, status, product_line, category, priority, is_demo, created_at, updated_at, last_message_at)
        VALUES ('PF-9901', 'demo', 'simone.niederberger@mail.example', 'Simone Niederberger', 'Synthetic claim', 'new', 'liability', 'claim', 'normal', 1, ?, ?, ?)""",
        (stamp, stamp, stamp),
    )
    candidate = resolve_ticket_customer("PF-9901", full_db)[0]
    assert {key: candidate[key] for key in ("partnerId", "score", "reason")} == {
        "partnerId": "PTR-00000001", "score": 1, "reason": "exact_email"
    }
    link_ticket_party(ticket_number="PF-9901", partner_id="PTR-00000001", role="CORRESPONDENT", actor="test", db=full_db)
    linked = link_ticket_contract(ticket_number="PF-9901", contract_id="VTR-00000101", actor="test", db=full_db)
    assert linked["parties"][0]["partnerId"] == "PTR-00000001"
    assert linked["linkedContracts"][0]["contractId"] == "VTR-00000101"
    assert any(event["type"] == "contract_linked" for event in linked["events"])
