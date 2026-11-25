import "server-only";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { asPdf } from "@/lib/doc-pdf";

// a document made to fit an application form's upload box (approved 25 nov 2026): a phone photo (HEIC, WebP, TIFF...)
// becomes a JPG; a box that only takes PDF gets a PDF; a box that only takes pictures gets the first page of a PDF as
// a JPG; and a file over the box's size limit is made smaller (pictures re-sized and re-saved, PDFs re-written by
// ghostscript at lower image resolution). the applicant's own file in Ivyward is never changed.

export type FitFile = { name: string; mime: string; buffer: Buffer };
export type Want = { pdf?: boolean; image?: boolean; maxBytes?: number | null };

const kind = (f: FitFile) => `${f.mime} ${f.name}`;
const isPdf = (f: FitFile) => /pdf/i.test(kind(f));
const isJpgPng = (f: FitFile) => /image\/(jpe?g|png)|\.(jpe?g|png)\b/i.test(kind(f));
const HEIC = /image\/hei[cf]|\.hei[cf]\b/i;
const OTHER_IMAGE = /image\/(hei[cf]|webp|tiff|gif|bmp|avif)|\.(hei[cf]|webp|tiff?|gif|bmp|avif)\b/i;
const base = (name: string) => name.replace(/\.[^.]+$/, "") || "document";
const jpg = (f: FitFile, buffer: Buffer): FitFile => ({ name: `${base(f.name)}.jpg`, mime: "image/jpeg", buffer });

export async function fitFile(f: FitFile, want: Want = {}): Promise<FitFile> {
  let out = f;
  // pictures most forms don't take (and pdf-lib can't embed) become a JPG first
  if (OTHER_IMAGE.test(kind(out))) out = await toJpeg(out).catch(() => out);
  if (want.image && isPdf(out)) out = await pdfFirstPage(out).catch(() => out);
  const limit = want.maxBytes && want.maxBytes > 0 ? Math.floor(want.maxBytes * 0.95) : null;
  // a picture going into a PDF: shrink the picture first, so the PDF around it fits too
  if (limit && want.pdf && isJpgPng(out) && out.buffer.length > limit) out = await shrinkImage(out, limit).catch(() => out);
  if (want.pdf) out = await asPdf(out);
  if (limit && out.buffer.length > limit) {
    if (isPdf(out)) out = await shrinkPdf(out, limit).catch(() => out);
    else if (isJpgPng(out)) out = await shrinkImage(out, limit).catch(() => out);
  }
  return out;
}

async function toJpeg(f: FitFile): Promise<FitFile> {
  if (HEIC.test(kind(f))) {
    // iphone photos: sharp's own build can't read HEVC-coded HEIC, heic-convert (libheif in wasm) can
    const convert = (await import("heic-convert")).default;
    const buf = await convert({ buffer: f.buffer, format: "JPEG", quality: 0.9 });
    return jpg(f, Buffer.from(buf));
  }
  const sharp = (await import("sharp")).default;
  return jpg(f, await sharp(f.buffer, { limitInputPixels: 2e8 }).rotate().flatten({ background: "#ffffff" }).jpeg({ quality: 88, mozjpeg: true }).toBuffer());
}

// re-sized and re-saved as JPG until it fits: long edge 2400 px at quality 82 down to 900 px at 50
const STEPS: [number, number][] = [
  [2400, 82],
  [2000, 76],
  [1600, 70],
  [1300, 62],
  [1100, 55],
  [900, 50],
];
async function shrinkImage(f: FitFile, limit: number): Promise<FitFile> {
  const sharp = (await import("sharp")).default;
  let best: Buffer | null = null;
  for (const [edge, quality] of STEPS) {
    const buf = await sharp(f.buffer, { limitInputPixels: 2e8 }).rotate().flatten({ background: "#ffffff" }).resize(edge, edge, { fit: "inside", withoutEnlargement: true }).jpeg({ quality, mozjpeg: true }).toBuffer();
    if (!best || buf.length < best.length) best = buf;
    if (buf.length <= limit) break;
  }
  return best && best.length < f.buffer.length ? jpg(f, best) : f;
}

// ghostscript, in its safe mode, with a time limit. returns null when it isn't installed or fails
function gs(args: string[], timeout = 60_000): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("gs", ["-dSAFER", "-dBATCH", "-dNOPAUSE", "-dQUIET", ...args], { timeout, maxBuffer: 1 << 20 }, (err) => resolve(!err));
  });
}

async function inTemp<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), "ivyfit-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// scans and photos inside a PDF re-sampled: 150 dpi ("ebook"), then 100, then 72 ("screen")
async function shrinkPdf(f: FitFile, limit: number): Promise<FitFile> {
  return inTemp(async (dir) => {
    const src = path.join(dir, "in.pdf");
    await writeFile(src, f.buffer);
    let best = f.buffer;
    for (const [preset, dpi] of [
      ["/ebook", 150],
      ["/ebook", 100],
      ["/screen", 72],
    ] as const) {
      const dst = path.join(dir, `out-${dpi}.pdf`);
      const ok = await gs(["-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.5", `-dPDFSETTINGS=${preset}`, "-dDownsampleColorImages=true", "-dDownsampleGrayImages=true", "-dDownsampleMonoImages=true", `-dColorImageResolution=${dpi}`, `-dGrayImageResolution=${dpi}`, `-dMonoImageResolution=${Math.max(dpi * 2, 150)}`, `-sOutputFile=${dst}`, src]);
      if (!ok) break;
      const buf = await readFile(dst).catch(() => null);
      if (buf && buf.length < best.length) best = buf;
      if (best.length <= limit) break;
    }
    return best === f.buffer ? f : { name: f.name, mime: "application/pdf", buffer: best };
  });
}

// a box that only takes a picture: the PDF's first page as a JPG at 150 dpi
async function pdfFirstPage(f: FitFile): Promise<FitFile> {
  return inTemp(async (dir) => {
    const src = path.join(dir, "in.pdf");
    const dst = path.join(dir, "page.jpg");
    await writeFile(src, f.buffer);
    if (!(await gs(["-sDEVICE=jpeg", "-r150", "-dJPEGQ=88", "-dFirstPage=1", "-dLastPage=1", `-sOutputFile=${dst}`, src]))) return f;
    return jpg(f, await readFile(dst));
  });
}
