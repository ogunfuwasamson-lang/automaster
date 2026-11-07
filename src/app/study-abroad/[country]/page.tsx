import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ORIGINS, fitsFor, origin, usLine, COMMONWEALTH_ELIGIBLE } from "@/content/countries";
import { guide } from "@/content";
import { translationsOfCountry } from "@/content/i18n";
import { TranslationLinks } from "@/components/library/translation-links";
import { ArticleJsonLd } from "@/components/seo/json-ld";
import { AlertSignup } from "@/components/growth/alert-signup";
import { ShareRow } from "@/components/growth/share-row";
import { Crumbs, Cta, Faq, LibraryShell, Related, ShortAnswer, longDate } from "@/components/library/library";

export const dynamicParams = false;
export function generateStaticParams() {
  return ORIGINS.map((o) => ({ country: o.slug }));
}

const UPDATED = "2026-11-01";
const title = (o: { name: string }) => `Study abroad from ${o.name}: scholarships, admissions and visas for 2027`;

export async function generateMetadata({ params }: { params: Promise<{ country: string }> }): Promise<Metadata> {
  const o = origin((await params).country);
  if (!o) return {};
  const description = `Fully funded scholarships open to ${o.demonym} students for bachelor's, master's and PhD study abroad, application fee waivers, and the 2026–27 visa rules for ${o.demonym} nationals in the US, UK, Canada and Europe.`;
  return {
    title: `Scholarships for ${o.demonym} students: study abroad from ${o.name} (2027)`,
    description,
    keywords: [`scholarships for ${o.demonym} students`, `study abroad from ${o.name}`, `fully funded scholarships for ${o.demonym}s`, `masters scholarships ${o.name}`, `PhD scholarships for ${o.demonym} students`, `undergraduate scholarships for ${o.demonym} students`, `${o.name} student visa USA UK Canada`, `application fee waiver ${o.name}`],
    alternates: {
      canonical: `/study-abroad/${o.slug}`,
      types: { "text/markdown": `/md/study-abroad/${o.slug}` },
      languages: Object.keys(translationsOfCountry(o.slug)).length ? { en: `/study-abroad/${o.slug}`, "x-default": `/study-abroad/${o.slug}`, ...translationsOfCountry(o.slug) } : undefined,
    },
    openGraph: { type: "article", title: title(o), description, url: `/study-abroad/${o.slug}` },
  };
}

const LABEL = { open: "Open to you", check: "Check the rules", no: "Not open" } as const;

