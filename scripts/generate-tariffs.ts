import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "data", "tariffs");
const upstreamReference = path.join(root, "vendor", "falk-pfefferminzia", "data", "reference");
const upstreamCommit = "352a68ec5786920bdb41b42d3cefc41627ad1145";
const fixedDate = new Date("2026-09-04T00:00:00.000Z");

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

interface DocumentModel {
  entry: CatalogEntry;
  category: string;
  displayTitle: string;
  edition: string;
  intro: string;
  profile: string;
  parameters: { label: string; value: string }[];
  checks: string[];
  workshopFocus: string;
}

interface Fonts { regular: PDFFont; bold: PDFFont }

const colors = {
  ink: rgb(0.10, 0.16, 0.13), muted: rgb(0.38, 0.45, 0.41), faint: rgb(0.56, 0.61, 0.58),
  green: rgb(0.08, 0.27, 0.19), mint: rgb(0.78, 0.91, 0.83), pale: rgb(0.95, 0.98, 0.96),
  line: rgb(0.84, 0.88, 0.85), white: rgb(1, 1, 1), amber: rgb(0.96, 0.78, 0.39),
  amberPale: rgb(1, 0.97, 0.88), violet: rgb(0.35, 0.25, 0.48), violetPale: rgb(0.94, 0.91, 0.97),
};

function pdfText(value: string) {
  return value.normalize("NFC")
    .replace(/[–—]/gu, "-")
    .replace(/[’]/gu, "'")
    .replace(/→/gu, "->")
    .replace(/ | /gu, " ");
}

function splitText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of pdfText(text).split("\n")) {
    if (!paragraph.trim()) { lines.push(""); continue; }
    let line = "";
    for (const word of paragraph.split(/\s+/u)) {
      const candidate = `${line} ${word}`.trim();
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function drawWrapped(page: PDFPage, text: string, options: {
  x: number; y: number; width: number; font: PDFFont; size: number; color?: ReturnType<typeof rgb>; lineHeight?: number;
}) {
  const lineHeight = options.lineHeight ?? options.size * 1.42;
  const lines = splitText(text, options.font, options.size, options.width);
  lines.forEach((line, index) => page.drawText(line || " ", {
    x: options.x, y: options.y - index * lineHeight, size: options.size, font: options.font, color: options.color ?? colors.ink,
  }));
  return options.y - lines.length * lineHeight;
}

function drawBrand(page: PDFPage, fonts: Fonts, entry: CatalogEntry, pageNumber: number) {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: height - 76, width, height: 76, color: colors.green });
  page.drawCircle({ x: 49, y: height - 38, size: 18, color: colors.mint });
  page.drawCircle({ x: 55, y: height - 33, size: 10, color: colors.green });
  page.drawText("PFEFFERMINZIA", { x: 82, y: height - 35, size: 13, font: fonts.bold, color: colors.white });
  page.drawText("VERSICHERUNGEN  /  EXECUTIVE WORKSHOP", { x: 82, y: height - 50, size: 6.7, font: fonts.regular, color: colors.mint });
  const badge = "FIKTIVE WORKSHOP-REFERENZ";
  const badgeWidth = fonts.bold.widthOfTextAtSize(badge, 6.6) + 20;
  page.drawRectangle({ x: width - badgeWidth - 38, y: height - 49, width: badgeWidth, height: 22, color: colors.white, opacity: 0.14, borderColor: colors.mint, borderWidth: 0.5 });
  page.drawText(badge, { x: width - badgeWidth - 28, y: height - 41.5, size: 6.6, font: fonts.bold, color: colors.white });
  page.drawLine({ start: { x: 38, y: 44 }, end: { x: width - 38, y: 44 }, thickness: 0.6, color: colors.line });
  page.drawText(`SYNTHETISCHER LEHRDATENSATZ  ·  ${entry.id}`, { x: 38, y: 27, size: 6.4, font: fonts.bold, color: colors.faint });
  const pageText = `SEITE ${pageNumber} / 2`;
  page.drawText(pageText, { x: width - 38 - fonts.bold.widthOfTextAtSize(pageText, 6.4), y: 27, size: 6.4, font: fonts.bold, color: colors.faint });
}

