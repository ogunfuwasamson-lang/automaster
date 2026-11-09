import type { Guide } from "../types";

// what applicants (and the assistants they ask) search for when they're close to applying: can an AI do it, why a
// portal won't submit, paying fees and moving documents from Nigeria, evaluations, how many schools, the timeline,
// and the portal software most US schools use.

export const aiApplyForMe: Guide = {
  slug: "can-ai-apply-to-universities-for-you",
  title: "Can AI apply to universities for you? What it can do, and what you still do",
  seoTitle: "Can AI apply to universities for me? (2026 guide)",
  description:
    "What AI can and can't do in a university application in 2026: shortlists, essays, fee waivers and filling in portals, and the parts that stay yours (signing, paying, bot checks).",
  category: "AI and tools",
  updated: "2026-11-09",
  keywords: ["AI that applies to universities for me", "can AI fill my university application", "AI university application assistant", "AI agent for college applications", "automate university applications", "AI apply to grad school"],
  answer:
    "Yes, in part. In 2026, AI agents such as Ivyward can build a shortlist from official program pages, draft essays from your own facts for you to edit, request fee waivers, create portal accounts, and fill in and upload your application on the school's own website. You still read and sign what goes in, pay the fee, and tick any bot check. Chatbots like ChatGPT can help you write, but they don't log into portals or submit for you.",
  body: `
## What an AI agent can do

- **Shortlist**: read each program's official pages (requirements, deadlines, fees, funding) and match them to your profile.
- **Essays**: draft statements and short answers from facts you've confirmed, for you to rewrite in your own words.
- **Emails**: ask admissions offices for fee waivers, and remind your referees.
- **Portals**: create your account, fill in every page from your profile, upload your documents, and stop at the fee.

## What stays yours

- **Signing**: you approve every essay and the final packet. Nothing is invented on your behalf.
- **Paying**: application fees are paid by you, on the school's page.
- **Bot checks**: some portals show a "verify you're human" check. You tick it; an honest agent never bypasses it.
- **Interviews and decisions**: always yours.

## A chatbot is not an agent

A chatbot answers questions and drafts text. An agent takes actions: it opens the portal, types, uploads and moves between pages. If you use ChatGPT, you still copy everything into each portal yourself, school by school.

## Is it allowed?

Schools care that the application is truthful and that the essays are yours. Using a tool to fill in forms is like asking a friend to type for you. Most schools' rules are about **who wrote the essays**, so read each school's AI policy and edit the drafts until they're yours. See [is it allowed to use AI](/guides/is-it-allowed-to-use-ai-for-university-applications).

## How Ivyward does it

[Ivyward](/) runs a team of agents for international students: shortlist, essays, fee waivers and the portal itself. It works in the cloud, and in your own Chrome when a portal blocks cloud browsers. It's free to prepare; you pay only for submissions. See [pricing](/pricing).
`,
  faq: [
    ["Will universities know I used AI?", "Forms filled in by a tool look the same as forms you typed. Essays are different: write them in your own words and keep every fact true. Several schools check for AI-written essays."],
    ["Can AI submit the application without me?", "A good agent stops for your approval and for the fee. Ivyward asks you to sign the packet and pay the fee, and never solves bot checks for you."],
    ["Is it safe to give an AI my portal logins?", "Ivyward creates the portal logins itself and keeps them encrypted. It never asks for your email password: Gmail is connected through Google's own permission screen, so the agents can read portal codes."],
  ],
  sources: [
    ["Common App: affirmation and AI", "https://www.commonapp.org/"],
    ["Ivyward: how it works", "https://tryivyward.com/about"],
  ],
  related: ["is-it-allowed-to-use-ai-for-university-applications", "best-ai-tools-for-university-applications", "ivyward-vs-chatgpt-for-university-applications"],
};

