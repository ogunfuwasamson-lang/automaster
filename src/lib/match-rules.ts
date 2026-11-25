// instant matches: programmes our agents have already checked (the shared library), matched to what a new applicant
// told us in the first minute (level, fields, regions). no model call, so it's free and shows on the next screen.
// pure, so tests and the server agree.

export type StudyLevel = "undergraduate" | "masters" | "phd";

export interface LibraryProgram {
  id: string;
  name: string;
  degree: string | null;
  url: string | null;
  kind: string | null;
  deadlines: { date?: string | null; round?: string | null }[] | null;
  funding_signals: { full_funding_realistic?: string | null; english_moi_waiver?: string | null } | null;
  test_policy?: string | null; // required | not_required | optional | waivable | unknown
  tuition_usd?: number | null;
  school: { name: string; country: string | null; region: string | null; ranking_note: string | null };
}

// what the applicant told us that changes the ranking (lib/sharpen)
export interface MatchPrefs {
  need?: "full" | "partial" | "self" | null;
  budget?: number | null; // per year, tuition and living
  avoidTests?: boolean; // no GRE/GMAT: programmes that require one are left out
  waiver?: boolean; // proving english with a medium-of-instruction letter
}

export interface Match {
  programId: string;
  school: string;
  program: string;
  degree: string;
  country: string | null;
  region: string | null;
  url: string | null;
  rankingNote: string | null;
  deadline: { date: string; round: string } | null;
  funding: "fully funded option" | "funding possible" | null;
  fieldMatch: boolean;
  tuition: number | null;
  englishWaiver: boolean; // accepts a medium-of-instruction letter (shown when that's their route)
}

// what level a programme is, from its degree text (the library's degree field is free text: "MSc", "Master of
// Science", "Bachelor of Engineering (Honours)", "Thesis master's (research-based)")
export function levelOfDegree(degree: string | null, name = ""): StudyLevel | null {
  const t = `${degree ?? ""} ${name}`.toLowerCase();
  if (/\bph\.?\s?d\b|doctor|dphil|doctoral/.test(t)) return "phd";
  if (/master|\bm\.?\s?(sc|s|a|eng|res|phil|ba|pa|pp|ph|sw|sn|asc|fa|ed|arch|plan|im|st|com|bus)\b|\bmba\b|\bllm\b|\bmim\b|\bmasc\b|erasmus mundus/.test(t)) return "masters";
  if (/bachelor|\bb\.?\s?(sc|a|eng|ba|com|ed|arch|tech|s)\b|undergrad|\bhons\b|honours/.test(t)) return "undergraduate";
  return null;
}

// a field the applicant typed, as words a programme name would contain. a few common fields have other names.
const SYNONYMS: Record<string, string[]> = {
  computer: ["computing", "computer", "software", "informatics"],
  computing: ["computing", "computer", "software", "informatics"],
  software: ["software", "computing", "computer"],
  data: ["data", "analytics", "statistics", "machine learning", "artificial intelligence"],
  analytics: ["analytics", "data"],
  ai: ["artificial intelligence", "machine learning", "data"],
  artificial: ["artificial intelligence", "machine learning"],
  business: ["business", "management", "mba", "administration", "commerce"],
  management: ["management", "business", "mba", "administration"],
  mba: ["mba", "business administration", "management"],
  finance: ["finance", "financial", "accounting", "economics"],
  accounting: ["accounting", "finance"],
  economics: ["economics", "economic", "finance"],
  health: ["health", "medical", "medicine", "nursing", "epidemiology"],
  medicine: ["medicine", "medical", "health", "clinical"],
  nursing: ["nursing", "health"],
  law: ["law", "legal", "llm"],
  engineering: ["engineering"],
  policy: ["policy", "public administration", "governance"],
  public: ["public", "policy"],
  social: ["social"],
  education: ["education", "teaching", "pedagogy"],
  environment: ["environment", "environmental", "sustainability", "climate"],
  environmental: ["environmental", "environment", "sustainability", "climate"],
  energy: ["energy", "renewable", "petroleum"],
  agriculture: ["agriculture", "agricultural", "agri", "food"],
  architecture: ["architecture", "urban"],
  design: ["design"],
  marketing: ["marketing", "business"],
  psychology: ["psychology"],
  biology: ["biology", "biological", "biosciences", "biotechnology", "life sciences"],
  chemistry: ["chemistry", "chemical"],
  physics: ["physics"],
  mathematics: ["mathematics", "mathematical", "statistics"],
  statistics: ["statistics", "data"],
  communication: ["communication", "media", "journalism"],
  media: ["media", "communication", "journalism"],
  international: ["international", "development", "global"],
  development: ["development", "international"],
};
const STOP = new Set(["and", "the", "for", "with", "studies", "science", "sciences", "of", "in", "msc", "masters", "master", "degree", "program", "programme", "phd", "bsc"]);

