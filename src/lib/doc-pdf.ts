import "server-only";
import mammoth from "mammoth";
import { textPdf } from "@/lib/pdf";

// a document as a PDF, for upload boxes that only take PDF. Word (.docx) and plain text become a text PDF (the
// words, not the layout); JPG/PNG become one fitted page; a PDF stays as it is; anything else (old .doc) is unchanged.
export async function asPdf(f: { name: string; mime: string; buffer: Buffer }): Promise<{ name: string; mime: string; buffer: Buffer }> {
  const kind = `${f.mime} ${f.name}`;
  if (/pdf/i.test(kind)) return f;
  const base = f.name.replace(/\.[^.]+$/, "") || "document";
  if (/wordprocessingml|\.docx\b/i.test(kind)) {
    const { value } = await mammoth.extractRawText({ buffer: f.buffer });
    return { name: `${base}.pdf`, mime: "application/pdf", buffer: textPdf(base, value) };
  }
  if (/^text\/plain|\.txt\b/i.test(kind)) return { name: `${base}.pdf`, mime: "application/pdf", buffer: textPdf(base, f.buffer.toString("utf8")) };
  // a photo or scan (a passport page, a certificate): one A4 page with the picture fitted inside the margins
  if (/image\/(jpe?g|png)|\.(jpe?g|png)\b/i.test(kind)) {
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    const img = /png/i.test(kind) ? await doc.embedPng(f.buffer) : await doc.embedJpg(f.buffer);
    const page = doc.addPage([595.28, 841.89]);
    const scale = Math.min((595.28 - 72) / img.width, (841.89 - 72) / img.height, 1);
    const w = img.width * scale;
    const h = img.height * scale;
    page.drawImage(img, { x: (595.28 - w) / 2, y: (841.89 - h) / 2, width: w, height: h });
    return { name: `${base}.pdf`, mime: "application/pdf", buffer: Buffer.from(await doc.save()) };
  }
  return f;
}
