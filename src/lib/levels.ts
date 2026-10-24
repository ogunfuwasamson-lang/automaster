// how admissions and funding actually work at each study level. injected into agent prompts
// so the same agents serve a 17-year-old applying for a bachelor's and a researcher applying for a PhD.
import { LEVEL_LABEL, type StudyLevel } from "@/lib/profile";

export function levelGuide(level: StudyLevel): string {
  if (level === "undergraduate") {
    return `level: bachelor's (undergraduate).
- applications usually go through a central system: Common App / Coalition (US), UCAS (UK, one personal statement for up to 5 choices), OUAC (Ontario), Studielink (NL), uni-assist (DE), national portals elsewhere. note which one.
- tests: SAT/ACT (many US schools test-optional), A-levels/IB/national exams with predicted grades, sometimes subject tests or admissions tests (e.g. UK subject-specific tests).
- money: US need-based aid for internationals exists at a limited set of schools (some need-blind, some meet full demonstrated need); merit scholarships elsewhere. UK: almost no aid for internationals. continental Europe: low or no tuition at many public universities (e.g. Germany, Norway, parts of France/Italy). Asia: government scholarships (e.g. GKS, MEXT, Chinese Government Scholarship) and university awards.
- what matters to admissions: grades and rigour, test scores where required, activities and leadership, the personal essay, recommendations from teachers and a counsellor.`;
  }
  if (level === "phd") {
    return `level: PhD.
- US/Canada: admission is usually by department, and offers are normally fully funded (tuition waiver + stipend via fellowship, RA or TA). an unfunded offer is a red flag. contacting faculty first helps but isn't always required.
- UK/Ireland/Australia/much of Europe: often supervisor-first. the applicant finds a supervisor, agrees a project or proposal, then applies; funding comes from studentships, doctoral training programmes, university scholarships or the supervisor's grant, and some are home-students-only. many continental European PhDs are salaried positions advertised like jobs (Netherlands, Nordics, Germany, Switzerland).
- Asia: government scholarships (MEXT, GKS, CSC, A*STAR/Singapore) and university awards.
- what matters: research fit with specific faculty, research experience and outputs, a strong research statement or proposal, references from researchers. name potential supervisors when you can.`;
  }
  return `level: master's.
- research-oriented master's (sciences, engineering, many social sciences) are often funded through research/teaching assistantships or by joining a lab.
- professional master's (business, law, policy, design...) mostly offer merit scholarships, rarely full rides; say so plainly.
- host-government scholarships matter a lot outside the US (e.g. Chevening and Commonwealth in the UK; Erasmus Mundus, DAAD, Eiffel, Swedish Institute, Holland and Swiss excellence awards in Europe; MEXT, GKS, Chinese Government and Singapore awards in Asia; Australia Awards; university awards in Canada).
- tests: GRE/GMAT for some programs, often waivable for experienced applicants; many programs need none.`;
}

// extra things program research must report at this level
export function programChecklist(level: StudyLevel): string {
  if (level === "undergraduate") {
    return "application system (Common App, UCAS, etc.) and its deadline rounds (early decision/action, regular); SAT/ACT policy; required school exams and minimum grades; need-based and merit aid for international students and whether admission is need-blind for internationals";
  }
  if (level === "phd") {
    return "whether applicants must contact or secure a supervisor first; whether a research proposal is required and its length; the standard funding package (stipend amount, tuition waiver, years guaranteed) and whether it covers international students; GRE policy; faculty in the applicant's research area";
  }
  return "GRE/GMAT policy and waiver rules; whether it's research-based or taught; assistantships or scholarships open to internationals";
}

// the written pieces you usually see at this level, for the strategist's fallback
export function defaultEssay(level: StudyLevel): { kind: string; title: string; prompt: string; limit: string } {
  if (level === "undergraduate") return { kind: "personal_statement", title: "personal statement", prompt: "no published prompt found: personal statement about who you are, what you want to study and why", limit: "650" };
  if (level === "phd") return { kind: "statement_of_purpose", title: "research statement", prompt: "no published prompt found: research statement covering research experience, interests, fit with faculty, and goals", limit: "1000" };
  return { kind: "statement_of_purpose", title: "statement of purpose", prompt: "no published prompt found: statement of purpose covering background, goals and fit", limit: "1000" };
}

export const levelName = (level: StudyLevel) => LEVEL_LABEL[level];
