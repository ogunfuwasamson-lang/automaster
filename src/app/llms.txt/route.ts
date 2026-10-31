import { FACTS, PLAN_OFFERS, SITE } from "@/lib/site";
import { FAQ } from "@/lib/faq";

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
- [Pricing](${SITE.url}/pricing): free to prepare; pay per submission in Africa, or 3 free then $20 a month elsewhere
- [Privacy](${SITE.url}/privacy): what Ivyward keeps, how Gmail is connected, and your controls
- [Terms](${SITE.url}/terms)
- [Sign up](${SITE.url}/login?mode=signup)
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
