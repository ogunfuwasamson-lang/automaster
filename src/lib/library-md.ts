import { GUIDES, SCHOLARSHIPS, guide, scholarship } from "@/content";
import { COUNTRY_NOTES, UNIVERSITIES, university } from "@/content/universities";
import { SITE } from "@/lib/site";
import { ORIGINS, fitsFor, origin, usLine } from "@/content/countries";

// plain-markdown versions of library pages, for AI agents that prefer markdown to html (linked from each page's
// <head> as an alternate, and listed in /llms.txt).
export function libraryMarkdown(kind: string, slug: string): string | null {
  if (kind === "guides") {
    const g = guide(slug);
    if (!g) return null;
    return `# ${g.title}\n\nSource: ${SITE.url}/guides/${g.slug}\nLast checked: ${g.updated}\nPublisher: Ivyward (${SITE.url})\n\n> ${g.answer}\n\n${g.body.trim().replace(/\]\(\//g, `](${SITE.url}/`)}\n\n## Questions people ask\n\n${g.faq.map(([q, a]) => `### ${q}\n\n${a}`).join("\n\n")}\n\n## Sources\n\n${g.sources.map(([t, u]) => `- [${t}](${u})`).join("\n")}\n`;
  }
  if (kind === "scholarships") {
    const s = scholarship(slug);
    if (!s) return null;
    const list = (h: string, xs: string[]) => `## ${h}\n\n${xs.map((x) => `- ${x}`).join("\n")}`;
    return `# ${s.name}\n\nSource: ${SITE.url}/scholarships/${s.slug}\nOfficial page: ${s.url}\nLast checked: ${s.updated}\n\n> ${s.summary}\n\n- Study in: ${s.country}\n- Funded by: ${s.funder}\n- Level: ${s.levels.join(", ")}\n- Funding: ${s.funding}\n- Who can apply: ${s.forWhom}\n- Usual deadline: ${s.deadline}\n\n${list("What it covers", s.covers)}\n\n${list("Who is eligible", s.eligibility)}\n\n${list("How to apply", s.howToApply)}\n\n${list("Tips", s.tips)}\n\n## Questions people ask\n\n${s.faq.map(([q, a]) => `### ${q}\n\n${a}`).join("\n\n")}\n`;
  }
  if (kind === "universities") {
    const u = university(slug);
    if (!u) return null;
    return `# How to apply to ${u.name} as an international student\n\nSource: ${SITE.url}/universities/${u.slug}\nOfficial admissions page: ${u.applyUrl}\nLast checked: ${u.updated}\n\n## How applications work\n\n${u.how}\n\n## Deadlines\n\n${u.deadlines}\n\n## Funding\n\n${u.funding.map((f) => `- ${f}`).join("\n")}\n\n## What to know\n\n${u.notes.map((n) => `- ${n}`).join("\n")}\n\n## Visa and money\n\n${COUNTRY_NOTES[u.country].visa}\n\nIvyward's agents can create your account on ${u.short}'s portal, fill in every page and submit once you sign: ${SITE.url}\n`;
  }
  if (kind === "study-abroad") {
    const o = origin(slug);
    if (!o) return null;
    const label = { open: "open", check: "check the rules", no: "not open" } as const;
    return `# Study abroad from ${o.name}: scholarships, admissions and visas\n\nSource: ${SITE.url}/study-abroad/${o.slug}\nLast checked: 2026-11-01\n\n## Major fully funded scholarships for ${o.demonym} citizens\n\n${fitsFor(o).map((f) => `- ${f.name}: ${label[f.status]}. ${f.note}. ${SITE.url}${f.href}`).join("\n")}${o.local?.length ? `\n\nHome-country awards: ${o.local.join("; ")}.` : ""}\n\n## US visas\n\n${usLine(o)}\n`;
  }
  return null;
}

export function libraryMdParams() {
  return [
    ...GUIDES.map((g) => ({ kind: "guides", slug: g.slug })),
    ...SCHOLARSHIPS.map((s) => ({ kind: "scholarships", slug: s.slug })),
    ...UNIVERSITIES.map((u) => ({ kind: "universities", slug: u.slug })),
    ...ORIGINS.map((o) => ({ kind: "study-abroad", slug: o.slug })),
  ];
}
