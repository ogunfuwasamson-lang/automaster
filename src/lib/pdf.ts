// a tiny text-only pdf writer for essay uploads (portals usually want a PDF). pure, no deps.
// helvetica 11pt, letter size, 1in margins, wrapped by measured width.

// helvetica widths (1/1000 em) for ascii 32..126
const W = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];

const MAP: Record<string, string> = { "‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "--", "…": "...", " ": " ", "•": "-", "₦": "NGN ", "€": "EUR ", "£": "GBP " };

export function toAscii(s: string): string {
  return s
    .replace(/[‘’“”–—… •₦€£]/g, (c) => MAP[c])
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e\n]/g, "");
}

function width(s: string, size: number) {
  let w = 0;
  for (const ch of s) w += W[(ch.charCodeAt(0) - 32) | 0] ?? 556;
  return (w * size) / 1000;
}

export function wrap(text: string, maxWidth: number, size: number): string[] {
  const out: string[] = [];
  for (const para of toAscii(text).split("\n")) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (width(next, size) <= maxWidth) line = next;
      else {
        if (line) out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

export function textPdf(title: string, body: string): Buffer {
  const size = 11, lead = 15, left = 72, top = 720, bottom = 72, maxW = 612 - 144;
  const lines = [...(title ? [title.toUpperCase(), ""] : []), ...wrap(body, maxW, size)];
  const perPage = Math.floor((top - bottom) / lead);
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  if (!pages.length) pages.push([""]);

  const objs: string[] = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  const kids: string[] = [];
  pages.forEach((pl, i) => {
    const pageId = 4 + i * 2, contentId = pageId + 1;
    kids.push(`${pageId} 0 R`);
    const stream = `BT /F1 ${size} Tf ${lead} TL ${left} ${top} Td ${pl.map((l) => `(${esc(l)}) Tj T*`).join(" ")} ET`;
    objs[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objs[contentId] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
  });
  objs[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = Buffer.byteLength(out, "latin1");
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
