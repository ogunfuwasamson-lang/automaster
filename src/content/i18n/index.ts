import { FR } from "./fr";
import { ES } from "./es";
import { PT } from "./pt";
import { AR } from "./ar";
import { localCountries } from "./countries";
import { L } from "./labels";
import type { Lang, LocalGuide } from "./types";
import { LOCAL_SCHOLARSHIPS, SCHOLARSHIP_PATH } from "./scholarships";

export const LOCAL: Record<Lang, LocalGuide[]> = { fr: FR, es: ES, pt: PT, ar: AR };
export const LANGS: Lang[] = ["fr", "es", "pt", "ar"];
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
  for (const lang of LANGS) {
    const c = localCountries(lang).find((x) => x.en === enSlug);
    if (c) out[lang] = countryUrl(lang, c.slug);
  }
  return out;
}

export function allLocalUrls(): string[] {
  return LANGS.flatMap((lang) => [
    L[lang].home,
    ...LOCAL[lang].map((g) => guideUrl(lang, g.slug)),
    ...localCountries(lang).map((c) => countryUrl(lang, c.slug)),
    ...(LOCAL_SCHOLARSHIPS[lang] ?? []).map((s) => `${SCHOLARSHIP_PATH[lang]}/${s.slug}`),
  ]);
}
