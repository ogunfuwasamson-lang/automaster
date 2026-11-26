// the meta description search engines show: Bing flags any outside 25 to 160 characters (Bing Webmaster Tools,
// 26 nov 2026). the page itself keeps the full text; only the <meta> gets the short form: whole sentences that fit,
// else cut at a clause or word, with an ellipsis. pure, so it's tested.
export const META_MAX = 160;

export function metaDescription(s: string, max = META_MAX): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  let out = "";
  for (const p of t.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? []) {
    if ((out + p).trim().length > max) break;
    out += p;
  }
  if (out.trim().length >= 70) return out.trim();
  const cut = t.slice(0, max - 1);
  const at = Math.max(cut.lastIndexOf(", "), cut.lastIndexOf(": "), cut.lastIndexOf("; "), cut.lastIndexOf(" ("));
  const base = at >= 90 ? cut.slice(0, at) : cut.slice(0, cut.lastIndexOf(" "));
  return `${base.replace(/[\s,;:(–-]+$/, "")}…`;
}
