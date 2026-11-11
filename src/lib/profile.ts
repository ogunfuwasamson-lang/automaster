// the applicant profile: one structured object every agent reads.
// built by intake from documents + interview. stored in profiles.profile (jsonb).
//
// patch rules (what agents send back):
//   * null / missing  = "no new info", never overwrites
//   * scalar value    = set
//   * array of items  = merged into the existing list by a natural key
import * as z from "zod/v4";

export type StudyLevel = "undergraduate" | "masters" | "phd";
export const LEVEL_LABEL: Record<StudyLevel, string> = { undergraduate: "bachelor's", masters: "master's", phd: "PhD" };
export const levelOf = (p: { goals: { study_level: StudyLevel | null } }): StudyLevel => p.goals.study_level ?? "masters";
export const TESTS_FOR: Record<StudyLevel, string> = { undergraduate: "SAT/ACT", masters: "GRE/GMAT", phd: "GRE" };

export const REGIONS: Record<string, string> = {
  us: "United States",
  canada: "Canada",
  uk: "United Kingdom",
  europe: "Europe (EU/EEA, Switzerland)",
  asia: "Asia",
  australia_nz: "Australia & New Zealand",
  middle_east: "Middle East",
  africa: "Africa",
  latin_america: "Latin America",
};

const s = () => z.string().nullable();
const n = () => z.number().nullable();

export const Education = z.object({
  institution: z.string(),
  degree: s(), // "B.Sc", "HND", "MBA"
  field: s(),
  country: s(),
  start: s(), // "2012" or "2012-09"
  end: s(),
  grade: s(), // as written: "Second Class Upper", "3.6/4.0", "4.2/5.0"
  gpa: n(),
  gpa_scale: n(),
});

export const Work = z.object({
  company: z.string(),
  role: z.string(),
  start: s(),
  end: s(), // null = current
  location: s(),
  highlights: z.array(z.string()), // achievements, with numbers where the source has them
});

export const Test = z.object({
  name: z.enum(["GRE", "GMAT", "SAT", "ACT", "TOEFL", "IELTS", "Duolingo", "Other"]),
  status: z.enum(["taken", "booked", "planned", "not_planned"]),
  score: s(),
  date: s(),
});

export const Story = z.object({
  title: z.string(), // short handle: "grew vendy merchant base"
  summary: z.string(), // what happened, what they did
  metrics: z.array(z.string()),
});

export const Profile = z.object({
  identity: z.object({
    full_name: s(),
    citizenship: s(),
    country_of_residence: s(),
    city: s(),
  }),
  education: z.array(Education),
  work: z.array(Work),
  tests: z.array(Test),
  english: z.object({
    route: z.enum(["test", "waiver", "undecided"]).nullable(), // waiver = medium-of-instruction letter
    notes: s(),
  }),
  goals: z.object({
    study_level: z.enum(["undergraduate", "masters", "phd"]).nullable(),
    fields: z.array(z.string()).nullable(), // null = not asked yet. for undergrads: intended majors
    research_interests: z.array(z.string()).nullable(), // phd (and research masters)
    degree_types: z.array(z.string()).nullable(),
    target_term: s(),
    short_term_goal: s(),
    long_term_goal: s(),
    why_masters: s(), // "why this degree, why now" at any level (key kept for stored data)
    gmat_gre_plan: z.enum(["will_take", "avoid", "undecided"]).nullable(),
  }),
  funding: z.object({
    need: z.enum(["full", "partial", "self"]).nullable(),
    annual_budget_usd: n(), // what they can cover per year
    application_fee_budget_usd: n(),
    notes: s(),
  }),
  preferences: z.object({
    regions: z.array(z.string()).nullable(), // REGIONS keys; null = not asked
    locations: z.array(z.string()).nullable(), // specific countries/cities. [] = no preference, null = not asked
    avoid: z.array(z.string()).nullable(),
    stem_preferred: z.boolean().nullable(),
    max_applications: n(),
  }),
  recommenders: z.object({
    count_lined_up: n(),
    notes: s(),
  }),
  stories: z.array(Story),
  skills: z.array(z.string()),
  notes: z.array(z.string()),
  // facts the user picked when sources disagreed. authoritative: agents never override these.
  confirmed_facts: z.array(z.object({ topic: z.string(), value: z.string() })),
  // gap keys the user answered without a clean value ("the budget decides"). never asked again.
  skipped_gaps: z.array(z.string()),
});
export type Profile = z.infer<typeof Profile>;

