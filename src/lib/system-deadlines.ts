// closing dates set by an application system rather than by the university, so they aren't on the course pages the
// agents read. UK bachelor's courses close on the UCAS date for the intake: without it every UK undergraduate
// programme sat at "deadlines not confirmed" (a paid applicant had five, nov 2026). pure, so tests pin the dates.
import type { DeadlineRow } from "@/lib/fit";
import { parseTerm } from "@/lib/intake";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// ucas.com, checked 23 nov 2026. add the next entry year when UCAS publishes it
export const UCAS_SOURCE = "https://www.ucas.com/events/2027-entry-deadline-for-all-undergraduate-courses-except-those-with-a-15-october-deadline-475546";
const UCAS: Record<number, { equal: string; october: string }> = {
  2027: { equal: "2027-01-13", october: "2026-10-15" },
};
// these close on 15 october the year before: Oxford, Cambridge, and most medicine, dentistry and veterinary courses
const OCTOBER_COURSE = /\b(medicine|mbbs|mbchb|bmbs|bm bs|dentistry|dental surgery|veterinary)\b/i;
const OXBRIDGE = /\b(oxford|cambridge)\b/i;
// applied for directly, not through UCAS: INTO and other pathway colleges, international foundation programmes
// (INTO in capitals only: "into" is an ordinary word in course names)
const NOT_UCAS = (program: string) => /\bINTO\b/.test(program) || /\bpathway\b|international (foundation|year one)|\bstudy group\b|\bkaplan\b|\bnavitas\b|\boncampus\b/i.test(program);

export function isUk(country: string, region?: string): boolean {
  return region === "uk" || /\b(united kingdom|uk|england|scotland|wales|northern ireland|great britain)\b/i.test(country);
}

// the UCAS closing date for a UK bachelor's course and the applicant's intake (UK courses start in the autumn)
export function ucasDeadline(a: { school: string; program: string; country: string; region?: string; term: string | null }): (DeadlineRow & { intake: string }) | null {
  if (!isUk(a.country, a.region) || NOT_UCAS(a.program)) return null;
  const t = parseTerm(a.term);
  if (!t || t.season !== "Fall") return null;
  const d = UCAS[t.year];
  if (!d) return null;
  const october = OCTOBER_COURSE.test(a.program) || OXBRIDGE.test(a.school);
  return {
    round: october ? "UCAS deadline (Oxford, Cambridge, medicine, dentistry, veterinary)" : "UCAS equal consideration date",
    date: october ? d.october : d.equal,
    intake: `Fall ${t.year}`,
    funding_priority: "unknown",
    notes: `18:00 UK time. Set by UCAS, not the university, so it isn't on the course page. Later applications are considered only if places remain, and popular courses fill. Source: ${UCAS_SOURCE}`,
  };
}

// the research's own dates win; the system's date fills in only when the course pages gave none
export function withSystemDeadlines<T extends DeadlineRow>(deadlines: T[], a: Parameters<typeof ucasDeadline>[0]): T[] {
  if (deadlines.some((d) => ISO.test(d.date))) return deadlines;
  const ucas = ucasDeadline(a);
  return ucas ? [...deadlines, ucas as T] : deadlines;
}
