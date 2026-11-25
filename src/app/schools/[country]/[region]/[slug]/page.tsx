import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UNIVERSITIES } from "@/content/universities";
import { ArticleJsonLd, Script } from "@/components/seo/json-ld";
import { ShareRow } from "@/components/growth/share-row";
import { Crumbs, Cta, Faq, LibraryShell, Related, ShortAnswer, longDate } from "@/components/library/library";
import { COUNTRY_NAME, COUNTRY_SLUG, SLUG_COUNTRY, controlLabel, findSchool, inRegion, regionLabel, registryName, schoolPath, worthIndexing, type DirSchool } from "@/lib/directory";
import { schoolCopy } from "@/lib/directory-copy";
import { SITE } from "@/lib/site";

// one page per degree-granting institution in the official registries: the facts we hold, the official links,
// and how applying from abroad works there. rendered on first visit and kept for a day.
export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type P = { params: Promise<{ country: string; region: string; slug: string }> };

async function get(params: P["params"]) {
  const { country, region, slug } = await params;
  const c = SLUG_COUNTRY[country];
  if (!c) return null;
  return findSchool(c, region, slug);
}

const title = (s: DirSchool) => `How to apply to ${s.name}`;
const VISA_NAME: Record<DirSchool["country"], string> = { US: "F-1", GB: "UK Student", CA: "Canadian study permit", AU: "Student (subclass 500)", FR: "French student", CN: "Chinese X1 student" };

function place(s: DirSchool) {
  return [s.city, regionLabel(s.country, s.region), COUNTRY_NAME[s.country]].filter(Boolean).join(", ");
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const s = await get(params);
  if (!s) return {};
  const description = `How to apply to ${s.name}${s.nameLocal && s.nameLocal !== s.name ? ` (${s.nameLocal})` : ""} in ${place(s)} from abroad: the official links, what to prepare, and the ${VISA_NAME[s.country]} visa steps.`;
  return {
    title: s.nameLocal && s.nameLocal !== s.name ? `How to apply to ${s.name} (${s.nameLocal})` : `How to apply to ${s.name}: admissions, international applicants`,
    description,
    alternates: { canonical: schoolPath(s) },
    openGraph: { type: "article", title: title(s), description, url: schoolPath(s) },
    robots: worthIndexing(s) ? undefined : { index: false, follow: true },
  };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9.5rem_1fr] gap-3 border-b border-line py-3 text-[15px] last:border-0 sm:grid-cols-[11rem_1fr]">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function Out({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener" className="break-all text-brand underline decoration-current/30 underline-offset-4 hover:decoration-current">
      {href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
    </a>
  );
}

