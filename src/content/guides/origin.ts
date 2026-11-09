import type { Guide } from "../types";

// "scholarships for <nationality> students": one guide per home country, built from the same honest frame.
type Origin = {
  slug: string;
  demonym: string; // "Ghanaian"
  country: string; // "Ghana"
  usLine: string; // the US visa position for this nationality
  local: [string, string][]; // home-specific awards: [name with link, note]
  extra: string; // a paragraph specific to this country
  ivy: string; // pricing line
  faq: [string, string][];
  sources: [string, string][];
};

const COMMON: [string, string][] = [
  ["[Chevening](/scholarships/chevening)", "UK master's, fully funded; needs about two years' work experience"],
  ["[Commonwealth Master's](/scholarships/commonwealth-masters)", "UK master's, fully funded; apply through your national nominating agency"],
  ["[Gates Cambridge](/scholarships/gates-cambridge)", "Cambridge master's or PhD, fully funded"],
  ["[Erasmus Mundus](/scholarships/erasmus-mundus)", "Joint master's in Europe, €1,400 a month plus tuition and travel"],
  ["[DAAD](/scholarships/daad)", "Germany, including EPOS for professionals"],
  ["[MEXT](/scholarships/mext)", "Japan, through the Japanese embassy"],
  ["[GKS](/scholarships/global-korea-scholarship)", "South Korea, embassy or university track"],
  ["[Türkiye Bursları](/scholarships/turkiye-burslari)", "Türkiye, all levels"],
  ["[Chinese Government Scholarship](/scholarships/chinese-government-scholarship)", "China, many English-taught programs"],
];

function build(o: Origin): Guide {
  const rows = [...o.local, ...COMMON].map(([a, b]) => `| ${a} | ${b} |`).join("\n");
  return {
    slug: o.slug,
    title: `Scholarships for ${o.demonym} students to study abroad`,
    seoTitle: `Fully funded scholarships for ${o.demonym} students (2027)`,
    description: `The fully funded scholarships open to students from ${o.country}, what changed in visa rules for 2026–27, and how to build an application plan that can win one.`,
    category: "Funding",
    updated: "2026-10-31",
    keywords: [`scholarships for ${o.demonym} students`, `fully funded scholarships for ${o.demonym}s`, `study abroad from ${o.country}`, `masters scholarships for ${o.demonym} students`, `${o.country} scholarships 2027`],
    answer: `Students from ${o.country} are eligible for most of the big fully funded awards: Chevening and Commonwealth in the UK, Erasmus Mundus in Europe, DAAD in Germany, Gates Cambridge, MEXT in Japan, GKS in Korea, Türkiye Bursları and the Chinese Government Scholarship, plus ${o.local.map(([a]) => a.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")).join(", ")}. ${o.usLine}`,
    body: `
## The scholarships open to you

| Scholarship | What it is |
|---|---|
${rows}

Each award has its own rules and deadline; the profiles link to the official pages.

## About ${o.country} specifically

${o.extra}

## Visa rules that changed

- **United States:** ${o.usLine}
- **United Kingdom:** from 30 November 2026, the student visa needs £1,570 a month for living costs in London or £1,203 elsewhere, for up to nine months. The Graduate route shortens to 18 months for applications from 1 January 2027.
- **Canada:** master's and PhD students at public institutions are exempt from the study-permit cap and the provincial attestation letter, and proof of funds is $23,448 for a single applicant outside Québec (from 1 September 2026).
- **Germany:** the blocked account is €11,904 a year.

See the [proof of funds guide](/guides/student-visa-proof-of-funds) for detail.

## A plan that can win

1. Choose three to six scholarships across two or three countries by August of the year before you start.
2. Apply to universities early, since many awards need an unconditional offer by a fixed date.
3. Ask referees six weeks ahead.
4. Write each essay to the award's purpose, with specific, quantified examples.
5. Ask for application fee waivers before paying; see our [fee waiver guide](/guides/how-to-get-application-fee-waivers).

## How Ivyward helps

${o.ivy} The agents shortlist programs and scholarships you're eligible for as a citizen of ${o.country}, draft and fact-check essays from your record, ask for fee waivers and fill in each portal. You review and sign everything.
`,
    faq: o.faq,
    sources: [
      ["Commonwealth Scholarship Commission: Master's Scholarships", "https://cscuk.fcdo.gov.uk/masters"],
      ["NAFSA: proclamation of December 16, 2025 (effective January 1, 2026)", "https://www.nafsa.org/regulatory-information/proclamation-december-16-2025-travel-ban-effective-january-1-2026"],
      ...o.sources,
    ],
    related: ["fully-funded-masters-scholarships-international-students", "scholarships/chevening", "scholarships/commonwealth-masters", "student-visa-proof-of-funds"],
  };
}

