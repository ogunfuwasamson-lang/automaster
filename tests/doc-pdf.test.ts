import { describe, it, expect, vi } from "vitest";
import * as JSZipLike from "node:zlib";

vi.mock("server-only", () => ({}));

// a minimal .docx (a zip with the three parts Word needs), built here so no fixture file is checked in
function docx(text: string): Buffer {
  const files: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/document.xml": `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`,
  };
  // stored (uncompressed) zip
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let off = 0;
  const crc = (b: Buffer) => JSZipLike.crc32(b) >>> 0;
  for (const [name, body] of Object.entries(files)) {
    const data = Buffer.from(body);
    const n = Buffer.from(name);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt32LE(crc(data), 14); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(n.length, 26);
    parts.push(h, n, data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt32LE(crc(data), 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
    central.push(c, n);
    off += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, end]);
}

describe("documents as PDF for PDF-only upload boxes", () => {
  it("turns a Word CV into a PDF with its words, and leaves a PDF alone", async () => {
    const { asPdf } = await import("@/lib/doc-pdf");
    const out = await asPdf({ name: "Ada CV.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: docx("Ada Okafor, financial analyst") });
    expect(out.name).toBe("Ada CV.pdf");
    expect(out.mime).toBe("application/pdf");
    expect(out.buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(out.buffer.toString("latin1")).toContain("financial analyst");
    const pdf = { name: "x.pdf", mime: "application/pdf", buffer: Buffer.from("%PDF-1.4") };
    expect(await asPdf(pdf)).toBe(pdf);
  });
});

describe("pictures as PDF", () => {
  it("puts a PNG scan on one PDF page", async () => {
    const { asPdf } = await import("@/lib/doc-pdf");
    // a 1x1 png
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    const out = await asPdf({ name: "passport.png", mime: "image/png", buffer: png });
    expect(out.name).toBe("passport.pdf");
    expect(out.buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
