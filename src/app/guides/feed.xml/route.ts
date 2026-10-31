import { GUIDES } from "@/content";
import { SITE } from "@/lib/site";

// an RSS feed of the guides, for feed readers and the crawlers that watch them
export const dynamic = "force-static";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function GET() {
  const items = [...GUIDES]
    .sort((a, b) => b.updated.localeCompare(a.updated))
    .map(
      (g) => `<item><title>${esc(g.title)}</title><link>${SITE.url}/guides/${g.slug}</link><guid>${SITE.url}/guides/${g.slug}</guid><pubDate>${new Date(`${g.updated}T09:00:00Z`).toUTCString()}</pubDate><category>${esc(g.category)}</category><description>${esc(`${g.description} ${g.answer}`)}</description></item>`,
    )
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${SITE.name} guides</title><link>${SITE.url}/guides</link><atom:link href="${SITE.url}/guides/feed.xml" rel="self" type="application/rss+xml"/><description>Admissions, fee waivers, scholarships and funding, explained.</description><language>en</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
