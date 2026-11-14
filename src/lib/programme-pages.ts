// the public programme pages (/programmes/...): lists built from the library our agents research and check on
// official pages, with deadlines, tuition, test rules, english-letter acceptance and how realistic full funding
// is. each page answers one search ("master's in business analytics in canada", "us master's without the gre",
// "master's deadlines in january 2027") with real rows nobody else has in one place. a page only exists with 3+
// programmes behind it, so nothing thin goes out. pure: the pages, the sitemap and the tests agree.
import { fieldScore, levelOfDegree, type StudyLevel } from "@/lib/match-rules";

export interface PublicProgramme {
  id: string;
  name: string;
  school: string;
  country: string | null;
  region: string;
  level: StudyLevel | null;
  degree: string;
  url: string | null;
  tuition: number | null;
  testPolicy: string | null; // required | not_required | optional | waivable | unknown
  moi: string | null; // english-medium letter: accepted | case_by_case | not_accepted | unknown
  funding: string | null; // full funding realistic: likely | possible | rare | unknown
  deadlines: string[]; // ISO dates
  checked: string | null; // ISO date the agents last verified it
}

export interface Destination {
  slug: string;
  region: string;
  name: string; // "the United States"
  short: string; // "the US"
  adj: string; // "US"
  guide?: string; // the country guide
}

export const DESTINATIONS: Destination[] = [
  { slug: "usa", region: "us", name: "the United States", short: "the US", adj: "US", guide: "apply-to-us-universities-as-an-international-student" },
  { slug: "uk", region: "uk", name: "the United Kingdom", short: "the UK", adj: "UK", guide: "apply-for-masters-in-the-uk" },
  { slug: "canada", region: "canada", name: "Canada", short: "Canada", adj: "Canadian", guide: "apply-for-masters-in-canada" },
  { slug: "europe", region: "europe", name: "Europe", short: "Europe", adj: "European", guide: "study-in-germany-tuition-free" },
  { slug: "australia-new-zealand", region: "australia_nz", name: "Australia and New Zealand", short: "Australia and NZ", adj: "Australian and New Zealand", guide: "study-in-australia" },
  { slug: "asia", region: "asia", name: "Asia", short: "Asia", adj: "Asian", guide: "study-in-japan" },
  { slug: "middle-east", region: "middle_east", name: "the Middle East", short: "the Middle East", adj: "Middle Eastern" },
  { slug: "africa", region: "africa", name: "Africa", short: "Africa", adj: "African" },
  { slug: "latin-america", region: "latin_america", name: "Latin America", short: "Latin America", adj: "Latin American" },
];

export interface FieldPage {
  slug: string;
  name: string; // as in "Master's in {name}"
  fields: string[]; // what the matcher scores names against (lib/match-rules)
  short?: string; // for a search title that would run long
}

