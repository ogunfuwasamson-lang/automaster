import { SCHOLARSHIPS_FR } from "./scholarships-fr";
import { SCHOLARSHIPS_ES } from "./scholarships-es";
import type { LocalScholarship } from "./scholarship-types";
import type { Lang } from "./types";

export const LOCAL_SCHOLARSHIPS: Partial<Record<Lang, LocalScholarship[]>> = { fr: SCHOLARSHIPS_FR, es: SCHOLARSHIPS_ES };
export const SCHOLARSHIP_PATH: Partial<Record<Lang, string>> = { fr: "/fr/bourses", es: "/es/becas" };

export const localScholarship = (lang: Lang, slug: string) => LOCAL_SCHOLARSHIPS[lang]?.find((s) => s.slug === slug);

// where a scholarship profile lives in this language: the translated profile if there is one, else the English one
export function scholarshipHref(lang: Lang, slug: string) {
  return localScholarship(lang, slug) ? `${SCHOLARSHIP_PATH[lang]}/${slug}` : `/scholarships/${slug}`;
}

// rewrite /scholarships/<slug> links in markdown to the translated profiles
export function localizeLinks(lang: Lang, md: string) {
  return md.replace(/\]\(\/scholarships\/([a-z0-9-]+)\)/g, (_m, slug: string) => `](${scholarshipHref(lang, slug)})`);
}

export function translationsOfScholarship(slug: string): Partial<Record<Lang, string>> {
  const out: Partial<Record<Lang, string>> = {};
  for (const lang of Object.keys(LOCAL_SCHOLARSHIPS) as Lang[]) if (localScholarship(lang, slug)) out[lang] = `${SCHOLARSHIP_PATH[lang]}/${slug}`;
  return out;
}
