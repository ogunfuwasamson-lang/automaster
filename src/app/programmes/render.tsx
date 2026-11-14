import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GUIDES } from "@/content";
import { PageLinks, ProgrammePage } from "@/components/library/programme-page";
import { publicProgrammes, todayISO } from "@/lib/programme-data";
import { DESTINATIONS, FIELD_PAGES, LIST_KINDS, MIN_ROWS, allPages, answerOf, faqOf, keyFromPath, pathOf, rowsFor, statsOf, titleOf, type PageKey } from "@/lib/programme-pages";

const LIST_LABEL: Record<string, string> = { phd: "PhD", bachelors: "Bachelor's", "without-gre": "Without the GRE", "english-medium-letter": "Without IELTS (English-medium letter)", "fully-funded": "Full funding realistic" };

// guides that go deeper on what a page is about
function guidesFor(key: PageKey): string[] {
  const out: string[] = [];
  if (key.dest.guide) out.push(key.dest.guide);
  if (key.kind === "without-gre" || key.kind === "english-medium-letter") out.push("gre-gmat-ielts-waivers");
  if (key.kind === "fully-funded") out.push("fully-funded-masters-scholarships-international-students", "graduate-assistantships-explained");
  if (key.kind === "phd") out.push("fully-funded-phd-how-funding-works", "how-to-email-a-professor");
  if (key.kind === "bachelors") out.push("how-to-apply-for-a-bachelors-degree-abroad", "full-financial-aid-for-international-undergraduates");
  if (key.kind === "field") {
    const f = key.field.slug;
    if (f === "public-health" || f === "nursing") out.push("scholarships-for-public-health");
    else if (/engineering|computer|data|artificial|cyber|statistics/.test(f)) out.push("scholarships-for-engineering-and-computer-science");
    else if (/mba|management|finance|accounting|business|law|economics|supply|project/.test(f)) out.push("scholarships-for-business-and-law");
    else if (/agriculture|environment|education|development/.test(f)) out.push("scholarships-for-agriculture-environment-and-education");
    if (f === "mba") out.push("mba-application-guide");
  }
  out.push("statement-of-purpose-guide", "how-to-get-application-fee-waivers", "application-deadlines-2027-intake");
  return [...new Set(out)].filter((s) => GUIDES.some((g) => g.slug === s)).slice(0, 4);
}

export async function programmeMetadata(dest: string, sub?: string): Promise<Metadata> {
  const key = keyFromPath(dest, sub);
  if (!key) return {};
  const today = todayISO();
  const rows = rowsFor(key, await publicProgrammes(), today);
  if (rows.length < MIN_ROWS) return { robots: { index: false } };
  const t = titleOf(key, rows.length, today);
  return { title: t.title, description: t.description, alternates: { canonical: pathOf(key) }, openGraph: { title: t.h1, description: t.description, url: pathOf(key) } };
}

export async function renderProgrammes(dest: string, sub?: string) {
  const key = keyFromPath(dest, sub);
  if (!key) notFound();
  const today = todayISO();
  const all = await publicProgrammes();
  const rows = rowsFor(key, all, today);
  if (rows.length < MIN_ROWS) notFound();
  const t = titleOf(key, rows.length, today);
  const pages = allPages(all, today);
  const here = pages.filter((p) => p.key.dest.slug === key.dest.slug && pathOf(p.key) !== pathOf(key));
  const sameField = key.kind === "field" ? pages.filter((p) => p.key.kind === "field" && p.key.field.slug === key.field.slug && p.key.dest.slug !== key.dest.slug) : [];
  const crumbs: [string, string][] = [["Programmes", "/programmes"], [key.dest.short.replace(/^the /, "").replace(/^\w/, (c) => c.toUpperCase()), `/programmes/${key.dest.slug}`]];
  if (key.kind !== "masters") crumbs.push([key.kind === "field" ? key.field.name : LIST_LABEL[key.kind], pathOf(key)]);
  const fieldParam = key.kind === "field" ? key.field.fields[0] : undefined;
  return (
    <ProgrammePage
      path={pathOf(key)}
      crumbs={crumbs}
      h1={t.h1}
      description={t.description}
      answer={answerOf(key, rows, today)}
      rows={rows}
      today={today}
      checked={statsOf(rows, today).checked}
      faq={faqOf(key, rows, today)}
      related={guidesFor(key).map((s) => {
        const g = GUIDES.find((x) => x.slug === s)!;
        return { href: `/guides/${g.slug}`, title: g.title, kind: "Guide" };
      })}
      match={{ level: key.kind === "phd" ? "phd" : key.kind === "bachelors" ? "undergraduate" : "masters", fields: fieldParam, regions: key.dest.region }}
    >
      <PageLinks
        title={`More in ${key.dest.short}`}
        links={here.map((p) => ({ href: pathOf(p.key), label: p.key.kind === "masters" ? "All master's" : p.key.kind === "field" ? p.key.field.name : LIST_LABEL[p.key.kind], count: p.count }))}
      />
      <PageLinks title={sameField.length ? `${key.kind === "field" ? key.field.name : ""} elsewhere` : ""} links={sameField.map((p) => ({ href: pathOf(p.key), label: p.key.dest.short.replace(/^the /, ""), count: p.count }))} />
    </ProgrammePage>
  );
}

export { DESTINATIONS, FIELD_PAGES, LIST_KINDS };
