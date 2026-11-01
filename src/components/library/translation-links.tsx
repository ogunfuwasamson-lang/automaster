import Link from "next/link";

// "Lire en français / Leer en español" under an English page that has translations
export function TranslationLinks({ links }: { links: Partial<Record<"fr" | "es", string>> }) {
  const items = [
    links.fr && { href: links.fr, label: "Lire en français", lang: "fr" },
    links.es && { href: links.es, label: "Leer en español", lang: "es" },
  ].filter(Boolean) as { href: string; label: string; lang: string }[];
  if (!items.length) return null;
  return (
    <p className="mt-4 flex flex-wrap gap-3 text-[14px]">
      {items.map((i) => (
        <Link key={i.href} href={i.href} hrefLang={i.lang} lang={i.lang} className="text-brand underline decoration-current/30 underline-offset-4">
          {i.label}
        </Link>
      ))}
    </p>
  );
}
