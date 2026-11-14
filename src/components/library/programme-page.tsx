import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Crumbs, Cta, Faq, LibraryShell, Related, ShortAnswer } from "@/components/library/library";
import { Script } from "@/components/seo/json-ld";
import { SITE } from "@/lib/site";
import { nextDeadline, shortDegree, type PublicProgramme } from "@/lib/programme-pages";

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const money = (n: number) => `$${Math.round(n).toLocaleString("en")}`;
const GRE: Record<string, string> = { not_required: "Not required", optional: "Optional", waivable: "Can be waived", required: "Required" };
const MOI: Record<string, string> = { accepted: "Accepted", case_by_case: "Case by case", not_accepted: "Not accepted" };
const FUND: Record<string, string> = { likely: "Realistic", possible: "Possible", rare: "Rare" };

// the table: one row per programme, linked to the school's own page. "—" where the agents found nothing clear.
export function ProgrammeTable({ rows, today, showDate }: { rows: PublicProgramme[]; today: string; showDate?: (p: PublicProgramme) => string | null }) {
  return (
    <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[720px] text-left text-[14px]">
        <thead className="border-b border-line text-[12.5px] text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Programme</th>
            <th className="px-3 py-3 font-medium">Deadline</th>
            <th className="px-3 py-3 font-medium">Tuition a year (USD)</th>
            <th className="px-3 py-3 font-medium">GRE/GMAT</th>
            <th className="px-3 py-3 font-medium">English-medium letter</th>
            <th className="px-3 py-3 font-medium">Full funding</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((p) => {
            const d = showDate ? showDate(p) : nextDeadline(p, today);
            return (
              <tr key={p.id} className="align-top">
                <td className="px-4 py-3">
                  <span className="block text-[12.5px] text-muted">
                    {p.school}
                    {p.country ? `, ${p.country}` : ""}
                  </span>
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noopener" className="inline-flex items-start gap-1 font-medium leading-snug hover:text-brand">
                      {p.name}
                      <ExternalLink className="mt-1 size-3 shrink-0 opacity-50" aria-hidden />
                    </a>
                  ) : (
                    <span className="font-medium leading-snug">{p.name}</span>
                  )}
                  <span className="mt-0.5 block text-[12px] text-muted">{shortDegree(p.degree, p.name)}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums">{d ? day(d) : "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums">{p.tuition ? money(p.tuition) : "—"}</td>
                <td className="px-3 py-3">{(p.testPolicy && GRE[p.testPolicy]) ?? "—"}</td>
                <td className="px-3 py-3">{(p.moi && MOI[p.moi]) ?? "—"}</td>
                <td className="px-3 py-3">{(p.funding && FUND[p.funding]) ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ProgrammePage(props: {
  path: string;
  crumbs: [string, string][];
  h1: string;
  answer: string;
  rows: PublicProgramme[];
  today: string;
  checked: string | null;
  faq: [string, string][];
  related: { href: string; title: string; kind: string }[];
  match: { level?: string; fields?: string; regions?: string };
  showDate?: (p: PublicProgramme) => string | null;
  description: string;
  children?: React.ReactNode;
}) {
  const url = `${SITE.url}${props.path}`;
  const q = new URLSearchParams(Object.entries(props.match).filter(([, v]) => !!v) as [string, string][]);
  const graph = [
    {
      "@type": "CollectionPage",
      "@id": `${url}#page`,
      url,
      name: props.h1,
      description: props.description,
      inLanguage: "en",
      dateModified: props.checked ?? props.today,
      isPartOf: { "@id": `${SITE.url}/#site` },
      publisher: { "@id": `${SITE.url}/#org` },
    },
    {
      "@type": "ItemList",
      "@id": `${url}#list`,
      name: props.h1,
      numberOfItems: props.rows.length,
      itemListElement: props.rows.slice(0, 100).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "EducationalOccupationalProgram",
          name: p.name,
          ...(p.url ? { url: p.url } : {}),
          provider: { "@type": "CollegeOrUniversity", name: p.school, ...(p.country ? { address: { "@type": "PostalAddress", addressCountry: p.country } } : {}) },
          ...(nextDeadline(p, props.today) ? { applicationDeadline: nextDeadline(p, props.today) } : {}),
          ...(p.tuition ? { offers: { "@type": "Offer", category: "Tuition", price: p.tuition, priceCurrency: "USD" } } : {}),
        },
      })),
    },
    ...(props.faq.length ? [{ "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: props.faq.map(([q2, a]) => ({ "@type": "Question", name: q2, acceptedAnswer: { "@type": "Answer", text: a } })) }] : []),
  ];
  return (
    <LibraryShell crumbs={props.crumbs}>
      <Script data={{ "@context": "https://schema.org", "@graph": graph }} />
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:pt-14">
        <Crumbs items={props.crumbs} />
        <header className="mt-5 max-w-3xl">
          <h1 className="text-[34px] leading-[1.08] sm:text-[48px]">{props.h1}</h1>
          <p className="mt-3 text-[14px] text-muted">
            {props.rows.length} programmes{props.checked ? `. Last checked ${day(props.checked)}` : ""}. From each school&apos;s official pages, researched by Ivyward&apos;s agents.
          </p>
        </header>
        <div className="max-w-3xl">
          <ShortAnswer>{props.answer}</ShortAnswer>
        </div>
        <ProgrammeTable rows={props.rows} today={props.today} showDate={props.showDate} />
        <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-muted">
          Tuition in US dollars, as published. Deadlines, fees and rules change every cycle. Each programme links to its official page: confirm there before you apply. &ldquo;—&rdquo; means the official pages didn&apos;t say clearly. Funding is how realistic full funding looked for an international student, not a promise.
        </p>
        {props.children}
        <div className="max-w-3xl">
          <Cta title="See which of these fit you" body="Tell Ivyward your level, field and where you want to study. It ranks programmes like these for you, finds scholarships you qualify for, writes your essays and fills in the application forms. You sign before anything goes." href={`/match${q.size ? `?${q}` : ""}`} label="Find my matches" />
          <Faq items={props.faq} />
          <Related items={props.related} />
        </div>
      </div>
    </LibraryShell>
  );
}

export function PageLinks({ title, links }: { title: string; links: { href: string; label: string; count?: number }[] }) {
  if (!links.length) return null;
  return (
    <section className={title ? "mt-10" : "mt-3"}>
      {title ? <h2 className="font-serif text-[22px]">{title}</h2> : null}
      <ul className={`${title ? "mt-3" : ""} flex flex-wrap gap-2`}>
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[14px] hover:border-foreground/30">
              {l.label}
              {l.count != null ? <span className="text-[12px] text-muted">{l.count}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
