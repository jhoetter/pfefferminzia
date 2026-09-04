import { readFileSync } from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { getDatabase, ROOT } from "./database";
import { FALK_UPSTREAM_COMMIT } from "./upstream";

interface CatalogEntry {
  id: string;
  title: string;
  productLine: "liability" | "life";
  productIds: string[];
  tariffGenerationId: string;
  market: "CH" | "DE";
  validFrom: string;
  validTo: string | null;
  revision: string;
  filename: string;
  source: string;
  summary: string;
}

/** Keep the fictional, Falk-aligned workshop document catalog in sync without creating tickets. */
export function ensureSeedData(db = getDatabase()) {
  const catalogPath = new URL("../data/tariffs/catalog.json", import.meta.url);
  let catalog: CatalogEntry[];
  try {
    catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as CatalogEntry[];
  } catch (error) {
    throw new Error("Tariff catalog is missing or invalid. Run `npm run generate:tariffs`.", { cause: error });
  }

  db.prepare("DELETE FROM documents WHERE id IN ('privathaft-klar-2026', 'leben-sicher-2045')").run();
  for (const document of catalog) {
    const sourcePath = new URL(`../${document.source}`, import.meta.url);
    const text = readFileSync(sourcePath, "utf8");
    db.prepare(`INSERT INTO documents
      (id, title, product_line, filename, storage_path, summary, text_content, created_at, document_type,
       product_ids_json, tariff_generation_id, market, valid_from, valid_to, revision, source_commit, workshop_extension)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BEDINGUNGSWERK', ?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(id) DO UPDATE SET title = excluded.title, product_line = excluded.product_line,
        filename = excluded.filename, storage_path = excluded.storage_path, summary = excluded.summary,
        text_content = excluded.text_content, document_type = excluded.document_type,
        product_ids_json = excluded.product_ids_json, tariff_generation_id = excluded.tariff_generation_id,
        market = excluded.market, valid_from = excluded.valid_from, valid_to = excluded.valid_to,
        revision = excluded.revision, source_commit = excluded.source_commit,
        workshop_extension = excluded.workshop_extension`)
      .run(
        document.id,
        document.title,
        document.productLine,
        document.filename,
        `data/tariffs/${document.filename}`,
        document.summary,
        text,
        "2026-09-04T00:00:00.000Z",
        JSON.stringify(document.productIds),
        document.tariffGenerationId,
        document.market,
        document.validFrom,
        document.validTo,
        document.revision,
        FALK_UPSTREAM_COMMIT,
      );
  }
}
