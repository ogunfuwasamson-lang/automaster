import type { Guide } from "../types";

// questions applicants everywhere put to Google and to AI assistants once they're serious: low grades, converting
// a GPA, english without IELTS, the GRE, intakes, costs, age limits, gaps, offers and course length. written for
// every country, with the rules that differ by destination spelled out.

export const lowGpa: Guide = {
  slug: "masters-abroad-with-low-gpa",
  title: "Master's abroad with a low GPA or a 2:2: what's realistic and how to apply",
  seoTitle: "Master's abroad with a low GPA or 2:2: how to get in",
  description: "Can you get a master's abroad with a 2:2, a third class or a GPA under 3.0? Which countries and schools are realistic, what to show instead of grades, and how funding changes.",
  category: "Applying",
  updated: "2026-11-14",
  keywords: ["masters with low gpa", "masters abroad with 2:2", "masters with second class lower", "can I do a masters with a third class", "masters with 2.5 gpa", "grad school low gpa international student", "masters with low grades"],
  answer:
    "Yes, often. Many universities in the UK, Canada, Australia, Ireland and Germany admit applicants with a lower second (2:2) or a GPA around 2.5 to 3.0, especially with relevant work experience, a strong statement and good recent results. What changes is the list: fewer top-ranked schools, and fewer fully funded places, because merit funding goes to the strongest grades. A third class or pass degree is harder but not closed: look for pre-master's or postgraduate diploma routes and programmes that weigh experience.",
  body: `
## What schools actually look at

Grades are one signal, not the only one. Admissions committees also read:

- **Your last two years**: an upward trend, or strong marks in the courses closest to the master's, can outweigh a weak first year.
- **Work experience**: two or more years in the field changes how a 2:2 reads, especially for business, public policy, public health and engineering management.
- **Test scores**: a good GRE or GMAT can offset a low GPA at schools that use them.
- **Your statement and references**: a clear reason for the weak grades (illness, work while studying, family duty) explained once, briefly, without excuses.

## Where a 2:2 or low GPA is realistic

- **United Kingdom**: many universities state a 2:1 but accept a 2:2 with experience, or list a 2:2 outright. Read each course's entry requirements and the country-specific equivalents page.
- **Canada and Australia**: course-based (non-thesis) master's are usually more flexible than research master's. Some ask for a minimum average in the last two years only.
- **Germany and the Netherlands**: requirements are often set by modules and credits rather than a classification. A low overall grade with the right courses can qualify.
- **United States**: many programmes list 3.0 as a guideline, not a cut-off. Holistic review is common; a strong GRE and experience help.

## Routes when your grades are well below the bar

- **Pre-master's or graduate diploma**: a one-term or one-year bridge that leads to the master's if you pass at a set grade.
- **Postgraduate certificate or diploma first**: do well, then transfer the credits into the master's.
- **Professional experience first**: two or three years of relevant work makes many programmes reachable.

## Funding with a low GPA

Merit scholarships and fully funded places mostly go to top grades. Realistic funding is: need-based awards, external scholarships that weigh leadership and impact (some government scholarships care more about experience than grades), employer sponsorship, and graduate assistantships in the US once you're admitted.

## How Ivyward helps

Ivyward's agents build a shortlist that fits your actual record: they read each programme's entry rules and sort schools into reach, match and safer bets, so you don't spend application fees on schools that will reject you on grades alone. See the [shortlist guide](/guides/how-to-build-a-university-shortlist).
`,
  faq: [
    ["Can I get a master's in the UK with a 2:2?", "Yes, at many universities. Some list a 2:2 as the minimum; others accept it with relevant work experience. Check each course's entry requirements and the international equivalents for your country."],
    ["Is a 2.5 GPA enough for a master's in the USA?", "For some programmes, yes. Many treat 3.0 as a guideline and review the whole application. A strong GRE, relevant experience and good recent grades make the difference."],
    ["Can I get a scholarship with a low GPA?", "Merit scholarships are hard, but external awards that weigh leadership, work and impact, need-based aid, employer sponsorship and US assistantships after admission are all possible."],
    ["Should I explain my low grades in my statement?", "Yes, once and briefly, with the real reason and evidence you've moved past it (recent results, work, a course you took since). Don't make it the centre of the statement."],
  ],
  sources: [
    ["UCAS: postgraduate entry requirements", "https://www.ucas.com/postgraduate"],
    ["EducationUSA: graduate admissions", "https://educationusa.state.gov/"],
    ["DAAD: requirements for study in Germany", "https://www2.daad.de/deutschland/en/"],
  ],
  related: ["how-to-build-a-university-shortlist", "statement-of-purpose-guide", "convert-gpa-to-us-4-scale"],
};

