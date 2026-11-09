import "server-only";
import mammoth from "mammoth";
import { textPdf } from "@/lib/pdf";

// a document as a PDF, for upload boxes that only take PDF. Word (.docx) and plain text become a text PDF (the
// words, not the layout); a PDF stays as it is; anything else (images, old .doc) is returned unchanged.
export async function asPdf(f: { name: string; mime: string; buffer: Buffer }): Promise<{ name: string; mime: string; buffer: Buffer }> {
  const kind = `${f.mime} ${f.name}`;
  if (/pdf/i.test(kind)) return f;
  const base = f.name.replace(/\.[^.]+$/, "") || "document";
  if (/wordprocessingml|\.docx\b/i.test(kind)) {
    const { value } = await mammoth.extractRawText({ buffer: f.buffer });
    return { name: `${base}.pdf`, mime: "application/pdf", buffer: textPdf(base, value) };
  }
  if (/^text\/plain|\.txt\b/i.test(kind)) return { name: `${base}.pdf`, mime: "application/pdf", buffer: textPdf(base, f.buffer.toString("utf8")) };
  return f;
}