export const portalProblems: Guide = {
  slug: "university-application-portal-wont-submit",
  title: "University application portal won't let you submit? 15 causes and fixes",
  seoTitle: "Application portal won't submit: 15 causes and fixes",
  description:
    "The common reasons a university application portal blocks you (required fields you can't see, date formats, uploads, locked accounts, wrong program) and how to get past each.",
  category: "Applying",
  updated: "2026-11-09",
  keywords: ["application portal not working", "can't submit university application", "graduate application portal error", "application won't submit", "Slate application error", "PeopleSoft application portal problem"],
  answer:
    "Most stuck applications come down to a few causes: a required field on another page or section, a date or phone number in the wrong format, an upload that's too large or not a PDF, a security check, a locked account after failed sign-ins, or an application started for the wrong program. Check the portal's checklist page for an incomplete section, re-enter dates in the format shown, convert files to PDF under the size limit, and contact admissions if a section stays locked.",
  body: `
## The fifteen we see most

1. **A required field you can't see**: another section is incomplete. Open the checklist or summary page; it names it.
2. **Date format**: the box wants MM/DD/YYYY but you typed DD/MM/YYYY, or a date picker ignores pasted text. Type it in the format shown.
3. **Phone number**: some portals want digits only, others the country code first (+234…).
4. **State or province required**: pick "Outside US", "Not applicable" or "Other" if your country isn't listed.
5. **Upload rejected**: convert to PDF, keep it under the stated size (often 2–5 MB), and use a plain file name without accents.
6. **Next clicked before an upload finished**: wait for the progress bar to complete.
7. **Character limit**: the box cuts or refuses long answers. Shorten to the limit shown.
8. **Security check**: tick the "I'm not a robot" box yourself; a VPN can trigger it repeatedly.
9. **Too many sign-in attempts**: the account is locked for a while, usually 15–30 minutes. Wait, then reset your password.
10. **Email already registered**: you made an account before. Use "forgot password" instead of signing up again.
11. **Verification code never arrives**: check spam and Promotions; codes expire within minutes.
12. **Session timed out**: long pages log you out. Save often.
13. **The application is for the wrong program**: start a new application for the right one; don't edit the old one.
14. **Applications closed**: the intake may have closed early. Ask admissions about the next intake.
15. **Fee page fails**: international cards are often declined. See [paying application fees from Nigeria](/guides/how-to-pay-university-application-fees-from-nigeria).

## When to email admissions

If a section stays locked or the submit button stays grey with everything complete, email the admissions office with a screenshot. They can see your record and fix it.

## Let an agent do it

[Ivyward](/) handles these on the portal for you: it fills each page from your profile, converts uploads to PDF, waits out locked accounts, and stops only for what's yours (the fee, a bot check, a fact it doesn't have).
`,
  faq: [
    ["Why is the submit button greyed out?", "A required section or document is incomplete, or the fee isn't paid yet. The portal's checklist page shows which."],
    ["Why does my date of birth keep disappearing?", "Some portals use a date picker that only keeps what's typed in its own format. Type the date in the format shown under the box instead of pasting it."],
    ["The portal says my email is already in use. What now?", "You or someone helping you created an account before. Use the forgot-password link to get back in rather than creating a second account."],
  ],
  sources: [["Ivyward: stop reasons seen across university portals", "https://tryivyward.com/guides"]],
  related: ["how-to-apply-to-graduate-school", "how-to-pay-university-application-fees-from-nigeria"],
};