export function fieldTerms(fields: string[] | null | undefined): string[] {
  const out = new Set<string>();
  for (const f of fields ?? []) {
    const words = f.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length >= 2 && !STOP.has(w));
    for (const w of words) {
      if (w.length >= 4 || SYNONYMS[w]) out.add(w);
      for (const s of SYNONYMS[w] ?? []) out.add(s);
    }
  }
  return [...out];
}

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
const OWN_STOP = new Set(["and", "the", "for", "with", "of", "in", "msc", "ms", "ma", "masters", "master", "degree", "program", "programme", "phd", "bsc", "ba"]);
// words that say little on their own: "science" alone shouldn't match "Data Science" to "Marine Science"
const GENERIC = new Set(["science", "sciences", "studies", "technology", "management", "engineering", "arts", "art", "applied", "advanced", "general", "international"]);

// words that name a subject only next to another word: "resource" is human resources or natural resources, "public"
// is public health or public policy. one of these on its own never makes a match (an HR applicant was shown a
// natural resource sciences programme, 25 nov 2026)
const AMBIGUOUS = new Set(["resource", "resources", "human", "people", "natural", "public", "social", "information", "systems", "system", "development", "planning", "policy", "global", "professional", "digital", "modern", "industrial", "relations", "organisational", "organizational", "behaviour", "behavior"]);

// fields people name in two or three words, and what programmes in them are called
const PHRASES: [RegExp, string[]][] = [
  [/\b(human resources?|hr|hrm|people management|personnel|talent management|workforce)\b/, ["human resource", "human resources", "hrm", "people management", "personnel", "industrial relations", "labour relations", "labor relations", "employment relations", "organisational behaviour", "organizational behavior", "organisational psychology", "organizational psychology", "talent management"]],
  [/\b(information technology|information systems|it)\b/, ["information technology", "information systems", "information management", "computing"]],
  [/\bsupply chain|logistics|procurement\b/, ["supply chain", "logistics", "procurement", "operations management"]],
  [/\bproject management\b/, ["project management", "programme management", "program management"]],
  [/\bpublic health\b/, ["public health", "global health", "epidemiology", "health policy"]],
  [/\bpublic (policy|administration)\b/, ["public policy", "public administration", "public management", "governance"]],
  [/\b(international relations|diplomacy)\b/, ["international relations", "international affairs", "diplomacy", "global affairs"]],
  [/\bsocial work\b/, ["social work", "social welfare"]],
  [/\b(natural resources?|forestry)\b/, ["natural resource", "natural resources", "forestry", "environmental"]],
];
const phraseTerms = (field: string): string[] => {
  const f = ` ${words(field).join(" ")} `;
  return PHRASES.filter(([re]) => re.test(f)).flatMap(([, t]) => t);
};

// the same subject under another name: these count as the word itself
const SAME: Record<string, string[]> = {
  business: ["mba"],
  administration: ["mba"],
  mba: ["business administration"],
  ai: ["artificial intelligence"],
  artificial: ["ai"],
  computer: ["computing"],
  computing: ["computer"],
  law: ["llm", "laws"],
  economics: ["economic"],
};
const has = (text: string, term: string) => {
  const t = ` ${words(text).join(" ")} `;
  return [term, ...(SAME[term] ?? [])].some((w) => t.includes(` ${w}`));
};