export const FIELD_PAGES: FieldPage[] = [
  { slug: "data-science", name: "Data Science", fields: ["Data Science"] },
  { slug: "computer-science", name: "Computer Science", fields: ["Computer Science"] },
  { slug: "artificial-intelligence", name: "Artificial Intelligence", fields: ["Artificial Intelligence", "Machine Learning"] },
  { slug: "cybersecurity", name: "Cybersecurity", fields: ["Cybersecurity", "Cyber Security", "Information Security"] },
  { slug: "business-analytics", name: "Business Analytics", fields: ["Business Analytics", "Analytics"] },
  { slug: "mba", name: "Business Administration (MBA)", fields: ["Business Administration", "MBA"] },
  { slug: "management", name: "Management", fields: ["Management"] },
  { slug: "finance", name: "Finance", fields: ["Finance"] },
  { slug: "accounting", name: "Accounting", fields: ["Accounting"] },
  { slug: "economics", name: "Economics", fields: ["Economics"] },
  { slug: "public-health", name: "Public Health", fields: ["Public Health"] },
  { slug: "nursing", name: "Nursing", fields: ["Nursing"] },
  { slug: "social-work", name: "Social Work", fields: ["Social Work"] },
  { slug: "mechanical-engineering", name: "Mechanical Engineering", fields: ["Mechanical Engineering"] },
  { slug: "electrical-engineering", name: "Electrical Engineering", fields: ["Electrical Engineering", "Electrical and Computer Engineering"] },
  { slug: "civil-engineering", name: "Civil Engineering", fields: ["Civil Engineering"] },
  { slug: "petroleum-engineering", name: "Petroleum and Energy Engineering", short: "Petroleum Engineering", fields: ["Petroleum Engineering", "Energy Engineering"] },
  { slug: "environmental-science", name: "Environmental Science", fields: ["Environmental Science", "Environmental Management", "Sustainability"] },
  { slug: "agriculture", name: "Agriculture and Food", fields: ["Agriculture", "Agricultural", "Food Science"] },
  { slug: "education", name: "Education", fields: ["Education"] },
  { slug: "international-development", name: "International Development", fields: ["International Development", "Development Studies"] },
  { slug: "public-policy", name: "Public Policy", fields: ["Public Policy", "Public Administration"] },
  { slug: "law", name: "Law (LLM)", fields: ["Law", "LLM"] },
  { slug: "psychology", name: "Psychology", fields: ["Psychology"] },
  { slug: "statistics", name: "Statistics", fields: ["Statistics"] },
  { slug: "supply-chain", name: "Supply Chain Management", fields: ["Supply Chain", "Logistics"] },
  { slug: "project-management", name: "Project Management", fields: ["Project Management"] },
];

export type ListKind = "phd" | "bachelors" | "without-gre" | "english-medium-letter" | "fully-funded";
export const LIST_KINDS: ListKind[] = ["phd", "bachelors", "without-gre", "english-medium-letter", "fully-funded"];
export const MIN_ROWS = 3;

const NO_GRE = new Set(["not_required", "optional", "waivable"]);
const MOI_OK = new Set(["accepted", "case_by_case"]);
const FF_OK = new Set(["likely", "possible"]);

// names that still carry a researcher's doubts don't go on a public page
export const publishable = (p: { name: string }) => !/not confirmed|unclear|unknown|probably|likely under|tbc|\?/i.test(p.name);

export const nextDeadline = (p: PublicProgramme, today: string) => p.deadlines.filter((d) => d >= today).sort()[0] ?? null;
const open = (p: PublicProgramme, today: string) => !p.deadlines.length || p.deadlines.some((d) => d >= today);

export type PageKey = { dest: Destination; kind: "masters" } | { dest: Destination; kind: "field"; field: FieldPage } | { dest: Destination; kind: ListKind };

export function rowsFor(key: PageKey, all: PublicProgramme[], today: string): PublicProgramme[] {
  const here = all.filter((p) => p.region === key.dest.region && open(p, today));
  let rows: PublicProgramme[];
  switch (key.kind) {
    case "masters":
      rows = here.filter((p) => p.level === "masters");
      break;
    case "field":
      // every word of the field in the name ("Business Analytics" isn't an MBA): a public list has to be exact
      rows = here.filter((p) => p.level === "masters" && fieldScore(p.name, key.field.fields) >= 100);
      break;
    case "phd":
      rows = here.filter((p) => p.level === "phd");
      break;
    case "bachelors":
      rows = here.filter((p) => p.level === "undergraduate");
      break;
    case "without-gre":
      // only where the GRE is a real question: in the UK and most of Europe it almost never is
      rows = ["us", "canada"].includes(key.dest.region) ? here.filter((p) => p.level !== "undergraduate" && !!p.testPolicy && NO_GRE.has(p.testPolicy)) : [];
      break;
    case "english-medium-letter":
      rows = here.filter((p) => !!p.moi && MOI_OK.has(p.moi));
      break;
    case "fully-funded":
      rows = here.filter((p) => p.level !== "undergraduate" && !!p.funding && FF_OK.has(p.funding));
      break;
  }
  return rows.sort((a, b) => (nextDeadline(a, today) ?? "9999").localeCompare(nextDeadline(b, today) ?? "9999") || a.school.localeCompare(b.school));
}

