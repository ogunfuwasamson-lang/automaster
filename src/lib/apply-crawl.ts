// finding the online application by walking the school's own pages, the way a person would: open the program page,
// follow "apply online" / "how to apply" / "application portal", and stop at the application site. plain http, no
// browser and no model, so it's cheap enough to try before (and after) a web search.
import { looksLikePortal, normalizeUrl } from "@/lib/portal-url";

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

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return null;
    return (await res.text()).slice(0, 600_000);
  } catch {
    return null;
  }
}

// breadth-first from the start pages, at most `budget` fetches. returns the application site if one turned up, else
// the most promising "how to apply" page (still a better place for the browser to start than the brochure page).
export async function crawlForApply(starts: string[], budget = 10): Promise<{ portal: string | null; best: ApplyLink | null; visited: number }> {
  const queue = starts.map((u) => normalizeUrl(u)).filter((u): u is string => !!u).map((url) => ({ url, depth: 0 }));
  const seen = new Set<string>();
  let best: ApplyLink | null = null;
  let fetched = 0;
  while (queue.length && fetched < budget) {
    const { url, depth } = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    const html = await fetchPage(url);
    fetched++;
    if (!html) continue;
    const links = scoreLinks(html, url);
    const portal = links.find((l) => l.portal && l.score >= 10);
    if (portal) return { portal: portal.url, best: portal, visited: fetched };
    for (const l of links.slice(0, 6)) {
      if (!best || l.score > best.score) best = l;
      if (depth < 2 && l.score >= 4 && !seen.has(l.url)) queue.push({ url: l.url, depth: depth + 1 });
    }
    queue.sort((a, b) => a.depth - b.depth);
  }
  return { portal: null, best, visited: fetched };
}