function drawSectionTitle(page: PDFPage, fonts: Fonts, number: string, title: string, y: number) {
  page.drawCircle({ x: 51, y: y + 2, size: 11, color: colors.green });
  page.drawText(number, { x: 47.5, y: y - 1.5, size: 7, font: fonts.bold, color: colors.white });
  page.drawText(title.toUpperCase(), { x: 72, y, size: 9, font: fonts.bold, color: colors.green });
  page.drawLine({ start: { x: 72, y: y - 7 }, end: { x: 557, y: y - 7 }, thickness: 0.6, color: colors.line });
  return y - 27;
}

function drawFactCard(page: PDFPage, fonts: Fonts, x: number, y: number, width: number, label: string, value: string) {
  page.drawRectangle({ x, y: y - 50, width, height: 50, color: colors.pale, borderColor: colors.line, borderWidth: 0.6 });
  page.drawText(label.toUpperCase(), { x: x + 11, y: y - 15, size: 6, font: fonts.bold, color: colors.faint });
  const lines = splitText(value, fonts.bold, 8.2, width - 22).slice(0, 2);
  lines.forEach((line, index) => page.drawText(line, { x: x + 11, y: y - 31 - index * 10, size: 8.2, font: fonts.bold, color: colors.ink }));
}

function drawBulletList(page: PDFPage, fonts: Fonts, items: string[], x: number, y: number, width: number) {
  let cursor = y;
  for (const item of items) {
    page.drawCircle({ x: x + 3, y: cursor + 2.5, size: 2.3, color: colors.green });
    cursor = drawWrapped(page, item, { x: x + 14, y: cursor + 6, width: width - 14, font: fonts.regular, size: 8.4, color: colors.muted, lineHeight: 12 }) - 6;
  }
  return cursor;
}

function drawCoverPage(page: PDFPage, fonts: Fonts, model: DocumentModel) {
  const { entry } = model;
  drawBrand(page, fonts, entry, 1);
  page.drawText(model.category.toUpperCase(), { x: 38, y: 716, size: 7.2, font: fonts.bold, color: colors.green });
  let y = drawWrapped(page, model.displayTitle, { x: 38, y: 679, width: 500, font: fonts.bold, size: 27, color: colors.ink, lineHeight: 31 });
  page.drawText(model.edition, { x: 38, y: y - 5, size: 11, font: fonts.regular, color: colors.muted });
  y -= 44;
  const cardWidth = 122;
  const gap = 8;
  const cards = [
    { label: "Dokument-ID", value: entry.id },
    { label: "Tarifgeneration", value: entry.tariffGenerationId },
    { label: "Markt", value: entry.market === "CH" ? "Schweiz" : "Deutschland" },
    { label: "Gültig ab", value: entry.validFrom },
  ];
  cards.forEach((card, index) => drawFactCard(page, fonts, 38 + index * (cardWidth + gap), y, cardWidth, card.label, card.value));
  y -= 82;
  page.drawRectangle({ x: 38, y: y - 72, width: 519, height: 72, color: colors.amberPale, borderColor: colors.amber, borderWidth: 0.8 });
  page.drawRectangle({ x: 38, y: y - 72, width: 5, height: 72, color: colors.amber });
  page.drawText("WICHTIGER NUTZUNGSHINWEIS", { x: 56, y: y - 21, size: 7.5, font: fonts.bold, color: colors.ink });
  drawWrapped(page, "Dieses Dokument ist eine verkürzte, synthetische Referenz für einen KI-Workshop. Es ist kein echtes Versicherungsprodukt, kein vollständiges Bedingungswerk und keine Rechts- oder Versicherungsberatung.", {
    x: 56, y: y - 39, width: 478, font: fonts.regular, size: 8.3, color: colors.muted, lineHeight: 11.5,
  });
  y -= 110;
  y = drawSectionTitle(page, fonts, "1", "Einordnung", y);
  y = drawWrapped(page, model.intro, { x: 38, y, width: 519, font: fonts.regular, size: 9.2, color: colors.muted, lineHeight: 14 }) - 17;
  y = drawSectionTitle(page, fonts, "2", "Generationsprofil", y);
  drawWrapped(page, model.profile, { x: 38, y, width: 519, font: fonts.regular, size: 9.2, color: colors.muted, lineHeight: 14 });
}