// what extraction and the interviewer may send back. every section optional.
export const ProfilePatch = z.object({
  identity: Profile.shape.identity.optional(),
  education: z.array(Education).optional(),
  work: z.array(Work).optional(),
  tests: z.array(Test).optional(),
  english: Profile.shape.english.optional(),
  goals: Profile.shape.goals.optional(),
  funding: Profile.shape.funding.optional(),
  preferences: Profile.shape.preferences.optional(),
  recommenders: Profile.shape.recommenders.optional(),
  stories: z.array(Story).optional(),
  skills: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
  skipped_gaps: z.array(z.string()).optional(),
});
export type ProfilePatch = z.infer<typeof ProfilePatch>;

export function emptyProfile(): Profile {
  return {
    identity: { full_name: null, citizenship: null, country_of_residence: null, city: null },
    education: [],
    work: [],
    tests: [],
    english: { route: null, notes: null },
    goals: {
      study_level: null, fields: null, research_interests: null, degree_types: null, target_term: null, short_term_goal: null,
      long_term_goal: null, why_masters: null, gmat_gre_plan: null,
    },
    funding: { need: null, annual_budget_usd: null, application_fee_budget_usd: null, notes: null },
    preferences: { regions: null, locations: null, avoid: null, stem_preferred: null, max_applications: null },
    recommenders: { count_lined_up: null, notes: null },
    stories: [],
    skills: [],
    notes: [],
    confirmed_facts: [],
    skipped_gaps: [],
  };
}

// tolerant load: whatever is in the db, fill missing pieces from the empty shape
export function loadProfile(raw: unknown): Profile {
  const base = emptyProfile();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base) as (keyof Profile)[]) {
    const v = r[key];
    if (v == null) continue;
    const b = base[key];
    if (Array.isArray(b)) out[key] = Array.isArray(v) ? v : b;
    else if (typeof v === "object") out[key] = { ...(b as object), ...(v as object) };
  }
  return out as Profile;
}

