import { describe, expect, it } from "vitest";
import { createDatabase } from "../server/database";
import { FALK_UPSTREAM_COMMIT, getUpstreamStatus, importFalkDataset } from "../server/upstream";

describe("Falk upstream dataset import", () => {
  it("verifies and imports the participant-safe sample dataset", () => {
    const db = createDatabase(":memory:");
    const result = importFalkDataset(db, true);
    expect(result.upstreamCommit).toBe(FALK_UPSTREAM_COMMIT);
    expect(result.tables).toBeGreaterThan(50);
    expect(result.rows).toBeGreaterThan(20_000);
    expect(result.referenceTables).toBeGreaterThan(30);

    const customer = db.prepare("SELECT partner_id, vorname, nachname FROM core_partner WHERE partner_id = ?")
      .get("PTR-00000001") as { partner_id: string; vorname: string; nachname: string };
    expect(customer).toEqual({ partner_id: "PTR-00000001", vorname: "Simone", nachname: "Niederberger" });
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