export function pathOf(key: PageKey): string {
  if (key.kind === "masters") return `/programmes/${key.dest.slug}`;
  return `/programmes/${key.dest.slug}/${key.kind === "field" ? key.field.slug : key.kind}`;
}

export function keyFromPath(dest: string, sub?: string): PageKey | null {
  const d = DESTINATIONS.find((x) => x.slug === dest);
  if (!d) return null;
  if (!sub) return { dest: d, kind: "masters" };
  if ((LIST_KINDS as string[]).includes(sub)) return { dest: d, kind: sub as ListKind };
  const f = FIELD_PAGES.find((x) => x.slug === sub);
  return f ? { dest: d, kind: "field", field: f } : null;
}

// every page with enough behind it
export function allPages(all: PublicProgramme[], today: string): { key: PageKey; count: number }[] {
  const out: { key: PageKey; count: number }[] = [];
  for (const dest of DESTINATIONS) {
    const keys: PageKey[] = [{ dest, kind: "masters" }, ...FIELD_PAGES.map((field) => ({ dest, kind: "field" as const, field })), ...LIST_KINDS.map((kind) => ({ dest, kind }))];
    for (const key of keys) {
      const count = rowsFor(key, all, today).length;
      if (count >= MIN_ROWS) out.push({ key, count });
    }
  }
  return out;
}

const year = (today: string) => (today >= `${today.slice(0, 4)}-09-01` ? Number(today.slice(0, 4)) + 1 : Number(today.slice(0, 4)));

// the first title that fits a search result
const fit = (options: string[]) => options.find((t) => t.length <= 60) ?? options[options.length - 1];

export function titleOf(key: PageKey, n: number, today: string): { h1: string; title: string; description: string } {
  const d = key.dest;
  const y = year(today);
  switch (key.kind) {
    case "masters":
      return { h1: `Master's programmes in ${d.name} for international students`, title: `Master's in ${d.short}: ${n} programmes, deadlines and fees`, description: `${n} master's programmes in ${d.name} checked on official pages: next deadline, tuition, GRE and English rules, and whether full funding is realistic. For ${y} entry.` };
    case "field":
      return { h1: `Master's in ${key.field.name} in ${d.name}`, title: fit([`Master's in ${key.field.name} in ${d.short} (${y})`, `Master's in ${key.field.name} in ${d.short}`, `Master's in ${key.field.name.replace(/\s*\(.*\)/, "")} in ${d.short}`, `Master's in ${key.field.short ?? key.field.name} in ${d.short}`]), description: `${n} master's programmes in ${key.field.name} in ${d.name} for international students, with deadlines, tuition, test rules and funding, checked on each school's official pages.` };
    case "phd":
      return { h1: `PhD programmes in ${d.name} for international students`, title: `PhD programmes in ${d.short}: ${n} with deadlines`, description: `${n} PhD programmes in ${d.name}: next deadline, funding realism, GRE and English rules, from each school's official pages.` };
    case "bachelors":
      return { h1: `Bachelor's degrees in ${d.name} for international students`, title: `Bachelor's degrees in ${d.short}: ${n} with deadlines`, description: `${n} undergraduate programmes in ${d.name} for international students, with deadlines, tuition and English requirements from official pages.` };
    case "without-gre":
      return { h1: `Master's and PhD programmes in ${d.name} without the GRE`, title: `${d.adj} master's without the GRE: ${n} programmes`, description: `${n} graduate programmes in ${d.name} where the GRE or GMAT is not required, optional or can be waived, with deadlines and tuition. Checked on official pages.` };
    case "english-medium-letter":
      return { h1: `Study in ${d.name} without IELTS: programmes that accept an English-medium letter`, title: `Study in ${d.short} without IELTS: ${n} programmes`, description: `${n} programmes in ${d.name} that accept a letter from your university saying your degree was taught in English, instead of IELTS or TOEFL (some case by case).` };
    case "fully-funded":
      return { h1: `Master's and PhDs in ${d.name} where full funding is realistic`, title: `Fully funded master's and PhDs in ${d.short}`, description: `${n} graduate programmes in ${d.name} where our agents found full funding realistic or possible for international students, with deadlines and how funding works.` };
  }
}

