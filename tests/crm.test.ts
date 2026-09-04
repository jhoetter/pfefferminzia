import { describe, expect, it } from "vitest";
import { createDatabase } from "../server/database";
import { getContract, getCustomer, linkTicketContract, linkTicketParty, resolveTicketCustomer, searchCustomers } from "../server/crm";
import { importFalkDataset } from "../server/upstream";

describe("CRM domain", () => {
  it("provides customer 360 and audited ticket linking using Falk IDs", () => {
    const db = createDatabase(":memory:");
    importFalkDataset(db, true);
    const results = searchCustomers({ query: "Niederberger" }, db);
    expect(results.map((customer) => customer.partnerId)).toContain("PTR-00000001");

    const customer = getCustomer("PTR-00000001", db)!;
    expect(customer.contracts.map((contract) => contract.contractId)).toContain("VTR-00000101");
    expect(customer.sourceReferences.length).toBeGreaterThan(1);
    expect(getContract("VTR-00000101", db)?.coverages.length).toBeGreaterThan(0);

    const stamp = new Date().toISOString();
    db.prepare(`INSERT INTO tickets
      (ticket_number, source, customer_email, customer_name, subject, status, product_line, category, priority, is_demo, created_at, updated_at, last_message_at)
      VALUES ('PF-9901', 'demo', 'simone.niederberger@mail.example', 'Simone Niederberger', 'Synthetic claim', 'new', 'liability', 'claim', 'normal', 1, ?, ?, ?)`)
      .run(stamp, stamp, stamp);
    expect(resolveTicketCustomer("PF-9901", db)).toMatchObject([{ partnerId: "PTR-00000001", score: 1, reason: "exact_email" }]);

    linkTicketParty({ ticketNumber: "PF-9901", partnerId: "PTR-00000001", role: "CORRESPONDENT", actor: "test" }, db);
    const linked = linkTicketContract({ ticketNumber: "PF-9901", contractId: "VTR-00000101", actor: "test" }, db);
    expect(linked.parties[0]?.partnerId).toBe("PTR-00000001");
    expect(linked.linkedContracts[0]?.contractId).toBe("VTR-00000101");
    expect(linked.events.some((event) => event.type === "contract_linked")).toBe(true);
    db.close();
  });
});