export const gpaConvert: Guide = {
  slug: "convert-gpa-to-us-4-scale",
  title: "How to convert your grades to a US 4.0 GPA, from any country's system",
  seoTitle: "Convert your grades to a US 4.0 GPA (any country)",
  description: "How grade conversion to the US 4.0 scale works for UK classes, percentages, 5-point and 10-point CGPAs, 20-point and 1-to-5 scales, when to convert at all, and which tools schools trust.",
  category: "Applying",
  updated: "2026-11-14",
  keywords: ["convert gpa to 4.0 scale", "cgpa to gpa conversion", "convert percentage to gpa", "uk degree class to gpa", "5 point cgpa to 4 point gpa", "10 point cgpa to 4 point", "wes gpa calculator"],
  answer:
    "Usually you don't convert at all: most applications ask for your grades on your own university's scale, and the school or a credential evaluator converts them. When a form insists on a 4.0 figure, convert course by course (each grade to its US letter-grade value, weighted by credits), not by dividing your overall average. WES's free iGPA calculator does this for most countries, and its result is the number US schools are most likely to recognise.",
  body: `
## Do you need to convert?

- **Most portals** ask for your GPA "on your institution's scale" plus the maximum (for example 3.9 out of 5.0, or 72%). Enter exactly what's on your transcript.
- **Some forms** ask for a US-equivalent GPA. Use a recognised method and say which one if there's a box for it.
- **Some schools** require an official evaluation (WES, ECE or similar). Then the evaluator's figure is the one that counts.

## The right way: course by course

1. Take each course on your transcript and its credit units.
2. Convert each grade to the US value with a published table for your country (A = 4.0, B = 3.0, C = 2.0, D = 1.0, F = 0 is the US side).
3. Multiply by the credits, add them up, and divide by the total credits.

Dividing your overall average by your scale's maximum and multiplying by 4 (for example 3.6 ÷ 5 × 4) gives a different and usually lower number than evaluators do, because grading curves differ between countries.

## Common systems, roughly

These are rough guides only. Evaluators use their own tables, and your university's grading key matters.

- **UK degree classes**: a First is usually treated in the upper range (around 3.7 to 4.0), a 2:1 around 3.3 to 3.6, and a 2:2 around 2.7 to 3.0.
- **Percentages (South Asia, China, parts of the Middle East)**: the mapping depends on the country's grading norms; 60% can be strong in one system and average in another. Use an evaluator's table.
- **5-point CGPA (common in West Africa)** and **10-point CGPA (common in India)**: convert each course grade on the transcript's key, not the final CGPA.
- **1.0 to 5.0 (Germany and others, where 1.0 is best)** and **0 to 20 (France and others)**: these run differently from US grades; a 14/20 in France is a good mark. Always quote the original alongside any conversion.

## Tools schools trust

- **WES iGPA calculator**: free, country by country, follows WES's own rules.
- **An official evaluation (WES, ECE, SpanTran)**: costs a fee; required by some US and Canadian schools.

## How Ivyward helps

Ivyward reads your transcript, keeps your grades exactly as your university reports them, and fills in each portal's GPA fields the way that school asks: original scale where it wants that, the converted figure where it wants that. See [WES credential evaluation](/guides/wes-credential-evaluation).
`,
  faq: [
    ["How do I convert a 5-point CGPA to a 4-point GPA?", "Convert each course grade using your transcript's grading key and a published table, weight by credits, and average. Dividing the CGPA by 5 and multiplying by 4 is a rough shortcut that usually comes out lower than evaluators' figures."],
    ["What is a 2:1 in GPA?", "Roughly 3.3 to 3.6 on the US scale, but evaluators and schools use their own tables. Quote '2:1 (Upper Second Class Honours)' and let the school convert where it can."],
    ["Should I report my converted GPA or my original grades?", "Your original grades, on your university's scale, unless the form asks specifically for a US-equivalent figure."],
    ["Is the WES GPA calculator accurate?", "It follows WES's own conversion rules, which many US schools recognise, but an official WES evaluation can differ slightly once WES sees your full transcript."],
  ],
  sources: [
    ["WES iGPA calculator", "https://applications.wes.org/igpa-calculator/"],
    ["WES: credential evaluation", "https://www.wes.org/"],
  ],
  related: ["wes-credential-evaluation", "masters-abroad-with-low-gpa", "apply-to-us-universities-as-an-international-student"],
};

export const moiLetter: Guide = {
  slug: "medium-of-instruction-letter",
  title: "Medium of instruction (MOI) letter: what it is, who accepts it, and how to get one",
  seoTitle: "Medium of instruction letter: how to get one (with email)",
  description: "An English-medium (MOI) letter can replace IELTS or TOEFL at many universities. What it must say, which schools accept it, and the email to send your university, with a template.",
  category: "Applying",
  updated: "2026-11-14",
  keywords: ["medium of instruction letter", "moi letter", "english proficiency letter from university", "study abroad without ielts moi", "how to get medium of instruction certificate", "english medium certificate sample"],
  answer:
    "A medium of instruction (MOI) letter is an official letter from your university confirming that your degree was taught and assessed in English. Many universities in the US, Canada, the UK, Europe and Asia accept it instead of IELTS or TOEFL, some outright and some case by case. Ask your university's registry or exams office for it on letterhead, signed and stamped, naming your degree, your years of study and that instruction and assessment were in English. Request it early: it can take weeks.",
  body: `
## What the letter must say

- Your full name as on your passport, and your student or matriculation number
- The degree, the field and the years you studied
- That **the medium of instruction and assessment** for the whole programme was English
- The university's letterhead, an official signature and stamp, and the date

Some schools want it sent directly by your university, or sealed. Check each school's instructions.

## Who accepts it

- **Many US and Canadian universities** waive the English test for graduates of degrees taught in English, sometimes only from countries where English is an official language, sometimes from any country with an MOI letter.
- **UK universities** often accept a degree from a majority English-speaking country, and some accept an MOI letter from other countries case by case. The Student visa has its own English rules: check whether the university can assess your English itself.
- **European and Asian universities** teaching in English frequently accept MOI letters.

Our programme lists show which schools accept it, for example [in Canada](/programmes/canada/english-medium-letter) and [in the US](/programmes/usa/english-medium-letter).

## When it won't work

- The programme lists only test scores and says no waivers
- A scholarship sets its own English rule (some government scholarships require a test)
- A visa route asks for a specific approved test

## The email to send your registry

> Subject: Request for a medium of instruction letter
>
> I graduated with [degree] in [field] from [university] in [year]. I am applying for postgraduate study abroad, and the universities ask for an official letter confirming that English was the medium of instruction for my degree. Could you please issue a letter on university letterhead, signed and stamped, stating that the medium of instruction and assessment for my programme was English? I'm happy to pay any fee and provide my matriculation number.

## How Ivyward helps

When you choose the English-medium route, Ivyward writes this email from your own degree details, adds the letter to every application that accepts it, and tells you which schools on your list need a test instead.
`,
  faq: [
    ["Is an MOI letter the same as an English proficiency certificate?", "Usually yes: universities use both names for a letter from your university confirming your degree was taught in English. Check what each school calls it and what it must contain."],
    ["Do UK universities accept a medium of instruction letter?", "Some do, case by case, and many automatically accept degrees from majority English-speaking countries. The visa can have its own English rule, so check with the university."],
    ["How long does it take to get an MOI letter?", "From a few days to several weeks, depending on your university. Request it as soon as you start applying."],
    ["Can an MOI letter replace IELTS for a scholarship?", "Sometimes. Scholarships set their own rules, and some require a recognised test. Read the scholarship's language requirement separately from the university's."],
  ],
  sources: [
    ["UKCISA: English language requirements", "https://www.ukcisa.org.uk/"],
    ["EducationUSA: English proficiency", "https://educationusa.state.gov/"],
  ],
  related: ["gre-gmat-ielts-waivers", "study-in-canada-without-ielts", "study-in-the-uk-without-ielts"],
};

