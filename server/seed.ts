import { readFileSync } from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { getDatabase } from "./database";

/** Keep the tariff knowledge catalog in sync without creating any tickets. */
export function ensureSeedData(db = getDatabase()) {
  const documents = [
    {
      id: "privathaft-klar-2026",
      title: "PrivatHaft Klar · PHK-2026",
      productLine: "liability",
      filename: "privathaft-klar-2026.pdf",
      storagePath: "data/tariffs/privathaft-klar-2026.pdf",
      source: "data/tariffs/privathaft-klar.md",
      summary: "Fiktiver Privathaftpflicht-Tarif mit 10 Mio. Euro Deckung, 150 Euro Selbstbeteiligung und 24h-Kontrollfenster.",
    },
    {
      id: "leben-sicher-2045",
      title: "Leben Sicher 2045 · LS-2045",
      productLine: "life",
      filename: "leben-sicher-2045.pdf",
      storagePath: "data/tariffs/leben-sicher-2045.pdf",
      source: "data/tariffs/leben-sicher-2045.md",
      summary: "Fiktiver Risikolebens-Tarif; jede Kommunikation und Leistungsentscheidung erfordert menschliche Freigabe.",
    },
  ];

  for (const document of documents) {
    const sourcePath = new URL(`../${document.source}`, import.meta.url);
    const text = readFileSync(sourcePath, "utf8");
    db.prepare(`INSERT INTO documents (id, title, product_line, filename, storage_path, summary, text_content, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET title = excluded.title, product_line = excluded.product_line,
        filename = excluded.filename, storage_path = excluded.storage_path, summary = excluded.summary,
        text_content = excluded.text_content`)
      .run(
        document.id,
        document.title,
        document.productLine,
        document.filename,
        document.storagePath,
        document.summary,
        text,
        new Date().toISOString(),
      );
  }
}
