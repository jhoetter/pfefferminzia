import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const documents = [
  ["privathaft-klar.md", "privathaft-klar-2026.pdf"],
  ["leben-sicher-2045.md", "leben-sicher-2045.pdf"],
] as const;

function plain(markdown: string) {
  return markdown
    .replace(/^>\s?/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`(.*?)`/g, "$1");
}

function wrap(text: string, max = 92) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/u);
    let line = "";
    for (const word of words) {
      if (`${line} ${word}`.trim().length > max && line) {
        lines.push(line);
        line = word;
      } else line = `${line} ${word}`.trim();
    }
    if (line) lines.push(line);
  }
  return lines;
}

async function generate(source: string, output: string) {
  const markdown = await readFile(path.join(root, "data", "tariffs", source), "utf8");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595.28, 841.89]);
  let y = 790;
  const lines = wrap(plain(markdown));
  for (const [index, line] of lines.entries()) {
    if (y < 58) {
      page = pdf.addPage([595.28, 841.89]);
      y = 790;
    }
    const isTitle = index === 0;
    page.drawText(line || " ", {
      x: 48,
      y,
      size: isTitle ? 16 : 9.5,
      font: isTitle ? bold : font,
      color: isTitle ? rgb(0.08, 0.16, 0.13) : rgb(0.18, 0.22, 0.2),
    });
    y -= isTitle ? 28 : line ? 14 : 8;
  }
  for (const [index, current] of pdf.getPages().entries()) {
    current.drawText(`Pfefferminzia MVP · Fiktiver Beispieltarif · Seite ${index + 1}/${pdf.getPageCount()}`, {
      x: 48, y: 28, size: 7.5, font, color: rgb(0.45, 0.48, 0.46),
    });
  }
  await writeFile(path.join(root, "data", "tariffs", output), await pdf.save());
}

for (const [source, output] of documents) await generate(source, output);
console.log("Generated tariff PDFs.");