function drawDetailPage(page: PDFPage, fonts: Fonts, model: DocumentModel) {
  const { entry } = model;
  drawBrand(page, fonts, entry, 2);
  page.drawText(`${model.displayTitle}  /  ${model.edition}`, { x: 38, y: 735, size: 7.2, font: fonts.bold, color: colors.green });
  let y = drawSectionTitle(page, fonts, "3", "Dokument- und Tarifdaten", 697);
  const colWidth = 250;
  model.parameters.slice(0, 6).forEach((fact, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 38 + column * 269;
    const itemY = y - row * 42;
    page.drawText(fact.label.toUpperCase(), { x, y: itemY, size: 5.8, font: fonts.bold, color: colors.faint });
    drawWrapped(page, fact.value, { x, y: itemY - 14, width: colWidth, font: fonts.regular, size: 8.2, color: colors.ink, lineHeight: 10.5 });
  });
  y -= 145;
  y = drawSectionTitle(page, fonts, "4", "Prüfpfad vor einer Aussage", y);
  y = drawBulletList(page, fonts, model.checks, 38, y, 519) - 9;
  y = drawSectionTitle(page, fonts, "5", "Workshop-Fokus", y);
  page.drawRectangle({ x: 38, y: y - 76, width: 519, height: 76, color: colors.violetPale, borderColor: rgb(0.77, 0.69, 0.84), borderWidth: 0.7 });
  page.drawText("MCP-SZENARIO", { x: 53, y: y - 20, size: 6.5, font: fonts.bold, color: colors.violet });
  drawWrapped(page, model.workshopFocus, { x: 53, y: y - 39, width: 488, font: fonts.regular, size: 8.4, color: colors.violet, lineHeight: 11.5 });
  y -= 104;
  y = drawSectionTitle(page, fonts, "6", "Provenienz und Verantwortung", y);
  drawWrapped(page, `Abgeleitet aus den Tarifreferenzen von falkue/Pfefferminzia, Commit ${upstreamCommit}. Template PF-PDF-1.0. Die Zuordnung erfolgt über Vertrag, Tarifgeneration und Markt. Widersprüche oder fehlende Nachträge müssen vor jeder fachlichen Aussage durch einen Menschen geklärt werden.`, {
    x: 38, y, width: 519, font: fonts.regular, size: 8.3, color: colors.muted, lineHeight: 12,
  });
}

async function renderPdf(model: DocumentModel) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(model.entry.title);
  pdf.setAuthor("Pfefferminzia workshop project");
  pdf.setSubject("Synthetische Bedingungsreferenz für Workshop-Zwecke");
  pdf.setKeywords(["synthetic", "workshop", model.entry.id, model.entry.tariffGenerationId, model.entry.market]);
  pdf.setCreator("Pfefferminzia MCP / PF-PDF-1.0");
  pdf.setProducer("Pfefferminzia MCP / pdf-lib");
  pdf.setCreationDate(fixedDate);
  pdf.setModificationDate(fixedDate);
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  const cover = pdf.addPage([595.28, 841.89]);
  const details = pdf.addPage([595.28, 841.89]);
  drawCoverPage(cover, fonts, model);
  drawDetailPage(details, fonts, model);
  await writeFile(path.join(outputDirectory, model.entry.filename), await pdf.save({ useObjectStreams: false }));
}

async function csv(relativePath: string) {
  const content = await readFile(path.join(upstreamReference, relativePath));
  return parse(content, { bom: true, columns: true, skip_empty_lines: true }) as Record<string, string>[];
}

function metadata(entry: CatalogEntry) {
  return `---
document_id: ${entry.id}
type: BEDINGUNGSWERK
tariff_generation: ${entry.tariffGenerationId}
market: ${entry.market}
valid_from: ${entry.validFrom}
valid_to: ${entry.validTo ?? "null"}
source_dataset: falkue/Pfefferminzia@${upstreamCommit}
template_version: PF-PDF-1.0
workshop_extension: true
---`;
}