// how well a programme's name fits the fields the applicant named (the best of their fields):
//   all of a field's words in the name ("Public Health" in "MSc Public Health"): 100+
//   one of its specific words ("Health Policy" for "Public Health"): 40-60
//   only a related word ("Nursing" for "Health"): 25, not enough to show (a wrong match costs more trust than none)
export function fieldScore(name: string, fields: string[] | null | undefined): number {
  let best = 0;
  for (const f of fields ?? []) {
    const own = words(f).filter((w) => w.length >= 2 && !OWN_STOP.has(w));
    if (!own.length) continue;
    const specific = own.filter((w) => !GENERIC.has(w) && !AMBIGUOUS.has(w));
    const hits = own.filter((w) => has(name, w));
    const specificHits = specific.filter((w) => has(name, w));
    let sc = 0;
    if (hits.length === own.length) sc = 100 + own.length;
    // the field under its usual programme names ("Human Resource" in "MSc Industrial Relations")
    else if (phraseTerms(f).some((t) => has(name, t))) sc = 90;
    else if (specificHits.length) sc = 40 + Math.round((20 * specificHits.length) / specific.length);
    else if (own.some((w) => (SYNONYMS[w] ?? []).some((t) => has(name, t)))) sc = 25;
    best = Math.max(best, sc);
  }
  return best;
}

// the next application round that's still open, at least a few days out
export function nextDeadline(deadlines: LibraryProgram["deadlines"], today: string): { date: string; round: string } | null {
  const min = new Date(Date.parse(`${today}T00:00:00Z`) + 3 * 86_400_000).toISOString().slice(0, 10);
  const open = (deadlines ?? [])
    .filter((d): d is { date: string; round?: string | null } => typeof d?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && d.date >= min)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return open ? { date: open.date, round: (open.round ?? "").slice(0, 80) } : null;
}

// the library's names carry research notes in brackets ("ECT+ (Erasmus Mundus Master of Science, coordinated by...")
export function cleanName(name: string): string {
  let n = name.replace(/\s*\([^)]*\)/g, " ").replace(/\s*\([^)]*$/, " ").split(";")[0].replace(/\s+/g, " ").replace(/\s+,/g, ",").replace(/,\s*$/, "").trim();
  if (n.length < 10) n = name.replace(/\s*\(([^,;)]*)[^)]*\)?/, " ($1)").replace(/\s+/g, " ").trim();
  return n.length > 80 ? `${n.slice(0, 78).trimEnd()}…` : n;
}

// the university, not the faculty: the agents sometimes file a whole university's programmes under the business
// school they first met (a computer science MSE under "Johns Hopkins University Carey Business School"). for
// display only; standalone schools ("London Business School", "MIT Sloan School of Management") stay as they are.
const UNI = /\b(?:University|College|Universidade|Universidad|Université|Universität|Universiteit|Università|Institute of Technology)\b/;
const FACULTY = /\b(?:Business School|School of|Graduate School|College of|Faculty of|Institute of Education|Escola|Faculdade|Programa)\b/;
const trimFaculty = (s: string): string => {
  const m = FACULTY.exec(s);
  if (!m || m.index === 0) return s;
  const before = s.slice(0, m.index).trim().replace(/,$/, "");
  const all = [...before.matchAll(new RegExp(UNI.source, "g"))];
  if (!all.length) return s;
  const last = all[all.length - 1];
  const end = (last.index ?? 0) + last[0].length;
  const rest = before.slice(end);
  return rest === "" || /^\s+(?:of|at|de|do|da|del)\s/.test(rest) ? before : before.slice(0, end);
};
export function cleanSchool(raw: string): string {
  const s = raw.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").replace(/\s+,/g, ",").trim();
  const parts = s.split(/\s*,\s*|\s+[–-]\s+/).filter(Boolean);
  if (parts.length > 1 && parts.some((x) => FACULTY.test(x))) {
    const uni = parts.find((x) => UNI.test(x) && !FACULTY.test(x));
    if (uni) return uni;
  }
  return trimFaculty(s);
}

const passed = (deadlines: LibraryProgram["deadlines"], today: string) => {
  const dated = (deadlines ?? []).filter((d) => typeof d?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date!));
  return dated.length > 0 && dated.every((d) => d.date! < today);
};

