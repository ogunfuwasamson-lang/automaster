import "server-only";
import { SITE } from "@/lib/site";

// Ivyward's email look: one white card, a serif headline, short paragraphs, at most a couple of buttons.
// table layout and inline styles, because that is what mail apps render reliably.

const BRAND = "#9b2c4e";
const INK = "#18181b";
const MUTED = "#71717a";
const LINE = "#e4e4e7";

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// **bold** in copy becomes <strong>
export const rich = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, `<strong style="color:${INK};font-weight:600">$1</strong>`);

export type Block =
  | { t: "p"; text: string }
  | { t: "button"; label: string; href: string; secondary?: boolean }
  | { t: "item"; n: number; title: string; text: string; button?: { label: string; href: string } }
  | { t: "stats"; items: { value: string; label: string }[] }
  | { t: "rule" };

const serif = `Georgia,'Times New Roman',serif`;
const sans = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

function button(label: string, href: string, secondary = false) {
  const style = secondary
    ? `display:inline-block;padding:11px 20px;border-radius:10px;border:1px solid ${LINE};color:${INK};text-decoration:none;font:500 14px ${sans}`
    : `display:inline-block;padding:12px 22px;border-radius:10px;background:${BRAND};color:#ffffff;text-decoration:none;font:600 14px ${sans}`;
  return `<a href="${esc(href)}" style="${style}">${esc(label)}</a>`;
}

function block(b: Block): string {
  switch (b.t) {
    case "p":
      return `<p style="margin:0 0 16px;font:400 16px/1.6 ${sans};color:#3f3f46">${rich(b.text)}</p>`;
    case "button":
      return `<p style="margin:8px 0 20px">${button(b.label, b.href, b.secondary)}</p>`;
    case "rule":
      return `<div style="height:1px;background:${LINE};margin:24px 0"></div>`;
    case "item":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;border:1px solid ${LINE};border-radius:14px"><tr>
<td valign="top" style="padding:20px 0 20px 20px;width:28px;font:400 16px ${serif};color:${BRAND}">${b.n}.</td>
<td style="padding:20px 20px 20px 8px"><p style="margin:0 0 6px;font:600 16px/1.4 ${sans};color:${INK}">${esc(b.title)}</p>
<p style="margin:0;font:400 15px/1.6 ${sans};color:#52525b">${rich(b.text)}</p>${b.button ? `<p style="margin:14px 0 0">${button(b.button.label, b.button.href)}</p>` : ""}</td></tr></table>`;
    case "stats":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;border-top:1px solid ${LINE};border-bottom:1px solid ${LINE}"><tr>${b.items
        .map((i, k) => `<td valign="top" style="padding:16px ${k ? "12px" : "0"};${k ? `border-left:1px solid ${LINE};` : ""}"><p style="margin:0;font:400 26px ${serif};color:${INK}">${esc(i.value)}</p><p style="margin:4px 0 0;font:400 12.5px/1.4 ${sans};color:${MUTED}">${esc(i.label)}</p></td>`)
        .join("")}</tr></table>`;
  }
}

export function emailHtml(o: { preheader?: string; kicker?: string; headline: string; blocks: Block[]; footer?: string; manageUrl?: string }): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.headline)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5">
${o.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${LINE};border-radius:18px">
<tr><td style="padding:22px 32px;border-bottom:1px solid ${LINE}">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:34px;height:34px;border-radius:9px;background:${BRAND};text-align:center;font:600 16px ${serif};color:#fbf4ef">I</td>
<td style="padding-left:12px"><p style="margin:0;font:600 15px ${sans};color:${INK}">${SITE.name}</p>${o.kicker ? `<p style="margin:2px 0 0;font:400 13px ${sans};color:${MUTED}">${esc(o.kicker)}</p>` : ""}</td>
</tr></table></td></tr>
<tr><td style="padding:32px 32px 12px">
<h1 style="margin:0 0 22px;font:400 28px/1.25 ${serif};color:${INK}">${esc(o.headline)}</h1>
${o.blocks.map(block).join("\n")}
${o.footer ? `<p style="margin:20px 0 0;font:400 14px ${sans};color:${MUTED}">${rich(o.footer)}</p>` : ""}
</td></tr>
<tr><td style="padding:18px 32px 26px"><p style="margin:0;font:400 12px/1.6 ${sans};color:#a1a1aa">${SITE.name} · ${SITE.tagline} ${o.manageUrl ? `· <a href="${esc(o.manageUrl)}" style="color:#a1a1aa">Email settings</a>` : ""}</p></td></tr>
</table></td></tr></table></body></html>`;
}
