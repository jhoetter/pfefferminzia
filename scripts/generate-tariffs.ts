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
  tariffFeatures: string;
  parameters: { label: string; value: string }[];
  applicationNotes: string[];
  specialNotes: string;
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
  page.drawText("VERSICHERUNGEN  /  TARIFINFORMATION", { x: 82, y: height - 50, size: 6.7, font: fonts.regular, color: colors.mint });
  const badge = "SYNTHETISCHES TARIFBLATT";
  const badgeWidth = fonts.bold.widthOfTextAtSize(badge, 6.6) + 20;
  page.drawRectangle({ x: width - badgeWidth - 38, y: height - 49, width: badgeWidth, height: 22, color: colors.white, opacity: 0.14, borderColor: colors.mint, borderWidth: 0.5 });
  page.drawText(badge, { x: width - badgeWidth - 28, y: height - 41.5, size: 6.6, font: fonts.bold, color: colors.white });
  page.drawLine({ start: { x: 38, y: 44 }, end: { x: width - 38, y: 44 }, thickness: 0.6, color: colors.line });
  page.drawText(`FIKTIVES LEHRBEISPIEL  ·  ${entry.id}`, { x: 38, y: 27, size: 6.4, font: fonts.bold, color: colors.faint });
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
  drawWrapped(page, "Dieses Tarifblatt fasst die Merkmale der genannten Tarifgeneration zusammen. Verbindlich sind der individuelle Vertrag, die Police, Nachträge und die vollständigen Bedingungen. Fiktives Lehrbeispiel; keine Rechts- oder Versicherungsberatung.", {
    x: 56, y: y - 39, width: 478, font: fonts.regular, size: 8.3, color: colors.muted, lineHeight: 11.5,
  });
  y -= 110;
  y = drawSectionTitle(page, fonts, "1", "Geltungsbereich", y);
  y = drawWrapped(page, model.intro, { x: 38, y, width: 519, font: fonts.regular, size: 9.2, color: colors.muted, lineHeight: 14 }) - 17;
  y = drawSectionTitle(page, fonts, "2", "Tarifmerkmale", y);
  drawWrapped(page, model.tariffFeatures, { x: 38, y, width: 519, font: fonts.regular, size: 9.2, color: colors.muted, lineHeight: 14 });
}

function drawDetailPage(page: PDFPage, fonts: Fonts, model: DocumentModel) {
  const { entry } = model;
  drawBrand(page, fonts, entry, 2);
  page.drawText(`${model.displayTitle}  /  ${model.edition}`, { x: 38, y: 735, size: 7.2, font: fonts.bold, color: colors.green });
  let y = drawSectionTitle(page, fonts, "3", "Tarifdaten", 697);
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
  y = drawSectionTitle(page, fonts, "4", "Anwendungshinweise", y);
  y = drawBulletList(page, fonts, model.applicationNotes, 38, y, 519) - 9;
  y = drawSectionTitle(page, fonts, "5", "Besondere Hinweise", y);
  page.drawRectangle({ x: 38, y: y - 76, width: 519, height: 76, color: colors.violetPale, borderColor: rgb(0.77, 0.69, 0.84), borderWidth: 0.7 });
  page.drawText("TARIFGENERATION", { x: 53, y: y - 20, size: 6.5, font: fonts.bold, color: colors.violet });
  drawWrapped(page, model.specialNotes, { x: 53, y: y - 39, width: 488, font: fonts.regular, size: 8.4, color: colors.violet, lineHeight: 11.5 });
  y -= 104;
  y = drawSectionTitle(page, fonts, "6", "Dokumentstatus", y);
  drawWrapped(page, `Tarifblatt ${entry.id}, gültig ab ${entry.validFrom}${entry.validTo ? ` bis ${entry.validTo}` : " ohne hinterlegtes Enddatum"}. Es handelt sich um ein fiktives Lehrbeispiel. Individuelle Vertragsunterlagen und spätere Nachträge haben Vorrang.`, {
    x: 38, y, width: 519, font: fonts.regular, size: 8.3, color: colors.muted, lineHeight: 12,
  });
}

