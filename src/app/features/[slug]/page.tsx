import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Crumbs, Cta, Faq, LibraryShell } from "@/components/library/library";
import { ORG, Script } from "@/components/seo/json-ld";
import { FeatureDemo } from "@/components/landing/feature-demo";
import { AddToChrome } from "@/components/landing/connect-demos";
import { FEATURES, featureBySlug } from "@/lib/features";
import { CHROME_STORE_URL } from "@/lib/chrome-store";
import { SITE } from "@/lib/site";

// one page per thing the agents do (lib/features): what it is, a demo of it working, how it works, what stays with
// you, and the questions people ask. linked from the landing page's tour and cards, and the footer.

export const dynamicParams = false;
export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const f = featureBySlug((await params).slug);
  if (!f) return {};
  return { title: f.metaTitle, description: f.description, alternates: { canonical: `/features/${f.slug}`, types: { "text/markdown": `/md/features/${f.slug}` } }, openGraph: { title: f.metaTitle, description: f.description, url: `/features/${f.slug}` } };
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const f = featureBySlug((await params).slug);
  if (!f) notFound();
  const url = `${SITE.url}/features/${f.slug}`;
  const others = FEATURES.filter((x) => x.slug !== f.slug);

  return (
    <LibraryShell crumbs={[["Features", "/features"], [f.nav, `/features/${f.slug}`]]}>
      <Script
        data={{
          "@context": "https://schema.org",
          "@graph": [
            ORG,
            { "@type": "WebPage", "@id": `${url}#page`, url, name: f.metaTitle, description: f.description, isPartOf: { "@id": `${SITE.url}/#site` }, about: { "@id": f.store ? `${SITE.url}/#chrome-runner` : `${SITE.url}/#app` }, inLanguage: "en" },
            { "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: f.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
          ],
        }}
      />

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:pt-14 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
        <div>
          <Crumbs items={[["Features", "/features"], [f.nav, `/features/${f.slug}`]]} />
          <h1 className="mt-6 text-[42px] leading-[1.05] sm:text-[58px]">{f.title}</h1>
          <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-muted">{f.lead}</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            {f.store ? (
              <>
                <AddToChrome />
                <ButtonLink href="/login?mode=signup" size="lg" variant="secondary">
                  Start free
                </ButtonLink>
              </>
            ) : (
              <>
                <ButtonLink href="/login?mode=signup" size="lg">
                  Start free
                </ButtonLink>
                {f.second ? (
                  <ButtonLink href={f.second.href} size="lg" variant="secondary">
                    {f.second.label}
                  </ButtonLink>
                ) : null}
              </>
            )}
          </div>
          <p className="mt-4 text-[13.5px] text-muted">{f.store ? "Free on the Chrome Web Store. Works in Chrome, Edge and Brave." : "Start free. Nothing goes to a school until you sign."}</p>
        </div>
        <FeatureDemo demo={f.demo} />
      </section>

      <section className="border-y border-line bg-surface/60 py-20" aria-labelledby="how-h">
        <div className="mx-auto max-w-6xl px-5">
          <h2 id="how-h" className="font-serif text-[34px] leading-tight sm:text-[42px]">
            How it works
          </h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
            {f.steps.map(([t, d], i) => (
              <li key={t} className="border-t border-line pt-6">
                <span className="font-serif text-[15px] text-brand tabular-nums">{i + 1}</span>
                <h3 className="mt-2 font-serif text-[22px] leading-snug">{t}</h3>
                <p className="mt-2.5 text-[15.5px] leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20" aria-labelledby="know-h">
        <h2 id="know-h" className="font-serif text-[34px] leading-tight sm:text-[42px]">
          Good to know
        </h2>
        <dl className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-3">
          {f.notes.map(([t, d]) => (
            <div key={t}>
              <dt className="text-[16px] font-medium">{t}</dt>
              <dd className="mt-1.5 text-[15.5px] leading-relaxed text-muted">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mx-auto max-w-[760px] px-5">
        <Faq items={f.faq} />
        {f.store ? (
          <Cta title="Add Ivyward to Chrome" body="Free, and only needed when a school's application form only works in your own browser." href={CHROME_STORE_URL} label="Add to Chrome" />
        ) : (
          <Cta title="Start with a free shortlist" body="Tell Ivyward what you want to study. The agents take it from there, and nothing goes to a school until you sign." />
        )}
      </div>

      <section className="mx-auto max-w-6xl px-5 pb-24" aria-labelledby="more-h">
        <h2 id="more-h" className="font-serif text-[28px] leading-tight">
          More of what the agents do
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((x) => (
            <li key={x.slug}>
              <Link href={`/features/${x.slug}`} className="block h-full rounded-xl border border-line bg-surface px-5 py-4 transition-colors hover:border-foreground/25">
                <span className="block text-[15.5px] font-medium">{x.nav}</span>
                <span className="mt-1 line-clamp-2 block text-[14px] leading-relaxed text-muted">{x.lead}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </LibraryShell>
  );
}
