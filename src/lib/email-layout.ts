import "server-only";
import { SITE } from "@/lib/site";

// Ivyward's email look, the site's "paper" in a mail app: a letter from the applicant's agents, not a marketing
// card. a white page, ink type, a serif headline, hairline rules, black buttons; oxblood only for the mark and links.
// the one bold thing is the journey strip, the dashboard's ten stops in miniature, on the emails about their journey.
// tables and inline styles, because that is what mail apps render reliably; a <style> block adds the phone and dark
// mode adjustments for the apps that read it (Apple Mail, iOS, Outlook.com, Gmail's apps for the phone rules).

const INK = "#09090b";
const BODY = "#3f3f46";
const MUTED = "#6b6b74";
const FAINT = "#a1a1aa";
const LINE = "#e4e4e7";
const WASH = "#f4f4f5";
const BRAND = "#9b2c4e";
const GO = "#047857";
const SIGNAL = "#b93c0a";
const BUTTON = "#18181b";

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// **bold** in copy becomes <strong>; [words](https://...) becomes a link
export const rich = (s: string) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, `<strong class="ink" style="color:${INK};font-weight:600">$1</strong>`)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, `<a href="$2" class="link" style="color:${BRAND};text-decoration:underline">$1</a>`);

export type Tone = "go" | "signal" | "muted" | "plain";
export type Row = { title: string; sub?: string; right?: string; tone?: Tone; href?: string };

export type Block =
  | { t: "p"; text: string }
  | { t: "heading"; text: string } // a section's title
  | { t: "rows"; rows: Row[]; more?: string } // a school, a deadline, a scholarship per line, its status on the right
  | { t: "note"; text: string; tone?: "signal" | "plain"; title?: string } // the one fact to read first
  | { t: "progress"; at: number; of: number; label: string; done?: number } // the journey strip
  | { t: "button"; label: string; href: string; secondary?: boolean }
  | { t: "item"; n: number; title: string; text: string; button?: { label: string; href: string } }
  | { t: "stats"; items: { value: string; label: string }[] }
  | { t: "rule" };

const serif = `Georgia,'Times New Roman',Times,serif`;
const sans = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;
const TONE: Record<Tone, string> = { go: GO, signal: SIGNAL, muted: MUTED, plain: INK };

// a button that holds its shape in Outlook too: the colour sits on the table cell, not only on the link
function button(label: string, href: string, secondary = false) {
  const cell = secondary ? `border:1px solid ${LINE};border-radius:8px` : `background:${BUTTON};border-radius:8px`;
  const link = secondary
    ? `display:inline-block;padding:11px 18px;font:500 15px/1.2 ${sans};color:${INK};text-decoration:none;border-radius:8px`
    : `display:inline-block;padding:12px 20px;font:600 15px/1.2 ${sans};color:#ffffff;text-decoration:none;border-radius:8px`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td class="${secondary ? "btn2" : "btn"}" ${secondary ? "" : `bgcolor="${BUTTON}"`} style="${cell}"><a href="${esc(href)}" class="${secondary ? "btn2-a" : "btn-a"}" style="${link}">${esc(label)}</a></td></tr></table>`;
}

const P = (inner: string, extra = "") => `<p class="body" style="margin:0 0 16px;font:400 16px/1.6 ${sans};color:${BODY};${extra}">${inner}</p>`;

function rowsHtml(rows: Row[], more?: string) {
  const line = (r: Row, i: number) => {
    const top = i ? `border-top:1px solid ${LINE};` : "";
    const title = r.href ? `<a href="${esc(r.href)}" class="ink" style="color:${INK};text-decoration:none">${esc(r.title)}</a>` : esc(r.title);
    const name = r.sub || r.right || r.href;
    const left = `<td valign="top" class="line" style="${top}padding:12px 0"><p class="${name ? "ink" : "body"}" style="margin:0;font:${name ? 600 : 400} 15px/1.5 ${sans};color:${name ? INK : BODY}">${title}</p>${r.sub ? `<p class="muted" style="margin:2px 0 0;font:400 14px/1.5 ${sans};color:${MUTED}">${rich(r.sub)}</p>` : ""}</td>`;
    const right = r.right ? `<td align="right" valign="top" class="line r" style="${top}padding:12px 0 12px 12px;white-space:nowrap;font:500 13px/1.6 ${sans};color:${TONE[r.tone ?? "muted"]}">${esc(r.right)}</td>` : "";
    return `<tr>${left}${right}</tr>`;
  };
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="box" style="margin:0 0 20px;border-top:1px solid ${LINE};border-bottom:1px solid ${LINE}">${rows.map(line).join("")}</table>${more ? `<p class="muted" style="margin:-8px 0 20px;font:400 13px/1.5 ${sans};color:${MUTED}">${rich(more)}</p>` : ""}`;
}

