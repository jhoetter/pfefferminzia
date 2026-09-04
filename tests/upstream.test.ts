import { describe, expect, it } from "vitest";
import { createDatabase } from "../server/database";
import { FALK_UPSTREAM_COMMIT, getUpstreamStatus, importFalkDataset } from "../server/upstream";

describe("Falk upstream dataset import", () => {
  it("verifies and imports the participant-safe sample dataset", () => {
    const db = createDatabase(":memory:");
    const result = importFalkDataset(db, true);
    expect(result.upstreamCommit).toBe(FALK_UPSTREAM_COMMIT);
    expect(result.tables).toBe(67);
    expect(result.rows).toBe(29_559);
    expect(result.referenceTables).toBe(43);

    const customer = db.prepare("SELECT partner_id, vorname, nachname FROM core_partner WHERE partner_id = ?")
      .get("PTR-00000001") as { partner_id: string; vorname: string; nachname: string };
    expect(customer).toEqual({ partner_id: "PTR-00000001", vorname: "Simone", nachname: "Niederberger" });
    const claim = db.prepare("SELECT vertrag_id, partner_id FROM core_schaden WHERE schaden_id = ?")
      .get("SCH-00000118") as { vertrag_id: string; partner_id: string };
    expect(claim).toEqual({ vertrag_id: "VTR-00000101", partner_id: "PTR-00000001" });
    expect((db.prepare("SELECT COUNT(*) AS count FROM core_interaktion").get() as { count: number }).count).toBe(62);
    expect((db.prepare("SELECT COUNT(*) AS count FROM core_dokument").get() as { count: number }).count).toBe(37);
    const truthTables = db.prepare("SELECT COUNT(*) AS count FROM source_tables WHERE layer = 'truth'").get() as { count: number };
    expect(truthTables.count).toBe(0);
    expect(getUpstreamStatus(db).dataset).not.toBeNull();
    db.close();
  });

  it("skips an unchanged snapshot", () => {
    const db = createDatabase(":memory:");
    importFalkDataset(db, true);
    expect(importFalkDataset(db).imported).toBe(false);
    db.close();
  });
});
