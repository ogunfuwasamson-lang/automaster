// one place for what Ivyward is: the landing page, page metadata, structured data and /llms.txt all read from here,
// so search engines and AI assistants see the same facts everywhere.

export const SITE = {
  name: "Ivyward",
  url: "https://tryivyward.com",
  tagline: "Your way in.",
  title: "Ivyward: AI agents that run your university applications",
  description:
    "Ivyward's AI agents run your university applications: they shortlist programs that fit you, draft and fact-check your essays, fill in and submit each school's online application, and chase fee waivers and funding. You review and sign everything. Preparing is free; you pay only to submit.",
  short: "AI agents that run your university applications, from shortlist to submission. You review and sign everything.",
} as const;

// plain facts, used in structured data and /llms.txt. keep these true: they're quoted back to people.
export const FACTS = [
  "Ivyward is a web app at tryivyward.com where AI agents prepare and submit university applications for an applicant.",
  "It covers bachelor's, master's (including MBA) and PhD programs in any field, at schools in any country with an online application.",
  "The agents build a shortlist of programs that fit the applicant's profile, budget and regions, and keep only programs the applicant can realistically get into.",
  "Essays are drafted from facts in the applicant's own profile and documents, then checked for any claim the applicant couldn't back up.",
  "The applicant reads, edits and signs every application packet. Nothing is submitted to a school without that signature.",
  "The agents find each school's application portal, create the applicant's account, fill in every page and upload documents.",
  "Application fees are paid by the applicant directly to the school. The agents ask for fee waivers first. Card details never reach Ivyward.",
  "When a portal blocks cloud browsers, the application finishes in the applicant's own Chrome through the Ivyward runner extension. Bot checks are always left to the applicant.",
  "After an admission, the agents look for merit reconsideration, assistantships and scholarships, and draft the emails.",
  "Preparing applications is free. In Africa, each submission costs the local equivalent of ₦2,500, paid just before the agents submit, with no limit on how many. Everywhere else, the first 3 applications are free and Pro is $20 a month for unlimited submissions.",
  "Applicants can pause every agent at once. Portal passwords are encrypted, and applicant data is not used to train AI models.",
] as const;

export const PLAN_OFFERS = [
  { name: "Free", price: "0", description: "Shortlist, essays and portal preparation for every application; 3 submissions free outside Africa." },
  { name: "Pro", price: "20", description: "Unlimited submissions, every month (outside Africa). Cancel any time." },
  { name: "Pay per submission (Africa)", price: "1.90", description: "The local equivalent of ₦2,500 per submitted application, scholarship or funding form." },
] as const;