// ten short segments, the stops behind them in ink, the current one in oxblood
function progressHtml(b: Extract<Block, { t: "progress" }>) {
  const done = b.done ?? b.at - 1;
  const cells = Array.from({ length: b.of }, (_, i) => {
    const colour = i < done ? INK : i === b.at - 1 ? BRAND : LINE;
    const cls = i < done ? "seg-done" : i === b.at - 1 ? "seg-now" : "seg";
    return `<td class="${cls}" height="4" bgcolor="${colour}" style="height:4px;background:${colour};border-radius:2px;font-size:0;line-height:0">&nbsp;</td>${i < b.of - 1 ? `<td width="4" style="width:4px;font-size:0;line-height:0">&nbsp;</td>` : ""}`;
  }).join("");
  // fixed layout: the gaps keep their 4px and the stops share the rest equally
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;table-layout:fixed"><tr>${cells}</tr></table><p class="muted" style="margin:0 0 24px;font:400 13px/1.5 ${sans};color:${MUTED}">Stop ${b.at} of ${b.of}: <strong class="ink" style="color:${INK};font-weight:600">${esc(b.label)}</strong></p>`;
}

function statsHtml(items: { value: string; label: string }[]) {
  // two to a row, so four figures still read on a phone
  const pairs: { value: string; label: string }[][] = [];
  for (let i = 0; i < items.length; i += 2) pairs.push(items.slice(i, i + 2));
  const cell = (s: { value: string; label: string } | undefined, left: boolean, top: boolean) =>
    `<td width="50%" valign="top" class="line" style="${top ? `border-top:1px solid ${LINE};` : ""}${left ? "" : `border-left:1px solid ${LINE};`}padding:14px 0 14px ${left ? "0" : "16px"}">${s ? `<p class="ink" style="margin:0;font:400 28px/1.1 ${serif};color:${INK}">${esc(s.value)}</p><p class="muted" style="margin:6px 0 0;font:400 13px/1.4 ${sans};color:${MUTED}">${esc(s.label)}</p>` : "&nbsp;"}</td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="box" style="margin:4px 0 20px;border-top:1px solid ${LINE};border-bottom:1px solid ${LINE}">${pairs.map((p, k) => `<tr>${cell(p[0], true, k > 0)}${cell(p[1], false, k > 0)}</tr>`).join("")}</table>`;
}