export default async function CountryPage({ params }: { params: Promise<{ country: string }> }) {
  const o = origin((await params).country);
  if (!o) notFound();
  const path = `/study-abroad/${o.slug}`;
  const fits = fitsFor(o);
  const open = fits.filter((f) => f.status === "open");
  const cw = COMMONWEALTH_ELIGIBLE.has(o.name);
  const africa = o.region === "Africa";
  const answer = `${o.demonym} students can apply for ${open.length} of the ${fits.length} major fully funded scholarships we track, including ${open
    .slice(0, 5)
    .map((f) => f.name.replace(/ \(.*\)/, ""))
    .join(", ")}${o.local?.length ? `, plus home-country awards such as ${o.local[0]}` : ""}. ${usLine(o)}`;
  const faq: [string, string][] = [
    [`What fully funded scholarships can ${o.demonym} students apply for?`, `${open.map((f) => f.name).join("; ")}.${o.local?.length ? ` Home-country options include ${o.local.join("; ")}.` : ""} Always confirm eligibility on the official page.`],
    [`Can ${o.demonym} students study in the USA in 2027?`, usLine(o)],
    [`Is ${o.name} eligible for Commonwealth scholarships?`, cw ? `Yes. ${o.name} is on the 2027/28 eligible list for Commonwealth Master's Scholarships; apply through your national nominating agency.` : `No. ${o.name} is not on the 2027/28 eligible list for Commonwealth Master's Scholarships.`],
    [`Do ${o.demonym} students need IELTS to study abroad?`, o.exam ? `Not always. Many universities, especially in the UK, accept ${o.exam}, or a degree taught in English, instead of IELTS or TOEFL. Check each university and scholarship.` : `Usually you need IELTS, TOEFL, PTE or the Duolingo English Test unless your previous degree was taught in English and the university accepts a medium-of-instruction letter.`],
    [`How much does Ivyward cost in ${o.name}?`, africa ? `Preparing applications is free. Submissions come in packs: ₦10,000 (or the local equivalent) covers 5 applications, scholarship forms or funding requests, with no subscription.` : `Preparing applications is free. Your first three submissions are free; Pro is $20 a month for up to ten submissions.`],
  ];
  const dedicated = o.guide ? guide(o.guide) : undefined;
  const near = ORIGINS.filter((x) => x.slug !== o.slug && x.region === o.region).slice(0, 4);
  return (
    <LibraryShell crumbs={[["Study abroad", "/study-abroad"], [o.name, path]]}>
      <ArticleJsonLd path={path} title={title(o)} description={answer} updated={UPDATED} faq={faq} about={[`scholarships for ${o.demonym} students`, `study abroad from ${o.name}`]} />
      <div className="mx-auto max-w-[780px] px-5 pb-20 pt-10 sm:pt-14">
        <Crumbs items={[["Study abroad", "/study-abroad"], [o.region, `/study-abroad#${o.region.toLowerCase().replace(/\s+/g, "-")}`]]} />
        <h1 className="mt-5 text-[36px] leading-[1.08] sm:text-[50px]">{title(o)}</h1>
        <p className="mt-4 text-[13.5px] text-muted">Checked against official lists on {longDate(UPDATED)}</p>
        <TranslationLinks links={translationsOfCountry(o.slug)} />
        <ShortAnswer>{answer}</ShortAnswer>

        <section className="mt-10">
          <h2 className="font-serif text-[28px]">Fully funded scholarships for {o.demonym} citizens</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-[14.5px]">
              <thead className="bg-surface text-left">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Scholarship</th>
                  <th className="px-4 py-2.5 font-semibold">For {o.demonym} applicants</th>
                  <th className="px-4 py-2.5 font-semibold">Why</th>
                </tr>
              </thead>
              <tbody>
                {fits.map((f) => (
                  <tr key={f.name} className="border-t border-line align-top">
                    <td className="px-4 py-2.5">
                      <Link href={f.href} className="text-brand underline decoration-current/30 underline-offset-4">
                        {f.name}
                      </Link>
                    </td>
                    <td className={`px-4 py-2.5 font-medium ${f.status === "open" ? "text-go" : f.status === "no" ? "text-muted" : ""}`}>{LABEL[f.status]}</td>
                    <td className="px-4 py-2.5 text-muted">{f.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {o.local?.length ? (
            <p className="mt-4 text-[15px]">
              <strong>From {o.name} itself:</strong> {o.local.join("; ")}. Check the official site for the current call.
            </p>
          ) : null}
          <p className="mt-4 text-[15px]">
            Not sure which fit you? Try the <Link href="/tools/scholarship-finder" className="text-brand underline decoration-current/30 underline-offset-4">scholarship finder</Link>.
          </p>
        </section>

        <div className="prose-iv mt-10">
          <h2>Visa rules for {o.demonym} nationals in 2026–27</h2>
          <ul>
            <li>
              <strong>United States:</strong> {usLine(o)}
            </li>
            <li>
              <strong>United Kingdom:</strong> from 30 November 2026 the Student visa needs £1,570 a month for living costs in London or £1,203 elsewhere (up to nine months), and the Graduate route shortens to 18 months for applications from 1 January 2027.
            </li>
            <li>
              <strong>Canada:</strong> master&apos;s and PhD students at public institutions are exempt from the study-permit cap and the provincial attestation letter; proof of funds is $23,448 for a single applicant outside Québec.
            </li>
            <li>
              <strong>Germany:</strong> a blocked account with €11,904 for the year.
            </li>
          </ul>
          <p>
            More in our <Link href="/guides/student-visa-proof-of-funds">proof of funds guide</Link>.
          </p>

          <h2>Bachelor&apos;s, master&apos;s or PhD?</h2>
          <ul>
            <li>
              <strong>Bachelor&apos;s (BSc, BA):</strong> full funding for international undergraduates is rare and very competitive; the main routes are need-based aid at US colleges that meet full need for international students, and a few awards such as the <Link href="/scholarships/lester-b-pearson">Lester B. Pearson scholarship</Link>. See <Link href="/guides/how-to-apply-for-a-bachelors-degree-abroad">applying for a bachelor&apos;s abroad</Link>.
            </li>
            <li>
              <strong>Master&apos;s (MSc, MA, MBA):</strong> most full funding comes from government scholarships like those above. See <Link href="/guides/fully-funded-masters-scholarships-international-students">fully funded master&apos;s scholarships</Link>.
            </li>
            <li>
              <strong>PhD:</strong> most strong offers are fully funded through assistantships, studentships or salaried positions. See <Link href="/guides/fully-funded-phd-how-funding-works">how PhD funding works</Link>.
            </li>
          </ul>

          <h2>English tests and documents</h2>
          <p>
            {o.exam
              ? `Many universities, especially in the UK, accept ${o.exam}, or a degree taught in English, instead of IELTS or TOEFL. Scholarships and visas can set their own rules, so check each.`
              : "Most universities ask for IELTS, TOEFL, PTE or the Duolingo English Test unless your degree was taught in English and they accept a medium-of-instruction letter from your university."}{" "}
            {o.french ? "French-taught programmes in France and Québec, and France's Eiffel scholarship, are natural options for French speakers. " : ""}
            {o.spanish ? "Spanish-taught programmes in Spain are also an option for Spanish speakers. " : ""}
            {o.portuguese ? "Portuguese-taught programmes in Portugal are also an option for Portuguese speakers. " : ""}
            Request transcripts early; some universities take weeks to issue them.
          </p>

          <h2>Application fees</h2>
          <p>
            Application fees add up quickly when you&apos;re applying from {o.name}. Many universities waive them for financial hardship, event attendance or on a polite request sent two weeks before the deadline. See <Link href="/guides/how-to-get-application-fee-waivers">how to get application fee waivers</Link>.
          </p>
        </div>

        <Cta
          title={`Applying from ${o.name}? Let the agents do the work`}
          body={`Ivyward checks every scholarship against your ${o.demonym} citizenship, builds a shortlist you can get into, drafts and fact-checks your essays, asks for fee waivers and fills in every university portal. You review and sign. ${africa ? "In Africa, preparing is free and ₦10,000 (or the local equivalent) covers 5 submissions." : "Preparing is free and your first three submissions are free."}`}
        />
        <Faq items={faq} />
        <AlertSignup source={`country:${o.slug}`} />
        <ShareRow path={path} title={`Scholarships for ${o.demonym} students`} />
        <p className="mt-10 text-[13.5px] leading-relaxed text-muted">Eligibility lists change every cycle. Confirm on each scholarship&apos;s official page before applying.</p>
        <Related
          items={[
            ...(dedicated ? [{ href: `/guides/${dedicated.slug}`, title: dedicated.title, kind: "Guide" }] : []),
            ...near.map((x) => ({ href: `/study-abroad/${x.slug}`, title: `Study abroad from ${x.name}`, kind: x.region })),
          ]}
        />
      </div>
    </LibraryShell>
  );
}
