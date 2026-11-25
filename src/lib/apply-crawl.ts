// finding the online application by walking the school's own pages, the way a person would: open the program page,
// follow "apply online" / "how to apply" / "application portal", and stop at the application site. plain http, no
// browser and no model, so it's cheap enough to try before (and after) a web search.
import { looksLikePortal, normalizeUrl } from "@/lib/portal-url";
import { safeFetch } from "@/lib/net-guard";
import { ACCEPT, portalVerdict, wrongAudience, type Level, type Verdict } from "@/lib/portal-check";

const STRONG = /\b(apply (now|online|here|today|directly)|start (your |an |my |a new )?application|begin (your |an )?application|online application|application (portal|form|system)|apply (via|through|using)|submit (an |your )?application|create (an )?account|apply for (this|the) (course|program(me)?))\b/i;
const MEDIUM = /\b(how to apply|apply|applying|application process|admissions?|entry requirements)\b/i;
const NOISE = /\b(news|events?|blog|podcast|webinars?|open days?|visit|tour|chat|faq|brochure|prospectus|fees?|accommodation|housing|jobs?|careers?|staff|alumni|donate|giving|privacy|cookies?|accessibility|sitemap|login to (moodle|canvas|blackboard))\b/i;
const SKIP_FILE = /\.(pdf|docx?|xlsx?|pptx?|zip|jpe?g|png|gif|svg|mp4|ics)(\?|#|$)/i;

export interface ApplyLink {
  url: string;
  text: string;
  score: number;
  portal: boolean;
}

const strip = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&gt;|&raquo;|&#187;|›|»/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// every link on a page with how much it looks like the way into an application
export function scoreLinks(html: string, base: string): ApplyLink[] {
  const out: ApplyLink[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = m[1].match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    let url: string;
    try {
      url = new URL(href.replace(/&amp;/g, "&"), base).toString().replace(/#.*$/, "");
    } catch {
      continue;
    }
    if (!/^https?:/i.test(url) || SKIP_FILE.test(url) || seen.has(url)) continue;
    const aria = m[1].match(/(?:aria-label|title)\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    const text = strip(`${m[2]} ${aria}`).slice(0, 120);
    if (!text) continue;
    const portal = looksLikePortal(url);
    let score = STRONG.test(text) ? 10 : MEDIUM.test(text) ? 4 : 0;
    if (portal) score += 6;
    if (/\/(apply|application|admissions?|how-to-apply)(\/|$|\?)/i.test(new URL(url).pathname)) score += 2;
    if (NOISE.test(text)) score -= 8;
    if (score <= 0) continue;
    seen.add(url);
    out.push({ url, text, score, portal });
  }
  return out.sort((a, b) => b.score - a.score);
}

// the page's html (null when it can't be read) and the status it came with (null when there was no answer)
export async function fetchPageWithStatus(url: string): Promise<{ html: string | null; status: number | null }> {
  try {
    // links come from school websites: never let one point the server at its own network
    const res = await safeFetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", accept: "text/html" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res) return { html: null, status: null };
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return { html: null, status: res.status };
    return { html: (await res.text()).slice(0, 600_000), status: res.status };
  } catch {
    return { html: null, status: null };
  }
}

export async function fetchPage(url: string): Promise<string | null> {
  return (await fetchPageWithStatus(url)).html;
}

// a link that isn't there: the server says so (404, 410), not a bot wall or a timeout
export const gone = (status: number | null) => status === 404 || status === 410;

// is this the start of an application? the page itself is read (lib/portal-check); a page that can't be fetched
// counts only on an application system's own address, and never when the server says it doesn't exist
export async function checkPortal(url: string): Promise<{ ok: boolean; verdict: Verdict; platform: string | null }> {
  const { html, status } = await fetchPageWithStatus(url);
  if (gone(status)) return { ok: false, verdict: "missing", platform: null };
  const v = portalVerdict(url, html);
  return { ok: ACCEPT.has(v.verdict) || (v.verdict === "unknown" && looksLikePortal(url) && !/^www\./i.test(new URL(url).hostname)), verdict: v.verdict, platform: v.platform };
}

// breadth-first from the start pages, at most `budget` fetches. returns the application site if one turned up, else
// the most promising "how to apply" page (still a better place for the browser to start than the brochure page).
// with a level, links meant for another kind of applicant (another degree, exchange students, a home diploma) are
// passed over; a link that looks like a portal is opened and read before it's believed
export async function crawlForApply(starts: string[], budget = 10, level?: Level): Promise<{ portal: string | null; best: ApplyLink | null; visited: number; verdict?: Verdict; platform?: string | null }> {
  const queue = starts.map((u) => normalizeUrl(u)).filter((u): u is string => !!u).map((url) => ({ url, depth: 0 }));
  const seen = new Set<string>();
  let best: ApplyLink | null = null;
  let fetched = 0;
  const forSomeoneElse = (l: ApplyLink) => !!level && wrongAudience(`${l.text} ${new URL(l.url).pathname}`, level);
  while (queue.length && fetched < budget) {
    const { url, depth } = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    const html = await fetchPage(url);
    fetched++;
    if (!html) continue;
    // the page itself may be the portal (a start link that was one already)
    if (level && depth === 0 && looksLikePortal(url)) {
      const v = portalVerdict(url, html);
      if (ACCEPT.has(v.verdict)) return { portal: url, best: null, visited: fetched, verdict: v.verdict, platform: v.platform };
    }
    const links = scoreLinks(html, url).filter((l) => !forSomeoneElse(l));
    for (const portal of links.filter((l) => l.portal && l.score >= 10).slice(0, 3)) {
      if (!level) return { portal: portal.url, best: portal, visited: fetched };
      if (seen.has(portal.url)) continue;
      seen.add(portal.url);
      fetched++;
      const c = await checkPortal(portal.url);
      if (c.ok) return { portal: portal.url, best: portal, visited: fetched, verdict: c.verdict, platform: c.platform };
      // a "portal" that is really another information page: read on from it
      if (c.verdict === "info" && depth < 2) queue.push({ url: portal.url, depth: depth + 1 });
    }
    for (const l of links.slice(0, 6)) {
      if (!best || l.score > best.score) best = l;
      if (depth < 2 && l.score >= 4 && !seen.has(l.url)) queue.push({ url: l.url, depth: depth + 1 });
    }
    queue.sort((a, b) => a.depth - b.depth);
  }
  return { portal: null, best, visited: fetched };
}