const AFRICA_PRICE = "In Africa, preparing applications with Ivyward is free and ₦10,000 (or the local equivalent) covers 5 submissions, with no subscription.";
const ELSEWHERE_PRICE = "Preparing applications with Ivyward is free; your first three submissions are free, then Pro is $20 a month for up to ten.";

export const ghana = build({
  slug: "scholarships-for-ghanaian-students",
  demonym: "Ghanaian",
  country: "Ghana",
  usLine: "Ghana is not on the US visa restriction lists that took effect on 1 January 2026, so Ghanaian students can apply for F-1 visas as usual.",
  local: [
    ["[Mastercard Foundation Scholars](/scholarships/mastercard-foundation)", "For young Africans with financial need, at partner universities"],
    ["[Stipendium Hungaricum](/scholarships/stipendium-hungaricum)", "Hungary; Ghana is a partner country"],
    ["[Fulbright Foreign Student Program](/scholarships/fulbright-foreign-student)", "US master's and PhD, through the US Embassy in Accra"],
  ],
  extra:
    "Ghana is eligible for both Chevening and Commonwealth Master's Scholarships. Commonwealth nominations go through Ghana's national nominating agency, which sets an earlier deadline than the Commission. Ghana's government also runs its own scholarships for study abroad through its national scholarships agency. Many UK universities accept a WASSCE English credit in place of IELTS; check each one.",
  ivy: AFRICA_PRICE,
  faq: [
    ["Can Ghanaian students get US student visas in 2026?", "Yes. Ghana is not among the 39 countries under the US entry restrictions that took effect on 1 January 2026."],
    ["Is Ghana eligible for Commonwealth scholarships?", "Yes. Ghana is on the 2027/28 eligible list for Commonwealth Master's Scholarships; apply through the national nominating agency."],
    ["Do Ghanaians need IELTS to study in the UK?", "Not always. Many UK universities accept a WASSCE English credit or a degree taught in English. Check each university."],
  ],
  sources: [],
});

export const kenya = build({
  slug: "scholarships-for-kenyan-students",
  demonym: "Kenyan",
  country: "Kenya",
  usLine: "Kenya is not on the US visa restriction lists that took effect on 1 January 2026, so Kenyan students can apply for F-1 visas as usual.",
  local: [
    ["[Mastercard Foundation Scholars](/scholarships/mastercard-foundation)", "For young Africans with financial need, at partner universities"],
    ["[Stipendium Hungaricum](/scholarships/stipendium-hungaricum)", "Hungary; Kenya is a partner country"],
    ["[Swedish Institute SISGP](/scholarships/swedish-institute-global-professionals)", "Sweden; check that year's country list"],
    ["[Fulbright Foreign Student Program](/scholarships/fulbright-foreign-student)", "US master's and PhD, through the US Embassy in Nairobi"],
  ],
  extra:
    "Kenya is eligible for Chevening and Commonwealth Master's Scholarships, and DAAD has a regional office in Nairobi that runs information sessions on German scholarships. Commonwealth nominations go through Kenya's national nominating agency, which sets its own earlier deadline. Many universities accept a KCSE English grade or an English-taught degree in place of an English test; check each one.",
  ivy: AFRICA_PRICE,
  faq: [
    ["Can Kenyan students get US student visas in 2026?", "Yes. Kenya is not among the 39 countries under the US entry restrictions that took effect on 1 January 2026."],
    ["Is Kenya eligible for Commonwealth scholarships?", "Yes. Kenya is on the 2027/28 eligible list for Commonwealth Master's Scholarships."],
  ],
  sources: [],
});

