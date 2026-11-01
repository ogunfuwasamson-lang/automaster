import type { Guide } from "../types";

const U = "2026-11-01";
const NAFSA: [string, string] = ["NAFSA: proclamation of December 16, 2025 (effective January 1, 2026)", "https://www.nafsa.org/regulatory-information/proclamation-december-16-2025-travel-ban-effective-january-1-2026"];

// ---------- degree levels ----------

export const bachelors: Guide = {
  slug: "how-to-apply-for-a-bachelors-degree-abroad",
  title: "How to apply for a bachelor's degree abroad (BSc, BA) as an international student",
  seoTitle: "How to apply for a bachelor's degree abroad: UCAS, Common App and more",
  description: "How undergraduate admissions work in the US (Common App), the UK (UCAS), Canada, Europe and Asia, the 2027 entry deadlines, and how international undergraduates get funding.",
  category: "Applying",
  updated: U,
  keywords: ["bachelor's degree abroad", "how to apply for undergraduate abroad", "BSc abroad for international students", "UCAS for international students", "Common App international", "undergraduate scholarships for international students"],
  answer:
    "Applying for a bachelor's abroad depends on the country: the UK uses UCAS (for 2027 entry, Oxford, Cambridge and most medicine courses close on 15 October 2026 and everything else by 13 January 2027); most US colleges use the Common App with deadlines from November to January; Canada, Europe and Asia mostly use each university's own portal or a national one. Full funding for international undergraduates is rare; the main route is need-based aid at US colleges that meet full demonstrated need for international students.",
  body: `
## How undergraduate admissions work, by country

| Country | How you apply | Usual deadlines for 2027 entry |
|---|---|---|
| United Kingdom | UCAS, up to five choices with one personal statement | 15 October 2026 for Oxford, Cambridge and most medicine, dentistry and veterinary courses; 13 January 2027 for equal consideration elsewhere |
| United States | Common App (or Coalition, or a college's own form) | Early decision or early action in November; regular decision mostly 1 to 15 January |
| Canada | Each university's portal, or OUAC for Ontario | Mostly January to March |
| Germany | Direct, through uni-assist or hochschulstart; often a foundation year (Studienkolleg) first for some school-leaving qualifications | Usually by 15 July for the winter semester |
| Netherlands | Studielink plus the university | Often 1 May for non-EU applicants, earlier for selective programmes |
| Japan, Korea, China | University portals or government scholarship routes | Tied to MEXT, GKS and CSC rounds |

## What you need

- School-leaving results (for example WAEC/WASSCE, KCSE, CBSE or A levels), predicted grades where they apply
- English test scores or an accepted exemption
- A personal statement or essays
- One or more references from teachers
- For US colleges, sometimes SAT or ACT scores (many are test-optional, some have reinstated requirements)

## Can you study a bachelor's abroad for free?

It's possible but competitive:

- **US colleges that are need-blind for international students and meet full need.** As of 2026 these include Harvard, Yale, Princeton, MIT, Dartmouth, Amherst and Notre Dame, with Brown and Bowdoin need-blind for international applicants who apply for aid. Admitted students from low-income families can attend at little or no cost.
- **Named awards** such as the [Lester B. Pearson International Scholarship](/scholarships/lester-b-pearson) at the University of Toronto and the [Mastercard Foundation Scholars Program](/scholarships/mastercard-foundation) for young Africans.
- **Government scholarships** that include bachelor's study: [MEXT](/scholarships/mext), [GKS](/scholarships/global-korea-scholarship), [Türkiye Bursları](/scholarships/turkiye-burslari), [Stipendium Hungaricum](/scholarships/stipendium-hungaricum) and the [Chinese Government Scholarship](/scholarships/chinese-government-scholarship).
- **Low-tuition countries** such as Germany, where most public universities charge no tuition.

## Application fees

Common App fee waivers are available to international students with financial need, usually confirmed by a school counsellor. UCAS charges one fee per application cycle. See [how to get application fee waivers](/guides/how-to-get-application-fee-waivers).

## How Ivyward helps

Ivyward covers bachelor's programmes as well as master's and PhDs: it shortlists universities you can get into, drafts your personal statement from your own record for you to rewrite and approve, finds scholarships and need-based aid you qualify for, asks for fee waivers and fills in each application portal. You sign everything.
`,
  faq: [
    ["When is the UCAS deadline for 2027 entry?", "15 October 2026 for Oxford, Cambridge and most medicine, dentistry and veterinary courses, and 13 January 2027 at 6pm UK time for equal consideration on other courses."],
    ["Which US universities give full financial aid to international students?", "Colleges that are need-blind for international applicants and meet full need, including Harvard, Yale, Princeton, MIT, Dartmouth, Amherst and Notre Dame (as of 2026). Brown and Bowdoin are need-blind for international applicants who apply for aid."],
    ["Can international students get a Common App fee waiver?", "Yes. International students with financial need can request a Common App fee waiver, which a school counsellor usually needs to confirm."],
  ],
  sources: [
    ["The Profs: UCAS key dates for 2027 entry", "https://www.theprofs.co.uk/student-resources/university-applications/ucas-key-dates-and-deadlines-for-2027-entry/"],
    ["Oriel Admissions: need-blind and need-aware colleges for international students (2026)", "https://orieladmissions.com/need-blind-need-aware-international-students/"],
    ["Common App: fees and fee waivers", "https://www.commonapp.org/static/653ded5d8d0d5d685e10ae814a7b2c85/Understanding-App-Fees-and-Waivers.pdf"],
  ],
  related: ["full-financial-aid-for-international-undergraduates", "how-to-get-application-fee-waivers", "how-to-build-a-university-shortlist", "scholarships/lester-b-pearson"],
};

