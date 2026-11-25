// what an application form's upload box will take: its size limit, and whether it wants a picture rather than a
// document. pure (no node imports): the engine that reads these also runs inside the chrome extension.

// the box or the page says how big a file may be ("Max file size: 2MB", "must not exceed 500 KB", "(5 MB maximum)")
const BEFORE = /\b(?:max(?:imum)?\.?(?:\s+(?:allowed|permitted|upload|file))*(?:\s+size)?|(?:allowed|permitted) (?:file )?size|up to|not (?:to )?exceed(?:ing)?|no (?:larger|bigger|more) than|(?:less|smaller) than|under|size limit(?: is| of)?|limit(?:ed)? to|file size(?: limit)?(?: is)?)\s*:?\s*(?:of\s+)?(\d+(?:[.,]\d+)?)\s*(kb|mb|gb|kilobytes?|megabytes?|ko|mo)\b/gi;
const AFTER = /\b(\d+(?:[.,]\d+)?)\s*(kb|mb|gb|kilobytes?|megabytes?|ko|mo)\s*(?:max(?:imum)?\b|limit\b|or (?:less|smaller)\b|per file\b)/gi;

const bytes = (n: string, unit: string) => {
  const v = Number(n.replace(",", "."));
  const u = unit.toLowerCase();
  // the decimal reading is the smaller one, so a file under it fits either way
  const mult = u.startsWith("g") ? 1e9 : u.startsWith("m") ? 1e6 : 1e3;
  return Math.round(v * mult);
};

// the smallest limit the text states, in bytes, or null. limits under 20 KB or over 200 MB are something else
// (a photo's pixel size, a programme's word count) and are ignored
export function sizeLimit(text: string | null | undefined): number | null {
  if (!text) return null;
  let best: number | null = null;
  for (const re of [BEFORE, AFTER]) {
    for (const m of text.matchAll(re)) {
      const b = bytes(m[1], m[2]);
      if (b < 20_000 || b > 200_000_000) continue;
      if (best == null || b < best) best = b;
    }
  }
  return best;
}

// the form refused a file for its size
export const TOO_LARGE = /\b(too (large|big)|exceeds? (the )?(max(imum)?|allowed|permitted|size)|(file )?size (is )?(too|exceeds|larger|greater)|larger than (the )?(max(imum)?|allowed|limit)|maximum (upload |file )?size (is |of )?(exceeded|\d)|fichier (est )?trop (volumineux|lourd)|datei (ist )?zu gro(ß|ss))/i;

// after a refusal that didn't say how big: aim under the most common limit first (2 MB), then half of what was tried
export function nextLimit(current: number | null | undefined, said: string | null | undefined): number {
  const stated = sizeLimit(said);
  if (stated) return stated;
  if (!current) return 1_900_000;
  return Math.max(250_000, Math.round(current / 2));
}

// the box takes pictures only (a passport photo, a scan as JPG): its accept list names image types and no documents
export function imageOnly(accept: string | null | undefined): boolean {
  const a = (accept ?? "").toLowerCase();
  if (!a.trim()) return false;
  if (/pdf|doc|word|officedocument|text\/|\*\/\*|^\s*\*\s*$/.test(a)) return false;
  return /image\/|\.(jpe?g|png|gif|bmp|webp|tiff?|heic)\b/.test(a);
}
