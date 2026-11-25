import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { imageOnly, nextLimit, sizeLimit, TOO_LARGE } from "@/lib/upload-limits";
import { fitFile } from "@/lib/file-fit";
import { fileWant } from "@/lib/cloud-engine";

const hasGs = (() => {
  try {
    execFileSync("gs", ["--version"]);
    return true;
  } catch {
    return false;
  }
})();

// a noisy photo that doesn't compress well, like a phone picture of a certificate
async function photo(w = 3000, h = 2200): Promise<Buffer> {
  const raw = Buffer.alloc(w * h * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 2654435761) >>> 24;
  return sharp(raw, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();
}

describe("upload limits", () => {
  it("reads the size limit a form states", () => {
    expect(sizeLimit("Upload your transcript (PDF, max 2MB)")).toBe(2_000_000);
    expect(sizeLimit("Maximum file size: 5 MB")).toBe(5_000_000);
    expect(sizeLimit("Files must not exceed 500 KB each")).toBe(500_000);
    expect(sizeLimit("Accepted: PDF, JPG. 10MB maximum per file")).toBe(10_000_000);
    expect(sizeLimit("max. 1,5 MB")).toBe(1_500_000);
    expect(sizeLimit("The file size limit is 4 MB; a CV of up to 2 MB")).toBe(2_000_000);
    expect(sizeLimit("Upload a photo 600 x 600 pixels")).toBeNull();
    expect(sizeLimit("Essay, maximum 500 words")).toBeNull();
  });
  it("knows a refusal for size, and what to aim for next", () => {
    expect(TOO_LARGE.test("The file you selected is too large.")).toBe(true);
    expect(TOO_LARGE.test("File exceeds the maximum allowed size of 3 MB")).toBe(true);
    expect(TOO_LARGE.test("Le fichier est trop volumineux")).toBe(true);
    expect(TOO_LARGE.test("Please upload your passport")).toBe(false);
    expect(nextLimit(null, "File exceeds the maximum allowed size of 3 MB")).toBe(3_000_000);
    expect(nextLimit(null, "too large")).toBe(1_900_000);
    expect(nextLimit(1_900_000, "too large")).toBe(950_000);
    expect(nextLimit(300_000, "too large")).toBe(250_000);
  });
  it("tells picture-only boxes from document boxes", () => {
    expect(imageOnly("image/jpeg,image/png")).toBe(true);
    expect(imageOnly(".jpg,.jpeg,.png")).toBe(true);
    expect(imageOnly("image/*")).toBe(true);
    expect(imageOnly(".pdf,.jpg")).toBe(false);
    expect(imageOnly("")).toBe(false);
    expect(imageOnly("*/*")).toBe(false);
  });
  it("puts the box's needs together for the file request", () => {
    expect(fileWant({ pdfOnly: true } as never, { accept: "", text: "Transcript (max 2 MB)" })).toEqual({ pdf: true, image: false, maxBytes: 2_000_000 });
    expect(fileWant({ maxBytes: 950_000 } as never, { accept: "image/jpeg", text: "Photo, max 2 MB" })).toEqual({ pdf: false, image: true, maxBytes: 950_000 });
    expect(fileWant(undefined, { accept: ".pdf" })).toEqual({ pdf: true, image: false, maxBytes: null });
    expect(fileWant(undefined)).toEqual({ pdf: false, image: false, maxBytes: null });
  });
});

describe("fitting a file to the box", () => {
  it("makes a big photo fit a size limit", async () => {
    const buffer = await photo();
    expect(buffer.length).toBeGreaterThan(1_000_000);
    const out = await fitFile({ name: "degree certificate.jpg", mime: "image/jpeg", buffer }, { maxBytes: 600_000 });
    expect(out.buffer.length).toBeLessThanOrEqual(600_000);
    expect(out.mime).toBe("image/jpeg");
  }, 60_000);
  it("turns a WebP into a PDF for a PDF-only box, under its limit", async () => {
    const webp = await sharp(await photo(2400, 1800)).webp({ quality: 90 }).toBuffer();
    const out = await fitFile({ name: "passport.webp", mime: "image/webp", buffer: webp }, { pdf: true, maxBytes: 800_000 });
    expect(out.mime).toBe("application/pdf");
    expect(out.name).toBe("passport.pdf");
    expect(out.buffer.length).toBeLessThanOrEqual(800_000);
    expect((await PDFDocument.load(out.buffer)).getPageCount()).toBe(1);
  }, 60_000);
  it("leaves a file alone when nothing is asked", async () => {
    const buffer = Buffer.from("%PDF-1.4 tiny");
    const f = { name: "cv.pdf", mime: "application/pdf", buffer };
    expect(await fitFile(f, {})).toBe(f);
  });
  it.skipIf(!hasGs)("makes a scanned PDF smaller with ghostscript", async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 2; i++) {
      const img = await doc.embedJpg(await photo(2600, 3400));
      const page = doc.addPage([595.28, 841.89]);
      page.drawImage(img, { x: 0, y: 0, width: 595.28, height: 841.89 });
    }
    const buffer = Buffer.from(await doc.save());
    const out = await fitFile({ name: "transcript.pdf", mime: "application/pdf", buffer }, { maxBytes: Math.round(buffer.length / 3) });
    expect(out.mime).toBe("application/pdf");
    expect(out.buffer.length).toBeLessThan(buffer.length / 3);
  }, 120_000);
  it.skipIf(!hasGs)("gives a picture-only box the first page of a PDF", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([300, 400]).drawText("Passport", { x: 20, y: 350 });
    const out = await fitFile({ name: "passport.pdf", mime: "application/pdf", buffer: Buffer.from(await doc.save()) }, { image: true });
    expect(out.mime).toBe("image/jpeg");
    expect(out.name).toBe("passport.jpg");
    expect((await sharp(out.buffer).metadata()).format).toBe("jpeg");
  }, 60_000);
});
