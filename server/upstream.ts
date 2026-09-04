import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { parse } from "csv-parse/sync";
import { getDatabase, ROOT } from "./database";

export const FALK_DATASET_ID = "falk-pfefferminzia-S";
export const FALK_UPSTREAM_COMMIT = "53a80bf49176a5066b80f0d4d509f096c16f57e7";
export const FALK_ATTRIBUTION = "Pfefferminzia – synthetischer Lehr-Datensatz, Falk Uebernickel, CC BY 4.0";
export const FALK_ROOT = path.join(ROOT, "vendor", "falk-pfefferminzia");
const MANIFEST_PATH = path.join(FALK_ROOT, "data", "manifest_S.json");

type ManifestTable = {
  name: string;
  layer: "curated" | "migration" | "truth";
  rows: number;
  files: { csv?: string };
  sha256: { csv?: string };
};

type Manifest = {
  version: string;
  schema_version: string;
  scale: string;
  generated_at: string;
  generator: { master_seed: number };
  tables: ManifestTable[];
};

export interface UpstreamImportResult {
  imported: boolean;
  datasetId: string;
  upstreamCommit: string;
  manifestSha256: string;
  tables: number;
  rows: number;
  referenceTables: number;
  warnings: string[];
}

const sha256 = (content: Buffer | string) => createHash("sha256").update(content).digest("hex");
const quoted = (identifier: string) => {
  if (!identifier || identifier.includes("\0")) throw new Error(`Unsafe SQLite identifier: ${identifier}`);
  return `"${identifier.replaceAll('"', '""')}"`;
};

function localTableName(layer: string, name: string) {
  const result = `${layer === "curated" ? "core" : layer}_${name}`.replace(/[^a-z0-9_]/giu, "_").toLowerCase();
  if (!/^[a-z][a-z0-9_]*$/u.test(result)) throw new Error(`Unsafe local table name: ${result}`);
  return result;
}

function csvFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? csvFiles(absolute) : entry.name.endsWith(".csv") ? [absolute] : [];
  }).sort();
}

function parseCsv(filePath: string) {
  const content = readFileSync(filePath);
  const records = parse(content, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    relax_column_count: false,
  }) as Record<string, string>[];
  return { content, records, headers: records.length ? Object.keys(records[0]) : [] };
}

function importCsvTable(
  db: DatabaseSync,
  sourcePath: string,
  localTable: string,
  layer: string,
  expectedHash: string | undefined,
  importedAt: string,
) {
  const { content, records, headers } = parseCsv(sourcePath);
  const actualHash = sha256(content);
  if (expectedHash && actualHash !== expectedHash) {
    throw new Error(`Hash mismatch for ${path.relative(FALK_ROOT, sourcePath)}: expected ${expectedHash}, got ${actualHash}`);
  }
  if (!headers.length) throw new Error(`CSV has no headers or rows: ${sourcePath}`);
  headers.forEach(quoted);
  const table = quoted(localTable);
  db.exec(`DROP TABLE IF EXISTS ${table}`);
  db.exec(`CREATE TABLE ${table} (${headers.map((header) => `${quoted(header)} TEXT`).join(", ")})`);
  const insert = db.prepare(`INSERT INTO ${table} (${headers.map(quoted).join(", ")}) VALUES (${headers.map(() => "?").join(", ")})`);
  for (const record of records) insert.run(...headers.map((header) => record[header] === "" ? null : record[header]));
  const relative = path.relative(FALK_ROOT, sourcePath);
  db.prepare(`INSERT INTO source_tables (source_path, local_table, layer, row_count, sha256, imported_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_path) DO UPDATE SET local_table = excluded.local_table, layer = excluded.layer,
      row_count = excluded.row_count, sha256 = excluded.sha256, imported_at = excluded.imported_at`)
    .run(relative, localTable, layer, records.length, actualHash, importedAt);
  return records.length;
}

