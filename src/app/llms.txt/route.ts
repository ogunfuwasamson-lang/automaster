import { FACTS, PLAN_OFFERS, SITE } from "@/lib/site";
import { FAQ } from "@/lib/faq";
import { GUIDES, SCHOLARSHIPS } from "@/content";
import { UNIVERSITIES } from "@/content/universities";
import { ORIGINS } from "@/content/countries";
import { LOCAL, guideUrl } from "@/content/i18n";

// /llms.txt: a plain summary of Ivyward for AI assistants and answer engines (the llmstxt.org format), built from
// the same facts as the site so it never drifts.
export const dynamic = "force-static";

export function GET() {
  const body = `# ${SITE.name}

> ${SITE.description}

${SITE.name}'s tagline is "${SITE.tagline}"

## Key facts

${FACTS.map((f) => `- ${f}`).join("\n")}

## Plans

${PLAN_OFFERS.map((o) => `- ${o.name}: ${o.price === "0" ? "free" : `$${o.price}`}. ${o.description}`).join("\n")}

## Questions and answers

${FAQ.map(([q, a]) => `### ${q}\n\n${a}`).join("\n\n")}

## Pages

- [Home](${SITE.url}/): what Ivyward does, how a season runs, and how it compares with applying alone or with a consultant
- [Pricing](${SITE.url}/pricing): free to prepare; pay per submission in Africa, or 3 free then $20 a month (10 submissions) elsewhere
- [About](${SITE.url}/about): who Ivyward is for, what the agents do and don't do, and how it compares with consultants and chatbots
- [Guides](${SITE.url}/guides): checked answers on fee waivers, scholarships, funding, applying abroad, visas and AI on applications
- [Scholarships](${SITE.url}/scholarships): profiles of fully funded scholarships for international students
- [Universities](${SITE.url}/universities): how to apply to Harvard, MIT, Stanford, Oxford, Cambridge, Toronto, McGill, TUM, ETH and more
- [Study abroad by home country](${SITE.url}/study-abroad): which fully funded scholarships are open to citizens of each country, and the 2026–27 visa rules for that nationality
- [Scholarship finder](${SITE.url}/tools/scholarship-finder): screen the major fully funded scholarships by citizenship, level, work experience and age
- [Glossary](${SITE.url}/glossary): admissions and funding terms defined
- [Full library as plain text](${SITE.url}/llms-full.txt)
- Every guide, scholarship and university page is also available as markdown at ${SITE.url}/md/<section>/<slug>
- [Privacy](${SITE.url}/privacy): what Ivyward keeps, how Gmail is connected, and your controls
- [Terms](${SITE.url}/terms)
- [Sign up](${SITE.url}/login?mode=signup)

## Guides

${GUIDES.map((g) => `- [${g.title}](${SITE.url}/guides/${g.slug}): ${g.description}`).join("\n")}

## Scholarship profiles

${SCHOLARSHIPS.map((s) => `- [${s.name}](${SITE.url}/scholarships/${s.slug}): ${s.levels.join(", ")} in ${s.country}. ${s.forWhom}.`).join("\n")}

## En français

${LOCAL.fr.map((g) => `- [${g.title}](${SITE.url}${guideUrl("fr", g.slug)})`).join("\n")}

## En español

${LOCAL.es.map((g) => `- [${g.title}](${SITE.url}${guideUrl("es", g.slug)})`).join("\n")}

## Em português

${LOCAL.pt.map((g) => `- [${g.title}](${SITE.url}${guideUrl("pt", g.slug)})`).join("\n")}

## بالعربية

${LOCAL.ar.map((g) => `- [${g.title}](${SITE.url}${guideUrl("ar", g.slug)})`).join("\n")}

## Study abroad by home country

${ORIGINS.map((o) => `- [Scholarships for ${o.demonym} students](${SITE.url}/study-abroad/${o.slug})`).join("\n")}

## How to apply to universities

${UNIVERSITIES.map((u) => `- [How to apply to ${u.name}](${SITE.url}/universities/${u.slug}): ${u.country}`).join("\n")}
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
