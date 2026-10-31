import { GUIDES, SCHOLARSHIPS } from "@/content";
import { FACTS, SITE } from "@/lib/site";
import { FAQ } from "@/lib/faq";
import { UNIVERSITIES } from "@/content/universities";
import { libraryMarkdown } from "@/lib/library-md";

// /llms-full.txt: every guide and scholarship profile in one plain-text file, so an AI assistant can read the
// whole library in a single fetch and quote it with the page's link.
export const dynamic = "force-static";

export function GET() {
  const guides = GUIDES.map(
    (g) =>
      `## ${g.title}\n\nURL: ${SITE.url}/guides/${g.slug}\nLast checked: ${g.updated}\n\n${g.answer}\n\n${g.body.trim()}\n\n${g.faq.map(([q, a]) => `### ${q}\n\n${a}`).join("\n\n")}\n\nSources: ${g.sources.map(([t, u]) => `${t} (${u})`).join("; ")}`,
  ).join("\n\n---\n\n");
  const schol = SCHOLARSHIPS.map(
    (s) =>
      `## ${s.name}\n\nURL: ${SITE.url}/scholarships/${s.slug}\nOfficial page: ${s.url}\nStudy in: ${s.country}. Funded by: ${s.funder}. Level: ${s.levels.join(", ")}. Funding: ${s.funding}. Who can apply: ${s.forWhom}. Usual deadline: ${s.deadline}.\n\n${s.summary}\n\nCovers:\n${s.covers.map((c) => `- ${c}`).join("\n")}\n\nEligibility:\n${s.eligibility.map((c) => `- ${c}`).join("\n")}\n\nHow to apply:\n${s.howToApply.map((c) => `- ${c}`).join("\n")}\n\n${s.faq.map(([q, a]) => `### ${q}\n\n${a}`).join("\n\n")}`,
  ).join("\n\n---\n\n");
  const body = `# ${SITE.name}: full library\n\n> ${SITE.description}\n\n## About Ivyward\n\n${FACTS.map((f) => `- ${f}`).join("\n")}\n\n${FAQ.map(([q, a]) => `### ${q}\n\n${a}`).join("\n\n")}\n\n# Guides\n\n${guides}\n\n# Scholarship profiles\n\n${schol}\n\n# How to apply to universities\n\n${UNIVERSITIES.map((u) => libraryMarkdown("universities", u.slug)).join("\n\n---\n\n")}\n`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
