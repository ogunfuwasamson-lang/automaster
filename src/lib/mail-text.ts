// turn an email into readable plain text: prefer the text part, else strip the html properly (styles and
// scripts gone, block tags to line breaks, entities decoded), then drop quoted history and collapse blank lines.
const ENT: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…" };

export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head|title)[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
      const t = label.replace(/<[^>]+>/g, "").trim();
      return t && !href.startsWith("mailto:") && t !== href ? `${t} (${href})` : t || href;
    })
    .replace(/<[^>]+>/g, "")
    .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e: string) =>
      e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e.toLowerCase()] ?? m,
    );
}

export function mailText(m: { text: string; html: string }): string {
  const raw = m.text?.trim() ? m.text : htmlToText(m.html ?? "");
  const lines = raw.replace(/\r/g, "").split("\n");
  // stop at the quoted earlier message ("On Tue, ... wrote:" / "-----Original Message-----" / "> " blocks)
  const cut = lines.findIndex((l, i) => /^on .{6,80} wrote:\s*$/i.test(l.trim()) || /^-{2,}\s*original message/i.test(l.trim()) || (/^>/.test(l) && /^>/.test(lines[i + 1] ?? "")));
  const kept = (cut > 3 ? lines.slice(0, cut) : lines).map((l) => l.replace(/[ \t]+/g, " ").trimEnd());
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 20000);
}

export function parseFrom(from: string): { name: string | null; email: string } {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);
  if (m) return { name: m[1].trim() || null, email: m[2].trim().toLowerCase() };
  return { name: null, email: from.trim().toLowerCase() };
}

export const baseSubject = (s: string) => s.replace(/^\s*((re|fwd?|aw|tr)\s*:\s*)+/i, "").trim().toLowerCase();