export const canadaNoIelts: Guide = {
  slug: "study-in-canada-without-ielts",
  title: "Study in Canada without IELTS: the routes that work for a master's",
  seoTitle: "Study in Canada without IELTS (master's, 2027)",
  description: "How to apply to Canadian master's programmes without IELTS: English-medium letters, country waivers, other accepted tests (TOEFL, Duolingo, PTE, CAEL) and what the study permit needs.",
  category: "Countries",
  updated: "2026-11-14",
  keywords: ["study in canada without ielts", "canadian universities without ielts for masters", "masters in canada without ielts", "ielts waiver canada", "canada universities that accept moi", "duolingo accepted universities canada"],
  answer:
    "Yes. Many Canadian universities waive the English test for master's applicants whose previous degree was taught in English, either from listed countries or with a medium of instruction letter, and many accept other tests such as TOEFL, Duolingo, PTE or CAEL instead of IELTS. The study permit itself doesn't require an IELTS score for most university students; the university's admission decision is what counts. Check each programme's English page: rules differ between universities and even between departments.",
  body: `
## Four ways in without IELTS

1. **Waiver for an English-taught degree.** Many universities list countries whose degrees count automatically. Others accept a [medium of instruction letter](/guides/medium-of-instruction-letter) from any country.
2. **Another test.** TOEFL iBT, Duolingo English Test, PTE Academic and CAEL are widely accepted. Check minimum scores per programme.
3. **Work or study in English.** Some programmes accept recent study or work in an English-speaking country.
4. **Conditional admission or pathway.** Some universities admit you on condition of completing their English programme first.

## What the study permit needs

For most university students, IRCC relies on the acceptance letter from a designated learning institution and doesn't set its own IELTS requirement. Master's and PhD students at public institutions are exempt from the provincial attestation letter, and the proof of funds for a single applicant outside Québec is CA$23,448 for applications from 1 September 2026, plus first-year tuition.

## Where to start

Our list of [Canadian programmes that accept an English-medium letter](/programmes/canada/english-medium-letter) shows the ones our agents have checked, with deadlines and tuition. The full [Canadian master's list](/programmes/canada) shows the test policy for each.

## How Ivyward helps

Ivyward reads each programme's English rules for you, flags where your degree qualifies for a waiver, writes the MOI request to your university, and only books you into a test when your shortlist really needs one.
`,
  faq: [
    ["Which Canadian universities don't require IELTS for a master's?", "Many waive it for applicants with an English-taught degree, and most accept TOEFL, Duolingo, PTE or CAEL instead. See our list of programmes that accept an English-medium letter."],
    ["Do I need IELTS for a Canadian study permit?", "For most university students, no: the visa relies on the university's admission. Some routes (for example SDS in the past, or certain colleges) had their own rules, so check IRCC's current instructions."],
    ["Is Duolingo accepted in Canada?", "By many universities, yes, though not all, and minimum scores vary by programme."],
    ["How much money do I need for a Canadian study permit?", "For a single applicant outside Québec, CA$23,448 for living costs for applications from 1 September 2026, plus your first year's tuition."],
  ],
  sources: [
    ["IRCC: study permit", "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html"],
    ["IRCC: proof of financial support", "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents.html"],
    ["CIC News: proof of funds from 1 September 2026", "https://www.cicnews.com/2026/08/canada-hikes-funds-needed-by-study-permit-applicants-0879805.html"],
  ],
  related: ["apply-for-masters-in-canada", "medium-of-instruction-letter", "gre-gmat-ielts-waivers"],
};

