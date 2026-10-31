// the public library: guides (long answers to the questions applicants search for) and scholarship profiles.
// every page leads with a short, quotable answer, so a search snippet or an AI assistant can lift the first lines.

export type GuideCategory = "Funding" | "Applying" | "Countries" | "Visas" | "AI and tools";

export type Guide = {
  slug: string;
  title: string;
  // the <title> and meta description; keep under ~60 and ~160 characters
  seoTitle?: string;
  description: string;
  category: GuideCategory;
  updated: string; // ISO date the facts were last checked
  keywords: string[];
  // two to four sentences that answer the question outright
  answer: string;
  // markdown. "## " headings become the table of contents
  body: string;
  faq: [string, string][];
  sources: [string, string][]; // [title, url]
  related?: string[]; // guide or scholarship slugs ("scholarships/chevening")
};

export type Level = "Bachelor's" | "Master's" | "PhD";

export type Scholarship = {
  slug: string;
  name: string;
  country: string; // where you study
  funder: string;
  levels: Level[];
  funding: "Fully funded" | "Partly funded" | "Varies";
  // who can apply, in one line ("Citizens of Chevening-eligible countries")
  forWhom: string;
  summary: string; // the quotable answer
  covers: string[];
  eligibility: string[];
  deadline: string; // usual window, never a guessed exact date
  howToApply: string[];
  tips: string[];
  url: string; // the official page
  updated: string;
  faq: [string, string][];
};