const norm = (x: string | null | undefined) => (x ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

function mergeObj<T extends Record<string, unknown>>(base: T, patch: Partial<T> | undefined): T {
  if (!patch) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v) && Array.isArray(out[k])) {
      (out as Record<string, unknown>)[k] = unionStrings(out[k] as string[], v as string[]);
    } else if (typeof v === "string" && v.trim() === "") {
      continue;
    } else {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

function unionStrings(a: string[], b: string[]): string[] {
  const seen = new Set(a.map(norm));
  const out = [...a];
  for (const x of b) {
    if (!x || seen.has(norm(x))) continue;
    seen.add(norm(x));
    out.push(x);
  }
  return out;
}

function mergeList<T extends Record<string, unknown>>(base: T[], add: T[] | undefined, key: (t: T) => string): T[] {
  if (!add?.length) return base;
  const out = [...base];
  for (const item of add) {
    const k = key(item);
    const i = out.findIndex((x) => key(x) === k);
    if (i === -1) out.push(item);
    else out[i] = mergeObj(out[i], item);
  }
  return out;
}

export function mergeProfile(base: Profile, patch: ProfilePatch): Profile {
  return {
    identity: mergeObj(base.identity, patch.identity),
    education: mergeList(base.education, patch.education, (e) => norm(e.institution) + "|" + norm(e.degree)),
    work: mergeList(base.work, patch.work, (w) => norm(w.company) + "|" + norm(w.role)),
    tests: mergeList(base.tests, patch.tests, (t) => t.name),
    english: mergeObj(base.english, patch.english),
    goals: mergeObj(base.goals, patch.goals),
    funding: mergeObj(base.funding, patch.funding),
    preferences: mergeObj(base.preferences, patch.preferences),
    recommenders: mergeObj(base.recommenders, patch.recommenders),
    stories: mergeList(base.stories, patch.stories, (st) => norm(st.title)),
    skills: unionStrings(base.skills, patch.skills ?? []),
    notes: unionStrings(base.notes, patch.notes ?? []),
    confirmed_facts: base.confirmed_facts,
    skipped_gaps: unionStrings(base.skipped_gaps, patch.skipped_gaps ?? []),
  };
}

// a full rewrite (used by the cleanup agent): build fresh from the patch, keep user-confirmed facts
export function rebuildProfile(patch: ProfilePatch, keep: Profile): Profile {
  return { ...mergeProfile(emptyProfile(), patch), confirmed_facts: keep.confirmed_facts, skipped_gaps: keep.skipped_gaps };
}

export function confirmFact(p: Profile, topic: string, value: string): Profile {
  const rest = p.confirmed_facts.filter((f) => norm(f.topic) !== norm(topic));
  return { ...p, confirmed_facts: [...rest, { topic, value }] };
}

// what the interviewer still needs, in priority order.
// priority = how much the answer changes the shortlist.
export interface Gap {
  key: string;
  ask: string;
}

// details: the applicant's form details (quick cards). a gap they already answered there isn't a gap: someone who
// told a card which passport they hold isn't asked their citizenship again, and their story answers count as stories
export function profileGaps(p: Profile, details?: Record<string, unknown> | null): Gap[] {
  const g: Gap[] = [];
  const has = (v: unknown) => v !== null && v !== undefined && v !== "";
  const d = (k: string) => has(details?.[k]) && details?.[k] !== "Prefer not to say";
  const told = ["proudest_achievement", "challenge_overcome", "failure_lesson", "leadership_moment", "teamwork_disagreement", "community_impact"].filter(d).length;

  const lvl = levelOf(p);
  const L = LEVEL_LABEL[lvl];
  if (!has(p.goals.study_level)) g.push({ key: "goals.study_level", ask: "which level they're applying for: bachelor's (undergraduate), master's, or PhD" });
  if (!p.goals.fields?.length) g.push({ key: "goals.fields", ask: lvl === "undergraduate" ? "which subjects/majors they want to study" : "which fields they want to study (any discipline)" });
  if (lvl === "phd" && !p.goals.research_interests?.length) g.push({ key: "goals.research_interests", ask: "their research interests: the questions they want to work on, methods, and any professors or labs they already have in mind" });
  if (!p.preferences.regions?.length) g.push({ key: "preferences.regions", ask: `where they want to study: ${Object.values(REGIONS).join(", ")} (one or several)` });
  if (!p.goals.degree_types?.length) g.push({ key: "goals.degree_types", ask: lvl === "undergraduate" ? "which degree types they'd consider (BA, BSc, BEng, BBA, liberal arts, foundation year)" : lvl === "phd" ? "PhD, DPhil, or an MPhil/MRes route into a PhD; and whether they need it fully funded with a stipend" : "which degree types they'd consider (e.g. MS/MSc, MA, MBA, MiM, MEng, MPhil, LLM, MPP), and whether research or taught" });
  if (!has(p.funding.need)) g.push({ key: "funding.need", ask: "full funding required, partial ok, or self-funded" });
  if (!has(p.identity.citizenship) && !d("passport_country")) g.push({ key: "identity.citizenship", ask: "citizenship (decides which scholarships they're eligible for)" });
  if (p.funding.need && p.funding.need !== "full" && !has(p.funding.annual_budget_usd))
    g.push({ key: "funding.annual_budget_usd", ask: "how much per year (USD) they can cover for tuition + living" });
  if (!has(p.goals.gmat_gre_plan)) g.push({ key: "goals.gmat_gre_plan", ask: `willing to take admissions tests (${TESTS_FOR[lvl]}) if it opens more programs or funding, or only programs that don't require them` });
  if (!p.education.length) g.push({ key: "education", ask: lvl === "undergraduate" ? "current or last school, and their school-leaving exams (e.g. WAEC/NECO, A-levels, IB, national exams) with results or predicted grades" : "previous degrees: institution, degree, field, years" });
  else if (!p.education.some((e) => has(e.grade) || has(e.gpa))) g.push({ key: "education.grade", ask: lvl === "undergraduate" ? "exam results or predicted grades" : "degree class or GPA and its scale" });
  if (!has(p.english.route)) g.push({ key: "english.route", ask: "english proof: TOEFL/IELTS/Duolingo, or medium-of-instruction waiver from their university" });
  if (!has(p.goals.short_term_goal)) g.push({ key: "goals.short_term_goal", ask: lvl === "phd" ? "what they want to do after the PhD (academia, industry research, policy...)" : lvl === "undergraduate" ? "what they hope to do after the degree, even roughly" : "what job they want right after the degree, ideally role + company type + where" });
  if (!has(p.goals.why_masters)) g.push({ key: "goals.why_masters", ask: `why a ${L} in this field, and why now` });
  if (!has(p.recommenders.count_lined_up)) g.push({ key: "recommenders.count_lined_up", ask: "how many recommenders they can count on, and who (role, relationship)" });
  if (p.preferences.locations === null) g.push({ key: "preferences.locations", ask: "specific countries or cities they want or want to avoid within those regions; cost of living matters" });
  if (!has(p.preferences.max_applications) && !has(p.funding.application_fee_budget_usd)) g.push({ key: "preferences.max_applications", ask: "how many applications they want to send" });
  if (!has(p.funding.application_fee_budget_usd)) g.push({ key: "funding.application_fee_budget_usd", ask: "total budget for application fees" });
  if (!has(p.goals.long_term_goal)) g.push({ key: "goals.long_term_goal", ask: "10-year goal" });
  if (p.stories.length + told < 3)
    g.push({
      key: "stories",
      ask: `essay material (have ${p.stories.length + told}, want 3+): ${
        lvl === "phd" ? "research experience, projects, publications, a hard problem they solved" : lvl === "undergraduate" ? "activities, leadership, projects, competitions, service, a challenge they overcame" : "specific stories with numbers: leadership, a failure, a big win"
      }`,
    });
  const skipped = new Set(p.skipped_gaps);
  return g.filter((x) => !skipped.has(x.key));
}

export function completeness(p: Profile): number {
  const total = profileGaps(emptyProfile()).length + 1; // +1 for the conditional budget gap
  return Math.max(0, Math.round(100 * (1 - profileGaps(p).length / total)));
}

// ---------------------------------------------------------------------------
// wire format: what the model actually returns.
// structured outputs cap a schema at 16 nullable/union fields and 24 optional ones,
// so the model gets a flat schema with no nulls and no optionals: "" means unknown,
// numbers and booleans come back as strings, and fromWire() converts to a ProfilePatch.
// ---------------------------------------------------------------------------
export const SCALAR_FIELDS = [
  "identity.full_name", "identity.citizenship", "identity.country_of_residence", "identity.city",
  "english.route", "english.notes",
  "goals.study_level", "goals.target_term", "goals.short_term_goal", "goals.long_term_goal", "goals.why_masters", "goals.gmat_gre_plan",
  "funding.need", "funding.annual_budget_usd", "funding.application_fee_budget_usd", "funding.notes",
  "preferences.stem_preferred", "preferences.max_applications",
  "recommenders.count_lined_up", "recommenders.notes",
] as const;

export const LIST_FIELDS = [
  "goals.fields", "goals.research_interests", "goals.degree_types", "preferences.regions", "preferences.locations", "preferences.avoid", "skills", "notes", "skipped_gaps",
] as const;

const ENUMS: Record<string, string[]> = {
  "english.route": ["test", "waiver", "undecided"],
  "goals.gmat_gre_plan": ["will_take", "avoid", "undecided"],
  "goals.study_level": ["undergraduate", "masters", "phd"],
  "funding.need": ["full", "partial", "self"],
};
const NUMBERS = new Set(["funding.annual_budget_usd", "funding.application_fee_budget_usd", "preferences.max_applications", "recommenders.count_lined_up"]);
const BOOLEANS = new Set(["preferences.stem_preferred"]);

export const WirePatch = z.object({
  facts: z.array(z.object({ field: z.enum(SCALAR_FIELDS), value: z.string() })),
  lists: z.array(z.object({ field: z.enum(LIST_FIELDS), values: z.array(z.string()) })),
  education: z.array(z.object({
    institution: z.string(), degree: z.string(), field: z.string(), country: z.string(),
    start: z.string(), end: z.string(), grade: z.string(), gpa: z.string(), gpa_scale: z.string(),
  })),
  work: z.array(z.object({
    company: z.string(), role: z.string(), start: z.string(), end: z.string(), location: z.string(),
    highlights: z.array(z.string()),
  })),
  tests: z.array(z.object({
    name: z.enum(["GRE", "GMAT", "SAT", "ACT", "TOEFL", "IELTS", "Duolingo", "Other"]),
    status: z.enum(["taken", "booked", "planned", "not_planned"]),
    score: z.string(),
    date: z.string(),
  })),
  stories: z.array(z.object({ title: z.string(), summary: z.string(), metrics: z.array(z.string()) })),
});
export type WirePatch = z.infer<typeof WirePatch>;

export const WIRE_GUIDE = `patch format: every field is required. use "" for unknown, [] for nothing to add.
- facts: scalar fields you learned. value is a string. numbers as plain digits ("15000"). booleans "yes"/"no".
  enums: goals.study_level undergraduate|masters|phd, english.route test|waiver|undecided, goals.gmat_gre_plan will_take|avoid|undecided (about admissions tests at their level), funding.need full|partial|self.
- lists: list fields. preferences.locations with values [] means "no preference".
  preferences.regions values must be keys from: ${Object.keys(REGIONS).join(", ")}.
  skipped_gaps: gap keys (like "preferences.max_applications") the user answered without a clean value; record their answer in notes.
- education / work / tests / stories: items to add or update. work.end "" means current role.`;

const str = (s: string) => (s.trim() === "" ? null : s.trim());

export function parseNumber(s: string): number | null {
  const t = s.trim().toLowerCase().replace(/[$,\s]|usd/g, "");
  const m = t.match(/^(\d+(?:\.\d+)?)(k|m)?$/);
  if (!m) return null;
  const n = parseFloat(m[1]) * (m[2] === "k" ? 1e3 : m[2] === "m" ? 1e6 : 1);
  return Math.round(n);
}

export function fromWire(w: WirePatch): ProfilePatch {
  const sections: Record<string, Record<string, unknown>> = {};
  const set = (path: string, value: unknown) => {
    const [sec, key] = path.split(".");
    if (!key) return; // top-level lists handled below
    (sections[sec] ??= {})[key] = value;
  };

  for (const f of w.facts) {
    const raw = f.value.trim();
    if (!raw) continue;
    if (ENUMS[f.field]) {
      const v = raw.toLowerCase().replace(/[\s-]+/g, "_");
      if (ENUMS[f.field].includes(v)) set(f.field, v);
    } else if (NUMBERS.has(f.field)) {
      const n = parseNumber(raw);
      if (n !== null) set(f.field, n);
    } else if (BOOLEANS.has(f.field)) {
      if (/^(yes|true|y)$/i.test(raw)) set(f.field, true);
      else if (/^(no|false|n)$/i.test(raw)) set(f.field, false);
    } else {
      set(f.field, raw);
    }
  }

  const patch: ProfilePatch = {};
  for (const l of w.lists) {
    const values = l.values.map((v) => v.trim()).filter(Boolean);
    if (l.field === "skills") patch.skills = [...(patch.skills ?? []), ...values];
    else if (l.field === "notes") patch.notes = [...(patch.notes ?? []), ...values];
    else if (l.field === "skipped_gaps") patch.skipped_gaps = [...(patch.skipped_gaps ?? []), ...values];
    else if (l.field === "preferences.regions") set(l.field, normalizeRegions(values));
    else set(l.field, values);
  }

  // fill each touched section with nulls for untouched keys so the shape stays valid
  const base = emptyProfile();
  for (const [sec, vals] of Object.entries(sections)) {
    const shape = base[sec as keyof Profile] as Record<string, unknown>;
    const filled: Record<string, unknown> = {};
    for (const k of Object.keys(shape)) filled[k] = k in vals ? vals[k] : null;
    (patch as Record<string, unknown>)[sec] = filled;
  }

  const edu = w.education.filter((e) => str(e.institution));
  if (edu.length) {
    patch.education = edu.map((e) => ({
      institution: e.institution.trim(), degree: str(e.degree), field: str(e.field), country: str(e.country),
      start: str(e.start), end: str(e.end), grade: str(e.grade),
      gpa: e.gpa.trim() ? parseFloat(e.gpa) || null : null,
      gpa_scale: e.gpa_scale.trim() ? parseFloat(e.gpa_scale) || null : null,
    }));
  }
  const work = w.work.filter((x) => str(x.company) && str(x.role));
  if (work.length) {
    patch.work = work.map((x) => ({
      company: x.company.trim(), role: x.role.trim(), start: str(x.start), end: str(x.end), location: str(x.location),
      highlights: x.highlights.map((h) => h.trim()).filter(Boolean),
    }));
  }
  if (w.tests.length) patch.tests = w.tests.map((t) => ({ name: t.name, status: t.status, score: str(t.score), date: str(t.date) }));
  const stories = w.stories.filter((s) => str(s.title) && str(s.summary));
  if (stories.length) {
    patch.stories = stories.map((s) => ({ title: s.title.trim(), summary: s.summary.trim(), metrics: s.metrics.map((m) => m.trim()).filter(Boolean) }));
  }
  return patch;
}

// short text view of the profile for prompts that don't need every bullet (keeps latency down)
export function profileBrief(p: Profile, targetTermFallback?: string | null): string {
  const L: string[] = [];
  const v = (x: unknown) => (x === null || x === undefined || x === "" ? "?" : Array.isArray(x) ? (x.length ? x.join(", ") : "none") : String(x));
  L.push(`name: ${v(p.identity.full_name)} | citizenship: ${v(p.identity.citizenship)} | lives: ${v(p.identity.city)}, ${v(p.identity.country_of_residence)}`);
  L.push(`applying for: ${LEVEL_LABEL[levelOf(p)]} | term: ${v(p.goals.target_term ?? targetTermFallback)} | fields: ${v(p.goals.fields)} | degree types: ${v(p.goals.degree_types)} | admissions tests (${TESTS_FOR[levelOf(p)]}): ${v(p.goals.gmat_gre_plan)}`);
  if (p.goals.research_interests?.length) L.push(`research interests: ${p.goals.research_interests.join("; ")}`);
  L.push(`after the degree: ${v(p.goals.short_term_goal)}`);
  L.push(`long term: ${v(p.goals.long_term_goal)}`);
  L.push(`why this degree: ${v(p.goals.why_masters)}`);
  L.push(`funding: need ${v(p.funding.need)}, can cover/yr ${v(p.funding.annual_budget_usd)}, fee budget ${v(p.funding.application_fee_budget_usd)}${p.funding.notes ? ` (${p.funding.notes})` : ""}`);
  L.push(`english: ${v(p.english.route)} | tests: ${p.tests.map((t) => `${t.name} ${t.status}${t.score ? " " + t.score : ""}`).join(", ") || "none"}`);
  L.push(`regions: ${v(p.preferences.regions)}`);
  L.push(`locations: ${p.preferences.locations === null ? "?" : p.preferences.locations.length ? p.preferences.locations.join(", ") : "anywhere"} | avoid: ${v(p.preferences.avoid)} | stem: ${v(p.preferences.stem_preferred)} | max apps: ${v(p.preferences.max_applications)}`);
  L.push(`recommenders: ${v(p.recommenders.count_lined_up)}${p.recommenders.notes ? ` (${p.recommenders.notes})` : ""}`);
  L.push(`education: ${p.education.map((e) => `${e.degree ?? "?"} ${e.field ?? ""} @ ${e.institution} ${e.end ?? ""} ${e.grade ?? ""}`.replace(/\s+/g, " ").trim()).join("; ") || "none"}`);
  L.push(`work: ${p.work.map((w) => `${w.role} @ ${w.company} (${w.start ?? "?"}–${w.end ?? "now"})`).join("; ") || "none"}`);
  L.push(`stories on file: ${p.stories.map((s) => s.title).join("; ") || "none"}`);
  if (p.confirmed_facts.length) L.push(`confirmed by user: ${p.confirmed_facts.map((f) => `${f.topic} = ${f.value}`).join("; ")}`);
  if (p.notes.length) L.push(`notes: ${p.notes.slice(-12).join(" | ")}`);
  return L.join("\n");
}

// most recent first: current roles (no end date) on top, then by end, then start
export function sortWork<T extends { start: string | null; end: string | null }>(work: T[]): T[] {
  const key = (x: string | null) => (x ?? "").replace(/[^0-9]/g, "").padEnd(6, "0");
  return [...work].sort((a, b) => {
    if (!a.end !== !b.end) return a.end ? 1 : -1;
    const e = key(b.end).localeCompare(key(a.end));
    return e !== 0 ? e : key(b.start).localeCompare(key(a.start));
  });
}

// map free-ish region words to REGIONS keys; unknown words are dropped
export function normalizeRegions(values: string[]): string[] {
  const out = new Set<string>();
  for (const raw of values) {
    const v = raw.toLowerCase().trim();
    if (REGIONS[v]) out.add(v);
    else if (/\b(usa|us|united states|america)\b/.test(v) && !/latin/.test(v)) out.add("us");
    else if (/canada/.test(v)) out.add("canada");
    else if (/\b(uk|united kingdom|britain|england|scotland|wales)\b/.test(v)) out.add("uk");
    else if (/europe|\beu\b|germany|france|netherlands|ireland|sweden|switzerland|italy|spain|finland|denmark|norway|belgium|austria/.test(v)) out.add("europe");
    else if (/asia|china|japan|korea|singapore|hong kong|india|taiwan|malaysia/.test(v)) out.add("asia");
    else if (/australia|new zealand/.test(v)) out.add("australia_nz");
    else if (/middle east|uae|dubai|qatar|saudi|israel/.test(v)) out.add("middle_east");
    else if (/africa|south africa|kenya|ghana|rwanda|egypt/.test(v)) out.add("africa");
    else if (/latin|brazil|mexico|chile|argentina/.test(v)) out.add("latin_america");
  }
  return [...out];
}