export const ukNoIelts: Guide = {
  slug: "study-in-the-uk-without-ielts",
  title: "Study in the UK without IELTS: what universities and the Student visa accept",
  seoTitle: "Study in the UK without IELTS (2027 entry)",
  description: "How to study in the UK without IELTS: degrees from English-speaking countries, MOI letters, university-assessed English, other tests, and how the Student visa's English rule works.",
  category: "Countries",
  updated: "2026-11-14",
  keywords: ["study in uk without ielts", "uk universities without ielts", "masters in uk without ielts", "uk student visa without ielts", "ielts waiver uk universities", "uk universities that accept moi"],
  answer:
    "Often, yes. For the Student visa, a university that is a licensed sponsor can assess your English itself for degree-level study, so many universities accept a previous degree taught in English, a medium of instruction letter from some countries, or other tests instead of IELTS. Nationals of majority English-speaking countries are exempt. What each university accepts differs, so read its country-specific English page before you apply.",
  body: `
## How the English rule works

- **Nationals of majority English-speaking countries** (as listed by the Home Office) don't need to prove English.
- **A degree taught in English** in a majority English-speaking country usually counts. Degrees taught in English elsewhere often count too, with an MOI letter, at the university's discretion.
- **University-assessed English**: for degree-level courses, the university can make its own assessment, which is why many accept the Duolingo English Test, TOEFL, PTE or an interview.
- **Secure English Language Tests (SELT)** such as IELTS for UKVI are needed for some routes and for courses below degree level.

## Money and the Graduate route

From 30 November 2026 the Student visa requires £1,570 a month for living costs in London or £1,203 a month elsewhere, for up to nine months, on top of fees. The Graduate route after your degree shortens to 18 months for applications from 1 January 2027.

## Where to start

Our list of [UK programmes that accept an English-medium letter](/programmes/uk/english-medium-letter) and the [UK master's list](/programmes/uk) show what our agents have checked, with deadlines and fees.

## How Ivyward helps

Ivyward checks each course's English rules against your degree and passport, writes the MOI request where it helps, and fills in the English section of each application the way that university asks.
`,
  faq: [
    ["Can I get a UK Student visa without IELTS?", "Yes, if your university assesses your English for degree-level study, or you're a national of a majority English-speaking country, or you hold a degree taught in English that the university accepts."],
    ["Do UK universities accept Duolingo?", "Many do for degree-level courses, but not all. Check each university's English requirements page."],
    ["How much money do I need for a UK Student visa?", "From 30 November 2026: £1,570 a month in London or £1,203 a month elsewhere, for up to nine months, plus any unpaid tuition."],
  ],
  sources: [
    ["GOV.UK: Student visa, knowledge of English", "https://www.gov.uk/student-visa/knowledge-of-english"],
    ["GOV.UK: Student visa, money", "https://www.gov.uk/student-visa/money"],
    ["UKCISA: English language requirements", "https://www.ukcisa.org.uk/"],
  ],
  related: ["apply-for-masters-in-the-uk", "medium-of-instruction-letter", "student-visa-proof-of-funds"],
};

export const usaNoIelts: Guide = {
  slug: "study-in-the-usa-without-ielts",
  title: "Study in the USA without IELTS or TOEFL: waivers and alternatives",
  seoTitle: "Study in the USA without IELTS or TOEFL (2027)",
  description: "How US universities waive English tests: English-taught degrees, MOI letters, Duolingo and other tests, and what the F-1 visa interview expects.",
  category: "Countries",
  updated: "2026-11-14",
  keywords: ["study in usa without ielts", "us universities without toefl", "masters in usa without ielts", "toefl waiver usa", "duolingo accepted universities usa", "us universities accept moi letter"],
  answer:
    "Yes. Many US graduate schools waive TOEFL and IELTS for applicants whose degree was taught in English, from listed countries or with a medium of instruction letter, and many accept the Duolingo English Test. The F-1 visa doesn't set its own test score: the consular officer can still judge your English in the interview, so be ready to speak comfortably about your plans.",
  body: `
## How waivers work in the US

- **Country lists**: many graduate schools waive the test for degrees from listed English-speaking countries.
- **MOI letters**: some accept a [medium of instruction letter](/guides/medium-of-instruction-letter) from any country; others don't. It's set per school, sometimes per department.
- **Other tests**: the Duolingo English Test is widely accepted; TOEFL iBT remains the default; IELTS Academic and PTE are accepted at many schools.

## The visa

There's no fixed English score for an F-1 visa, but the interview is in English. Check whether your nationality is under the US entry restrictions in force since 1 January 2026 before you invest in US applications.

## Where to start

Our list of [US programmes that accept an English-medium letter](/programmes/usa/english-medium-letter) and the [US programmes without the GRE](/programmes/usa/without-gre) show what our agents have checked.

## How Ivyward helps

Ivyward reads each school's English and test policies, applies for the waivers you qualify for, and only plans a test when your shortlist really needs it.
`,
  faq: [
    ["Which US universities don't require TOEFL?", "Many graduate schools waive it for degrees taught in English, especially from listed countries, and some accept MOI letters. Policies differ by school and department."],
    ["Is the Duolingo English Test accepted in the USA?", "By many universities, yes, though not all and not always for every programme."],
    ["Do I need IELTS for a US student visa?", "No set score is required for the F-1 visa, but the interview is in English and your I-20 depends on the university's admission."],
  ],
  sources: [
    ["EducationUSA", "https://educationusa.state.gov/"],
    ["US Department of State: student visa", "https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html"],
  ],
  related: ["apply-to-us-universities-as-an-international-student", "medium-of-instruction-letter", "masters-in-usa-without-gre"],
};

