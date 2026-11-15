// which term an application is for. the applicant's preferred term ("fall 2027") is the default, but a programme
// that only starts in another term wins: mcgill's in-person MMA starts in the summer and asks for the "Summer term,
// 2026-2027 application cycle", and the agents chose "Fall 2027" from the profile. pure.

export type Term = { season: "Fall" | "Spring" | "Summer" | "Winter"; year: number };

const SEASON: Record<string, Term["season"]> = { fall: "Fall", autumn: "Fall", automne: "Fall", spring: "Spring", printemps: "Spring", summer: "Summer", "été": "Summer", ete: "Summer", winter: "Winter", hiver: "Winter" };
const TERM_RE = /\b(fall|autumn|automne|spring|printemps|summer|été|ete|winter|hiver)\b[\s\-/]*(?:[a-zé]+\s*)?(?:term|semester|intake|session|entry)?[\s\-/]*(20\d\d)\b/gi;

export const termLabel = (t: Term) => `${t.season} ${t.year}`;
const same = (a: Term, b: Term) => a.season === b.season && a.year === b.year;

// "fall-2027", "Fall 2027", "Automne 2027": the first term named in some text
export function parseTerm(text: string | null | undefined): Term | null {
  return termsIn(text)[0] ?? null;
}

export function termsIn(text: string | null | undefined): Term[] {
  const out: Term[] = [];
  for (const m of `${text ?? ""}`.matchAll(TERM_RE)) {
    const season = SEASON[m[1].toLowerCase()];
    if (season) out.push({ season, year: Number(m[2]) });
  }
  return out;
}

type Deadline = { round?: string | null; date?: string | null; notes?: string | null; intake?: string | null };

// the intakes a programme's deadline rounds are for: the structured `intake` when research gave one, otherwise the
// term the round's name or notes name ("Fall 2027 (F-1 applicants)", "these dates are for the Summer 2027 intake")
export function programIntakes(deadlines: Deadline[] | null | undefined): Term[] {
  const out: Term[] = [];
  for (const d of deadlines ?? []) {
    const named = parseTerm(d.intake) ?? parseTerm(d.round) ?? termsIn(d.notes).find((t) => /intake|start|entry|term|cohort/i.test(d.notes ?? "")) ?? null;
    if (named && !out.some((t) => same(t, named))) out.push(named);
  }
  return out;
}

// the term to apply for: the applicant's own when the programme offers it (or says nothing), the programme's when it
// starts in one term only and that isn't the applicant's
export function applicationTerm(deadlines: Deadline[] | null | undefined, preferred: string | null | undefined): { term: Term | null; fromProgram: boolean } {
  const want = parseTerm(preferred);
  const offered = programIntakes(deadlines);
  if (!offered.length) return { term: want, fromProgram: false };
  if (want && offered.some((t) => same(t, want))) return { term: want, fromProgram: false };
  if (offered.length === 1) return { term: offered[0], fromProgram: true };
  // several intakes, none the applicant's: the next one in the applicant's year, else leave the applicant's choice
  const order = { Spring: 1, Winter: 1, Summer: 2, Fall: 3 } as const;
  const later = want ? offered.filter((t) => t.year === want.year).sort((a, b) => order[a.season] - order[b.season]) : [];
  return later.length === 1 ? { term: later[0], fromProgram: true } : { term: want, fromProgram: false };
}

// a portal question about the term or intake: its answer belongs to that one application, never the whole profile
// ("Application Type: Fall / Automne 2027" at mcgill is not an answer for the next school's "Application Type")
export const TERM_QUESTION = /\b(application\s*(type|sub\s*-?\s*type|cycle|term|period|round)|admit\s*(type|term)|entry\s*(term|point|semester|session|date)|start(ing)?\s*(term|semester|session)|term\s*of\s*(entry|admission)|intake|semester|academic\s*(term|session|year)|^\W*term\W*(term)?\W*$|session\s*d.admission|trimestre)\b/i;
export const isTermAnswer = (question: string, answer: string) => TERM_QUESTION.test(question) || (termsIn(answer).length > 0 && answer.length < 60);