const usd = (n: number) => `$${Math.round(n / 1000) * 1000 >= 1000 ? `${Math.round(n / 1000).toLocaleString("en")},000` : n.toLocaleString("en")}`;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};
const pct = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
};
const long = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function statsOf(rows: PublicProgramme[], today: string) {
  const fees = rows.map((r) => r.tuition).filter((t): t is number => typeof t === "number" && t > 0);
  const next = rows.map((r) => ({ r, d: nextDeadline(r, today) })).filter((x): x is { r: PublicProgramme; d: string } => !!x.d).sort((a, b) => a.d.localeCompare(b.d));
  const months = new Map<string, number>();
  for (const x of next) months.set(x.d.slice(0, 7), (months.get(x.d.slice(0, 7)) ?? 0) + 1);
  const busiest = [...months.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([m]) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }));
  return {
    n: rows.length,
    // the range without the outliers (a per-credit fee or a whole-programme total can sit in the same column)
    fees: fees.length >= 3 ? { min: pct(fees, fees.length >= 8 ? 0.1 : 0), max: pct(fees, fees.length >= 8 ? 0.9 : 1), median: median(fees), known: fees.length } : null,
    noGre: rows.filter((r) => r.testPolicy && NO_GRE.has(r.testPolicy)).length,
    greRequired: rows.filter((r) => r.testPolicy === "required").length,
    moi: rows.filter((r) => r.moi && MOI_OK.has(r.moi)).length,
    funded: rows.filter((r) => r.funding && FF_OK.has(r.funding)).length,
    first: next[0] ? { school: next[0].r.school, program: next[0].r.name, date: next[0].d } : null,
    busiest,
    checked: rows.map((r) => r.checked).filter(Boolean).sort().pop() ?? null,
  };
}

// the short answer at the top: the sentence an assistant can quote
export function answerOf(key: PageKey, rows: PublicProgramme[], today: string): string {
  const s = statsOf(rows, today);
  const what = key.kind === "field" ? `master's programmes in ${key.field.name}` : key.kind === "phd" ? "PhD programmes" : key.kind === "bachelors" ? "bachelor's programmes" : key.kind === "masters" ? "master's programmes" : "programmes";
  const parts = [`Our agents have checked ${s.n} ${what} in ${key.dest.name} on the schools' own pages.`];
  if (s.fees) parts.push(`Tuition for most runs from about ${usd(s.fees.min)} to ${usd(s.fees.max)} a year (median ${usd(s.fees.median)}), before living costs.`);
  if (s.first) parts.push(`The next deadline is ${long(s.first.date)} (${s.first.school}).`);
  if (key.kind === "english-medium-letter") parts.push("Each accepts a letter from your university that your degree was taught in English, instead of IELTS or TOEFL, either outright or case by case.");
  else if (key.kind === "without-gre") parts.push("None of them requires the GRE or GMAT: it's not required, optional, or can be waived.");
  else if (s.funded) parts.push(`For ${s.funded} of them, full funding looked realistic or possible for international students.`);
  return parts.join(" ");
}