export const noGre: Guide = {
  slug: "masters-in-usa-without-gre",
  title: "Master's in the USA without the GRE: how common it is and how to choose",
  seoTitle: "Master's in the USA without the GRE (2027 list)",
  description: "Most US master's programmes no longer require the GRE. Which ones still do, when an optional score still helps, how waivers work, and a checked list of programmes.",
  category: "Applying",
  updated: "2026-11-14",
  keywords: ["masters in usa without gre", "gre not required universities", "gre optional masters", "mba without gmat usa", "gre waiver", "no gre masters programs"],
  answer:
    "Since 2020 a large share of US master's programmes have made the GRE optional or dropped it. Of the US graduate programmes our agents have checked, most don't require it. Top research-heavy and quantitative programmes, and some funding decisions, still use it. If a programme is 'optional' and your grades are average, a good score can still help, especially for scholarships or assistantships.",
  body: `
## Required, optional, waivable

- **Not required**: the school doesn't look at scores, or says not to send them.
- **Optional**: send a score only if it strengthens your application.
- **Waivable**: required unless you meet conditions (a high GPA, years of experience, a prior graduate degree), usually on a form.
- **Required**: still common in some quantitative and research programmes, and in some MBA programmes for the GMAT.

## When to take it anyway

- Your grades are below the programme's typical range
- You're applying for merit funding or an assistantship
- Your degree is from a university admissions committees may not know well

## A checked list

Our list of [US programmes that don't require the GRE](/programmes/usa/without-gre) is updated as our agents check each programme's admissions page: deadline, tuition and test policy side by side. There's also one for [Canada](/programmes/canada/without-gre).

## How Ivyward helps

Ivyward records each programme's test rule, asks for waivers where you qualify, and plans a test only if the schools you most want require it. See the [test waivers guide](/guides/gre-gmat-ielts-waivers).
`,
  faq: [
    ["Do US universities still require the GRE?", "Most master's programmes don't anymore; some quantitative and research programmes, and some funding decisions, still do."],
    ["Should I take the GRE if it's optional?", "Take it if your grades are below the programme's usual range or you're competing for merit funding. Otherwise you can usually skip it."],
    ["Can I get an MBA without the GMAT?", "Yes, many MBA programmes offer test waivers based on experience or prior degrees, and some accept the GRE or the Executive Assessment instead."],
  ],
  sources: [
    ["ETS: GRE General Test", "https://www.ets.org/gre.html"],
    ["EducationUSA: graduate admissions", "https://educationusa.state.gov/"],
  ],
  related: ["gre-gmat-ielts-waivers", "apply-to-us-universities-as-an-international-student", "study-in-the-usa-without-ielts"],
};

export const januaryIntake: Guide = {
  slug: "january-intake-universities",
  title: "January intake 2027: universities that start in January, and when to apply",
  seoTitle: "January 2027 intake: where to apply and deadlines",
  description: "Which countries and universities take master's students in January (UK, Canada, Australia, Ireland, parts of Europe and the US), when applications close, and how visas and funding differ from the autumn intake.",
  category: "Applying",
  updated: "2026-11-14",
  keywords: ["january intake 2027", "january intake uk universities", "january intake canada masters", "winter intake 2027", "spring intake usa masters", "february intake australia"],
  answer:
    "Many UK universities run a January start for taught master's, Canadian universities have a winter (January) intake for some programmes, Australia's main intakes start in February and July, and US universities have a spring (January) start for some programmes. Applications for January usually close between September and November, often earlier for international students because of visa time. Funding is thinner in January, so if you need a scholarship, the autumn intake gives you more options.",
  body: `
## Where January works

- **United Kingdom**: a good number of taught master's, especially business, computing and health, start in January or February. Some close in October or November.
- **Canada**: some course-based master's and many college programmes start in January. Fewer research master's do.
- **Australia and New Zealand**: the main intakes start around February/March and July.
- **United States**: spring starts exist for some master's programmes; most funding is tied to autumn.
- **Europe**: most programmes start in September; a few business schools and Erasmus partners start in February.

## The timeline for a January start

- **August to October**: apply (international deadlines are often earlier)
- **October to November**: offer, deposit, CAS or I-20 or acceptance letter
- **November to December**: visa application; allow at least three weeks, more in peak season

## Funding

Many scholarships and assistantships are tied to the autumn intake. If you need full funding, apply for autumn and use the extra months to strengthen your application.

## How Ivyward helps

Ivyward's [deadline lists by month](/deadlines) show what's closing soon, and its agents start each application early enough to finish before the visa deadline.
`,
  faq: [
    ["Is it too late to apply for January 2027?", "For some UK and Canadian programmes it's still possible in November, but many international deadlines have passed. Check each programme now, and plan the visa time."],
    ["Are there scholarships for the January intake?", "Fewer than for autumn. Some universities run January scholarships, but most large funding rounds are for September starts."],
    ["Which UK universities have a January intake?", "Many, especially for business, computing, engineering management and health. Check each university's course page for start dates."],
  ],
  sources: [
    ["UCAS: postgraduate study", "https://www.ucas.com/postgraduate"],
    ["EduCanada", "https://www.educanada.ca/"],
    ["Study Australia", "https://www.studyaustralia.gov.au/"],
  ],
  related: ["application-deadlines-2027-intake", "fall-2027-application-timeline", "apply-for-masters-in-the-uk"],
};

