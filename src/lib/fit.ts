// deterministic shortlist rules. the model judges fit; these rules make sure
// nothing it says can put a disqualified program on the shortlist.
// strategy: admissions first. a program is held back only for things that block ADMISSION
// (required tests they won't take, english proof they can't meet, closed deadlines).
import { TESTS_FOR, levelOf, type Profile } from "@/lib/profile";
import { applicationTerm, parseTerm, type Term } from "@/lib/intake";

export interface DeadlineRow {
  round: string;
  date: string; // YYYY-MM-DD or ""
  funding_priority: "yes" | "no" | "unknown";
  notes: string;
  intake?: string; // the term the round admits for, when research gave it
}

export interface ProgramFactsLite {
  test_policy: "required" | "optional" | "waivable" | "not_required" | "unknown";
  english_moi_waiver: "accepted" | "not_accepted" | "case_by_case" | "unknown";
  full_funding_realistic: "likely" | "possible" | "rare" | "unknown";
  deadlines: DeadlineRow[];
  // where and what, when the caller knows them: bachelor's entry in some countries has no admissions test at all
  country?: string;
  region?: string;
  program_name?: string;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function upcomingDeadlines(deadlines: DeadlineRow[], today: string): DeadlineRow[] {
  return deadlines.filter((d) => ISO.test(d.date) && d.date >= today).sort((a, b) => a.date.localeCompare(b.date));
}

// the deadline that matters: earliest upcoming funding-priority round, else earliest upcoming round
// for an applicant from abroad: rounds that say they aren't for them are skipped, and a "general" round gives way to
// the international (F-1) round of the same intake. missouri state's MBA has "Spring 2027 (general)" on 15 january
// and "Fall 2027 (F-1 applicants)" on 1 may: an F-1 applicant for fall 2027 needs the second.
const INTL_ROUND = /\b(f-?1|international|overseas|non-?(us|u\.s\.|uk|eu|canadian|resident|domestic))\b/i;
const GENERAL_ROUND = /\b(general|domestic|u\.?s\.? (citizens|applicants)|canadian (citizens|applicants)|home (students|applicants))\b/i;
const NOT_FOR_INTL = /\bnot (applicable|available|open) (to|for) (international|f-?1|overseas)|\b(canadian citizens and (prs?|permanent residents)|domestic (applicants|students)) only\b/i;
const intakeOf = (d: DeadlineRow): Term | null => parseTerm(d.intake ?? null) ?? parseTerm(d.round);
const sameTerm = (a: Term | null, b: Term | null) => !!a && !!b && a.season === b.season && a.year === b.year;

export function targetDeadline(deadlines: DeadlineRow[], today: string, who: { term?: string | null; international?: boolean } = {}): DeadlineRow | null {
  // a round that says it isn't for applicants from abroad never applies to one, even when nothing else is left
  const all = upcomingDeadlines(deadlines, today).filter((d) => !who.international || !NOT_FOR_INTL.test(`${d.round} ${d.notes}`));
  let up = all;
  if (who.international) {
    up = up.filter((d) => !(GENERAL_ROUND.test(d.round) && deadlines.some((x) => INTL_ROUND.test(x.round) && sameTerm(intakeOf(x), intakeOf(d)))));
  }
  // the rounds for the term being applied for (the applicant's, or the programme's only intake)
  if (who.term !== undefined) {
    const t = applicationTerm(deadlines, who.term).term;
    const forTerm = t ? up.filter((d) => sameTerm(intakeOf(d), t)) : [];
    if (forTerm.length) up = forTerm;
  }
  if (!up.length) up = all;
  return up.find((d) => d.funding_priority === "yes") ?? up[0] ?? null;
}

export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000);
}

export type Verdict = "shortlisted" | "researching" | "dropped";

// bachelor's entry in the UK, Ireland, Australia and New Zealand goes on school results and English: there's no
// general admissions test (SAT/ACT) to confirm. medicine, dentistry, veterinary and law are the exceptions (UCAT,
// HPAT, GAMSAT, LNAT), so an unknown policy still holds those back
const NO_TEST_COUNTRY = /\b(united kingdom|uk|england|scotland|wales|northern ireland|great britain|ireland|australia|new zealand)\b/i;
const TESTED_COURSE = /\b(medicine|mbbs|mbchb|bmbs|dentistry|dental surgery|veterinary|law|llb)\b/i;
export function noTestEntry(level: string, f: Pick<ProgramFactsLite, "country" | "region" | "program_name">): boolean {
  if (level !== "undergraduate") return false;
  const where = f.region === "uk" || f.region === "australia_nz" || NO_TEST_COUNTRY.test(f.country ?? "");
  return where && !TESTED_COURSE.test(f.program_name ?? "");
}

export function screen(p: Profile, f: ProgramFactsLite, today: string): { verdict: Verdict; reasons: string[] } {
  const reasons: string[] = [];
  let verdict: Verdict = "shortlisted";
  const demote = (r: string) => {
    reasons.push(r);
    if (verdict === "shortlisted") verdict = "researching";
  };
  const drop = (r: string) => {
    reasons.push(r);
    verdict = "dropped";
  };

  if (f.test_policy === "required" && p.goals.gmat_gre_plan === "avoid") drop(`requires an admissions test (${TESTS_FOR[levelOf(p)]}) and you want programs without one`);
  if (f.test_policy === "unknown" && !noTestEntry(levelOf(p), f)) demote("test policy not confirmed");

  const hasEnglishTest = p.tests.some((t) => ["TOEFL", "IELTS", "Duolingo"].includes(t.name) && t.status !== "not_planned");
  if (p.english.route === "waiver" && !hasEnglishTest) {
    if (f.english_moi_waiver === "not_accepted") demote("doesn't accept your medium-of-instruction waiver; you'd need TOEFL/IELTS/Duolingo");
    if (f.english_moi_waiver === "unknown") demote("english waiver policy not confirmed");
  }

  const known = f.deadlines.filter((d) => ISO.test(d.date));
  if (known.length && !upcomingDeadlines(f.deadlines, today).length) drop("all deadlines for this cycle have passed");
  // rolling admission (common in Australia and New Zealand) is a real answer: no single closing date to confirm
  const rolling = f.deadlines.some((d) => !ISO.test(d.date) && /\brolling\b/i.test(`${d.round} ${d.notes}`));
  if (!known.length && !rolling) demote("deadlines not confirmed");

  // admissions first: funding is never a filter here. most schools don't publish full-funding odds,
  // and the closer agent works on aid after the admit (merit reconsideration, assistantships,
  // departmental awards, outside scholarships). funding realism is shown as information only.
  return { verdict, reasons };
}