export const undergradAid: Guide = {
  slug: "full-financial-aid-for-international-undergraduates",
  title: "Full financial aid for international undergraduates: need-blind US colleges and other routes",
  seoTitle: "Fully funded bachelor's for international students: need-blind colleges (2027)",
  description: "Which US colleges admit international students regardless of ability to pay and meet full need, how their aid works, and the other routes to a fully funded bachelor's.",
  category: "Funding",
  updated: U,
  keywords: ["full ride scholarship for international students", "need blind universities for international students", "fully funded bachelor's for international students", "undergraduate scholarships for international students", "colleges that meet full need international", "free university abroad for undergraduates"],
  answer:
    "A handful of US colleges admit international undergraduates without looking at whether they can pay (need-blind) and then meet their full demonstrated financial need: as of 2026 these include Harvard, Yale, Princeton, MIT, Dartmouth, Amherst and Notre Dame, with Brown and Bowdoin need-blind for international applicants who apply for aid. Many other colleges are need-aware but still give large grants. Outside the US, government scholarships (MEXT, GKS, Türkiye Bursları, Stipendium Hungaricum, the Chinese Government Scholarship) and awards such as Lester B. Pearson and Mastercard Foundation fund full bachelor's degrees.",
  body: `
## Need-blind vs need-aware

- **Need-blind:** your ability to pay doesn't affect the admission decision.
- **Need-aware:** the college considers whether you need aid, usually only at the margin, because its aid budget is limited.
- **Meets full need:** once admitted, the college covers the gap between its cost and what your family can pay, usually with grants rather than loans.

## Colleges that are need-blind for international students (2026)

| College | Need-blind for internationals | Meets full need |
|---|---|---|
| Harvard | Yes | Yes |
| Yale | Yes | Yes |
| Princeton | Yes | Yes |
| MIT | Yes | Yes |
| Dartmouth | Yes | Yes |
| Amherst | Yes | Yes |
| Notre Dame | Yes | Yes |
| Brown | Yes, from the Class of 2029, for applicants who apply for aid | Yes, if you apply for aid at admission |
| Bowdoin | Yes, for applicants who apply for aid | Yes, for those who apply |

Policies change; check each college's financial aid page before applying.

## How to apply for aid

1. Apply for aid at the same time as admission. Many colleges won't consider aid later.
2. Complete the **CSS Profile** (and any college-specific form) with your family's finances.
3. Use each college's **net price calculator** to estimate what you'd pay.
4. Request **application fee waivers**: international students with financial need can get Common App fee waivers.

## Other routes to a funded bachelor's

- [Lester B. Pearson](/scholarships/lester-b-pearson) at the University of Toronto
- [Mastercard Foundation Scholars](/scholarships/mastercard-foundation) for young Africans
- [MEXT](/scholarships/mext), [GKS](/scholarships/global-korea-scholarship), [Türkiye Bursları](/scholarships/turkiye-burslari), [Stipendium Hungaricum](/scholarships/stipendium-hungaricum), [Chinese Government Scholarship](/scholarships/chinese-government-scholarship)
- Tuition-free public universities in [Germany](/guides/study-in-germany-tuition-free)

## US visas

Nationals of 39 countries, including Nigeria, face US entry restrictions since 1 January 2026 that suspend new student visas. Check your country's position on our [study abroad by country](/study-abroad) pages.

## How Ivyward helps

Ivyward finds the colleges and scholarships you can realistically win given your record and finances, drafts your essays from your own facts, requests fee waivers, and fills in each application. You review and sign everything.
`,
  faq: [
    ["Which universities give full scholarships to international undergraduates?", "In the US, colleges that are need-blind for international students and meet full need, such as Harvard, Yale, Princeton, MIT, Dartmouth, Amherst and Notre Dame. Elsewhere, government scholarships like MEXT, GKS, Türkiye Bursları and Stipendium Hungaricum."],
    ["Is Harvard free for international students?", "Harvard is need-blind for international applicants and meets full demonstrated need, so admitted students from lower-income families can pay little or nothing. What you pay depends on your family's finances."],
  ],
  sources: [
    ["Oriel Admissions: need-blind and need-aware colleges for international students (2026)", "https://orieladmissions.com/need-blind-need-aware-international-students/"],
    NAFSA,
  ],
  related: ["how-to-apply-for-a-bachelors-degree-abroad", "how-to-get-application-fee-waivers", "scholarships/lester-b-pearson"],
};