export function faqOf(key: PageKey, rows: PublicProgramme[], today: string): [string, string][] {
  const s = statsOf(rows, today);
  const d = key.dest;
  const subject = key.kind === "field" ? `a master's in ${key.field.name} in ${d.name}` : key.kind === "phd" ? `a PhD in ${d.name}` : key.kind === "bachelors" ? `a bachelor's degree in ${d.name}` : `a master's in ${d.name}`;
  const out: [string, string][] = [];
  if (s.fees)
    out.push([`How much does ${subject} cost for international students?`, `Across the ${s.fees.known} programmes here with a published fee, tuition for most is about ${usd(s.fees.min)} to ${usd(s.fees.max)} a year, with a median of ${usd(s.fees.median)}. Living costs, visa fees and health cover come on top. Fees change each year, so each programme links to its official page.`]);
  if (s.first)
    out.push([`When are the application deadlines?`, `The earliest open deadline on this list is ${long(s.first.date)}, for ${s.first.program} at ${s.first.school}.${s.busiest.length ? ` Most deadlines here fall in ${s.busiest.join(" and ")}.` : ""} Scholarship and funding rounds often close earlier than the final deadline, so apply in the first round where you can.`]);
  if (key.kind !== "bachelors" && (s.noGre || s.greRequired))
    out.push([`Do I need the GRE or GMAT?`, `${s.noGre} of the ${s.n} programmes here don't require it (not required, optional or waivable)${s.greRequired ? `, and ${s.greRequired} require it` : ""}. The rest didn't say clearly on their pages. A strong test score can still help with funding where it's optional.`]);
  if (key.kind !== "english-medium-letter")
    out.push([`Can I apply without IELTS or TOEFL?`, s.moi ? `${s.moi} of these programmes accept a letter from your university saying your degree was taught in English, either outright or case by case. Others need IELTS, TOEFL, Duolingo or PTE. Ask your university's registry for the letter early; it can take weeks.` : `None of these programmes clearly accepts an English-medium letter, so plan on IELTS, TOEFL, Duolingo or PTE, unless you're from a country the school exempts.`]);
  else
    out.push([`What is an English-medium letter?`, `An official letter from your university, on letterhead, signed and stamped, confirming that your degree was taught and assessed in English. Many schools accept it instead of IELTS or TOEFL. Some accept it only case by case, so check the programme's page or email admissions before relying on it.`]);
  if (key.kind !== "bachelors")
    out.push([`Are there fully funded options?`, s.funded ? `For ${s.funded} of the ${s.n} programmes, our agents found full funding realistic or possible for international students (assistantships, school scholarships, or external awards). Funding is competitive and often decided with admission, so apply early.` : `None of these programmes showed full funding as realistic for international students. Look at external scholarships for ${d.name}, or programmes where funding comes with admission, such as research degrees.`]);
  out.push([`How does Ivyward help?`, `Ivyward's AI agents build a shortlist that fits your profile from programmes like these, write your essays from your real stories, fill in each school's application form and track every deadline. You review and sign each application before anything is submitted.`]);
  return out;
}

export const MONTH_RE = /^20\d\d-(0[1-9]|1[0-2])$/;

// application deadlines in one month, every level
export function monthRows(month: string, all: PublicProgramme[]): { p: PublicProgramme; date: string }[] {
  return all
    .flatMap((p) => p.deadlines.filter((d) => d.startsWith(month)).slice(0, 1).map((date) => ({ p, date })))
    .sort((a, b) => a.date.localeCompare(b.date) || a.p.school.localeCompare(b.p.school));
}

export function monthsAhead(all: PublicProgramme[], today: string, max = 12): { month: string; count: number }[] {
  const out: { month: string; count: number }[] = [];
  const d = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  for (let i = 0; i < max; i++) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + i, 1)).toISOString().slice(0, 7);
    const count = monthRows(m, all).length;
    if (count >= MIN_ROWS) out.push({ month: m, count });
  }
  return out;
}

export const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

// "MSc" for the table, from free-text degree fields
export const shortDegree = (degree: string | null, name: string) => {
  const t = (degree ?? "").split(/[(;,]/)[0].trim();
  return t.length && t.length <= 24 ? t : (levelOfDegree(degree, name) === "phd" ? "PhD" : levelOfDegree(degree, name) === "undergraduate" ? "Bachelor's" : "Master's");
};