async function renderPdf(model: DocumentModel) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(model.entry.title);
  pdf.setAuthor("Pfefferminzia Versicherungen AG (fiktiv)");
  pdf.setSubject("Synthetisches Tarifblatt für Lehrzwecke");
  pdf.setKeywords(["synthetisch", "tarifblatt", model.entry.id, model.entry.tariffGenerationId, model.entry.market]);
  pdf.setCreator("Pfefferminzia Dokumentgenerator / PF-PDF-1.1");
  pdf.setProducer("Pfefferminzia Dokumentgenerator / pdf-lib");
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
template_version: PF-PDF-1.1
workshop_extension: true
---`;
}

function buildMarkdown(model: DocumentModel) {
  const { entry } = model;
  return `${metadata(entry)}

# ${model.displayTitle}

## ${model.edition}

> Fiktives Lehrbeispiel. Dieses Tarifblatt ist kein vollständiges Bedingungswerk und keine Rechts- oder Versicherungsberatung.

## Geltungsbereich

${model.intro}

## Tarifmerkmale

${model.tariffFeatures}

## Tarifdaten

${model.parameters.map((fact) => `- **${fact.label}:** ${fact.value}`).join("\n")}

## Anwendungshinweise

${model.applicationNotes.map((note) => `- ${note}`).join("\n")}

## Besondere Hinweise

${model.specialNotes}

## Dokumentstatus