export const india = build({
  slug: "scholarships-for-indian-students",
  demonym: "Indian",
  country: "India",
  usLine: "India is not on the US visa restriction lists that took effect on 1 January 2026, so Indian students can apply for F-1 visas as usual, though interview wait times vary by consulate.",
  local: [
    ["Fulbright-Nehru Master's Fellowships", "US master's, run by USIEF for Indian professionals"],
    ["Inlaks Shivdasani Foundation Scholarships", "Postgraduate study at top universities abroad"],
    ["[Rhodes Scholarship](/scholarships/rhodes)", "Oxford; India has its own Rhodes constituency"],
    ["[Knight-Hennessy Scholars](/scholarships/knight-hennessy)", "Stanford, any graduate degree"],
  ],
  extra:
    "India is eligible for both Chevening and Commonwealth Master's Scholarships, and is one of the largest Chevening countries. Several Indian trusts, such as the JN Tata Endowment and the KC Mahindra Education Trust, offer loan scholarships for study abroad, which can close a gap that a partial scholarship leaves. The Chevening deadline is in early October and Rhodes India usually closes in the summer, so start early.",
  ivy: ELSEWHERE_PRICE,
  faq: [
    ["What are the best fully funded scholarships for Indian students?", "Chevening, Commonwealth Master's, Fulbright-Nehru, Rhodes India, Gates Cambridge, Erasmus Mundus and DAAD are the best known. Inlaks covers study at top universities abroad."],
    ["Is India eligible for Commonwealth scholarships?", "Yes. India is on the 2027/28 eligible list for Commonwealth Master's Scholarships."],
  ],
  sources: [["USIEF: Fulbright-Nehru fellowships", "https://www.usief.org.in/"]],
});

export const pakistan = build({
  slug: "scholarships-for-pakistani-students",
  demonym: "Pakistani",
  country: "Pakistan",
  usLine: "Pakistan is not on the US visa restriction lists that took effect on 1 January 2026, so Pakistani students can apply for F-1 visas as usual.",
  local: [
    ["Fulbright Pakistan (USEFP)", "US master's and PhD; historically one of the largest Fulbright programs in the world"],
    ["HEC overseas scholarships", "Pakistan's Higher Education Commission funds master's and PhD study abroad in priority fields"],
    ["[Stipendium Hungaricum](/scholarships/stipendium-hungaricum)", "Hungary; Pakistan is a partner country"],
  ],
  extra:
    "Pakistan is eligible for Chevening and Commonwealth Master's Scholarships; Commonwealth nominations go through the Higher Education Commission. US exchange funding faced cuts in 2025, so check USEFP's current calls before relying on Fulbright. China's government scholarships are widely used by Pakistani students, with many English-taught programs.",
  ivy: ELSEWHERE_PRICE,
  faq: [
    ["Is Fulbright still open to Pakistani students?", "The program continued, but US exchange funding was cut in 2025. Check USEFP's website for the current competition."],
    ["Is Pakistan eligible for Commonwealth scholarships?", "Yes. Pakistan is on the 2027/28 eligible list for Commonwealth Master's Scholarships, with nominations through the Higher Education Commission."],
  ],
  sources: [["USEFP: Fulbright Pakistan", "https://www.usefpakistan.org/"]],
});
