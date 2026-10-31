import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SCHOLARSHIPS, scholarship } from "@/content";
import { ArticleJsonLd } from "@/components/seo/json-ld";
import { AlertSignup } from "@/components/growth/alert-signup";
import { ShareRow } from "@/components/growth/share-row";
import { Crumbs, Cta, Faq, LibraryShell, Related, ShortAnswer, longDate } from "@/components/library/library";

export const dynamicParams = false;
export function generateStaticParams() {
  return SCHOLARSHIPS.map((s) => ({ slug: s.slug }));
}

const metaTitle = (s: { name: string; levels: string[]; country: string }) => `${s.name}: eligibility, what it covers and how to apply`;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = scholarship((await params).slug);
  if (!s) return {};
  const description = `${s.summary.split(". ")[0]}. Who can apply, what it pays for, the usual deadline and how to apply.`.slice(0, 300);
  return {
    title: metaTitle(s),
    description,
    keywords: [s.name, `${s.name} eligibility`, `${s.name} deadline`, `${s.country} scholarship`, `${s.funding.toLowerCase()} scholarship ${s.country}`, ...s.levels.map((l) => `${l} scholarship ${s.country}`)],
    alternates: { canonical: `/scholarships/${s.slug}`, types: { "text/markdown": `/md/scholarships/${s.slug}` } },
    openGraph: { type: "article", title: metaTitle(s), description, url: `/scholarships/${s.slug}` },
  };
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-[27px] leading-tight">{title}</h2>
      <ul className="prose-iv mt-3">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </section>
  );
}

export default async function ScholarshipPage({ params }: { params: Promise<{ slug: string }> }) {
  const s = scholarship((await params).slug);
  if (!s) notFound();
  const path = `/scholarships/${s.slug}`;
  const similar = SCHOLARSHIPS.filter((x) => x.slug !== s.slug && (x.country === s.country || x.levels.some((l) => s.levels.includes(l))))
    .sort((a, b) => Number(b.country === s.country) - Number(a.country === s.country))
    .slice(0, 4)
    .map((x) => ({ href: `/scholarships/${x.slug}`, title: x.name, kind: `Scholarship, ${x.country}` }));
  const facts: [string, string][] = [
    ["Study in", s.country],
    ["Funded by", s.funder],
    ["Level", s.levels.join(", ")],
    ["Funding", s.funding],
    ["Who can apply", s.forWhom],
    ["Usual deadline", s.deadline],
  ];
  return (
    <LibraryShell crumbs={[["Scholarships", "/scholarships"], [s.name, path]]}>
      <ArticleJsonLd path={path} title={metaTitle(s)} description={s.summary} updated={s.updated} faq={s.faq} about={[s.name, `${s.country} scholarships`, ...s.levels.map((l) => `${l} funding`)]} />
      <div className="mx-auto max-w-[760px] px-5 pb-20 pt-10 sm:pt-14">
        <Crumbs items={[["Scholarships", "/scholarships"], [s.country, `/scholarships#${s.country.toLowerCase().replace(/\s+/g, "-")}`]]} />
        <h1 className="mt-5 text-[38px] leading-[1.08] sm:text-[52px]">{s.name}</h1>
        <p className="mt-4 text-[13.5px] text-muted">Checked against the official page on {longDate(s.updated)}</p>
        <ShortAnswer>{s.summary}</ShortAnswer>

        <dl className="mt-8 grid overflow-hidden rounded-2xl border border-line sm:grid-cols-2">
          {facts.map(([k, v]) => (
            <div key={k} className="border-b border-line p-4 sm:[&:nth-child(odd)]:border-r">
              <dt className="text-[12.5px] text-muted">{k}</dt>
              <dd className="mt-0.5 text-[15px] font-medium leading-snug">{v}</dd>
            </div>
          ))}
        </dl>

        <List title="What it covers" items={s.covers} />
        <List title="Who is eligible" items={s.eligibility} />
        <List title="How to apply" items={s.howToApply} />
        <List title="How to make your application stronger" items={s.tips} />

        <p className="mt-8 text-[15px]">
          Official page:{" "}
          <a href={s.url} target="_blank" rel="noopener" className="break-all text-brand underline decoration-current/30 underline-offset-4">
            {s.url.replace(/^https?:\/\//, "")}
          </a>
        </p>

        <Cta
          title={`Apply for ${s.name.replace(/ Scholarships?$/, "")} with Ivyward`}
          body="Ivyward matches you to scholarships you're eligible for, drafts your essays from your own record and checks every claim, keeps track of each deadline, and applies to the universities the scholarship needs. You review and sign everything."
        />
        <Faq items={s.faq} />
        <AlertSignup source={`scholarship:${s.slug}`} />
        <ShareRow path={path} title={s.name} />
        <p className="mt-10 text-[13.5px] leading-relaxed text-muted">Rules, amounts and dates change every cycle. Confirm everything on the official page before you apply. Ivyward is not affiliated with {s.funder}.</p>
        <Related items={[...similar, { href: "/guides/fully-funded-masters-scholarships-international-students", title: "Fully funded master's scholarships for international students", kind: "Funding" }]} />
      </div>
    </LibraryShell>
  );
}
