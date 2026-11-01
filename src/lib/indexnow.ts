import { GUIDES, SCHOLARSHIPS } from "@/content";
import { SITE } from "@/lib/site";
import { UNIVERSITIES } from "@/content/universities";
import { ORIGINS } from "@/content/countries";
import { allLocalUrls } from "@/content/i18n";

// IndexNow tells Bing (which feeds Copilot and ChatGPT search), Yandex, Seznam and Naver the moment a page is
// new or changed, instead of waiting for a crawl. the key is public by design: it's served at /<key>.txt.
export const INDEXNOW_KEY = "001a4b28caf4a499498bf53b8c331098";

export function publicUrls(sinceIso?: string) {
  const lib = [
    ...GUIDES.map((g) => ({ path: `/guides/${g.slug}`, updated: g.updated })),
    ...SCHOLARSHIPS.map((s) => ({ path: `/scholarships/${s.slug}`, updated: s.updated })),
    ...UNIVERSITIES.map((u) => ({ path: `/universities/${u.slug}`, updated: u.updated })),
    ...ORIGINS.map((o) => ({ path: `/study-abroad/${o.slug}`, updated: "2026-11-01" })),
    ...allLocalUrls().map((path) => ({ path, updated: "2026-11-01" })),
  ];
  const fresh = sinceIso ? lib.filter((p) => p.updated >= sinceIso) : lib;
  const hubs = !sinceIso || fresh.length ? ["/", "/guides", "/scholarships", "/about", "/pricing", "/universities", "/study-abroad", "/glossary", "/tools/scholarship-finder", "/llms.txt", "/llms-full.txt"] : [];
  return [...hubs, ...fresh.map((p) => p.path)].map((p) => `${SITE.url}${p}`);
}

export async function submitIndexNow(urls: string[]) {
  if (!urls.length) return { ok: true, status: 0, count: 0 };
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(SITE.url).host, key: INDEXNOW_KEY, keyLocation: `${SITE.url}/${INDEXNOW_KEY}.txt`, urlList: urls.slice(0, 10000) }),
    signal: AbortSignal.timeout(10000),
  });
  return { ok: res.ok, status: res.status, count: urls.length };
}