export const costByCountry: Guide = {
  slug: "cost-of-masters-abroad-by-country",
  title: "How much a master's abroad costs, country by country (2027)",
  seoTitle: "Cost of a master's abroad by country (2027 guide)",
  description: "Tuition ranges and the official living-cost figures for student visas in the UK, Canada, Germany, the US and more, so you can budget a master's abroad before you apply.",
  category: "Funding",
  updated: "2026-11-14",
  keywords: ["cost of masters abroad", "cheapest country for masters", "how much does a masters in canada cost", "masters in uk cost for international students", "cost of studying in germany", "study abroad budget"],
  answer:
    "Budget for two things: tuition, and the living costs the visa makes you prove. For example, the UK Student visa requires £1,570 a month in London or £1,203 elsewhere (from 30 November 2026), Canada asks a single applicant outside Québec to show CA$23,448 plus first-year tuition (from 1 September 2026), and Germany asks for a blocked account of €11,904 a year, with little or no tuition at public universities. US costs vary the most: published cost of attendance, often US$40,000 to US$90,000 a year, before any funding.",
  body: `
## Tuition, by destination

- **United Kingdom**: one-year master's, typically around £15,000 to £40,000 for international students, more for top business and medicine.
- **Canada**: often CA$20,000 to CA$60,000 a year; many master's run one to two years.
- **United States**: wide range; research master's and PhDs are often funded, professional master's rarely.
- **Germany**: most public universities charge no tuition, only a semester fee; Baden-Württemberg charges non-EU students.
- **Rest of Europe**: from low fees in some countries to €15,000+ in the Netherlands and Ireland.
- **Australia**: often A$30,000 to A$50,000 a year.

Our [programme lists](/programmes) show the tuition each school publishes, with the median by country.

## Living costs the visa requires

- **UK**: £1,570 a month in London or £1,203 elsewhere, for up to nine months (from 30 November 2026).
- **Canada**: CA$23,448 for a single applicant outside Québec (from 1 September 2026), plus tuition.
- **Germany**: €11,904 a year in a blocked account.
- **US**: the cost of attendance on your I-20, which the school sets.

## Ways to lower it

- [Fee waivers](/guides/how-to-get-application-fee-waivers) for application fees
- [Fully funded master's scholarships](/guides/fully-funded-masters-scholarships-international-students)
- [Graduate assistantships](/guides/graduate-assistantships-explained) in the US
- [Affordable countries](/guides/affordable-countries-to-study-abroad)

## How Ivyward helps

Ivyward shows the tuition and funding outlook for every programme on your shortlist, asks for fee waivers, and finds scholarships you qualify for, so you can compare the real cost before you apply.
`,
  faq: [
    ["What is the cheapest country to do a master's abroad?", "Germany's public universities, with little or no tuition, are among the cheapest; you still need the blocked account for living costs. Some countries in Central Europe and Asia are also low cost."],
    ["How much money do I need for a UK student visa?", "From 30 November 2026: £1,570 a month in London or £1,203 a month elsewhere for up to nine months, plus any unpaid tuition."],
    ["How much is proof of funds for Canada in 2026?", "For a single applicant outside Québec, CA$23,448 for applications received from 1 September 2026, plus first-year tuition."],
  ],
  sources: [
    ["GOV.UK: Student visa, money", "https://www.gov.uk/student-visa/money"],
    ["CIC News: Canada proof of funds from 1 September 2026", "https://www.cicnews.com/2026/08/canada-hikes-funds-needed-by-study-permit-applicants-0879805.html"],
    ["German Federal Foreign Office: visa for study", "https://www.auswaertiges-amt.de/en/visa-service"],
  ],
  related: ["affordable-countries-to-study-abroad", "student-visa-proof-of-funds", "fully-funded-masters-scholarships-international-students"],
};

export const ageLimits: Guide = {
  slug: "scholarship-age-limits",
  title: "Scholarship age limits: which big scholarships have them, and which don't",
  seoTitle: "Scholarship age limits: Chevening, MEXT, GKS and more",
  description: "Am I too old for a scholarship? The age limits for MEXT, GKS, Türkiye Bursları and Rhodes, and the major scholarships with no age limit, for master's and PhD applicants.",
  category: "Funding",
  updated: "2026-11-14",
  keywords: ["scholarship age limit", "am i too old for a scholarship", "scholarships for over 35", "masters scholarship no age limit", "mext age limit", "gks age limit", "chevening age limit"],
  answer:
    "Most large master's scholarships have no age limit, including Chevening, the Commonwealth Master's Scholarships, Erasmus Mundus, Gates Cambridge and Clarendon. A few do: MEXT research students must be under 35, Global Korea Scholarship graduate applicants under 40, Türkiye Bursları under 30 for master's and under 35 for PhD, and Rhodes usually 18 to 24 depending on the constituency. Some awards have indirect limits instead, such as a degree completed within the last few years.",
  body: `
## Scholarships with an age limit

- **MEXT (Japan)**: research students under 35. [Profile](/scholarships/mext)
- **Global Korea Scholarship**: graduate applicants under 40. [Profile](/scholarships/global-korea-scholarship)
- **Türkiye Bursları**: under 30 for master's, under 35 for PhD. [Profile](/scholarships/turkiye-burslari)
- **Rhodes (Oxford)**: usually 18 to 24, higher in some constituencies. [Profile](/scholarships/rhodes)

## No age limit (but other conditions)

- **Chevening**: no age limit; needs about two years' work experience. [Profile](/scholarships/chevening)
- **Commonwealth Master's**: no stated age limit; nominated in your country. [Profile](/scholarships/commonwealth-masters)
- **Erasmus Mundus**: any age and nationality. [Profile](/scholarships/erasmus-mundus)
- **Gates Cambridge and Clarendon**: no age limit. [Gates](/scholarships/gates-cambridge), [Clarendon](/scholarships/clarendon)
- **DAAD EPOS**: no age cap, but usually a degree no more than six years old and two years' work experience. [Profile](/scholarships/daad)

## Applying later in life

Experience is often an advantage: development and leadership scholarships want impact, and admissions committees value a clear reason for the degree now. Make your statement about what you'll do with it.

## How Ivyward helps

Ivyward checks every scholarship's rules against your profile, including age and how long ago you graduated, so you only spend time on awards you can actually win. Try the [scholarship finder](/tools/scholarship-finder).
`,
  faq: [
    ["Is there an age limit for Chevening?", "No. Chevening asks for about two years' work experience and citizenship of an eligible country, but sets no age limit."],
    ["What is the age limit for MEXT?", "Research students must be under 35 on the date set for that year's call. Other MEXT categories have their own limits."],
    ["Can I get a scholarship at 40?", "Yes. Most large master's scholarships have no age limit; GKS accepts graduate applicants under 40, and experience is often an advantage."],
  ],
  sources: [
    ["Chevening: eligibility", "https://www.chevening.org/scholarships/who-can-apply/"],
    ["Study in Japan: MEXT", "https://www.studyinjapan.go.jp/en/"],
    ["Study in Korea: GKS", "https://www.studyinkorea.go.kr/"],
  ],
  related: ["scholarships/chevening", "scholarships/mext", "fully-funded-masters-scholarships-international-students"],
};