// ---------- destinations ----------

export const france: Guide = {
  slug: "study-in-france",
  title: "Studying in France as an international student: Campus France, fees and scholarships",
  seoTitle: "Study in France for international students: Campus France, fees, Eiffel",
  description: "How the Campus France and Études en France procedure works, what non-EU students pay at public universities, and the scholarships that help, including Eiffel.",
  category: "Countries",
  updated: U,
  keywords: ["study in France", "Campus France", "Etudes en France", "France tuition fees non-EU", "Eiffel scholarship", "masters in France for international students"],
  answer:
    "Students from many countries apply to French universities through Campus France's Études en France platform, which also starts the visa process. Public universities charge non-EU students differentiated fees (recently around €2,900 a year for a bachelor's and €3,950 for a master's, with a rise announced for 2026/27 and exemptions for a share of students). Grandes écoles and business schools set their own, higher fees. The Eiffel scholarship pays a monthly allowance for strong master's and PhD students nominated by French institutions.",
  body: `
## How to apply

1. Check whether your country uses **Études en France** (Campus France's platform). Many countries in Africa, Asia and Latin America do.
2. Choose programmes and apply through the platform, or directly to schools that recruit outside it (many grandes écoles and business schools).
3. Attend the Campus France interview where required.
4. Apply for the long-stay student visa with proof of funds.

## Fees

- **Public universities, non-EU students:** differentiated fees, recently about €2,902 a year for a bachelor's and €3,950 for a master's. The government announced higher fees for 2026/27, and universities may exempt a share of international students (up to 30% in 2026/27, falling in later years).
- **Grandes écoles and business schools:** set their own fees, often much higher.

## Scholarships

- [Eiffel Excellence](/scholarships/eiffel-excellence): monthly allowance, travel and insurance, nominated by the French institution
- French embassy scholarships in many countries
- [Erasmus Mundus](/scholarships/erasmus-mundus) joint master's degrees with French partners
- University and school merit scholarships

## Language

Many master's programmes are taught in English, but most bachelor's programmes are in French. French-speaking applicants from West and Central Africa, North Africa and elsewhere have a wide choice.

## How Ivyward helps

Ivyward includes French programmes when France is one of your regions, prepares applications for Études en France or direct school portals, and matches you to Eiffel and other scholarships.
`,
  faq: [
    ["How much does it cost for international students to study in France?", "At public universities, non-EU students have recently paid about €2,902 a year for a bachelor's and €3,950 for a master's, with a rise announced for 2026/27. Grandes écoles and business schools charge more."],
    ["What is Études en France?", "Campus France's online platform that students from many countries use to apply to French higher education and start the visa process."],
  ],
  sources: [
    ["The Local: French universities to increase fees for international students (May 2026)", "https://www.thelocal.fr/20260527/french-universities-to-increase-fees-for-international-students"],
    ["Campus France", "https://www.campusfrance.org/en"],
  ],
  related: ["scholarships/eiffel-excellence", "scholarships/erasmus-mundus", "affordable-countries-to-study-abroad", "universities/hec-paris"],
};

