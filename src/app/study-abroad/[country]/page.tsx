import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ORIGINS, ORIGINS_UPDATED, fitsFor, origin, usLine, inText, atStart, COMMONWEALTH_ELIGIBLE, type Origin } from "@/content/countries";
import { guide } from "@/content";
import { translationsOfCountry } from "@/content/i18n";
import { TranslationLinks } from "@/components/library/translation-links";
import { ArticleJsonLd } from "@/components/seo/json-ld";
import { AlertSignup } from "@/components/growth/alert-signup";
import { ShareRow } from "@/components/growth/share-row";
import { PageLinks } from "@/components/library/programme-page";
import { DESTINATIONS } from "@/lib/programme-pages";
import { Crumbs, Cta, Faq, LibraryShell, Related, ShortAnswer, longDate } from "@/components/library/library";

export const dynamicParams = false;
export function generateStaticParams() {
  return ORIGINS.map((o) => ({ country: o.slug }));
}

const UPDATED = ORIGINS_UPDATED;
// high-income countries whose students mostly fund themselves get a page about home funding, costs and visas
const title = (o: Origin) => (o.outbound ? `Study abroad from ${inText(o)}: funding, scholarships and visas for 2027` : `Study abroad from ${inText(o)}: scholarships, admissions and visas for 2027`);
const bloc = (o: Origin) => (o.iso === "NO" ? "EEA" : "EU");
const listOf = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : xs.join(""));

// where a citizen of this country would go: every destination except home
const HOME_DEST: Record<string, string> = { US: "usa", GB: "uk", CA: "canada", AU: "australia-new-zealand", NZ: "australia-new-zealand" };

export async function generateMetadata({ params }: { params: Promise<{ country: string }> }): Promise<Metadata> {
  const o = origin((await params).country);
  if (!o) return {};
  const description = o.outbound
    ? `Scholarships and home funding for ${o.demonym} students going abroad for a bachelor's, master's or PhD, the 2026–27 visa and tuition rules for ${o.demonym} citizens in the US, UK, Canada and Europe, and where tuition is lowest.`
    : `Fully funded scholarships open to ${o.demonym} students for bachelor's, master's and PhD study abroad, application fee waivers, and the 2026–27 visa rules for ${o.demonym} nationals in the US, UK, Canada and Europe.`;
  return {
    title: `Scholarships for ${o.demonym} students: study abroad from ${inText(o)} (2027)`,
    description,
    keywords: o.outbound
      ? [`study abroad from ${o.name}`, `scholarships for ${o.demonym} students to study abroad`, `masters abroad for ${o.demonym} students`, `PhD abroad from ${o.name}`, `cheapest countries to study abroad for ${o.demonym}s`, `${o.demonym} student visa UK Europe`, ...(o.local ?? []).slice(0, 3)]
      : [`scholarships for ${o.demonym} students`, `study abroad from ${o.name}`, `fully funded scholarships for ${o.demonym}s`, `masters scholarships ${o.name}`, `PhD scholarships for ${o.demonym} students`, `undergraduate scholarships for ${o.demonym} students`, `${o.name} student visa USA UK Canada`, `application fee waiver ${o.name}`],
    alternates: {
      canonical: `/study-abroad/${o.slug}`,
      types: { "text/markdown": `/md/study-abroad/${o.slug}` },
      languages: Object.keys(translationsOfCountry(o.slug)).length ? { en: `/study-abroad/${o.slug}`, "x-default": `/study-abroad/${o.slug}`, ...translationsOfCountry(o.slug) } : undefined,
    },
    openGraph: { type: "article", title: title(o), description, url: `/study-abroad/${o.slug}` },
  };
}

const LABEL = { open: "Open to you", check: "Check the rules", no: "Not open" } as const;

// the visa and tuition rules a citizen meets in each big destination, home left out
function visaLines(o: Origin): [string, string][] {
  const out: [string, string][] = [];
  if (o.iso !== "US") out.push(["United States", usLine(o)]);
  if (o.iso !== "GB")
    out.push([
      "United Kingdom",
      o.iso === "IE"
        ? "Irish citizens need no visa to study in the UK and usually pay home fees, under the Common Travel Area."
        : `${o.eu ? `Since 2021, ${bloc(o)} citizens need a Student visa and usually pay international fees, unless they have settled or pre-settled status. ` : ""}From 30 November 2026 the Student visa needs £1,570 a month for living costs in London or £1,203 elsewhere (up to nine months), and the Graduate route shortens to 18 months for applications from 1 January 2027.`,
    ]);
  if (o.eu) out.push([`Elsewhere in the EU and EEA`, "No student visa. You register your residence if you stay longer than three months, and public universities charge you the same tuition as local students."]);
  else if (o.outbound)
    out.push([
      "European Union",
      `${o.iso === "GB" ? "Since Brexit, British students" : `${o.demonym} students`} need a student residence permit for a full degree, and most countries charge non-EU tuition. Germany is the big exception: its public universities charge no tuition for most programmes, even for non-EU students (Baden-Württemberg and TU Munich are among the exceptions). Germany also asks for proof of funds, usually a blocked account with €11,904 for the year.`,
    ]);
  if (o.iso !== "CA") out.push(["Canada", "A study permit. Master's and PhD students at public institutions are exempt from the study-permit cap and the provincial attestation letter; proof of funds is CA$23,448 for a single applicant outside Québec."]);
  if (!o.outbound) out.push(["Germany", "A blocked account with €11,904 for the year."]);
  return out;
}

