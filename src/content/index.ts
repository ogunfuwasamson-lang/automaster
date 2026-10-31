import type { Guide, GuideCategory, Scholarship } from "./types";
import { GUIDES } from "./guides";
import { SCHOLARSHIPS } from "./scholarships";

export { GUIDES, SCHOLARSHIPS };

export const CATEGORIES: { name: GuideCategory; blurb: string }[] = [
  { name: "Funding", blurb: "Fee waivers, scholarships, assistantships and getting more aid after an offer." },
  { name: "Applying", blurb: "Shortlists, timelines, statements of purpose, recommendations and emails to professors." },
  { name: "Countries", blurb: "How applying works in the US, UK, Canada, Germany and elsewhere." },
  { name: "Visas", blurb: "Student visas, proof of funds and the rules that changed this year." },
  { name: "AI and tools", blurb: "Using AI on applications honestly, and how Ivyward compares with the alternatives." },
];

export const guide = (slug: string) => GUIDES.find((g) => g.slug === slug);
export const scholarship = (slug: string) => SCHOLARSHIPS.find((s) => s.slug === slug);

// "scholarships/chevening" or a guide slug → a card for the "Read next" list
export function relatedCards(refs: string[] = [], self?: string) {
  const out: { href: string; title: string; kind: string }[] = [];
  for (const r of refs) {
    if (r.startsWith("scholarships/")) {
      const s = scholarship(r.slice(13));
      if (s) out.push({ href: `/scholarships/${s.slug}`, title: s.name, kind: `Scholarship, ${s.country}` });
    } else {
      const g = guide(r);
      if (g && g.slug !== self) out.push({ href: `/guides/${g.slug}`, title: g.title, kind: g.category });
    }
  }
  return out;
}

export function guidesIn(cat: GuideCategory): Guide[] {
  return GUIDES.filter((g) => g.category === cat);
}

export function scholarshipsFor(pred: (s: Scholarship) => boolean) {
  return SCHOLARSHIPS.filter(pred);
}

export function scholarshipCountries() {
  return [...new Set(SCHOLARSHIPS.map((s) => s.country))].sort();
}