function liabilityFocus(generation: string, market: "CH" | "DE") {
  if (generation === "HP-MODERN" && market === "CH") {
    return "Niederberger und Kaufmann: Bei Kinderschäden sind Aufsichtspflicht und konkrete Deckung zu prüfen. Beim Gewerbe-Grossschaden kommen Deckung, Selbstbehalt, Kompetenzgrenze, Kausalität und Regress hinzu.";
  }
  if (generation === "HP-MODERN" && market === "DE") {
    return "Pieper und Grimm: Migrierte Bausteine müssen gegen das Quellsystem geprüft werden. Eine Ablehnung darf nie allein aus einem fehlenden Zielfeld folgen. Betrugssignale begründen eine Prüfung, aber keinen Beweis.";
  }
  return "Das MCP-System muss zuerst den konkreten Vertrag auflösen und anschließend Generation, Markt, Deckungen, Bausteine und Nachträge gemeinsam bewerten. Diese Referenz allein erlaubt keine Deckungsentscheidung.";
}

function lifeFocus(generation: string, market: "CH" | "DE") {
  return `Lebensversicherung ${generation} / ${market}: Das MCP-System darf relevante Generationseigenschaften und fehlende Unterlagen aufzeigen. Annahme-, Begünstigten- oder Leistungsentscheidungen bleiben immer bei einer qualifizierten menschlichen Prüfstelle.`;
}

function buildMarkdown(model: DocumentModel) {
  const { entry } = model;
  return `${metadata(entry)}

# ${model.displayTitle}

## ${model.edition}

> Fiktive Workshop-Referenz. Kein echtes Versicherungsprodukt, kein vollständiges Bedingungswerk und keine Rechts- oder Versicherungsberatung.

## Einordnung

${model.intro}

## Generationsprofil

${model.profile}

## Dokument- und Tarifdaten

${model.parameters.map((fact) => `- **${fact.label}:** ${fact.value}`).join("\n")}

## Prüfpfad vor einer Aussage

${model.checks.map((check) => `- ${check}`).join("\n")}

## Workshop-Fokus

${model.workshopFocus}

## Provenienz und Verantwortung

Abgeleitet aus den Tarifreferenzen von falkue/Pfefferminzia, Commit ${upstreamCommit}. Template PF-PDF-1.0. Die Zuordnung erfolgt über Vertrag, Tarifgeneration und Markt. Widersprüche oder fehlende Nachträge müssen vor jeder fachlichen Aussage durch einen Menschen geklärt werden.
`;
}

