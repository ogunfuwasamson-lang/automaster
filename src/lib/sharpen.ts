// "sharpen your matches": the few facts that decide which programmes and scholarships fit, asked as one-tap
// questions. nov 2026: of 47 applicants, 2 had told us their funding need, 1 a budget, 11 a citizenship, 4 an
// english route, 3 a test plan. without them fit scores and the scholarship hunt run blind. each answer changes
// the matches in front of them (lib/match-rules), so answering pays off at once. pure, shared by the setup
// screen, the dashboard, the public matcher and the server.
import type { Profile, StudyLevel } from "@/lib/profile";

export type SharpenKey = "citizenship" | "funding" | "budget" | "english" | "tests" | "grades" | "applying";

export interface SharpenQuestion {
  key: SharpenKey;
  ask: string;
  why: string; // what answering changes, in one line
  options: { value: string; label: string }[]; // empty = pick from a list (citizenship)
}

const GRADE_LABEL: Record<string, string> = {
  first: "First class, or GPA 3.5 and above",
  upper_second: "Second class upper (2:1), or GPA 3.0 to 3.49",
  lower_second: "Second class lower (2:2), or GPA 2.5 to 2.99",
  third: "Third class or pass, or GPA below 2.5",
};
export const BUDGET: Record<string, number> = { under5k: 5000, "5to15k": 15000, "15to30k": 30000, over30k: 50000 };

export function sharpenQuestions(level: StudyLevel | null): SharpenQuestion[] {
  const grad = level !== "undergraduate";
  const tests = level === "undergraduate" ? "the SAT or ACT" : level === "phd" ? "the GRE" : "the GRE or GMAT";
  const qs: SharpenQuestion[] = [
    { key: "citizenship", ask: "Which passport do you hold?", why: "Most scholarships are decided by citizenship. We show the ones open to you.", options: [] },
    {
      key: "funding",
      ask: "How will you pay for it?",
      why: "Programmes where full funding is realistic move to the top if you need it.",
      options: [
        { value: "full", label: "I need full funding" },
        { value: "partial", label: "Partial funding would work" },
        { value: "self", label: "I can pay" },
      ],
    },
    {
      key: "budget",
      ask: "How much can you cover a year, tuition and living?",
      why: "Programmes that cost far more than this move down.",
      options: [
        { value: "under5k", label: "Under $5,000" },
        { value: "5to15k", label: "$5,000 to $15,000" },
        { value: "15to30k", label: "$15,000 to $30,000" },
        { value: "over30k", label: "Over $30,000" },
      ],
    },
    {
      key: "english",
      ask: "How will you show your English?",
      why: "Some schools accept a letter that your degree was taught in English instead of IELTS or TOEFL.",
      options: [
        { value: "test", label: "IELTS, TOEFL or Duolingo" },
        { value: "waiver", label: "My degree was taught in English" },
        { value: "undecided", label: "Not sure yet" },
      ],
    },
    {
      key: "tests",
      ask: `Would you take ${tests}?`,
      why: "If not, programmes that require it drop off your list.",
      options: [
        { value: "will_take", label: "Yes, or I have it" },
        { value: "avoid", label: "Only programmes without it" },
        { value: "undecided", label: "Not sure" },
      ],
    },
  ];
  if (grad)
    qs.push({
      key: "grades",
      ask: "What was your degree result?",
      why: "Your agents sort schools into reach, match and safer bets from it.",
      options: Object.entries(GRADE_LABEL).map(([value, label]) => ({ value, label })),
    });
  qs.push({
    key: "applying",
    ask: "When are you applying?",
    why: "Your agents pace the work to your timeline.",
    options: [
      { value: "this_cycle", label: "This cycle, for 2027" },
      { value: "next_year", label: "Next year" },
      { value: "exploring", label: "Just exploring" },
    ],
  });
  return qs;
}

// what's already known, from the answers or from what the agents read in their CV and documents
export function answered(p: Profile, key: SharpenKey, passportCountry?: string | null): boolean {
  switch (key) {
    case "citizenship":
      return !!(p.identity.citizenship || passportCountry);
    case "funding":
      return !!p.funding.need || p.skipped_gaps.includes("funding.need");
    case "budget":
      return p.funding.need === "full" || p.funding.annual_budget_usd != null || p.skipped_gaps.includes("funding.annual_budget_usd");
    case "english":
      return !!p.english.route;
    case "tests":
      return !!p.goals.gmat_gre_plan;
    case "grades":
      return p.education.some((e) => !!e.grade || e.gpa != null) || p.confirmed_facts.some((f) => f.topic === "degree result");
    case "applying":
      return !!p.goals.applying;
  }
}

export function sharpenState(p: Profile, passportCountry?: string | null): { questions: SharpenQuestion[]; open: SharpenQuestion[]; done: number; total: number } {
  const questions = sharpenQuestions(p.goals.study_level);
  const open = questions.filter((q) => !answered(p, q.key, passportCountry));
  return { questions, open, done: questions.length - open.length, total: questions.length };
}

// one answer into the profile. "skip" files it as asked-and-skipped so it isn't asked again.
export function applySharpen(p: Profile, key: SharpenKey, value: string): Profile {
  const skip = (gap: string) => ({ ...p, skipped_gaps: [...new Set([...p.skipped_gaps, gap])] });
  switch (key) {
    case "citizenship":
      return value === "skip" ? skip("identity.citizenship") : { ...p, identity: { ...p.identity, citizenship: value.slice(0, 60) } };
    case "funding":
      return ["full", "partial", "self"].includes(value) ? { ...p, funding: { ...p.funding, need: value as "full" | "partial" | "self" } } : skip("funding.need");
    case "budget":
      return BUDGET[value] ? { ...p, funding: { ...p.funding, annual_budget_usd: BUDGET[value] } } : skip("funding.annual_budget_usd");
    case "english":
      return ["test", "waiver", "undecided"].includes(value) ? { ...p, english: { ...p.english, route: value as "test" | "waiver" | "undecided" } } : p;
    case "tests":
      return ["will_take", "avoid", "undecided"].includes(value) ? { ...p, goals: { ...p.goals, gmat_gre_plan: value as "will_take" | "avoid" | "undecided" } } : p;
    case "grades": {
      const label = GRADE_LABEL[value];
      if (!label) return skip("education.grade");
      const facts = [...p.confirmed_facts.filter((f) => f.topic !== "degree result"), { topic: "degree result", value: label }];
      // the most recent degree without a grade takes it too, so forms and the fit check read it in the usual place
      const i = p.education.findIndex((e) => !e.grade && e.gpa == null);
      const education = i >= 0 ? p.education.map((e, j) => (j === i ? { ...e, grade: label } : e)) : p.education;
      return { ...p, education, confirmed_facts: facts };
    }
    case "applying":
      return ["this_cycle", "next_year", "exploring"].includes(value) ? { ...p, goals: { ...p.goals, applying: value as "this_cycle" | "next_year" | "exploring" } } : p;
  }
}

// what the matcher reads (lib/match-rules)
export function matchCriteria(p: Profile): { need: "full" | "partial" | "self" | null; budget: number | null; avoidTests: boolean; waiver: boolean } {
  return { need: p.funding.need, budget: p.funding.annual_budget_usd, avoidTests: p.goals.gmat_gre_plan === "avoid", waiver: p.english.route === "waiver" };
}