export const payFeesNigeria: Guide = {
  slug: "how-to-pay-university-application-fees-from-nigeria",
  title: "How to pay university application fees from Nigeria (US, UK, Canada)",
  seoTitle: "How to pay US/UK university application fees from Nigeria",
  description:
    "Ways Nigerian applicants pay foreign application fees when naira cards are declined: dollar cards, virtual cards, Flywire, paying someone abroad, and getting the fee waived.",
  category: "Funding",
  updated: "2026-11-09",
  keywords: ["pay application fee from Nigeria", "naira card declined application fee", "dollar card for application fee", "how to pay US university application fee in Nigeria", "Flywire Nigeria", "application fee waiver Nigeria"],
  answer:
    "Naira debit cards are often declined on foreign university portals because of international spending limits. Most Nigerian applicants use a domiciliary (dollar) account card, a fintech virtual dollar card, a relative abroad paying on their behalf, or the school's own payment partner (often Flywire). Before paying, ask for a fee waiver: many US programs waive the fee for applicants who ask with a short reason.",
  body: `
## Ask for a waiver first

Many US graduate programs waive application fees for international applicants who ask, especially early. A short email to admissions with your reason (cost, attending an info session, a partner scholarship) is often enough. See [how to get application fee waivers](/guides/how-to-get-application-fee-waivers).

## Ways to pay

- **Domiciliary account card**: a dollar Visa or Mastercard from a Nigerian bank. The most reliable option where your bank allows online foreign spend.
- **Virtual dollar cards** from fintech apps: quick to set up; some portals decline prepaid or virtual cards, so try a small purchase first.
- **The school's payment partner**: many schools use Flywire, which accepts local bank transfer from some countries. Check whether the portal offers it at checkout.
- **Someone abroad**: a relative or friend pays with their card. Keep their receipt; schools only need the payment, not the payer.

## Before you pay

- Check the exact fee and currency on the school's page, and add your bank's charges.
- Make sure every section is complete. Most portals take the fee as the last step, and fees are rarely refunded.
- Save the receipt and confirmation email.

## Nigeria's foreign exchange rules

Banks set limits for international card spending, and they change. Check your bank's current limit before the deadline week, not on the day.

## Let the agents do the rest

[Ivyward](/) asks for fee waivers for you, fills in every page, and stops at the fee so you pay on the school's own page. In Nigeria, Ivyward costs ₦10,000 for 5 submissions; see [pricing](/pricing).
`,
  faq: [
    ["Why was my card declined on the application portal?", "Usually your bank's international spending limit or the card type (some portals refuse prepaid or virtual cards). Try a domiciliary card or the school's payment partner."],
    ["Can someone else pay my application fee?", "Yes. Schools need the payment, not a particular payer. Keep the receipt in case admissions asks."],
    ["Is the application fee refundable?", "Almost never, so make sure the application is complete before you pay."],
  ],
  sources: [
    ["Central Bank of Nigeria", "https://www.cbn.gov.ng/"],
    ["Flywire: paying education fees", "https://www.flywire.com/"],
  ],
  related: ["how-to-get-application-fee-waivers", "scholarships-for-nigerian-and-african-students"],
};

export const transcriptsNigeria: Guide = {
  slug: "how-to-get-transcripts-from-nigerian-universities",
  title: "How to get your transcript from a Nigerian university and send it abroad",
  seoTitle: "How to get Nigerian university transcripts sent abroad",
  description:
    "How Nigerian graduates request official transcripts, what unofficial copies are for, how long it takes, and how to send to schools abroad or to WES.",
  category: "Applying",
  updated: "2026-11-09",
  keywords: ["Nigerian university transcript", "how to request transcript in Nigeria", "send transcript abroad Nigeria", "transcript for masters abroad", "WES transcript Nigeria", "official transcript UNILAG OAU UI"],
  answer:
    "Request your official transcript from your university's registry or academic office, often through an online portal, and pay the processing and courier fee. Most schools abroad accept an unofficial copy (a scanned statement of results) for the application and ask for the official, sealed transcript only after admission. Start early: official transcripts from Nigerian universities can take several weeks.",
  body: `
## Unofficial first, official later

For most graduate applications you upload a **scanned copy** of your transcript or statement of result. The official transcript, sent directly by your university, is usually needed only after you're admitted, or for a credential evaluation such as WES.

## Requesting the official transcript

1. Check your university's registry or alumni page for the transcript request process. Many now run an online request portal.
2. Pay the processing fee and the courier fee for each destination.
3. Give the exact address: the school's admissions office or the evaluation service.
4. Keep your request number and follow up with the registry.

## How long it takes

Expect anything from two weeks to a few months, depending on the university and the courier. Request as soon as you know where you're applying.

## Sending to WES

WES needs transcripts sent **directly by your university** in a sealed envelope, along with your degree certificate. See [WES credential evaluation](/guides/wes-credential-evaluation).

## While you wait

Apply with the unofficial copy where allowed. [Ivyward](/) uploads your scanned transcript to each portal and converts photos and Word files to PDF when a portal only takes PDF.
`,
  faq: [
    ["Can I apply with a statement of result instead of a transcript?", "Many schools accept a scanned statement of result or unofficial transcript for the application. Check each program's requirements page."],
    ["Do I need an official transcript to apply?", "Usually not at the application stage; most schools ask for it after admission."],
  ],
  sources: [["WES: required documents", "https://www.wes.org/"]],
  related: ["wes-credential-evaluation", "how-to-apply-to-graduate-school"],
};

