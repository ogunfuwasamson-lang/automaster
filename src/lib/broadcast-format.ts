// the operator's emails to many applicants at once (product news, a heads-up): written as plain text with a few
// marks, turned into the email look's blocks. pure, so the composer's preview, the send and the tests agree.
//
//   a blank line starts a new paragraph          **bold**            [words](https://link)
//   ### Title, then its lines: a numbered card    [[Button label]](https://link) on its own line: a button
//   --- on its own line: a divider              {first_name}: the reader's first name ("there" when unknown)
import type { Block } from "@/lib/email-layout";

export type Broadcast = { subject: string; preheader?: string; headline: string; body: string };

export const personalise = (s: string, first: string | null) => s.replace(/\{first_name\}/g, first?.trim() || "there");

const BUTTON = /^\[\[(.+?)\]\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)$/;

// absolute links only in an email: a path like /dashboard becomes the site's
const abs = (href: string, base: string) => (href.startsWith("/") ? `${base}${href}` : href);

// inline links to a page of the site become absolute
const absLinks = (s: string, base: string) => s.replace(/\]\((\/[^\s)]*)\)/g, (_, h) => `](${base}${h})`);

export function toBlocks(body: string, base: string): Block[] {
  const out: Block[] = [];
  let n = 0;
  for (const chunk of body.replace(/\r/g, "").split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim());
    if (!lines.length) continue;
    const first = lines[0].trim();
    if (first === "---" && lines.length === 1) {
      out.push({ t: "rule" });
      continue;
    }
    const b = first.match(BUTTON);
    if (b && lines.length === 1) {
      out.push({ t: "button", label: b[1], href: abs(b[2], base) });
      continue;
    }
    if (first.startsWith("### ")) {
      const rest = lines.slice(1);
      const btn = rest.length && rest[rest.length - 1].trim().match(BUTTON);
      const text = absLinks((btn ? rest.slice(0, -1) : rest).join(" ").trim(), base);
      out.push({ t: "item", n: ++n, title: first.slice(4).trim(), text, ...(btn ? { button: { label: btn[1], href: abs(btn[2], base) } } : {}) });
      continue;
    }
    out.push({ t: "p", text: absLinks(lines.join(" ").trim(), base) });
  }
  return out;
}

// the plain-text part: the same words, links written out
export function toText(b: Broadcast, first: string | null, base: string, unsubscribe: string): string {
  const body = personalise(b.body, first)
    .replace(/^\[\[(.+?)\]\]\((\S+?)\)$/gm, (_, l, h) => `${l}: ${abs(h, base)}`)
    .replace(/\[([^\]]+)\]\((\S+?)\)/g, (_, l, h) => `${l} (${abs(h, base)})`)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^### /gm, "")
    .replace(/^---$/gm, "");
  return `${personalise(b.headline, first)}\n\n${body.trim()}\n\n--\nIvyward · ${base}\nDon't want these emails? ${unsubscribe}`;
}

export function problems(b: Broadcast): string[] {
  const out: string[] = [];
  if (!b.subject.trim()) out.push("Add a subject.");
  if (!b.headline.trim()) out.push("Add a headline.");
  if (!b.body.trim()) out.push("Write the message.");
  if (b.subject.length > 140) out.push("Keep the subject under 140 characters.");
  const unclosed = (b.body.match(/\[\[/g)?.length ?? 0) !== (b.body.match(/\]\]\(/g)?.length ?? 0);
  if (unclosed) out.push("A button is missing its link: write [[Label]](https://...) on its own line.");
  return out;
}