export const sweden: Guide = {
  slug: "study-in-sweden",
  title: "Studying a master's in Sweden: University Admissions, fees and scholarships",
  seoTitle: "Master's in Sweden for international students: deadlines, SEK 900 fee, SISGP",
  description: "How to apply through University Admissions in Sweden, the application fee and deadlines for non-EU students, tuition, and the Swedish Institute and university scholarships.",
  category: "Countries",
  updated: U,
  keywords: ["study in Sweden", "masters in Sweden for international students", "University Admissions Sweden", "Swedish Institute scholarship", "Sweden application fee", "Sweden tuition non-EU"],
  answer:
    "You apply for Swedish master's degrees centrally through universityadmissions.se, choosing up to four programmes in one application. Non-EU/EEA applicants pay a SEK 900 application fee and, if admitted, tuition. The main round for autumn entry closes in mid-January, and the fee must arrive by its own deadline. The Swedish Institute Scholarships for Global Professionals and university scholarships cover tuition for some students.",
  body: `
## Applying

1. Create an account on **universityadmissions.se** and choose up to four master's programmes in priority order.
2. Upload transcripts, degree certificate, English proof and any programme-specific documents.
3. Pay the **SEK 900** application fee (non-EU/EEA applicants) by the fee deadline, or your application counts as late.
4. The main autumn round usually opens in mid-October and closes in mid-January; results come in late March or early April.

## Costs

Non-EU/EEA students pay tuition set by each university, plus living costs. You'll need proof of funds for the residence permit.

## Scholarships

- [Swedish Institute Scholarships for Global Professionals](/scholarships/swedish-institute-global-professionals): tuition, a living allowance, travel and insurance for professionals from eligible countries
- University tuition-fee waivers and scholarships, usually applied for alongside admission
- [Erasmus Mundus](/scholarships/erasmus-mundus) programmes with Swedish partners

## How Ivyward helps

Ivyward prepares your University Admissions application, keeps the fee and document deadlines in view, and matches you to SI and university scholarships.
`,
  faq: [
    ["How much is the application fee for Swedish universities?", "SEK 900 for non-EU/EEA applicants, paid through universityadmissions.se by the fee deadline."],
    ["When is the deadline to apply to Swedish universities?", "For autumn entry, the main round usually closes in mid-January. Check universityadmissions.se for the exact date."],
  ],
  sources: [["University Admissions in Sweden: pay your application fee", "https://universityadmissions.se/en/apply-to-masters/pay-your-application-fee-non-eueea-masters/"]],
  related: ["scholarships/swedish-institute-global-professionals", "scholarships/erasmus-mundus", "study-in-the-netherlands"],
};

