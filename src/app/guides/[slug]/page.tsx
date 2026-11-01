import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GUIDES, guide, relatedCards } from "@/content";
import { UNIVERSITIES } from "@/content/universities";
import { ORIGINS } from "@/content/countries";
import { translationsOfGuide } from "@/content/i18n";

// country guides also point at the university pages in that country
const COUNTRY_OF: Record<string, string> = {
  "apply-to-us-universities-as-an-international-student": "United States",
  "apply-for-masters-in-the-uk": "United Kingdom",
  "apply-for-masters-in-canada": "Canada",
  "study-in-germany-tuition-free": "Germany",
};
import { renderMarkdown, readMinutes } from "@/lib/markdown";
import { AlertSignup } from "@/components/growth/alert-signup";
import { ShareRow } from "@/components/growth/share-row";
import { ArticleJsonLd } from "@/components/seo/json-ld";
import { TranslationLinks } from "@/components/library/translation-links";
import { Crumbs, Cta, Faq, LibraryShell, Related, ShortAnswer, Sources, longDate } from "@/components/library/library";

export const dynamicParams = false;
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

// hreflang: point to the French and Spanish versions when they exist
function langs(slug: string) {
  const t = translationsOfGuide(slug);
  return Object.keys(t).length ? { en: `/guides/${slug}`, "x-default": `/guides/${slug}`, ...t } : undefined;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = guide((await params).slug);
  if (!g) return {};
  return {
    title: g.seoTitle ?? g.title,
    description: g.description,
    keywords: g.keywords,
    alternates: { canonical: `/guides/${g.slug}`, types: { "text/markdown": `/md/guides/${g.slug}` }, languages: langs(g.slug) },
    openGraph: { type: "article", title: g.title, description: g.description, url: `/guides/${g.slug}`, modifiedTime: g.updated },
    twitter: { card: "summary_large_image", title: g.title, description: g.description },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = guide((await params).slug);
  if (!g) notFound();
  const { html, toc } = renderMarkdown(g.body);
  const path = `/guides/${g.slug}`;
  return (
    <LibraryShell crumbs={[["Guides", "/guides"], [g.title, path]]}>
      <ArticleJsonLd path={path} title={g.title} description={g.description} updated={g.updated} faq={g.faq} about={g.keywords.slice(0, 5)} />
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:pt-14">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_240px]">
          <article className="min-w-0 max-w-[700px]">
            <Crumbs items={[["Guides", "/guides"], [g.category, `/guides#${g.category.toLowerCase().replace(/\s+/g, "-")}`]]} />
            <h1 className="mt-5 text-[38px] leading-[1.08] sm:text-[52px]">{g.title}</h1>
            <p className="mt-4 text-[18px] leading-relaxed text-muted">{g.description}</p>
            <p className="mt-4 text-[13.5px] text-muted">
              <span>Checked against official sources on {longDate(g.updated)}</span>
              <span className="mx-2" aria-hidden>
                /
              </span>
              <span>{readMinutes(g.body)} minute read</span>
            </p>
            <TranslationLinks links={translationsOfGuide(g.slug)} />
            <ShortAnswer>{g.answer}</ShortAnswer>
            <div className="prose-iv mt-10" dangerouslySetInnerHTML={{ __html: html }} />
            <Cta
              title="Let the agents do the legwork"
              body="Ivyward builds your shortlist, drafts and fact-checks your essays, asks schools for fee waivers, finds funding and fills in every application portal. You review and sign. Preparing is free."
            />
            <Faq items={g.faq} />
            <AlertSignup source={`guide:${g.slug}`} />
            <ShareRow path={path} title={g.title} />
            <Sources items={g.sources} />
            <Related
              items={[
                ...relatedCards(g.related, g.slug),
                ...ORIGINS.filter((o) => o.guide === g.slug).map((o) => ({ href: `/study-abroad/${o.slug}`, title: `Every scholarship open to ${o.demonym} citizens`, kind: "By home country" })),
                ...UNIVERSITIES.filter((u) => u.country === COUNTRY_OF[g.slug]).map((u) => ({ href: `/universities/${u.slug}`, title: `How to apply to ${u.short}`, kind: u.country })),
              ]}
            />
          </article>
          {toc.length > 2 && (
            <aside className="hidden lg:block">
              <nav aria-label="On this page" className="sticky top-24 text-[14px]">
                <p className="font-medium">On this page</p>
                <ol className="mt-3 space-y-2 border-l border-line">
                  {toc.map((t) => (
                    <li key={t.id}>
                      <a href={`#${t.id}`} className="-ml-px block border-l border-transparent pl-3 leading-snug text-muted hover:border-foreground hover:text-foreground">
                        {t.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          )}
        </div>
      </div>
    </LibraryShell>
  );
}
