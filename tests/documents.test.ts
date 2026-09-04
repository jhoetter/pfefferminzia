import { existsSync, readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { createDatabase } from "../server/database";
import { ensureSeedData } from "../server/seed";
import { listContractDocuments, listTariffs, resolveStoragePath } from "../server/store";
import { FALK_UPSTREAM_COMMIT, importFalkDataset } from "../server/upstream";

describe("Falk-aligned workshop documents", () => {
  it("maps every tariff generation and market to a deterministic PDF", async () => {
    const db = createDatabase(":memory:");
    importFalkDataset(db, true);
    ensureSeedData(db);
    const documents = listTariffs(db);
    expect(documents).toHaveLength(28);
    expect(documents.every((document) => document.sourceCommit === FALK_UPSTREAM_COMMIT)).toBe(true);
    const upstreamDirectory = "vendor/falk-pfefferminzia/data/documents/S/tarife";
    expect(documents.every((document) => existsSync(resolveStoragePath(`${upstreamDirectory}/${document.filename}`)))).toBe(true);
    const sample = documents.find((document) => document.id === "RW-HP-AHB-DE-2013");
    expect(sample).toBeDefined();
    const pdf = await PDFDocument.load(readFileSync(resolveStoragePath(`${upstreamDirectory}/${sample!.filename}`)));
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getCreator()).toBe("Pfefferminzia Dokumentgenerator");
    expect(pdf.getSubject()).toContain("Synthetisches Tarifblatt");
    const markdown = readFileSync(resolveStoragePath(`${upstreamDirectory}/${sample!.id}.md`), "utf8");
    expect(markdown).toContain("dokument_id: RW-HP-AHB-DE-2013");
    expect(markdown).not.toContain("Falk-Tarifgeneration");
    expect(markdown).not.toContain("Workshop-Fokus");
    expect(sample!.workshopExtension).toBe(false);
    expect(listContractDocuments("VTR-00000801", db).map((document) => document.id)).toEqual(["RW-HP-AHB-DE-2013"]);
    expect(listContractDocuments("VTR-00000202", db).map((document) => document.id)).toEqual(["RW-LV-AVB-DE-2025"]);
    db.close();
  });
});