function block(b: Block): string {
  switch (b.t) {
    case "p":
      return P(rich(b.text));
    case "heading":
      return `<p class="ink" style="margin:28px 0 10px;font:600 13px/1.4 ${sans};color:${INK};letter-spacing:0.01em">${esc(b.text)}</p>`;
    case "rows":
      return b.rows.length ? rowsHtml(b.rows, b.more) : "";
    case "note": {
      const edge = b.tone === "signal" ? SIGNAL : INK;
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px"><tr><td class="wash${b.tone === "signal" ? "" : " edge"}" bgcolor="${WASH}" style="background:${WASH};border-left:3px solid ${edge};padding:14px 16px">${b.title ? `<p class="ink" style="margin:0 0 4px;font:600 15px/1.45 ${sans};color:${INK}">${esc(b.title)}</p>` : ""}<p class="body" style="margin:0;font:400 15px/1.55 ${sans};color:${BODY}">${rich(b.text)}</p></td></tr></table>`;
    }
    case "progress":
      return progressHtml(b);
    case "button":
      return `<div style="margin:8px 0 24px">${button(b.label, b.href, b.secondary)}</div>`;
    case "rule":
      return `<div class="rule" style="height:1px;line-height:1px;font-size:0;background:${LINE};margin:28px 0">&nbsp;</div>`;
    case "item":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px"><tr>
<td valign="top" width="28" style="width:28px;padding:2px 0 18px;font:400 20px/1.2 ${serif};color:${BRAND}" class="link">${b.n}</td>
<td valign="top" style="padding:0 0 18px"><p class="ink" style="margin:0 0 4px;font:600 16px/1.45 ${sans};color:${INK}">${esc(b.title)}</p><p class="body" style="margin:0;font:400 15px/1.6 ${sans};color:${BODY}">${rich(b.text)}</p>${b.button ? `<p style="margin:8px 0 0;font:600 15px/1.5 ${sans}"><a href="${esc(b.button.href)}" class="link" style="color:${BRAND};text-decoration:underline">${esc(b.button.label)}</a></p>` : ""}</td></tr></table>`;
    case "stats":
      return statsHtml(b.items);
  }
}

const STYLE = `
:root{color-scheme:light dark;supported-color-schemes:light dark}
body{margin:0;padding:0;-webkit-text-size-adjust:100%}
a{color:${BRAND}}
@media (max-width:620px){
  .pad{padding-left:20px!important;padding-right:20px!important}
  .h1{font-size:25px!important}
  .label{display:none!important}
}
@media (prefers-color-scheme:dark){
  body,.page{background:#0b0b0c!important}
  .ink,.h1{color:#f4f4f5!important}
  .body{color:#d4d4d8!important}
  .muted,.r{color:#a1a1aa!important}
  .line,.box{border-color:#27272a!important}
  .rule,.seg{background:#27272a!important}
  .seg-done{background:#f4f4f5!important}
  .seg-now{background:#f0a3bd!important}
  .wash{background:#18181b!important}
  .edge{border-left-color:#f4f4f5!important}
  .btn{background:#f4f4f5!important}
  .btn-a{color:#09090b!important}
  .btn2{border-color:#3f3f46!important}
  .btn2-a{color:#f4f4f5!important}
  .link{color:#f0a3bd!important}
}`;

export function emailHtml(o: { preheader?: string; kicker?: string; headline: string; blocks: Block[]; footer?: string; manageUrl?: string; unsubscribeUrl?: string }): string {
  const links = [o.manageUrl ? `<a href="${esc(o.manageUrl)}" class="muted" style="color:${MUTED};text-decoration:underline">Email settings</a>` : "", o.unsubscribeUrl ? `<a href="${esc(o.unsubscribeUrl)}" class="muted" style="color:${MUTED};text-decoration:underline">Stop these emails</a>` : ""].filter(Boolean);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(o.headline)}</title><style>${STYLE}</style></head>
<body class="page" style="margin:0;padding:0;background:#ffffff">
${o.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${esc(o.preheader.replace(/\*\*/g, ""))}${"&#8204;&nbsp;".repeat(40)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="page" bgcolor="#ffffff" style="background:#ffffff"><tr><td align="center" style="padding:0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
<tr><td class="pad" style="padding:32px 32px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" width="36" style="width:36px"><a href="${SITE.url}" style="text-decoration:none"><img src="${SITE.url}/email/mark.png" width="28" height="28" alt="" style="display:block;width:28px;height:28px;border:0;border-radius:6px"></a></td>
<td valign="middle"><a href="${SITE.url}" class="ink" style="font:600 16px/1 ${sans};color:${INK};text-decoration:none;letter-spacing:-0.01em">${SITE.name}</a></td>
${o.kicker ? `<td valign="middle" align="right" class="label muted" style="font:400 13px/1.3 ${sans};color:${MUTED}">${esc(o.kicker)}</td>` : ""}
</tr></table>
<div class="rule" style="height:1px;line-height:1px;font-size:0;background:${LINE};margin:20px 0 32px">&nbsp;</div>
<h1 class="h1 ink" style="margin:0 0 20px;font:400 28px/1.25 ${serif};color:${INK};letter-spacing:-0.01em">${rich(o.headline)}</h1>
${o.blocks.map(block).join("\n")}
${o.footer ? `<p class="muted" style="margin:8px 0 0;font:400 15px/1.6 ${sans};color:${MUTED}">${rich(o.footer)}</p>` : ""}
<div class="rule" style="height:1px;line-height:1px;font-size:0;background:${LINE};margin:36px 0 18px">&nbsp;</div>
<p class="muted" style="margin:0 0 6px;font:400 12.5px/1.6 ${sans};color:${FAINT}">${SITE.name} runs university applications with AI agents, from your first application to your first day in school.</p>
${links.length ? `<p class="muted" style="margin:0 0 40px;font:400 12.5px/1.6 ${sans};color:${FAINT}">${links.join(`<span style="color:${LINE}">&nbsp;&nbsp;|&nbsp;&nbsp;</span>`)}</p>` : `<div style="height:34px"></div>`}
</td></tr></table></td></tr></table></body></html>`;
}