export default async function SchoolPage({ params }: P) {
  const s = await get(params);
  if (!s) notFound();
  const path = schoolPath(s);
  const us = s.country === "US";
  const where = place(s);
  const guide = UNIVERSITIES.find((u) => u.name.toLowerCase() === s.name.toLowerCase());
  const regionPath = `/schools/${COUNTRY_SLUG[s.country]}/${s.regionSlug}`;
  const copy = schoolCopy(s, where);
  const answer = copy.answer;
  const control = controlLabel(s.control);
  // a value the register doesn't hold (a website, an english name) says where it came from
  const borrowed = s.issues.filter((i) => /from (wikidata|the hipo)/i.test(i));

  const faq: [string, string][] = [
    [`How do I apply to ${s.name}?`, copy.how],
    [`Is ${s.name} officially recognised?`, `${s.name} is listed by the ${registryName(s.registry)}${s.recognition ? `: ${s.recognition}` : ""}.`],
    copy.visaQ,
    [`Can Ivyward apply to ${s.name} for me?`, `Yes. Ivyward's agents find the right ${s.name} application, create your account, fill in every page from your profile, upload your documents and ask for an application fee waiver where one is available. You review and sign before anything is submitted.`],
  ];

  const nearby = (await inRegion(s.country, s.regionSlug))
    .filter((x) => x.id !== s.id && (x.admissions || x.apply || !us))
    .slice(0, 6)
    .map((x) => ({ href: schoolPath(x), title: `How to apply to ${x.name}`, kind: [x.city, regionLabel(x.country, x.region)].filter(Boolean).join(", ") }));

  return (
    <LibraryShell crumbs={[["Schools", "/schools"], [COUNTRY_NAME[s.country], `/schools/${COUNTRY_SLUG[s.country]}`], [regionLabel(s.country, s.region), regionPath], [s.name, path]]}>
      <ArticleJsonLd path={path} title={title(s)} description={answer} updated={s.checked} faq={faq} about={[s.name, `${s.name} admissions`, `universities in ${regionLabel(s.country, s.region)}`]} />
      <Script
        data={{
          "@context": "https://schema.org",
          "@type": "CollegeOrUniversity",
          name: s.name,
          ...(s.aliases.length ? { alternateName: s.aliases } : {}),
          ...(s.website ? { url: s.website } : {}),
          address: { "@type": "PostalAddress", ...(s.city ? { addressLocality: s.city } : {}), addressRegion: s.region, addressCountry: s.country },
          subjectOf: { "@id": `${SITE.url}${path}#article` },
        }}
      />
      <div className="mx-auto max-w-[760px] px-5 pb-20 pt-10 sm:pt-14">
        <Crumbs items={[["Schools", "/schools"], [COUNTRY_NAME[s.country], `/schools/${COUNTRY_SLUG[s.country]}`], [regionLabel(s.country, s.region), regionPath]]} />
        <h1 className="mt-5 text-[36px] leading-[1.08] sm:text-[48px]">{title(s)}</h1>
        <p className="mt-4 text-[13.5px] text-muted">
          {s.nameLocal && s.nameLocal !== s.name ? <span lang="zh-Hans">{s.nameLocal}. </span> : null}
          {where}. From the {registryName(s.registry)}, checked on {longDate(s.checked)}
        </p>
        <ShortAnswer>{answer}</ShortAnswer>

        <section aria-labelledby="facts-h" className="mt-10">
          <h2 id="facts-h" className="font-serif text-[26px]">
            At a glance
          </h2>
          <dl className="mt-3 rounded-2xl border border-line bg-surface px-5">
            <Fact label="Location">{where}</Fact>
            {control && <Fact label="Type">{control}</Fact>}
            {s.kind && <Fact label="Category">{s.kind}</Fact>}
            {s.highest && <Fact label="Highest award">{s.highest}</Fact>}
            {s.recognition && <Fact label="Recognition">{s.recognition}</Fact>}
            {s.website && (
              <Fact label="Website">
                <Out href={s.website} />
              </Fact>
            )}
          </dl>
        </section>

        <section aria-labelledby="links-h" className="mt-10">
          <h2 id="links-h" className="font-serif text-[26px]">
            Official links
          </h2>
          <ul className="mt-3 space-y-2.5 text-[15px]">
            {s.admissions && (
              <li>
                Admissions: <Out href={s.admissions} />
              </li>
            )}
            {s.apply && s.apply !== s.admissions && (
              <li>
                Apply: <Out href={s.apply} />
              </li>
            )}
            {s.international && (
              <li>
                International students: <Out href={s.international} />
              </li>
            )}
            {s.aid && (
              <li>
                Financial aid: <Out href={s.aid} />
              </li>
            )}
            {s.netPrice && (
              <li>
                Net price calculator: <Out href={s.netPrice} />
              </li>
            )}
            {!s.admissions && !s.apply && s.website && (
              <li>
                Start from the university&apos;s website: <Out href={s.website} />
              </li>
            )}
          </ul>
        </section>

        <div className="prose-iv mt-10">
          <h2 id="apply">Applying from abroad</h2>
          {copy.apply.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
          <p>{copy.lead}</p>
          <ul>
            {copy.needs.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p>
            Our <Link href="/guides/statement-of-purpose-guide">statement of purpose guide</Link> covers the statement most of these ask for
            {us ? (
              <>
                , and the <Link href="/guides/how-to-get-application-fee-waivers">fee waiver guide</Link> has a request template
              </>
            ) : null}
            .
          </p>
          {copy.after && <p>{copy.after}</p>}
          <h2 id="visa">Visa</h2>
          <p>
            {copy.visa} More in our <Link href={copy.guide.href}>{copy.guide.label}</Link>.
          </p>
          {guide && (
            <p>
              We have a detailed guide for this school: <Link href={`/universities/${guide.slug}`}>how to apply to {guide.short}</Link>, with its deadlines and funding.
            </p>
          )}
        </div>

        <Cta
          title={`Let Ivyward apply to ${s.name} for you`}
          body={`The agents find the right ${s.name} application, create your account, fill in every page, upload your documents and ask for a fee waiver first. You review and sign before anything is submitted.`}
        />
        <Faq items={faq} />
        <ShareRow path={path} title={title(s)} />
        <p className="mt-10 text-[13.5px] leading-relaxed text-muted">
          Facts come from the {registryName(s.registry)}
          {borrowed.length ? ` (${borrowed.map((b) => b.replace(/ \(not in [^)]*\)/, "")).join("; ")})` : ""}. Deadlines, fees and requirements differ by program and change each cycle: confirm on {s.name}&apos;s official pages. Ivyward is not affiliated with {s.name}.
        </p>
        <Related items={nearby} />
        <p className="mt-8 text-[14.5px]">
          <Link href={regionPath} className="text-brand underline decoration-current/30 underline-offset-4">
            All schools in {regionLabel(s.country, s.region)}
          </Link>
        </p>
      </div>
    </LibraryShell>
  );
}
