import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { GUIDES, SCHOLARSHIPS } from "@/content";
import { UNIVERSITIES } from "@/content/universities";
import { ORIGINS } from "@/content/countries";

// the public pages. everything behind sign-in stays out (see robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const latest = [...GUIDES.map((g) => g.updated), ...SCHOLARSHIPS.map((s) => s.updated)].sort().pop();
  const libDate = latest ? new Date(`${latest}T12:00:00Z`) : now;
  return [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE.url}/guides`, lastModified: libDate, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE.url}/scholarships`, lastModified: libDate, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE.url}/universities`, lastModified: libDate, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE.url}/alerts`, lastModified: libDate, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.url}/ambassadors`, lastModified: libDate, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.url}/glossary`, lastModified: libDate, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.url}/tools/scholarship-finder`, lastModified: libDate, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/study-abroad`, lastModified: new Date("2026-11-01T12:00:00Z"), changeFrequency: "weekly", priority: 0.85 },
    ...ORIGINS.map((o) => ({ url: `${SITE.url}/study-abroad/${o.slug}`, lastModified: new Date("2026-11-01T12:00:00Z"), changeFrequency: "monthly" as const, priority: 0.75 })),
    ...UNIVERSITIES.map((u) => ({ url: `${SITE.url}/universities/${u.slug}`, lastModified: new Date(`${u.updated}T12:00:00Z`), changeFrequency: "monthly" as const, priority: 0.7 })),
    ...GUIDES.map((g) => ({ url: `${SITE.url}/guides/${g.slug}`, lastModified: new Date(`${g.updated}T12:00:00Z`), changeFrequency: "monthly" as const, priority: 0.8 })),
    ...SCHOLARSHIPS.map((s) => ({ url: `${SITE.url}/scholarships/${s.slug}`, lastModified: new Date(`${s.updated}T12:00:00Z`), changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${SITE.url}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE.url}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