export const japan: Guide = {
  slug: "study-in-japan",
  title: "Studying in Japan as an international student: MEXT, English-taught degrees and costs",
  seoTitle: "Study in Japan for international students: MEXT routes and English programmes",
  description: "How to study in Japan: the MEXT embassy and university routes, English-taught degree programmes, research student status, and costs.",
  category: "Countries",
  updated: U,
  keywords: ["study in Japan", "MEXT scholarship", "masters in Japan in English", "Japanese government scholarship", "research student Japan", "study in Japan for international students"],
  answer:
    "The main fully funded route to Japan is the MEXT (Japanese Government) scholarship, through the Japanese embassy in your country (usually applications in April to May) or through a Japanese university. Many graduate schools offer degree programmes taught in English, and research applicants often start as research students before entering a master's or PhD. A professor's agreement to supervise you is often the decisive step.",
  body: `
## Routes in

- **[MEXT](/scholarships/mext) embassy recommendation:** apply to the Japanese embassy; written tests and interview; then secure a university and supervisor.
- **MEXT university recommendation:** a Japanese university nominates you, often for English-taught programmes.
- **Direct admission:** apply to a programme and fund yourself or apply for university scholarships.

## Finding a supervisor

For research degrees, read faculty pages at your target universities, email professors whose work fits yours, and attach a short research plan. See [how to email a professor](/guides/how-to-email-a-professor).

## Language

Many graduate programmes are taught in English. Learning some Japanese helps daily life and is part of many MEXT schemes.

## How Ivyward helps

Ivyward finds English-taught programmes and supervisors whose research fits yours, drafts your research plan and emails from your record, and tracks MEXT and university deadlines.
`,
  faq: [
    ["Can I study in Japan in English?", "Yes. Many graduate programmes, and some bachelor's programmes, are taught in English."],
    ["When do MEXT applications open?", "For the embassy route, usually in April to May, about a year before you'd start. Check the Japanese embassy in your country."],
  ],
  sources: [["Study in Japan (JASSO): MEXT research students", "https://www.studyinjapan.go.jp/en/smap-stopj-applications-research.html"]],
  related: ["scholarships/mext", "how-to-email-a-professor", "fully-funded-phd-how-funding-works"],
};

export const korea: Guide = {
  slug: "study-in-south-korea",
  title: "Studying in South Korea: GKS scholarship, universities and costs",
  seoTitle: "Study in South Korea for international students: GKS and English programmes",
  description: "How to study in South Korea through the Global Korea Scholarship or direct admission, the embassy and university tracks, language training and costs.",
  category: "Countries",
  updated: U,
  keywords: ["study in Korea", "GKS scholarship", "Global Korea Scholarship", "masters in Korea for international students", "study in South Korea in English"],
  answer:
    "The main fully funded route to South Korea is the Global Korea Scholarship (GKS), applied for through the Korean embassy in your country or directly through a participating university, usually between February and March. It covers tuition, a monthly allowance, airfare and a year of Korean language training. Many Korean universities also admit international students directly with partial scholarships.",
  body: `
## GKS in brief

- Two tracks: **embassy** or **university**. You can't apply to both.
- Covers tuition, a monthly living allowance, airfare, a settlement allowance, medical insurance and a year of Korean language study.
- Graduate applicants must be under 40.

Full details on the [GKS profile](/scholarships/global-korea-scholarship).

## Direct admission

Universities run their own international admissions, usually twice a year (spring and autumn), often with tuition scholarships for strong applicants.

## How Ivyward helps

Ivyward matches you to GKS and university scholarships, drafts your study plan and personal statement from your record, and fills in each application.
`,
  faq: [["When is the GKS deadline?", "Usually February to March each year, set by the embassy or the university track you choose."]],
  sources: [["Study in Korea (NIIED)", "https://www.studyinkorea.go.kr/"]],
  related: ["scholarships/global-korea-scholarship", "study-in-japan", "how-to-write-a-scholarship-essay"],
};