// how much the applicant's answers move a programme: funding realism for those who need it, tuition against
// what they can cover, and whether their way of proving english is accepted
export function prefScore(a: MatchPrefs, ff: string | null, tuition: number | null, moi: string | null): number {
  let s = 0;
  if (a.need === "full") s += ff === "likely" ? 35 : ff === "possible" ? 15 : ff === "rare" ? -60 : 0;
  else if (a.need === "partial") s += ff === "likely" ? 15 : ff === "possible" ? 10 : 0;
  else s += ff === "likely" ? 15 : ff === "possible" ? 8 : 0;
  if (a.need !== "full" && a.budget && tuition) s += tuition > a.budget * 1.5 ? -50 : tuition > a.budget ? -25 : 10;
  if (a.waiver) s += moi === "accepted" ? 10 : moi === "case_by_case" ? 5 : moi === "not_accepted" ? -20 : 0;
  return s;
}

// a library row whose "name" is a research note ("specific department not confirmed, ... likely under ...") isn't a
// programme anyone can apply to by name: it never goes on a shortlist
const GENERAL_ADMISSION = /\b(first[- ]year|general (undergraduate )?admission|undergraduate admission|freshman)\b/i;
const NOTE_NAME = /not confirmed|unconfirmed|likely under|to be confirmed|\btb[cd]\b|department unknown|unknown department/i;

// rank the library for one applicant: same level and region always; their field first; then open deadlines,
// funding and ranking. at most two per school so the list isn't one university.
export function rankMatches(
  library: LibraryProgram[],
  a: { level: StudyLevel | null; fields: string[] | null; regions: string[] } & MatchPrefs,
  today: string,
  limit = 8,
): Match[] {
  const terms = fieldTerms(a.fields);
  const scored: (Match & { score: number })[] = [];
  for (const p of library) {
    if (p.kind === "scholarship") continue;
    if (!p.school.region || !a.regions.includes(p.school.region)) continue;
    if (/\bonline\b|distance learning/i.test(p.name)) continue; // studying abroad means being there
    if (NOTE_NAME.test(p.name)) continue;
    const lvl = levelOfDegree(p.degree, p.name);
    if (a.level && lvl !== a.level) continue;
    if (passed(p.deadlines, today)) continue;
    if (a.avoidTests && p.test_policy === "required") continue;
    const fs = terms.length ? fieldScore(p.name, a.fields) : 0;
    const fieldMatch = fs >= 40;
    const deadline = nextDeadline(p.deadlines, today);
    const ff = p.funding_signals?.full_funding_realistic ?? null;
    const funding = ff === "likely" ? "fully funded option" : ff === "possible" ? "funding possible" : null;
    const moi = p.funding_signals?.english_moi_waiver ?? null;
    const tuition = typeof p.tuition_usd === "number" && p.tuition_usd > 0 ? p.tuition_usd : null;
    const score = fs + (deadline ? 20 : 0) + (p.school.ranking_note ? 3 : 0) + prefScore(a, ff, tuition, moi);
    scored.push({
      programId: p.id,
      school: p.school.name.replace(/\s*\([^)]*\)\s*/g, " ").trim(),
      program: cleanName(p.name),
      degree: (p.degree ?? "").split(/[(;,]/)[0].trim().slice(0, 40),
      country: p.school.country,
      region: p.school.region,
      url: p.url,
      rankingNote: p.school.ranking_note,
      deadline,
      funding,
      fieldMatch,
      tuition,
      englishWaiver: !!a.waiver && (moi === "accepted" || moi === "case_by_case"),
      score,
    });
  }
  // when they named fields, only programmes in those fields count; nothing at all is better than a list of
  // unrelated programmes (the agents' own search starts on the same screen)
  // no field named yet: only the general admission routes (a first-year undergraduate application), never a
  // programme in a subject they didn't choose (a fashion design applicant was given psychology, nov 2026)
  const pool = terms.length ? scored.filter((m) => m.fieldMatch) : scored.filter((m) => GENERAL_ADMISSION.test(m.program));
  pool.sort((x, y) => y.score - x.score || (x.deadline?.date ?? "9999").localeCompare(y.deadline?.date ?? "9999") || x.school.localeCompare(y.school));
  const perSchool = new Map<string, number>();
  const out: Match[] = [];
  for (const m of pool) {
    const n = perSchool.get(m.school) ?? 0;
    if (n >= 2) continue;
    perSchool.set(m.school, n + 1);
    const { score: _s, ...rest } = m;
    void _s;
    out.push(rest);
    if (out.length >= limit) break;
  }
  return out;
}