async function buildDocuments() {
  const documents: DocumentModel[] = [];
  for (const row of await csv("hp/tarifgenerationen.csv")) {
    for (const market of ["CH", "DE"] as const) {
      const id = row[market === "CH" ? "bedingungswerk_ch" : "bedingungswerk_de"];
      const products = row.produkte.split(";");
      const entry: CatalogEntry = {
        id, title: `Bedingungsreferenz Haftpflicht · ${row.bezeichnung} · ${market}`,
        productLine: "liability", productIds: products, tariffGenerationId: row.kuerzel, market,
        validFrom: row.gueltig_ab, validTo: row.gueltig_bis || null, revision: row.revisionen || row.tarifhandbuch_version,
        filename: `${id}.pdf`, source: `data/tariffs/${id}.md`,
        summary: `${row.bezeichnung} (${row.kuerzel}) für ${market}; synthetische Workshop-Referenz mit exakter Falk-Tarifzuordnung.`,
      };
      documents.push({
        entry, category: "Haftpflicht · Bedingungsreferenz", displayTitle: "Bedingungsreferenz Haftpflicht",
        edition: `${row.bezeichnung} · ${market === "CH" ? "Schweiz" : "Deutschland"}`,
        intro: `Diese Referenz ordnet die Falk-Tarifgeneration ${row.kuerzel} den Produkten ${products.join(", ")} im Markt ${market} zu. Sie unterstützt die versionsgenaue Recherche im Workshop, ersetzt aber keine vollständigen Bedingungen.`,
        profile: row.kernunterschiede,
        parameters: [
          { label: "Produkte", value: products.join(", ") }, { label: "Neugeschäft", value: `${row.gueltig_ab} bis ${row.gueltig_bis || "offen"}` },
          { label: "Herkunft", value: row.herkunft }, { label: "Primäres System", value: row.quellsystem_primaer },
          { label: "Tarifhandbuch", value: row.tarifhandbuch_version }, { label: "Revisionen", value: row.revisionen || "Keine separate Revisionsangabe" },
        ],
        checks: [
          "Vertrag, Versicherungsnehmer, Produkt und Markt eindeutig auflösen.",
          "Tarifgeneration sowie Gültigkeit am Vertrags- und Schadendatum prüfen.",
          "Konkrete Deckungen, Bausteine, Versicherungssummen und Selbstbehalte lesen.",
          "Nachträge, Quellsystem und Migrationsabweichungen als eigene Evidenz behandeln.",
          "Ergebnis als Empfehlung kennzeichnen und erforderliche menschliche Freigabe einholen.",
        ],
        workshopFocus: liabilityFocus(row.kuerzel, market),
      });
    }
  }

  for (const row of await csv("lv/tarifgenerationen.csv")) {
    for (const market of ["CH", "DE"] as const) {
      const id = row[market === "CH" ? "bedingungswerk_id_ch" : "bedingungswerk_id_de"];
      const products = row.produkte.split(";");
      const suicidePeriod = row[market === "CH" ? "suizidfrist_jahre_ch" : "suizidfrist_jahre_de"];
      const entry: CatalogEntry = {
        id, title: `Bedingungsreferenz Leben · ${row.bezeichnung} · ${market}`,
        productLine: "life", productIds: products, tariffGenerationId: row.generation_code, market,
        validFrom: row.gueltig_ab, validTo: row.gueltig_bis || null, revision: row.annahmerichtlinie_version,
        filename: `${id}.pdf`, source: `data/tariffs/${id}.md`,
        summary: `${row.bezeichnung} (${row.generation_code}) für ${market}; synthetische Workshop-Referenz mit exakter Falk-Tarifzuordnung.`,
      };
      documents.push({
        entry, category: "Lebensversicherung · Bedingungsreferenz", displayTitle: "Bedingungsreferenz Leben",
        edition: `${row.bezeichnung} · ${market === "CH" ? "Schweiz" : "Deutschland"}`,
        intro: `Diese Referenz ordnet die Falk-Tarifgeneration ${row.generation_code} den Produkten ${products.join(", ")} im Markt ${market} zu. Sie dient der nachvollziehbaren Recherche und niemals einer automatischen Annahme- oder Leistungsentscheidung.`,
        profile: row.kernunterschiede_bemerkung,
        parameters: [
          { label: "Produkte", value: products.join(", ") }, { label: "Neugeschäft", value: `${row.gueltig_ab} bis ${row.gueltig_bis || "offen"}` },
          { label: "Annahmerichtlinie", value: row.annahmerichtlinie_version }, { label: "Gesundheitsfragen", value: row.gesundheitsfragebogen_version },
          { label: "Suizidfrist", value: `${suicidePeriod} Jahr(e) · Markt ${market}` }, { label: "Rückkaufswert", value: row.rueckkauf_methode },
        ],
        checks: [
          "Rolle der Person, Vertrag, Produkt und Markt eindeutig auflösen.",
          "Tarifgeneration, Vertragsbeginn, Nachträge und versicherte Summe prüfen.",
          "Gesundheitsangaben und Dokumente nur zweckgebunden und minimal verwenden.",
          "Begünstigung, Ausschlüsse und Leistungsunterlagen niemals aus Stammdaten ableiten.",
          "Jede Annahme-, Begünstigten- oder Leistungsentscheidung menschlich prüfen lassen.",
        ],
        workshopFocus: lifeFocus(row.generation_code, market),
      });
    }
  }
  return documents;
}

await mkdir(outputDirectory, { recursive: true });
const documents = await buildDocuments();
for (const model of documents) {
  await writeFile(path.join(root, model.entry.source), buildMarkdown(model), "utf8");
  await renderPdf(model);
}
await writeFile(path.join(outputDirectory, "catalog.json"), `${JSON.stringify(documents.map((model) => model.entry), null, 2)}\n`, "utf8");
console.log(`Generated ${documents.length} Falk-aligned synthetic workshop PDFs with template PF-PDF-1.0.`);