export const china: Guide = {
  slug: "study-in-china",
  title: "Studying in China: Chinese Government Scholarship, English-taught programmes and applying",
  seoTitle: "Study in China for international students: CSC scholarship and how to apply",
  description: "How the Chinese Government Scholarship works (Type A through embassies, Type B through universities), English-taught programmes, and how to apply.",
  category: "Countries",
  updated: U,
  keywords: ["study in China", "Chinese Government Scholarship", "CSC scholarship", "masters in China in English", "study in China for African students"],
  answer:
    "Most international students who study in China on full funding hold the Chinese Government Scholarship, applied for through the Chinese embassy in their country (Type A) or directly through a designated university (Type B), usually between January and April for a September start. It covers tuition, housing, a monthly stipend and medical insurance, and many master's and PhD programmes are taught in English.",
  body: `
## Applying

1. Pick universities and programmes, ideally English-taught ones in your field.
2. Email a potential supervisor; a pre-admission or acceptance letter strengthens your application.
3. Apply on the Campus China portal with your embassy's or university's agency number.
4. Upload your study plan, two recommendation letters, transcripts and a physical examination form.

Details on the [Chinese Government Scholarship profile](/scholarships/chinese-government-scholarship).

## How Ivyward helps

Ivyward finds English-taught programmes that fit you, drafts your study plan and supervisor emails from your record, and tracks embassy and university deadlines.
`,
  faq: [["Do I need to speak Chinese to study in China?", "Not always. Many master's and PhD programmes are taught in English."]],
  sources: [["Campus China", "https://www.campuschina.org/"]],
  related: ["scholarships/chinese-government-scholarship", "how-to-email-a-professor", "affordable-countries-to-study-abroad"],
};

export const hungaryTurkey: Guide = {
  slug: "study-in-hungary-and-turkiye-on-scholarship",
  title: "Studying in Hungary or Türkiye on a government scholarship",
  seoTitle: "Stipendium Hungaricum and Türkiye Bursları: how to apply",
  description: "Two of the largest government scholarships for international students, side by side: who can apply, what they cover, deadlines and how to choose.",
  category: "Countries",
  updated: U,
  keywords: ["Stipendium Hungaricum", "Türkiye Bursları", "Turkey scholarship", "Hungary scholarship", "study in Hungary", "study in Turkey"],
  answer:
    "Stipendium Hungaricum (Hungary) and Türkiye Bursları (Türkiye) both fund bachelor's, master's and PhD study for thousands of international students a year, covering tuition, a monthly stipend, housing and insurance. Stipendium Hungaricum is for citizens of partner countries nominated by their home sending authority and usually closes in mid-January; Türkiye Bursları is open to all nationalities within age limits and usually closes in January to February.",
  body: `
| | Stipendium Hungaricum | Türkiye Bursları |
|---|---|---|
| Who can apply | Citizens of partner countries, nominated by the sending authority | All nationalities (not Turkish citizens), within age limits |
| Levels | Bachelor's, master's, PhD | Bachelor's, master's, PhD |
| Covers | Tuition, monthly stipend, housing contribution or dormitory, insurance | Tuition, monthly stipend, accommodation, insurance, one return flight, Turkish language year |
| Usual deadline | Mid-January | January to February |
| Language | Many programmes in English | Many programmes in Turkish after the language year; some in English |

Full profiles: [Stipendium Hungaricum](/scholarships/stipendium-hungaricum) and [Türkiye Bursları](/scholarships/turkiye-burslari).

## How to choose

Apply to both if you're eligible. Hungary suits applicants who want English-taught programmes within the EU; Türkiye suits applicants open to learning Turkish, with a wider range of universities.

## How Ivyward helps

Ivyward checks your eligibility for both, drafts your statements of purpose from your record, and tracks the sending-authority and portal deadlines.
`,
  faq: [["Can I apply for Stipendium Hungaricum and Türkiye Bursları in the same year?", "Yes. They're separate programmes with separate applications."]],
  sources: [
    ["Stipendium Hungaricum", "https://stipendiumhungaricum.hu/"],
    ["Türkiye Scholarships", "https://www.turkiyeburslari.gov.tr/"],
  ],
  related: ["scholarships/stipendium-hungaricum", "scholarships/turkiye-burslari", "affordable-countries-to-study-abroad"],
};

// ---------- fields ----------

