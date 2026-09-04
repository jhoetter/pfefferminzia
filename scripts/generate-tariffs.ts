import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "data", "tariffs");
const upstreamReference = path.join(root, "vendor", "falk-pfefferminzia", "data", "reference");

interface CatalogEntry {
  id: string; title: string; productLine: "liability" | "life"; productIds: string[];
  tariffGenerationId: string; market: "CH" | "DE"; validFrom: string; validTo: string | null;
  revision: string; filename: string; source: string; summary: string;
}

function plain(markdown: string) {
  return markdown
    .replace(/^---$/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/[–—]/g, "-")
    .replace(/[’]/g, "'")
    .replace(/→/g, "->");
}

function wrap(text: string, max = 92) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph.trim()) { lines.push(""); continue; }
    const words = paragraph.split(/\s+/u);
    let line = "";
    for (const word of words) {
      if (`${line} ${word}`.trim().length > max && line) { lines.push(line); line = word; }
      else line = `${line} ${word}`.trim();
    }
    if (line) lines.push(line);
  }
  return lines;
}

async function csv(relativePath: string) {
  const content = await readFile(path.join(upstreamReference, relativePath));
  return parse(content, { bom: true, columns: true, skip_empty_lines: true }) as Record<string, string>[];
}

async function renderPdf(markdown: string, output: string, documentId: string, title: string) {
  const pdf = await PDFDocument.create();
  const fixedDate = new Date("2026-09-04T00:00:00.000Z");
  pdf.setTitle(title);
  pdf.setAuthor("Pfefferminzia workshop project");
  pdf.setSubject("Synthetic workshop-only insurance conditions reference");
  pdf.setCreator("Pfefferminzia MCP");
  pdf.setProducer("Pfefferminzia MCP / pdf-lib");
  pdf.setCreationDate(fixedDate);
  pdf.setModificationDate(fixedDate);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595.28, 841.89]);
  let y = 790;
  const lines = wrap(plain(markdown));
  for (const [index, line] of lines.entries()) {
    if (y < 58) { page = pdf.addPage([595.28, 841.89]); y = 790; }
    const isTitle = index === 0;
    page.drawText(line || " ", { x: 48, y, size: isTitle ? 15 : 9.5, font: isTitle ? bold : font,
      color: isTitle ? rgb(0.08, 0.16, 0.13) : rgb(0.18, 0.22, 0.2) });
    y -= isTitle ? 28 : line ? 14 : 8;
  }
  for (const [index, current] of pdf.getPages().entries()) {
    current.drawText(`SYNTHETIC WORKSHOP DATA · ${documentId} · Page ${index + 1}/${pdf.getPageCount()}`, {
      x: 48, y: 28, size: 7.2, font, color: rgb(0.45, 0.48, 0.46),
    });
  }
  await writeFile(path.join(outputDirectory, output), await pdf.save({ useObjectStreams: false }));
}

function metadata(entry: CatalogEntry) {
  return `---
document_id: ${entry.id}
type: BEDINGUNGSWERK
tariff_generation: ${entry.tariffGenerationId}
market: ${entry.market}
valid_from: ${entry.validFrom}
valid_to: ${entry.validTo ?? "null"}
source_dataset: falkue/Pfefferminzia@4d847a63ec6f8eb0d033c6d3dce6782789817768
workshop_extension: true
---`;
}

