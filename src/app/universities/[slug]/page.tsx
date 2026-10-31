import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COUNTRY_NOTES, UNIVERSITIES, university } from "@/content/universities";
import { scholarship } from "@/content";
import { ArticleJsonLd, Script } from "@/components/seo/json-ld";
import { Crumbs, Cta, Faq, LibraryShell, Related, ShortAnswer, longDate } from "@/components/library/library";
import { SITE } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return UNIVERSITIES.map((u) => ({ slug: u.slug }));
}

const title = (n: string) => `How to apply to ${n} as an international student`;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const u = university((await params).slug);
  if (!u) return {};
  const description = `How graduate applications to ${u.name} work, the usual deadlines, funding and scholarships, fee waivers, and the ${u.country} student visa rules for 2026–27.`;
  return {
    title: `How to apply to ${u.short}: deadlines, funding, fee waivers`,
    description,
    keywords: [`how to apply to ${u.name}`, `${u.short} application deadline`, `${u.short} graduate admissions`, `${u.short} scholarships for international students`, `${u.short} application fee waiver`, `${u.short} masters`, `${u.short} PhD funding`],
    alternates: { canonical: `/universities/${u.slug}`, types: { "text/markdown": `/md/universities/${u.slug}` } },
    openGraph: { type: "article", title: title(u.name), description, url: `/universities/${u.slug}` },
  };
}

export default async function UniversityPage({ params }: { params: Promise<{ slug: string }> }) {
  const u = university((await params).slug);
  if (!u) notFound();
  const path = `/universities/${u.slug}`;
  const cn = COUNTRY_NOTES[u.country];
  const awards = (u.scholarships ?? []).map((s) => scholarship(s)).filter((s) => !!s);
  const answer = `${u.how} ${u.deadlines} ${u.funding[0]}.`;
  const faq: [string, string][] = [
    [`What is the application deadline for ${u.short}?`, `${u.deadlines} Deadlines differ by program, so check the program page on ${u.short}'s admissions site.`],
    [`Can international students get funding at ${u.short}?`, `${u.funding.join(". ")}.`],
    [`How do I apply to ${u.short}?`, u.how],
    [`What visa do I need to study at ${u.short}?`, cn.visa],
    [`Can Ivyward apply to ${u.short} for me?`, `Yes. Ivyward's agents create your account on ${u.short}'s application portal, fill in every page from your profile, upload your documents and submit once you've signed the packet. They also ask for an application fee waiver first where ${u.short} allows one.`],
  ];
  const peers = UNIVERSITIES.filter((x) => x.slug !== u.slug && x.country === u.country)
    .slice(0, 4)
    .map((x) => ({ href: `/universities/${x.slug}`, title: `How to apply to ${x.short}`, kind: x.country }));
  return (
    <LibraryShell crumbs={[["Universities", "/universities"], [u.name, path]]}>
      <ArticleJsonLd path={path} title={title(u.name)} description={answer} updated={u.updated} faq={faq} about={[u.name, `${u.short} admissions`, `${u.country} universities`]} />
      <Script
        data={{
          "@context": "https://schema.org",
          "@type": "CollegeOrUniversity",
          name: u.name,
          alternateName: u.short,
          url: new URL(u.applyUrl).origin,
          address: { "@type": "PostalAddress", addressLocality: u.city, addressCountry: u.country },
          subjectOf: { "@id": `${SITE.url}${path}#article` },
        }}
      />
      <div className="mx-auto max-w-[760px] px-5 pb-20 pt-10 sm:pt-14">
        <Crumbs items={[["Universities", "/universities"], [u.country, `/universities#${u.country.toLowerCase().replace(/\s+/g, "-")}`]]} />
        <h1 className="mt-5 text-[38px] leading-[1.08] sm:text-[52px]">{title(u.name)}</h1>
        <p className="mt-4 text-[13.5px] text-muted">
          {u.city}, {u.country}. Checked on {longDate(u.updated)}
        </p>
        <ShortAnswer>{answer}</ShortAnswer>

        <div className="prose-iv mt-10">
          <h2 id="how">How applications work</h2>
          <p>{u.how}</p>
          <h2 id="deadlines">Deadlines</h2>
          <p>{u.deadlines} Apply well before the last date if you want scholarship consideration or need time for a visa.</p>
          <h2 id="funding">Funding and scholarships</h2>
          <ul>
            {u.funding.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          {awards.length > 0 && (
            <p>
              Scholarships you can hold here:{" "}
              {awards.map((a, i) => (
                <span key={a.slug}>
                  {i > 0 && ", "}
                  <Link href={`/scholarships/${a.slug}`}>{a.name}</Link>
                </span>
              ))}
              .
            </p>
          )}
          <h2 id="tips">What to know before you apply</h2>
          <ul>
            {u.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <h2 id="documents">What you&apos;ll usually need</h2>
          <ul>
            <li>Transcripts and degree certificate</li>
            <li>A statement of purpose or personal statement (see our <Link href="/guides/statement-of-purpose-guide">statement of purpose guide</Link>)</li>
            <li>Two or three references</li>
            <li>English test scores or an accepted exemption, and any tests the program requires</li>
            <li>A CV, and a passport copy</li>
          </ul>
          <h2 id="visa">Visa and money</h2>
          <p>
            {cn.visa} More in our <Link href={cn.guide}>country guide</Link> and the <Link href="/guides/student-visa-proof-of-funds">proof of funds guide</Link>.
          </p>
          <h2 id="fees">Application fees</h2>
          <p>
            Fees vary by program. Look for a fee waiver before you pay: event attendance, financial hardship and partner programs are the usual routes. Our <Link href="/guides/how-to-get-application-fee-waivers">fee waiver guide</Link> has a request template.
          </p>
        </div>

        <p className="mt-8 text-[15px]">
          Official admissions page:{" "}
          <a href={u.applyUrl} target="_blank" rel="noopener" className="break-all text-brand underline decoration-current/30 underline-offset-4">
            {u.applyUrl.replace(/^https?:\/\//, "")}
          </a>
        </p>

        <Cta
          title={`Let Ivyward apply to ${u.short} for you`}
          body={`The agents find the right ${u.short} program portal, create your account, fill in every page, upload your documents and ask for a fee waiver first. You review and sign before anything is submitted.`}
        />
        <Faq items={faq} />
        <p className="mt-10 text-[13.5px] leading-relaxed text-muted">Deadlines, fees and requirements differ by program and change each cycle. Confirm on {u.short}&apos;s official pages. Ivyward is not affiliated with {u.name}.</p>
        <Related items={peers} />
      </div>
    </LibraryShell>
  );
}
