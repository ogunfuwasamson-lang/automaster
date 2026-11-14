import { SITE } from "@/lib/site";
import { publicProgrammes, todayISO } from "@/lib/programme-data";
import { allPages, monthsAhead, pathOf, rowsFor, statsOf } from "@/lib/programme-pages";

// the programme lists and the deadline months (read from the library, so it grows on its own), listed in robots.txt
export const dynamic = "force-dynamic";

export async function GET() {
  const today = todayISO();
  const all = await publicProgrammes().catch(() => []);
  const urls: [string, string][] = [
    ["/programmes", today],
    ...allPages(all, today).map((p) => [pathOf(p.key), statsOf(rowsFor(p.key, all, today), today).checked ?? today] as [string, string]),
    ...monthsAhead(all, today).map((m) => [`/deadlines/${m.month}`, today] as [string, string]),
  ];
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(([p, d]) => `<url><loc>${esc(SITE.url + p)}</loc><lastmod>${d}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