function ensureIndexes(db: DatabaseSync) {
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_core_partner_id ON core_partner(partner_id);
    CREATE INDEX IF NOT EXISTS idx_core_partner_name ON core_partner(nachname, firmenname);
    CREATE INDEX IF NOT EXISTS idx_core_partner_kontakt_partner ON core_partner_kontakt(partner_id);
    CREATE INDEX IF NOT EXISTS idx_core_partner_kontakt_value ON core_partner_kontakt(wert);
    CREATE INDEX IF NOT EXISTS idx_core_partner_adresse_partner ON core_partner_adresse(partner_id, ist_aktuell);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_core_vertrag_id ON core_vertrag(vertrag_id);
    CREATE INDEX IF NOT EXISTS idx_core_vertrag_partner ON core_vertrag(versicherungsnehmer_id, status);
    CREATE INDEX IF NOT EXISTS idx_core_deckung_vertrag ON core_deckung(vertrag_id);
    CREATE INDEX IF NOT EXISTS idx_core_risiko_vertrag ON core_risiko_objekt(vertrag_id);
    CREATE INDEX IF NOT EXISTS idx_core_rollen_vertrag ON core_vertrag_partner_rolle(vertrag_id);
    CREATE INDEX IF NOT EXISTS idx_core_rollen_partner ON core_vertrag_partner_rolle(partner_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_core_schaden_id ON core_schaden(schaden_id);
    CREATE INDEX IF NOT EXISTS idx_core_schaden_vertrag ON core_schaden(vertrag_id, schadendatum);
    CREATE INDEX IF NOT EXISTS idx_core_schaden_partner ON core_schaden(partner_id, schadendatum);
    CREATE INDEX IF NOT EXISTS idx_core_schaden_position_schaden ON core_schaden_position(schaden_id, datum);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_core_interaktion_id ON core_interaktion(interaktion_id);
    CREATE INDEX IF NOT EXISTS idx_core_interaktion_partner ON core_interaktion(partner_id, zeitpunkt);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_core_dokument_id ON core_dokument(dokument_id);
    CREATE INDEX IF NOT EXISTS idx_core_dokument_partner ON core_dokument(partner_id, erstellt_am);
    CREATE INDEX IF NOT EXISTS idx_migration_partner_xref ON migration_partner_xref(curated_id);
    CREATE INDEX IF NOT EXISTS idx_migration_vertrag_xref ON migration_vertrag_xref(curated_id);
  `);
}

export function importFalkDataset(db = getDatabase(), force = false): UpstreamImportResult {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error("Falk dataset is missing. Run `npm run data:init` first.");
  }
  const manifestContent = readFileSync(MANIFEST_PATH);
  const manifestHash = sha256(manifestContent);
  const existing = db.prepare("SELECT manifest_sha256 FROM source_datasets WHERE id = ?").get(FALK_DATASET_ID) as { manifest_sha256?: string } | undefined;
  const existingTables = Number((db.prepare("SELECT COUNT(*) AS count FROM source_tables").get() as { count: number }).count);
  if (!force && existing?.manifest_sha256 === manifestHash && existingTables > 0) {
    const counts = db.prepare("SELECT COUNT(*) AS tables, COALESCE(SUM(row_count), 0) AS rows FROM source_tables").get() as { tables: number; rows: number };
    const references = db.prepare("SELECT COUNT(*) AS count FROM source_tables WHERE layer = 'reference'").get() as { count: number };
    return { imported: false, datasetId: FALK_DATASET_ID, upstreamCommit: FALK_UPSTREAM_COMMIT, manifestSha256: manifestHash,
      tables: Number(counts.tables), rows: Number(counts.rows), referenceTables: Number(references.count), warnings: upstreamWarnings() };
  }

  const manifest = JSON.parse(manifestContent.toString("utf8")) as Manifest;
  if (manifest.scale !== "S") throw new Error(`Expected Falk dataset scale S, got ${manifest.scale}`);
  const importable = manifest.tables.filter((table) => table.layer !== "truth" && table.files.csv);
  const importedAt = new Date().toISOString();
  let totalRows = 0;
  let referenceTables = 0;
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec("DELETE FROM source_tables");
    for (const table of importable) {
      const relative = table.files.csv!;
      const sourcePath = path.join(FALK_ROOT, relative);
      totalRows += importCsvTable(db, sourcePath, localTableName(table.layer, table.name), table.layer, table.sha256.csv, importedAt);
    }
    const referenceRoot = path.join(FALK_ROOT, "data", "reference");
    for (const sourcePath of csvFiles(referenceRoot)) {
      const relative = path.relative(referenceRoot, sourcePath).replace(/\.csv$/u, "");
      const name = `reference_${relative.replace(/[^a-z0-9]+/giu, "_").toLowerCase()}`;
      totalRows += importCsvTable(db, sourcePath, name, "reference", undefined, importedAt);
      referenceTables += 1;
    }
    ensureIndexes(db);
    db.prepare(`INSERT INTO source_datasets
      (id, upstream_commit, manifest_sha256, dataset_version, schema_version, scale, source_generated_at, imported_at, attribution)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET upstream_commit = excluded.upstream_commit,
        manifest_sha256 = excluded.manifest_sha256, dataset_version = excluded.dataset_version,
        schema_version = excluded.schema_version, scale = excluded.scale,
        source_generated_at = excluded.source_generated_at, imported_at = excluded.imported_at,
        attribution = excluded.attribution`)
      .run(FALK_DATASET_ID, FALK_UPSTREAM_COMMIT, manifestHash, manifest.version, manifest.schema_version,
        manifest.scale, manifest.generated_at, importedAt, FALK_ATTRIBUTION);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { imported: true, datasetId: FALK_DATASET_ID, upstreamCommit: FALK_UPSTREAM_COMMIT, manifestSha256: manifestHash,
    tables: importable.length + referenceTables, rows: totalRows, referenceTables, warnings: upstreamWarnings() };
}

export function upstreamWarnings() {
  return [
    "Finance and broader process stages are not fully implemented yet.",
  ];
}

export function getUpstreamStatus(db = getDatabase()) {
  const dataset = db.prepare("SELECT * FROM source_datasets WHERE id = ?").get(FALK_DATASET_ID) as Record<string, unknown> | undefined;
  const tables = db.prepare("SELECT source_path, local_table, layer, row_count, sha256 FROM source_tables ORDER BY layer, source_path").all();
  return { dataset: dataset ?? null, tables, warnings: upstreamWarnings() };
}