export const wes: Guide = {
  slug: "wes-credential-evaluation",
  title: "WES credential evaluation: when you need it and how to get it",
  seoTitle: "WES evaluation for US and Canada: when and how",
  description:
    "What a WES (World Education Services) evaluation is, which schools and visas ask for one, document-by-document vs course-by-course, and how to order it.",
  category: "Applying",
  updated: "2026-11-09",
  keywords: ["WES evaluation", "do I need WES for masters", "WES course by course", "WES ECA Canada", "credential evaluation for US universities", "WES Nigeria"],
  answer:
    "A WES evaluation converts your foreign degree and grades into US or Canadian equivalents. Some US universities require it (often a course-by-course evaluation with a GPA), while many evaluate transcripts themselves. Check each program's international requirements. For Canada, an ECA is mainly for immigration, not admission. You order it on wes.org, and your university sends the transcripts directly.",
  body: `
## Do you need one?

- **US graduate schools**: some require a WES or ECE course-by-course evaluation; many don't. The international applicant page of each program says.
- **Canada**: universities usually assess transcripts themselves. The WES ECA is for Express Entry and other immigration programs.
- **UK and Europe**: generally not used.

## Which report

- **Document-by-document**: confirms your degree's equivalent. Cheaper.
- **Course-by-course**: lists every course with a grade and a GPA. What US schools usually ask for.

## How to order

1. Create an account on wes.org and choose the evaluation type and recipients.
2. Follow the country-specific document instructions; for many countries the university sends transcripts directly.
3. Pay, and track the status in your WES account.

## Timing

Allow several weeks after WES receives everything. Order as soon as a school on your list requires it.

## Ivyward

[Ivyward](/) reads each program's official requirements while building your shortlist, so you see which schools need an evaluation before you apply.
`,
  faq: [
    ["Is WES required for all US universities?", "No. Some require it, many don't. Check each program's international admissions page."],
    ["Do Canadian universities require WES?", "Usually not for admission. The WES ECA is mainly for immigration."],
  ],
  sources: [
    ["World Education Services", "https://www.wes.org/"],
    ["IRCC: education credential assessment", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/education-assessed.html"],
  ],
  related: ["how-to-get-transcripts-from-nigerian-universities", "apply-to-us-universities-as-an-international-student"],
};

export const howMany: Guide = {
  slug: "how-many-universities-should-i-apply-to",
  title: "How many universities should you apply to for a master's or PhD?",
  seoTitle: "How many universities should I apply to? (master's/PhD)",
  description:
    "A practical number for international applicants, how to split it between reach, target and safer programs, and how fees and funding change the answer.",
  category: "Applying",
  updated: "2026-11-09",
  keywords: ["how many universities should I apply to", "how many masters programs to apply to", "how many PhD programs to apply to", "reach target safety grad school", "number of grad school applications"],
  answer:
    "Most international applicants do well with 6 to 10 programs: a few reach, most target, and two or three safer options. Apply to more if you need full funding (competition is higher), fewer if fees are a constraint and you can get waivers. Quality beats quantity: each application needs a tailored statement.",
  body: `
## A balanced list

- **2–3 reach**: strong fit, but admission or funding is uncertain.
- **3–5 target**: your profile matches recent admits.
- **2–3 safer**: likely admission, ideally with some funding.

## When to apply to more

- You need **full funding**: funded places are scarcer, so widen the list.
- You're applying for a **PhD**: admission depends on supervisor fit and funding in a given year.

## When fewer is fine

- You have a strong fit with specific supervisors or programs.
- Fees add up: ask for [fee waivers](/guides/how-to-get-application-fee-waivers) first.

## The real limit is time

Every program wants its own statement and short answers. [Ivyward](/) builds the shortlist from official pages, drafts each statement from your own facts for you to edit, and fills in every portal, so applying to eight costs you little more than applying to three.
`,
  faq: [
    ["Is 15 applications too many?", "Not if you can tailor each one and afford the fees, but most people get better results from 6–10 well-prepared applications."],
    ["Should I apply to only top universities?", "Mix them. A list of only reach programs is the most common reason good applicants end up with no offer."],
  ],
  sources: [["Ivyward: how to build a shortlist", "https://tryivyward.com/guides/how-to-build-a-university-shortlist"]],
  related: ["how-to-build-a-university-shortlist", "how-to-apply-to-graduate-school"],
};

export const timeline2027: Guide = {
  slug: "fall-2027-application-timeline",
  title: "Fall 2027 master's and PhD application timeline, month by month",
  seoTitle: "Fall 2027 grad school application timeline (month by month)",
  description:
    "What to do each month from now to a Fall 2027 start: tests, shortlist, statements, references, applications, funding and visa.",
  category: "Applying",
  updated: "2026-11-09",
  keywords: ["fall 2027 application timeline", "when to apply for masters 2027", "grad school timeline 2027", "PhD application timeline", "masters abroad timeline"],
  answer:
    "For a Fall 2027 start, most deadlines fall between December 2026 and February 2027 (later for many UK programs). In November, finish your shortlist and ask referees. Submit in December and January, apply for funding alongside, and expect decisions from February to April. Visa applications follow admission, from April to July.",
  body: `
## November 2026

- Finalise a shortlist of 6–10 programs ([how many?](/guides/how-many-universities-should-i-apply-to)).
- Ask your referees, giving them at least four weeks.
- Request [fee waivers](/guides/how-to-get-application-fee-waivers) and unofficial transcripts.

## December 2026

- Submit early-deadline applications (many US PhDs, some funded master's).
- Draft and tailor statements.

## January–February 2027

- Submit the rest. Check each portal's checklist for missing items.
- Apply for external scholarships with their own deadlines.

## March–April 2027

- Decisions and funding offers arrive. Compare total cost and funding, not just the ranking.

## May–July 2027

- Accept an offer and pay the deposit.
- Apply for your visa with [proof of funds](/guides/student-visa-proof-of-funds).

## Start now

[Ivyward](/) builds the shortlist from official deadlines and runs every application in parallel. See [application deadlines for the 2027 intake](/guides/application-deadlines-2027-intake).
`,
  faq: [
    ["Is it too late to apply for Fall 2027?", "Not in November 2026. Many deadlines are in January and February, and many UK and European programs run later."],
    ["When do UK master's applications close?", "Many UK taught master's programs accept applications into the spring or summer, but popular programs and scholarships close earlier."],
  ],
  sources: [["Ivyward: 2027 intake deadlines", "https://tryivyward.com/guides/application-deadlines-2027-intake"]],
  related: ["application-deadlines-2027-intake", "how-to-apply-to-graduate-school"],
};

export const slate: Guide = {
  slug: "slate-application-portal-guide",
  title: "What is Slate? A guide to the application portal many US universities use",
  seoTitle: "Slate application portal: how it works and common problems",
  description:
    "Slate (by Technolutions) runs applications at hundreds of US universities. How its accounts, application pages, uploads, recommendations and status page work, and fixes for common problems.",
  category: "Applying",
  updated: "2026-11-09",
  keywords: ["Slate application portal", "what is Slate university application", "Technolutions Slate", "Slate application status page", "Slate recommendation request", "Slate captcha error"],
  answer:
    "Slate is admissions software by Technolutions that many US universities use for their application portal: you create an account with your email, fill in sections, upload documents, register recommenders (who get an email link), pay the fee and submit. After submitting, the same login shows your status page and checklist. Each school's Slate is separate, so you make a new account per school.",
  body: `
## How a Slate application works

1. **Create an account**: your email, name and birth date. Slate emails a temporary PIN to set your password.
2. **Start an application** for the right term and program. Don't start a second one; continue the first.
3. **Fill in the sections**: personal details, education, test scores, essays, uploads.
4. **Recommenders**: enter their names and emails; Slate emails them a link. You can resend from the same page.
5. **Pay and submit.** After that, the status page shows a checklist of what's been received.

## Common problems

- **"Error generating captcha token" or repeated bot checks**: Slate uses Google's check. Try another browser, or switch off a VPN.
- **PIN email not arriving**: check spam; the PIN expires quickly, so request a new one.
- **"Logins temporarily blocked"**: too many attempts. Wait, then reset your password.
- **A school's Slate doesn't know you**: each school's Slate is its own system, so you need an account at each.

## Ivyward and Slate

[Ivyward](/) works on Slate portals. It creates the account, reads the PIN from your connected Gmail, fills in each section, registers your recommenders, and stops for the fee. Where Slate's bot check blocks cloud browsers, the Ivyward extension finishes in your own Chrome.
`,
  faq: [
    ["Do I need a separate Slate account for each university?", "Yes. Each university runs its own Slate, with its own login."],
    ["How do I check my application status on Slate?", "Sign in to the same portal after submitting; the status page lists received and missing items."],
  ],
  sources: [["Technolutions: Slate", "https://technolutions.com/solutions/slate"]],
  related: ["university-application-portal-wont-submit", "apply-to-us-universities-as-an-international-student"],
};