export const gapYears: Guide = {
  slug: "explain-gap-years-in-application",
  title: "How to explain a gap in your education or career in a university application",
  seoTitle: "How to explain a study gap in your application",
  description: "Universities and visa officers ask about gaps. How to explain a gap year or career break honestly in your statement, CV and interview, with examples, and what documents help.",
  category: "Applying",
  updated: "2026-11-14",
  keywords: ["study gap explanation", "gap year in sop", "how to explain gap in education", "study gap for masters abroad", "career break masters application", "gap certificate"],
  answer:
    "A gap rarely stops an application if you explain it honestly and briefly. Say what you did (work, caring for family, health, exams, business, waiting for a result), show what you learned or achieved, and connect it to why you're applying now. Put dates on your CV so there are no blanks, mention the gap once in your statement, and keep evidence such as employment letters ready for the visa interview.",
  body: `
## Where the gap shows up

- **Your CV**: list every period, including "Family responsibilities, 2023–2024" or "Freelance work". Unexplained blanks look worse than any reason.
- **Your statement**: one or two sentences, not a paragraph of apology.
- **The visa interview**: officers in several countries ask about gaps to judge your intentions. Have documents.

## Good explanations

- Work, including informal or family business work
- Caring for a relative, or your own health
- National service, exams, professional certifications
- Waiting for results or saving money to study

## A short example

> After graduating in 2022 I worked for two years at a logistics company, where I built the reporting tools our operations team still uses. That work is why I'm applying for a master's in supply chain analytics now.

## Documents that help

Employment or experience letters, certificates from courses, a letter from a doctor if relevant, or a sworn affidavit where that's the local practice for a "gap certificate".

## How Ivyward helps

Ivyward's interviewer asks about each period on your CV, turns the answers into the dates and sentences your applications need, and keeps the story consistent across every school and the visa.
`,
  faq: [
    ["Is a 3-year gap acceptable for a master's abroad?", "Yes, if you can show what you did. Work experience in particular makes many applications stronger."],
    ["What is a gap certificate?", "In some countries applicants provide an affidavit or letter explaining what they did during a gap. Some universities and visa offices ask for it; most just want the explanation on your CV and statement."],
    ["Should I mention my gap in my statement of purpose?", "Briefly, if it isn't obvious from your CV, and turn it into evidence: what you did and why it leads to this degree."],
  ],
  sources: [
    ["UCAS: personal statements", "https://www.ucas.com/undergraduate/applying-to-university/writing-your-personal-statement"],
    ["EducationUSA: applying", "https://educationusa.state.gov/"],
  ],
  related: ["statement-of-purpose-guide", "cv-for-masters-application", "student-visa-proof-of-funds"],
};

export const oneVsTwoYear: Guide = {
  slug: "one-year-vs-two-year-masters",
  title: "One-year or two-year master's: cost, jobs and work visas compared",
  seoTitle: "One-year vs two-year master's abroad compared",
  description: "UK and Australian one-year master's versus two-year degrees in the US, Canada and Europe: what you save, what you give up, and how course length affects post-study work visas.",
  category: "Applying",
  updated: "2026-11-14",
  keywords: ["one year masters vs two year", "1 year masters abroad", "2 year masters worth it", "one year masters uk value", "masters length post study work", "shortest masters abroad"],
  answer:
    "A one-year master's (common in the UK, Ireland and some Canadian and Australian programmes) costs less and gets you back to work sooner. A two-year master's (common in the US, much of Europe and research master's in Canada) gives you an internship summer, more depth and often more funding. Length can also affect post-study work visas: in Canada, for example, a master's of at least eight months qualifies for a Post-Graduation Work Permit of up to three years.",
  body: `
## One year

- **Where**: UK, Ireland, some Canadian and Australian programmes
- **For**: lower total cost, faster return to work, career changers with experience
- **Against**: little time for internships, less research depth, less time to network for jobs

## Two years

- **Where**: US, most of continental Europe (120 ECTS), research master's in Canada
- **For**: summer internship, thesis or project, assistantships and funding in the US
- **Against**: higher total cost and a longer time out of work

## Work visas after the degree

- **UK**: the Graduate route lets you stay and work after your degree; it shortens to 18 months for applications from 1 January 2027.
- **Canada**: a master's of at least eight months can lead to a Post-Graduation Work Permit of up to three years.
- **US**: OPT, extended for STEM-designated degrees.

## How Ivyward helps

Ivyward's shortlist shows each programme's length, tuition and funding side by side, so you can compare total cost and work-visa outcomes before you apply.
`,
  faq: [
    ["Is a one-year UK master's respected abroad?", "Yes, UK master's degrees are widely recognised. Some employers and PhD programmes elsewhere prefer longer degrees, so check if you plan a PhD."],
    ["Which countries have one-year master's?", "The UK and Ireland mainly, plus some programmes in Canada, Australia and parts of Europe."],
    ["Does a one-year master's qualify for a Canadian work permit?", "A master's of at least eight months at an eligible institution can qualify for a Post-Graduation Work Permit of up to three years. Check IRCC's current rules."],
  ],
  sources: [
    ["GOV.UK: Graduate visa", "https://www.gov.uk/graduate-visa"],
    ["IRCC: Post-Graduation Work Permit", "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation.html"],
  ],
  related: ["apply-for-masters-in-the-uk", "apply-for-masters-in-canada", "cost-of-masters-abroad-by-country"],
};

