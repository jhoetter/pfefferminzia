import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createDatabase } from "../server/database";
import { ensureSeedData } from "../server/seed";
import { listContractDocuments, listTariffs, resolveStoragePath } from "../server/store";
import { FALK_UPSTREAM_COMMIT, importFalkDataset } from "../server/upstream";

describe("Falk-aligned workshop documents", () => {
  it("maps every tariff generation and market to a deterministic PDF", () => {
    const db = createDatabase(":memory:");
    importFalkDataset(db, true);
    ensureSeedData(db);
    const documents = listTariffs(db);
    expect(documents).toHaveLength(28);
    expect(documents.every((document) => document.sourceCommit === FALK_UPSTREAM_COMMIT)).toBe(true);
    expect(documents.every((document) => existsSync(resolveStoragePath(`data/tariffs/${document.filename}`)))).toBe(true);
    expect(listContractDocuments("VTR-00000801", db).map((document) => document.id)).toEqual(["RW-HP-AHB-DE-2013"]);
    expect(listContractDocuments("VTR-00000202", db).map((document) => document.id)).toEqual(["RW-LV-AVB-DE-2025"]);
    db.close();
  });
});