Tarifblatt ${entry.id}, gültig ab ${entry.validFrom}${entry.validTo ? ` bis ${entry.validTo}` : " ohne hinterlegtes Enddatum"}. Es handelt sich um ein fiktives Lehrbeispiel. Individuelle Vertragsunterlagen und spätere Nachträge haben Vorrang.
`;
}

async function buildDocuments() {
  const documents: DocumentModel[] = [];
  for (const row of await csv("hp/tarifgenerationen.csv")) {
    for (const market of ["CH", "DE"] as const) {
      const id = row[market === "CH" ? "bedingungswerk_ch" : "bedingungswerk_de"];
      const products = row.produkte.split(";");
      const entry: CatalogEntry = {
        id, title: `Tarifblatt Haftpflicht · ${row.bezeichnung} · ${market}`,
        productLine: "liability", productIds: products, tariffGenerationId: row.kuerzel, market,
        validFrom: row.gueltig_ab, validTo: row.gueltig_bis || null, revision: row.revisionen || row.tarifhandbuch_version,
        filename: `${id}.pdf`, source: `data/tariffs/${id}.md`,
        summary: `${row.bezeichnung} (${row.kuerzel}) für ${market}; synthetisches Tarifblatt mit Gültigkeit und Tarifmerkmalen.`,
      };
      documents.push({
        entry, category: "Haftpflicht · Tarifgeneration", displayTitle: "Tarifblatt Haftpflicht",
        edition: `${row.bezeichnung} · ${market === "CH" ? "Schweiz" : "Deutschland"}`,
        intro: `Die Tarifgeneration ${row.kuerzel} gilt für die Produkte ${products.join(", ")} im Markt ${market === "CH" ? "Schweiz" : "Deutschland"}. Der Neugeschäftszeitraum beginnt am ${row.gueltig_ab}${row.gueltig_bis ? ` und endet am ${row.gueltig_bis}` : " und hat kein hinterlegtes Enddatum"}.`,
        tariffFeatures: row.kernunterschiede,
        parameters: [
          { label: "Produkte", value: products.join(", ") }, { label: "Neugeschäft", value: `${row.gueltig_ab} bis ${row.gueltig_bis || "offen"}` },
          { label: "Herkunft", value: row.herkunft }, { label: "Primäres System", value: row.quellsystem_primaer },
          { label: "Tarifhandbuch", value: row.tarifhandbuch_version }, { label: "Revisionen", value: row.revisionen || "Keine separate Revisionsangabe" },
        ],
        applicationNotes: [
          "Anwendbar nur auf die ausgewiesenen Produkte und den genannten Markt.",
          `Für die zeitliche Zuordnung sind Vertragsbeginn, Änderungsdatum und Schadenzeitpunkt ${market === "CH" ? "massgeblich" : "maßgeblich"}.`,
          "Deckungen, Bausteine, Versicherungssummen und Selbstbehalte ergeben sich aus der Police.",
          "Nachträge und individuell vereinbarte Klauseln gehen diesem Tarifblatt vor.",
          "Bei abweichenden Bestandsdaten ist das führende Vertragssystem zu prüfen.",
        ],
        specialNotes: row.revisionen || "Für diese Tarifgeneration ist keine separate Revision ausgewiesen.",
      });
    }
  }

  for (const row of await csv("lv/tarifgenerationen.csv")) {
    for (const market of ["CH", "DE"] as const) {
      const id = row[market === "CH" ? "bedingungswerk_id_ch" : "bedingungswerk_id_de"];
      const products = row.produkte.split(";");
      const suicidePeriod = row[market === "CH" ? "suizidfrist_jahre_ch" : "suizidfrist_jahre_de"];
      const entry: CatalogEntry = {
        id, title: `Tarifblatt Leben · ${row.bezeichnung} · ${market}`,
        productLine: "life", productIds: products, tariffGenerationId: row.generation_code, market,
        validFrom: row.gueltig_ab, validTo: row.gueltig_bis || null, revision: row.annahmerichtlinie_version,
        filename: `${id}.pdf`, source: `data/tariffs/${id}.md`,
        summary: `${row.bezeichnung} (${row.generation_code}) für ${market}; synthetisches Tarifblatt mit Gültigkeit und Tarifmerkmalen.`,
      };
      documents.push({
        entry, category: "Lebensversicherung · Tarifgeneration", displayTitle: "Tarifblatt Leben",
        edition: `${row.bezeichnung} · ${market === "CH" ? "Schweiz" : "Deutschland"}`,
        intro: `Die Tarifgeneration ${row.generation_code} gilt für die Produkte ${products.join(", ")} im Markt ${market === "CH" ? "Schweiz" : "Deutschland"}. Der Neugeschäftszeitraum beginnt am ${row.gueltig_ab}${row.gueltig_bis ? ` und endet am ${row.gueltig_bis}` : " und hat kein hinterlegtes Enddatum"}.`,
        tariffFeatures: row.kernunterschiede_bemerkung,
        parameters: [
          { label: "Produkte", value: products.join(", ") }, { label: "Neugeschäft", value: `${row.gueltig_ab} bis ${row.gueltig_bis || "offen"}` },
          { label: "Annahmerichtlinie", value: row.annahmerichtlinie_version }, { label: "Gesundheitsfragen", value: row.gesundheitsfragebogen_version },
          { label: "Suizidfrist", value: `${suicidePeriod} Jahr(e) · Markt ${market}` }, { label: "Rückkaufswert", value: row.rueckkauf_methode },
        ],
        applicationNotes: [
          "Anwendbar nur auf die ausgewiesenen Produkte und den genannten Markt.",
          "Tarifgeneration, Vertragsbeginn, Nachträge und versicherte Summe sind gemeinsam zu lesen.",
          "Rechnungsgrundlagen richten sich nach Abschlussdatum, Markt und Tarifgeneration.",
          "Begünstigung, Ausschlüsse und Leistungsumfang ergeben sich aus den Vertragsunterlagen.",
          "Individuelle Zuschläge oder Ausschlüsse gehen den allgemeinen Tarifmerkmalen vor.",
        ],
        specialNotes: `Flugrisiko-Ausschluss: ${row.flugrisiko_ausschluss}. Nachversicherungsgarantie: ${row.nachversicherungsgarantie}. Verweisung EU/BU: ${row.verweisung_bu}.`,
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
console.log(`Generated ${documents.length} synthetic tariff PDFs with template PF-PDF-1.1.`);
