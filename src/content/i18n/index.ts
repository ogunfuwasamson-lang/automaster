import { FR } from "./fr";
import { ES } from "./es";
import { FR_COUNTRIES, ES_COUNTRIES } from "./countries";
import { L } from "./labels";
import type { Lang, LocalGuide } from "./types";

export const LOCAL: Record<Lang, LocalGuide[]> = { fr: FR, es: ES };
export const LANGS: Lang[] = ["fr", "es"];
export const localGuide = (lang: Lang, slug: string) => LOCAL[lang].find((g) => g.slug === slug);
export const guideUrl = (lang: Lang, slug: string) => `${L[lang].guidesPath}/${slug}`;
export const countryUrl = (lang: Lang, slug: string) => `${L[lang].countriesPath}/${slug}`;

// hreflang: the French and Spanish versions of an English guide or country page
export function translationsOfGuide(enSlug: string): Partial<Record<Lang, string>> {
  const out: Partial<Record<Lang, string>> = {};
  for (const lang of LANGS) {
    const g = LOCAL[lang].find((x) => x.en === enSlug);
    if (g) out[lang] = guideUrl(lang, g.slug);
  }
  return out;
}

export function translationsOfCountry(enSlug: string): Partial<Record<Lang, string>> {
  const out: Partial<Record<Lang, string>> = {};
  const fr = FR_COUNTRIES.find((c) => c.en === enSlug);
  const es = ES_COUNTRIES.find((c) => c.en === enSlug);
  if (fr) out.fr = countryUrl("fr", fr.slug);
  if (es) out.es = countryUrl("es", es.slug);
  return out;
}

export function allLocalUrls(): string[] {
  return [
    "/fr",
    "/es",
    ...FR.map((g) => guideUrl("fr", g.slug)),
    ...ES.map((g) => guideUrl("es", g.slug)),
    ...FR_COUNTRIES.map((c) => countryUrl("fr", c.slug)),
    ...ES_COUNTRIES.map((c) => countryUrl("es", c.slug)),
  ];
}
