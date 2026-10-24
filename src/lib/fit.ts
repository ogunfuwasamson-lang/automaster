// deterministic shortlist rules. the model judges fit; these rules make sure
// nothing it says can put a disqualified program on the shortlist.
// strategy: admissions first. a program is held back only for things that block ADMISSION
// (required tests they won't take, english proof they can't meet, closed deadlines).
import type { Profile } from "@/lib/profile";

export interface DeadlineRow {
  round: string;
  date: string; // YYYY-MM-DD or ""
  funding_priority: "yes" | "no" | "unknown";
  notes: string;
}

export interface ProgramFactsLite {
  test_policy: "required" | "optional" | "waivable" | "not_required" | "unknown";
  english_moi_waiver: "accepted" | "not_accepted" | "case_by_case" | "unknown";
  full_funding_realistic: "likely" | "possible" | "rare" | "unknown";
  deadlines: DeadlineRow[];
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function upcomingDeadlines(deadlines: DeadlineRow[], today: string): DeadlineRow[] {
  return deadlines.filter((d) => ISO.test(d.date) && d.date >= today).sort((a, b) => a.date.localeCompare(b.date));
}

// the deadline that matters: earliest upcoming funding-priority round, else earliest upcoming round
export function targetDeadline(deadlines: DeadlineRow[], today: string): DeadlineRow | null {
  const up = upcomingDeadlines(deadlines, today);
  return up.find((d) => d.funding_priority === "yes") ?? up[0] ?? null;
}

export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000);
}

export type Verdict = "shortlisted" | "researching" | "dropped";

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

  if (f.test_policy === "required" && p.goals.gmat_gre_plan === "avoid") drop("requires an admissions test (GRE/GMAT) and you want programs without one");
  if (f.test_policy === "unknown") demote("test policy not confirmed");

  const hasEnglishTest = p.tests.some((t) => ["TOEFL", "IELTS", "Duolingo"].includes(t.name) && t.status !== "not_planned");
  if (p.english.route === "waiver" && !hasEnglishTest) {
    if (f.english_moi_waiver === "not_accepted") demote("doesn't accept your medium-of-instruction waiver; you'd need TOEFL/IELTS/Duolingo");
    if (f.english_moi_waiver === "unknown") demote("english waiver policy not confirmed");
  }

  const known = f.deadlines.filter((d) => ISO.test(d.date));
  if (known.length && !upcomingDeadlines(f.deadlines, today).length) drop("all deadlines for this cycle have passed");
  if (!known.length) demote("deadlines not confirmed");

  // admissions first: funding is never a filter here. most schools don't publish full-funding odds,
  // and the closer agent works on aid after the admit (merit reconsideration, assistantships,
  // departmental awards, outside scholarships). funding realism is shown as information only.
  return { verdict, reasons };
}
