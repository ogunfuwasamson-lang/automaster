import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, GUIDES, SCHOLARSHIPS, guidesIn } from "@/content";
import { ItemListJsonLd } from "@/components/seo/json-ld";
import { Cta, LibraryShell } from "@/components/library/library";

export const metadata: Metadata = {
  title: "Admissions guides: fee waivers, scholarships, funding and applying abroad",
  description:
    "Plain, checked answers on getting into university abroad: application fee waivers, fully funded master's and PhD scholarships, assistantships, statements of purpose, student visas, and using AI on applications.",
  alternates: { canonical: "/guides", types: { "application/rss+xml": "/guides/feed.xml" }, languages: { en: "/guides", fr: "/fr", es: "/es", "x-default": "/guides" } },
};

export default function Guides() {
  return (
    <LibraryShell crumbs={[["Guides", "/guides"]]}>
      <ItemListJsonLd path="/guides" name="Ivyward admissions guides" items={GUIDES.map((g) => [g.title, `/guides/${g.slug}`])} />
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:pt-16">
        <header className="max-w-3xl">
          <h1 className="text-[42px] leading-[1.05] sm:text-[60px]">Getting in, and getting it paid for.</h1>
          <p className="mt-5 text-[18px] leading-relaxed text-muted">
            Straight answers on applying to universities abroad: how to have application fees waived, where fully funded places come from, what to write, and what changed in the visa rules this year. Each guide is checked against official sources and dated.
          </p>
          <p className="mt-3 text-[15px]">
            <Link href="/fr" hrefLang="fr" className="text-brand underline decoration-current/30 underline-offset-4">
              Guides en français
            </Link>
            <span className="mx-2 text-muted" aria-hidden>
              /
            </span>
            <Link href="/es" hrefLang="es" className="text-brand underline decoration-current/30 underline-offset-4">
              Guías en español
            </Link>
          </p>
          <p className="mt-5 text-[15px]">
            Looking for money first?{" "}
            <Link href="/scholarships" className="font-medium text-brand underline decoration-current/30 underline-offset-4">
              Browse {SCHOLARSHIPS.length} scholarship profiles
            </Link>
            .
          </p>
        </header>

        <div className="mt-14 space-y-16">
          {CATEGORIES.map((c) => {
            const list = guidesIn(c.name);
            if (!list.length) return null;
            return (
              <section key={c.name} id={c.name.toLowerCase().replace(/\s+/g, "-")} className="scroll-mt-24" aria-labelledby={`h-${c.name}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line pb-3">
                  <h2 id={`h-${c.name}`} className="font-serif text-[30px]">
                    {c.name}
                  </h2>
                  <p className="text-[14.5px] text-muted">{c.blurb}</p>
                </div>
                <ul className="mt-2 divide-y divide-line">
                  {list.map((g) => (
                    <li key={g.slug}>
                      <Link href={`/guides/${g.slug}`} className="group grid gap-1 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:gap-8">
                        <span className="font-serif text-[21px] leading-snug group-hover:text-brand">{g.title}</span>
                        <span className="text-[15px] leading-relaxed text-muted">{g.description}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        <div className="max-w-3xl">
          <Cta title="Rather not do all this by hand?" body="Tell Ivyward about yourself once. Agents shortlist programs, draft and fact-check essays, ask for fee waivers, find funding and fill in every portal. You review and sign." />
        </div>
      </div>
    </LibraryShell>
  );
}