function field(o: { slug: string; field: string; seo: string; keywords: string[]; answer: string; programs: string; awards: [string, string][]; tips: string[]; related: string[] }): Guide {
  return {
    slug: o.slug,
    title: `Scholarships for ${o.field} students: fully funded master's and PhD options`,
    seoTitle: o.seo,
    description: `The fully funded scholarships that suit ${o.field} applicants, what kinds of programmes to target, and how to make a strong case.`,
    category: "Funding",
    updated: U,
    keywords: o.keywords,
    answer: o.answer,
    body: `
## Programmes to target

${o.programs}

## Scholarships that suit ${o.field}

| Scholarship | Why it fits |
|---|---|
${o.awards.map(([a, b]) => `| ${a} | ${b} |`).join("\n")}

All of these change details each cycle; the profiles link to the official pages.

## Making a strong case

${o.tips.map((t) => `- ${t}`).join("\n")}

## How Ivyward helps

Ivyward shortlists ${o.field} programmes you can get into, checks each scholarship against your citizenship and record, drafts your statements from your own experience, and fills in every application. You review and sign.
`,
    faq: [[`What is the best scholarship for ${o.field}?`, `It depends on your citizenship and experience. ${o.awards.slice(0, 3).map(([a]) => a.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")).join(", ")} are strong starting points.`]],
    sources: [["Commonwealth Scholarship Commission: Master's Scholarships", "https://cscuk.fcdo.gov.uk/masters"], ["EACEA: Erasmus Mundus catalogue", "https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en"]],
    related: o.related,
  };
}

export const publicHealth = field({
  slug: "scholarships-for-public-health",
  field: "public health",
  seo: "Fully funded scholarships for public health (MPH, MSc, PhD) for international students",
  keywords: ["public health scholarships", "fully funded MPH", "MPH scholarships for international students", "global health masters scholarship", "public health PhD funding"],
  answer: "Public health is one of the best-funded fields for international students, because development-focused awards prioritise it: Commonwealth Master's, Chevening, DAAD EPOS, JJ/WBGSP and Erasmus Mundus all fund MPH and global health master's degrees. PhDs in epidemiology and biostatistics are commonly funded through research positions.",
  programs: "Master of Public Health (MPH), MSc in global health, epidemiology, health policy or health economics, and PhDs in epidemiology, biostatistics and health systems. UK one-year MSc programmes and European joint degrees are common choices.",
  awards: [
    ["[Commonwealth Master's](/scholarships/commonwealth-masters)", "Health is a core development theme"],
    ["[Chevening](/scholarships/chevening)", "Strong for professionals with health-sector leadership"],
    ["[DAAD EPOS](/scholarships/daad)", "Several public health courses are on the EPOS list"],
    ["[JJ/WBGSP](/scholarships/joint-japan-world-bank)", "Health policy for development professionals"],
    ["[Erasmus Mundus](/scholarships/erasmus-mundus)", "Several joint master's degrees in public health"],
    ["[Gates Cambridge](/scholarships/gates-cambridge)", "Social impact focus"],
  ],
  tips: ["Show a specific health problem you've worked on and the measurable result", "Link the degree to a role in your health system", "Name the methods (epidemiology, biostatistics, health economics) you need to learn"],
  related: ["scholarships/commonwealth-masters", "fully-funded-masters-scholarships-international-students", "how-to-write-a-scholarship-essay"],
});

export const engineeringCs = field({
  slug: "scholarships-for-engineering-and-computer-science",
  field: "engineering and computer science",
  seo: "Scholarships for engineering and computer science master's and PhDs (international)",
  keywords: ["engineering scholarships for international students", "computer science scholarships", "fully funded masters in computer science", "data science scholarship", "PhD in computer science funding", "STEM scholarships abroad"],
  answer: "Engineering and computer science PhDs are usually fully funded through research and teaching assistantships, especially in the US and Canada, and as salaried positions in Germany, the Netherlands and the Nordics. For master's degrees, the best routes are government scholarships (Chevening, DAAD, Erasmus Mundus, MEXT, GKS), assistantships at large public universities, and tuition-free study in Germany.",
  programs: "MSc and MEng in computer science, data science, AI, electrical, mechanical, civil and chemical engineering; thesis-based master's in Canada; PhDs in the US, Canada and Europe.",
  awards: [
    ["[Graduate assistantships](/guides/graduate-assistantships-explained)", "Most US and Canadian engineering PhDs are funded this way"],
    ["[DAAD](/scholarships/daad)", "Germany's tuition-free engineering master's plus a stipend"],
    ["[Erasmus Mundus](/scholarships/erasmus-mundus)", "Joint master's in data science, robotics, energy and more"],
    ["[MEXT](/scholarships/mext) and [GKS](/scholarships/global-korea-scholarship)", "Strong engineering research in Japan and Korea"],
    ["[Chevening](/scholarships/chevening)", "Tech leaders and engineers with two years' experience"],
    ["[ETH Zurich ESOP](/universities/eth-zurich)", "Excellence scholarships for master's students"],
  ],
  tips: ["For PhDs, contact professors with funded projects before applying", "Show projects, code or publications, not just grades", "Apply to programmes with assistantships and tick the funding box"],
  related: ["fully-funded-phd-how-funding-works", "graduate-assistantships-explained", "study-in-germany-tuition-free"],
});

