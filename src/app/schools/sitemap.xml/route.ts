import { SITE } from "@/lib/site";
import { COUNTRY_SLUG, directory, regions, schoolPath, worthIndexing } from "@/lib/directory";

// the school directory's own sitemap (thousands of pages, read from the database), listed in robots.txt
export const dynamic = "force-dynamic";

export async function GET() {
  const all = await directory();
  const [us, uk] = await Promise.all([regions("US"), regions("GB")]);
  const urls: [string, string][] = [
    ["/schools", ""],
    ["/schools/us", ""],
    ["/schools/uk", ""],
    ...us.map((r) => [`/schools/${COUNTRY_SLUG.US}/${r.slug}`, ""] as [string, string]),
    ...uk.map((r) => [`/schools/${COUNTRY_SLUG.GB}/${r.slug}`, ""] as [string, string]),
    ...all.filter(worthIndexing).map((s) => [schoolPath(s), s.checked] as [string, string]),
  ];
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(([p, d]) => `<url><loc>${esc(SITE.url + p)}</loc>${d ? `<lastmod>${d}</lastmod>` : ""}</url>`)
    .join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