async function buildCatalog() {
  const entries: { catalog: CatalogEntry; markdown: string }[] = [];
  for (const row of await csv("hp/tarifgenerationen.csv")) {
    for (const market of ["CH", "DE"] as const) {
      const id = row[market === "CH" ? "bedingungswerk_ch" : "bedingungswerk_de"];
      const products = row.produkte.split(";");
      const catalog: CatalogEntry = {
        id, title: `${row.bezeichnung} · ${market}`, productLine: "liability", productIds: products,
        tariffGenerationId: row.kuerzel, market, validFrom: row.gueltig_ab, validTo: row.gueltig_bis || null,
        revision: row.revisionen || row.tarifhandbuch_version, filename: `${id}.pdf`, source: `data/tariffs/${id}.md`,
        summary: `${row.bezeichnung} (${row.kuerzel}) for ${market}; synthetic workshop conditions mapped to Falk's exact tariff generation.`,
      };
      const markdown = `${metadata(catalog)}

# ${catalog.title}

> Synthetic workshop-only conditions reference. This is not a real insurance product, not a complete policy wording, and not legal or insurance advice.

## Canonical assignment

- Document ID: ${id}
- Tariff generation: ${row.kuerzel}
- Products: ${products.join(", ")}
- Market: ${market}
- New-business validity: ${row.gueltig_ab} to ${row.gueltig_bis || "open"}
- Origin: ${row.herkunft}
- Primary source system: ${row.quellsystem_primaer}
- Tariff manual: ${row.tarifhandbuch_version}

## Version notes

${row.revisionen || "No separate revision note in the upstream reference."}

## Teaching characteristics

${row.kernunterschiede}

## Use in Pfefferminzia MCP

The applicable document must be selected through contract ID, tariff generation, and market. Product line alone is insufficient. Any coverage or claim conclusion must also inspect the contract's concrete coverages, limits, deductibles, risk object, amendments, and available evidence.

## Responsible-use boundary

This condensed document exists to demonstrate version-aware retrieval and tool use. It deliberately preserves conflicts and ambiguity documented by the upstream teaching dataset. It must never be presented as a real insurer's binding terms.
`;
      entries.push({ catalog, markdown });
    }
  }
  for (const row of await csv("lv/tarifgenerationen.csv")) {
    for (const market of ["CH", "DE"] as const) {
      const id = row[market === "CH" ? "bedingungswerk_id_ch" : "bedingungswerk_id_de"];
      const products = row.produkte.split(";");
      const suicidePeriod = row[market === "CH" ? "suizidfrist_jahre_ch" : "suizidfrist_jahre_de"];
      const catalog: CatalogEntry = {
        id, title: `${row.bezeichnung} · ${market}`, productLine: "life", productIds: products,
        tariffGenerationId: row.generation_code, market, validFrom: row.gueltig_ab, validTo: row.gueltig_bis || null,
        revision: row.annahmerichtlinie_version, filename: `${id}.pdf`, source: `data/tariffs/${id}.md`,
        summary: `${row.bezeichnung} (${row.generation_code}) for ${market}; synthetic workshop conditions mapped to Falk's exact tariff generation.`,
      };
      const markdown = `${metadata(catalog)}

# ${catalog.title}

> Synthetic workshop-only conditions reference. This is not a real insurance product, not a complete policy wording, and not legal or insurance advice.

## Canonical assignment

- Document ID: ${id}
- Tariff generation: ${row.generation_code}
- Products: ${products.join(", ")}
- Market: ${market}
- New-business validity: ${row.gueltig_ab} to ${row.gueltig_bis || "open"}
- Origin: ${row.herkunft}
- Underwriting guideline: ${row.annahmerichtlinie_version}
- Health questionnaire: ${row.gesundheitsfragebogen_version}

## Generation parameters

- Suicide exclusion period in this market: ${suicidePeriod} year(s)
- Follow-up insurance guarantee: ${row.nachversicherungsgarantie}
- Surrender-value method: ${row.rueckkauf_methode}
- Disability reference method: ${row.verweisung_bu}
- Flight-risk exclusion: ${row.flugrisiko_ausschluss}
- Simplified mortality table: ${row.sterbetafel_vereinfacht}

## Teaching characteristics

${row.kernunterschiede_bemerkung}

## Use in Pfefferminzia MCP

The applicable document must be selected through contract ID, tariff generation, and market. Every life-insurance communication, underwriting recommendation, beneficiary assessment, or benefit decision requires qualified human review before it can leave the workshop system.

## Responsible-use boundary

This condensed document exists to demonstrate version-aware retrieval and tool use. It deliberately preserves conflicts and ambiguity documented by the upstream teaching dataset. It must never be presented as a real insurer's binding terms.
`;
      entries.push({ catalog, markdown });
    }
  }
  return entries;
}

await mkdir(outputDirectory, { recursive: true });
const entries = await buildCatalog();
for (const entry of entries) {
  await writeFile(path.join(root, entry.catalog.source), entry.markdown, "utf8");
  await renderPdf(entry.markdown, entry.catalog.filename, entry.catalog.id, entry.catalog.title);
}
await writeFile(path.join(outputDirectory, "catalog.json"), `${JSON.stringify(entries.map((entry) => entry.catalog), null, 2)}\n`, "utf8");
console.log(`Generated ${entries.length} Falk-aligned synthetic workshop PDFs and Markdown sources.`);
