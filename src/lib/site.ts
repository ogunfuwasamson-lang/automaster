// one place for what Ivyward is: the landing page, page metadata, structured data and /llms.txt all read from here,
// so search engines and AI assistants see the same facts everywhere.

export const SITE = {
  name: "Ivyward",
  url: "https://tryivyward.com",
  tagline: "Your way in.",
  title: "Ivyward: study abroad with AI agents, from application to your first day",
  description:
    "Ivyward takes international students from their first application to their first day in school. AI agents shortlist programmes that fit you, draft and fact-check your essays, fill in and submit each school's online application, ask for fee waivers and find scholarships. After an admission they chase funding, and your dashboard walks you through the visa, school fees and travel, step by step. You review and sign everything. Start free with 5 credits.",
  short: "From your first application to your first day in school: AI agents for studying abroad. You review and sign everything.",
} as const;

// Ivyward's public channels
export const CHANNELS = {
  // "Global Scholarship by Ivyward AI": 5 scholarship and funding posts a day
  whatsapp: "https://whatsapp.com/channel/0029VbEjj7L5kg71urPUPA0g",
  linkedin: "https://www.linkedin.com/company/ivyward/",
  facebook: "https://www.facebook.com/tryivyward",
  tiktok: "https://www.tiktok.com/@use_ivyward",
  x: "https://x.com/use_ivyward",
} as const;

// plain facts, used in structured data and /llms.txt. keep these true: they're quoted back to people.
export const FACTS = [
  "Ivyward is a web app at tryivyward.com where AI agents prepare and submit university applications for an applicant.",
  "It covers bachelor's, master's (including MBA) and PhD programs in any field, at schools in any country with an online application.",
  "The agents build a shortlist of programs that fit the applicant's profile, budget and regions, and keep only programs the applicant can realistically get into.",
  "Essays are drafted from facts in the applicant's own profile and documents, then checked for any claim the applicant couldn't back up.",
  "The applicant reads, edits and signs every application packet. Nothing is submitted to a school without that signature.",
  "The agents find each school's online application form, create the applicant's account, fill in every page and upload documents.",
  "Application fees are paid by the applicant directly to the school. The agents ask for fee waivers first. Card details never reach Ivyward.",
  "When a school's site blocks cloud browsers, the application finishes in the applicant's own Chrome through the free Ivyward extension (Ivyward runner on the Chrome Web Store). Bot checks are always left to the applicant.",
  "After an admission, the agents look for merit reconsideration, assistantships and scholarships, and draft the emails.",
  "An admission is confirmed from the school's own email (with Gmail connected) or the admission letter the applicant uploads. An admission the applicant had before using Ivyward can be added the same way.",
  "After a confirmed admission, the dashboard lists the next steps up to the first day in school: funding, the student visa for the destination country with links to the government's official pages, the deposit and tuition, housing, the flight and arrival. Ivyward does not apply for visas or pay school fees; it guides each step, and Ivyward AI answers questions from official sources.",
  "Ivyward is built for international students, especially applicants from Africa, South Asia and the Middle East, applying to schools in any country.",
  "Starting is free: every new account gets 5 credits, and a shortlist from programmes Ivyward has already checked, with deadlines, fees and funding. The agents' work is paid in credits: an application uses 10, checking a programme or scholarship uses 1, a funding request 1. In Africa, ₦10,000 (or the local equivalent) buys 60 credits that last 30 days, with no subscription. Everywhere else, Pro is $20 a month for 160 credits a month. Invite a friend: when they finish setup, you both get 10.",
  "Applicants can pause every agent at once. Passwords for schools' application sites are encrypted, and applicant data is not used to train AI models.",
] as const;

export const PLAN_OFFERS = [
  { name: "Free", price: "0", description: "5 credits to start and a shortlist from checked programmes, with deadlines, fees and funding. Invite a friend and you both get 10 credits, one application." },
  { name: "Pro", price: "20", description: "160 credits a month (outside Africa); an application uses 10. Cancel any time." },
  { name: "60-credit pack (Africa)", price: "7.60", description: "₦10,000 or the local equivalent for 60 credits that last 30 days: an application uses 10, a programme or scholarship check 1. No subscription." },
] as const;