export default async function CountryPage({ params }: { params: Promise<{ country: string }> }) {
  const o = origin((await params).country);
  if (!o) notFound();
  const path = `/study-abroad/${o.slug}`;
  const fits = fitsFor(o);
  const open = fits.filter((f) => f.status === "open");
  const cw = COMMONWEALTH_ELIGIBLE.has(o.name);
  const africa = o.region === "Africa";
  const openNames = open
    .slice(0, 5)
    .map((f) => f.name.replace(/ \(.*\)/, ""))
    .join(", ");
  const answer = o.outbound
    ? `${o.demonym} students can apply for ${open.length} of the ${fits.length} major international scholarships we track, including ${openNames}.${o.local?.length ? ` From ${inText(o)} itself: ${o.local.slice(0, 2).join(" and ")}.` : ""}${o.fundAbroad ? ` ${o.fundAbroad}.` : ""}${o.eu ? ` As an ${bloc(o)} citizen you can study anywhere else in the EU and EEA without a visa, and public universities there charge you the same tuition as local students.` : ""}`
    : `${o.demonym} students can apply for ${open.length} of the ${fits.length} major fully funded scholarships we track, including ${openNames}${o.local?.length ? `, plus home-country awards such as ${o.local[0]}` : ""}. ${usLine(o)}`;
  const english = o.english
    ? `Usually not. Universities that teach in English generally exempt citizens of majority English-speaking countries like ${inText(o)} from IELTS and TOEFL. Programmes taught in another language ask for proof of that language.`
    : o.exam
      ? `Not always. Many universities, especially in the UK, accept ${o.exam}, or a degree taught in English, instead of IELTS or TOEFL. Check each university and scholarship.`
      : `Usually you need IELTS, TOEFL, PTE or the Duolingo English Test unless your previous degree was taught in English and the university accepts a medium-of-instruction letter.`;
  const faq: [string, string][] = o.outbound
    ? [
        [`What scholarships can ${o.demonym} students get to study abroad?`, `${open.map((f) => f.name).join("; ")}.${o.local?.length ? ` From ${inText(o)}: ${o.local.join("; ")}.` : ""} Always confirm eligibility on the official page.`],
        ...(o.fundAbroad ? [[`Can ${o.demonym} student finance pay for a degree abroad?`, `${o.fundAbroad}. Check the rules for your university and course before you enrol.`] as [string, string]] : []),
        o.eu
          ? [`Do ${o.demonym} citizens need a visa to study elsewhere in Europe?`, `Not in the EU or EEA: you register your residence after you arrive and pay the same tuition as local students. ${o.iso === "IE" ? "In the UK, Irish citizens need no visa and usually pay home fees under the Common Travel Area." : `The UK is different: since 2021, ${bloc(o)} citizens need a Student visa and usually pay international fees.`}`]
          : [`Do ${o.demonym} students need a visa to study in Europe?`, `Yes, a student residence permit for a full degree, and most EU countries charge non-EU tuition. Germany's public universities charge no tuition for most programmes, even for non-EU students.`],
        [`Do ${o.demonym} students need IELTS to study abroad?`, english],
        ...(o.iso !== "US" ? [[`Can ${o.demonym} students study in the USA in 2027?`, usLine(o)] as [string, string]] : []),
        [`How much does Ivyward cost in ${inText(o)}?`, `Starting is free: a shortlist from programmes Ivyward has already checked, with deadlines, fees and funding. Each application the agents prepare and submit uses one credit. Pro is $20 a month for up to ten. Invite a friend and you both get one free.`],
      ]
    : [
        [`What fully funded scholarships can ${o.demonym} students apply for?`, `${open.map((f) => f.name).join("; ")}.${o.local?.length ? ` Home-country options include ${o.local.join("; ")}.` : ""} Always confirm eligibility on the official page.`],
        [`Can ${o.demonym} students study in the USA in 2027?`, usLine(o)],
        [`Is ${inText(o)} eligible for Commonwealth scholarships?`, cw ? `Yes. ${atStart(o)} is on the 2027/28 eligible list for Commonwealth Master's Scholarships; apply through your national nominating agency.` : `No. ${atStart(o)} is not on the 2027/28 eligible list for Commonwealth Master's Scholarships.`],
        [`Do ${o.demonym} students need IELTS to study abroad?`, english],
        [`How much does Ivyward cost in ${inText(o)}?`, africa ? `Starting is free: a shortlist from programmes Ivyward has already checked, with deadlines, fees and funding. Each application the agents prepare and submit uses one credit. Submissions come in packs: ₦10,000 (or the local equivalent) covers 5 applications, scholarship forms or funding requests, with no subscription. Invite a friend and you both get one free.` : `Starting is free: a shortlist from programmes Ivyward has already checked, with deadlines, fees and funding. Each application the agents prepare and submit uses one credit. Pro is $20 a month for up to ten. Invite a friend and you both get one free.`],
      ];
  const dedicated = o.guide ? guide(o.guide) : undefined;
  const near = ORIGINS.filter((x) => x.slug !== o.slug && x.region === o.region).slice(0, 4);
  const destinations = DESTINATIONS.filter((d) => d.slug !== HOME_DEST[o.iso] && !(o.region === "Africa" && d.slug === "africa") && !(o.region === "Latin America" && d.slug === "latin-america")).map((d) => ({
    href: `/programmes/${d.slug}`,
    label: d.name.replace(/^the /, "").replace(/^./, (c) => c.toUpperCase()),
  }));
  const link = "text-brand underline decoration-current/30 underline-offset-4";
  return (
    <LibraryShell crumbs={[["Study abroad", "/study-abroad"], [o.name, path]]}>
      <ArticleJsonLd path={path} title={title(o)} description={answer} updated={UPDATED} faq={faq} about={[`scholarships for ${o.demonym} students`, `study abroad from ${o.name}`]} />
      <div className="mx-auto max-w-[780px] px-5 pb-20 pt-10 sm:pt-14">
        <Crumbs items={[["Study abroad", "/study-abroad"], [o.region, `/study-abroad#${o.region.toLowerCase().replace(/\s+/g, "-")}`]]} />
        <h1 className="mt-5 text-[36px] leading-[1.08] sm:text-[50px]">{title(o)}</h1>
        <p className="mt-4 text-[13.5px] text-muted">Checked against official lists on {longDate(UPDATED)}</p>
        <TranslationLinks links={translationsOfCountry(o.slug)} />
        <ShortAnswer>{answer}</ShortAnswer>

        {o.outbound ? (
          <section className="mt-10">
            <h2 className="font-serif text-[28px]">Funding from {inText(o)}</h2>
            <ul className="prose-iv mt-3">
              {(o.local ?? []).map((l) => (
                <li key={l}>{l}</li>
              ))}
              {o.fundAbroad ? (
                <li>
                  <strong>Student finance:</strong> {o.fundAbroad}.
                </li>
              ) : null}
            </ul>
            <p className="mt-3 text-[15px] text-muted">Calls and deadlines change every year. Check each official site for the current round.</p>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="font-serif text-[28px]">{o.outbound ? `International scholarships open to ${o.demonym} citizens` : `Fully funded scholarships for ${o.demonym} citizens`}</h2>
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
                      <Link href={f.href} className={link}>
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
          {!o.outbound && o.local?.length ? (
            <p className="mt-4 text-[15px]">
              <strong>From {inText(o)} itself:</strong> {o.local.join("; ")}. Check the official site for the current call.
            </p>
          ) : null}
          <p className="mt-4 text-[15px]">
            Not sure which fit you? Try the{" "}
            <Link href="/tools/scholarship-finder" className={link}>
              scholarship finder
            </Link>
            .
          </p>
        </section>

        <div className="prose-iv mt-10">
          <h2>
            {o.outbound ? "Visas and tuition rules" : "Visa rules"} for {o.demonym} {o.outbound ? "citizens" : "nationals"} in 2026–27
          </h2>
          <ul>
            {visaLines(o).map(([where, line]) => (
              <li key={where}>
                <strong>{where}:</strong> {line}
              </li>
            ))}
          </ul>
          <p>
            More in our <Link href="/guides/student-visa-proof-of-funds">proof of funds guide</Link>.
          </p>

          {o.outbound ? (
            <>
              <h2>Where tuition is lowest</h2>
              <p>
                {o.eu
                  ? `As an ${bloc(o)} citizen, public universities in ${listOf(["Germany", "Austria", "Denmark", "Finland", "Norway", "Sweden"].filter((c) => c !== o.name))} charge you no tuition for most degrees (you pay a small semester or student-union fee), and ${listOf(["France", "Italy", "Spain"].filter((c) => c !== o.name))} set public fees that are low by UK or US standards.`
                  : `Germany's public universities charge no tuition for most programmes, even for non-EU students. Elsewhere in Europe, non-EU tuition is usually well below US private universities.`}{" "}
                {o.iso === "US" || o.iso === "CA" ? "A one-year master's in the UK or Ireland can cost less in total than a two-year master's at home. " : ""}
                Compare in our guides to the <Link href="/guides/cost-of-masters-abroad-by-country">cost of a master&apos;s by country</Link> and <Link href="/guides/one-year-vs-two-year-masters">one-year vs two-year master&apos;s</Link>.
              </p>
            </>
          ) : null}

          <h2>Bachelor&apos;s, master&apos;s or PhD?</h2>
          <ul>
            <li>
              {o.outbound ? (
                <>
                  <strong>Bachelor&apos;s (BSc, BA):</strong> three- and four-year degrees in the UK, Ireland and Europe can cost less than at home, but full funding is rare, so budget for the whole degree. See <Link href="/guides/how-to-apply-for-a-bachelors-degree-abroad">applying for a bachelor&apos;s abroad</Link>.
                </>
              ) : (
                <>
                  <strong>Bachelor&apos;s (BSc, BA):</strong> full funding for international undergraduates is rare and very competitive; the main routes are need-based aid at US colleges that meet full need for international students, and a few awards such as the <Link href="/scholarships/lester-b-pearson">Lester B. Pearson scholarship</Link>. See <Link href="/guides/how-to-apply-for-a-bachelors-degree-abroad">applying for a bachelor&apos;s abroad</Link>.
                </>
              )}
            </li>
            <li>
              <strong>Master&apos;s (MSc, MA, MBA):</strong> {o.outbound ? "most funding comes from the awards above, university merit scholarships and your own student finance." : "most full funding comes from government scholarships like those above."} See <Link href="/guides/fully-funded-masters-scholarships-international-students">fully funded master&apos;s scholarships</Link>.
            </li>
            <li>
              <strong>PhD:</strong> most strong offers are fully funded through assistantships, studentships or salaried positions. See <Link href="/guides/fully-funded-phd-how-funding-works">how PhD funding works</Link>.
            </li>
          </ul>

          <h2>English tests and documents</h2>
          <p>
            {o.english
              ? `Universities that teach in English generally exempt citizens of majority English-speaking countries like ${inText(o)} from IELTS and TOEFL. Programmes taught in another language ask for proof of that language.`
              : o.exam
                ? `Many universities, especially in the UK, accept ${o.exam}, or a degree taught in English, instead of IELTS or TOEFL. Scholarships and visas can set their own rules, so check each.`
                : "Most universities ask for IELTS, TOEFL, PTE or the Duolingo English Test unless your degree was taught in English and they accept a medium-of-instruction letter from your university."}{" "}
            {o.french ? "French-taught programmes in France and Québec, and France's Eiffel scholarship, are natural options for French speakers. " : ""}
            {o.spanish ? "Spanish-taught programmes in Spain are also an option for Spanish speakers. " : ""}
            {o.portuguese ? "Portuguese-taught programmes in Portugal are also an option for Portuguese speakers. " : ""}
            Request transcripts early; some universities take weeks to issue them.
          </p>

          <h2>Application fees</h2>
          <p>
            Application fees add up quickly when you&apos;re applying to several universities. Many waive them for financial hardship, event attendance or on a polite request sent two weeks before the deadline. See <Link href="/guides/how-to-get-application-fee-waivers">how to get application fee waivers</Link>.
          </p>
        </div>

        <PageLinks title="Programmes we've checked, by destination" links={destinations} />

        <Cta
          title={`Applying from ${inText(o)}? Let the agents do the work`}
          body={`Ivyward checks every scholarship against your ${o.demonym} citizenship, builds a shortlist you can get into, drafts and fact-checks your essays, asks for fee waivers and fills in every university portal. You review and sign. ${africa ? "In Africa, the shortlist is free and ₦10,000 (or the local equivalent) covers 5 applications. Invite a friend and you both get one free." : "The shortlist is free; Pro covers up to 10 applications a month. Invite a friend and you both get one free."}`}
        />
        <Faq items={faq} />
        <AlertSignup source={`country:${o.slug}`} />
        <ShareRow path={path} title={`Scholarships for ${o.demonym} students`} />
        <p className="mt-10 text-[13.5px] leading-relaxed text-muted">Eligibility lists and funding rules change every cycle. Confirm on each official page before applying.</p>
        <Related
          items={[
            ...(dedicated ? [{ href: `/guides/${dedicated.slug}`, title: dedicated.title, kind: "Guide" }] : []),
            ...near.map((x) => ({ href: `/study-abroad/${x.slug}`, title: `Study abroad from ${inText(x)}`, kind: x.region })),
          ]}
        />
      </div>
    </LibraryShell>
  );
}