export const businessLaw = field({
  slug: "scholarships-for-business-and-law",
  field: "business, economics and law",
  seo: "Scholarships for business, MBA, economics and law for international students",
  keywords: ["MBA scholarships for international students", "economics scholarships", "LLM scholarship", "law masters scholarship", "business school scholarships", "fully funded MBA"],
  answer: "Business and law degrees are rarely funded by departments, so the money comes from merit scholarships at admission (larger in early rounds), government scholarships that accept these fields (Chevening funds many one-year UK MBAs, MSc economics and LLM degrees), Knight-Hennessy at Stanford, and school-specific fellowships for applicants from particular regions.",
  programs: "MBA, Master in Management, MSc in finance, economics or development economics, and LLM degrees. One-year UK and European programmes keep total cost down.",
  awards: [
    ["[Chevening](/scholarships/chevening)", "Funds many UK one-year MBAs, LLMs and economics master's"],
    ["[Knight-Hennessy](/scholarships/knight-hennessy)", "Covers Stanford MBA and JD"],
    ["[Commonwealth Master's](/scholarships/commonwealth-masters)", "Development economics and governance courses"],
    ["[JJ/WBGSP](/scholarships/joint-japan-world-bank)", "Economic policy for development professionals"],
    ["School merit awards", "Apply in round 1 or 2 for the most money; see our [MBA guide](/guides/mba-application-guide)"],
  ],
  tips: ["Apply in early rounds, where scholarship budgets are largest", "Quantify impact in every role", "For law, connect the LLM to a specific area of practice at home"],
  related: ["mba-application-guide", "how-to-ask-for-more-financial-aid", "scholarships/chevening"],
});

export const agricultureEducation = field({
  slug: "scholarships-for-agriculture-environment-and-education",
  field: "agriculture, environment and education",
  seo: "Scholarships for agriculture, environment, climate and education master's degrees",
  keywords: ["agriculture scholarships", "environmental science scholarship", "climate change masters scholarship", "education masters scholarship international", "food security scholarship"],
  answer: "Agriculture, environment, climate and education are priority fields for development-focused scholarships: Commonwealth, DAAD EPOS, JJ/WBGSP, Erasmus Mundus and Chevening all fund master's degrees in these areas, and US land-grant universities often fund graduate students in agriculture and environmental science through assistantships.",
  programs: "MSc in agricultural economics, agronomy, food security, environmental management, climate policy, water resources, and MA or MEd in education policy and leadership.",
  awards: [
    ["[Commonwealth Master's](/scholarships/commonwealth-masters)", "Climate, food security and education are core themes"],
    ["[DAAD EPOS](/scholarships/daad)", "Many agriculture, water and environment courses"],
    ["[Erasmus Mundus](/scholarships/erasmus-mundus)", "Joint degrees in environment, water and sustainable food systems"],
    ["[JJ/WBGSP](/scholarships/joint-japan-world-bank)", "Development-focused programmes"],
    ["[Graduate assistantships](/guides/graduate-assistantships-explained)", "Common at US land-grant universities such as [Auburn](/universities/auburn)"],
  ],
  tips: ["Describe the specific problem in your community or sector, with numbers", "Show field or teaching experience", "Tie the degree to a role in government, an NGO or a school system at home"],
  related: ["scholarships/commonwealth-masters", "scholarships/daad", "graduate-assistantships-explained"],
});