export const offers: Guide = {
  slug: "conditional-vs-unconditional-offer",
  title: "Conditional vs unconditional offer: what each means and what to do next",
  seoTitle: "Conditional vs unconditional offer explained",
  description: "What a conditional or unconditional university offer means, common conditions (final transcript, English test, deposit), how to meet them, and when you can apply for the visa.",
  category: "Applying",
  updated: "2026-11-14",
  keywords: ["conditional offer meaning", "unconditional offer meaning", "conditional offer to unconditional", "conditional offer uk university", "how long to meet conditional offer", "cas after unconditional offer"],
  answer:
    "A conditional offer means you're admitted once you meet the conditions listed, such as your final degree result, an English test score or official transcripts. An unconditional offer means you've met everything academic. For the UK Student visa, the university issues your CAS only once the offer is unconditional and any deposit is paid, so meet conditions early.",
  body: `
## Common conditions

- Final degree result at a set level (for example a 2:1 or a GPA)
- Official transcripts or the degree certificate
- An English test score, or an accepted alternative
- A deposit or financial documents
- For scholarships: an admission offer before the scholarship is confirmed

## Turning conditional into unconditional

1. Read the deadline for meeting each condition.
2. Send documents the way the school asks (some want them direct from your university).
3. Ask the admissions office to confirm once they've received everything.

## Visas follow the offer

- **UK**: CAS after an unconditional offer and deposit.
- **US**: I-20 after admission and proof of funds.
- **Canada**: the acceptance letter from the designated learning institution.

## How Ivyward helps

Ivyward tracks each offer's conditions and deadlines, reminds you what's left, and keeps your documents ready to send. See [how to apply to graduate school](/guides/how-to-apply-to-graduate-school).
`,
  faq: [
    ["Can I accept two conditional offers?", "Often yes, while you wait to meet conditions, unless a system (such as UCAS for undergraduates) limits you. Withdraw from the rest once you decide."],
    ["Can I apply for a UK visa with a conditional offer?", "No. The university issues the CAS after your offer is unconditional and any required deposit is paid."],
    ["What if I miss a condition?", "Contact admissions immediately. Some will still accept you, defer you or offer another course."],
  ],
  sources: [
    ["UCAS: conditional and unconditional offers", "https://www.ucas.com/undergraduate/after-you-apply/types-offer"],
    ["GOV.UK: Student visa", "https://www.gov.uk/student-visa"],
  ],
  related: ["apply-for-masters-in-the-uk", "how-to-apply-to-graduate-school", "student-visa-proof-of-funds"],
};

export const chooseCountry: Guide = {
  slug: "best-country-to-study-abroad",
  title: "Which country should you study in? Comparing costs, funding and work visas",
  seoTitle: "Best country to study abroad in 2027: a comparison",
  description: "The US, UK, Canada, Germany, Australia and the rest of Europe and Asia compared on tuition, funding, post-study work and admissions, so you can choose where to apply.",
  category: "Countries",
  updated: "2026-11-14",
  keywords: ["best country to study abroad", "best country for masters for international students", "where to study abroad 2027", "uk vs canada vs usa for masters", "cheapest country to study abroad", "best country to study and work"],
  answer:
    "There's no single best country: it depends on your budget, your field and whether you want to work there afterwards. The US has the most funding for research degrees and strong STEM work options; the UK has one-year master's and the Graduate route; Canada offers a work permit of up to three years after a long enough master's; Germany has little or no tuition at public universities; Australia and parts of Asia offer strong scholarships and work rights. Start from what you need (funding, low cost, work rights), then compare programmes in your field.",
  body: `
## Quick comparison

- **United States**: widest choice and the most funding for PhDs and some master's; OPT work after graduation, longer for STEM. Check the US entry restrictions in force since 1 January 2026 for your nationality.
- **United Kingdom**: one-year master's; the Graduate route for work after your degree (18 months for applications from 1 January 2027); Chevening and Commonwealth scholarships.
- **Canada**: one- to two-year master's; a Post-Graduation Work Permit of up to three years after an eligible master's; proof of funds rose for applications from 1 September 2026.
- **Germany**: little or no tuition at most public universities, many English-taught master's, an 18-month job-search permit after graduation.
- **Rest of Europe**: Erasmus Mundus scholarships, lower fees in many countries.
- **Australia and New Zealand**: post-study work rights, strong in health and engineering.
- **Asia**: government scholarships such as MEXT, GKS and the Chinese Government Scholarship.

## Choose by what you need

- **Full funding**: PhDs in the US, Canada and Europe; government scholarships.
- **Lowest cost**: Germany and parts of Central Europe and Asia.
- **Work after study**: Canada, the UK, the US (STEM), Australia.

## See the programmes

Compare real programmes in each country, with deadlines and tuition: [all programme lists](/programmes).

## How Ivyward helps

Ivyward's [matcher](/match) shows programmes that fit your field and budget across the countries you choose, then its agents handle the applications.
`,
  faq: [
    ["Which country is easiest to get admission for a master's?", "Germany, the UK and Australia often have clearer published entry requirements and more flexible routes than highly selective US programmes, but it depends on the programme."],
    ["Which country gives the most scholarships to international students?", "For master's, government schemes in the UK, Japan, Korea and Europe; for PhDs, the US, Canada and Europe fund most strong admits."],
    ["Which country is best for working after a master's?", "Canada, the UK, the US for STEM graduates, and Australia all offer post-study work routes. Rules change, so check the current ones before you decide."],
  ],
  sources: [
    ["GOV.UK: Graduate visa", "https://www.gov.uk/graduate-visa"],
    ["IRCC: work after graduation", "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation.html"],
    ["DAAD: study in Germany", "https://www2.daad.de/deutschland/en/"],
  ],
  related: ["affordable-countries-to-study-abroad", "cost-of-masters-abroad-by-country", "fully-funded-masters-scholarships-international-students"],
};
