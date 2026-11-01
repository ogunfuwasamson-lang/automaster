export type Lang = "fr" | "es";

// a guide written natively in French or Spanish. `en` is the English guide it corresponds to (for hreflang), if any.
export type LocalGuide = {
  lang: Lang;
  slug: string;
  en?: string;
  title: string;
  seoTitle?: string;
  description: string;
  updated: string;
  keywords: string[];
  answer: string;
  body: string; // markdown; links to /fr/... or /es/... pages where they exist, English pages otherwise
  faq: [string, string][];
  sources: [string, string][];
  related?: string[]; // local guide slugs
};
