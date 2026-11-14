// the documents one application needs, which the applicant has, and a way through for the ones they don't have
// yet. nov 2026: 11 of 47 applicants had uploaded a CV, 9 a transcript, 3 a reference or a test score, because
// we only ever asked in general. asked for by school and deadline, with what each one unlocks, they get done.
// pure, so the application page, today's task and the notifications agree.

export type RowState = "done" | "missing" | "agents" | "optional";

export interface DocRow {
  id: string;
  label: string;
  unlocks: string; // what having it does for them, in one line
  state: RowState;
  detail?: string; // progress or what happens next
  kind?: string; // the document kind an upload on this line is filed as
  alt?: { label: string; href?: string; letter?: "english" }; // a way through when they don't have it yet
}

export interface HeldDocs {
  kinds: Record<string, number>; // documents on file, by kind (failed reads don't count)
  englishTest: boolean; // an IELTS/TOEFL/Duolingo/PTE result, from a document or the profile
  admissionsTest: boolean; // a GRE or GMAT result
  referees: number; // referees on file with an email
}

export interface AppNeeds {
  level: "undergraduate" | "masters" | "phd" | null;
  award: boolean; // a scholarship application rather than a degree
  testPolicy: string | null; // the programme's GRE/GMAT policy
  englishRoute: "test" | "waiver" | "undecided" | null;
  references: number | null; // what the agents found the application asks for; null = not planned yet
  refsRequested: number; // reference requests the agents have drafted or sent for this application
  requirements: string[]; // "other requirements" from the agents' plan
}

const has = (h: HeldDocs, k: string) => (h.kinds[k] ?? 0) > 0;

export function docChecklist(a: AppNeeds, h: HeldDocs): DocRow[] {
  const rows: DocRow[] = [];
  const grad = a.level !== "undergraduate";
  rows.push({ id: "cv", label: "CV", unlocks: "Most of every form fills from it, and your fit is scored on it.", state: has(h, "cv") ? "done" : "missing", kind: "cv" });
  rows.push({
    id: "transcript",
    label: "Transcript",
    unlocks: "Your grades and courses. Your agents convert your GPA for each country.",
    state: has(h, "transcript") ? "done" : "missing",
    kind: "transcript",
    alt: { label: "Not issued yet? Upload your statement of results for now." },
  });
  rows.push(
    grad
      ? { id: "degree", label: "Degree certificate", unlocks: "Proof you finished. Some forms won't accept the application without it.", state: has(h, "degree_certificate") ? "done" : "missing", kind: "degree_certificate", alt: { label: "Still studying, or waiting for it? A letter from your university with your expected finish date works for now." } }
      : { id: "degree", label: "School-leaving certificate", unlocks: "WAEC, NECO, A-levels or your national exam results.", state: has(h, "degree_certificate") ? "done" : "missing", kind: "degree_certificate", alt: { label: "Results not out yet? Your predicted grades from your school work for now." } },
  );
  // english: whichever way they said they'll prove it, or either until they've said
  const letter = has(h, "english_letter");
  if (a.englishRoute === "waiver")
    rows.push({ id: "english", label: "English-medium letter", unlocks: "A letter from your university that your degree was taught in English. Many schools accept it instead of IELTS.", state: letter || h.englishTest ? "done" : "missing", kind: "english_letter", alt: { label: "Ask your university for it: we've written the email", letter: "english" } });
  else
    rows.push({
      id: "english",
      label: a.englishRoute === "test" ? "IELTS, TOEFL or Duolingo result" : "English test result or English-medium letter",
      unlocks: "Every school asks how you'll prove your English.",
      state: h.englishTest || letter ? "done" : "missing",
      kind: a.englishRoute === "test" ? "test_score" : undefined,
      alt: { label: "No test yet? Many schools accept a letter that your degree was taught in English. We've written the email to your university.", letter: "english" },
    });
  if (grad && !a.award && a.testPolicy === "required")
    rows.push({ id: "admissions_test", label: "GRE or GMAT result", unlocks: "This programme requires it.", state: h.admissionsTest ? "done" : "missing", kind: "test_score", alt: { label: "Not taking one? Your agents can find similar programmes without it.", href: "/shortlist" } });
  // references: the school collects them from the referees; the agents ask the referees
  const n = a.references ?? (grad ? 2 : 1);
  const uploaded = h.kinds.reference_letter ?? 0;
  const refState: RowState = a.refsRequested >= n || uploaded >= n ? "done" : h.referees >= n ? "agents" : "missing";
  rows.push({
    id: "references",
    label: `${n} reference${n === 1 ? "" : "s"}`,
    unlocks: "Schools ask your referees directly. Your agents write to them for you, with the deadline.",
    state: refState,
    detail:
      refState === "done"
        ? a.refsRequested
          ? `Your agents have asked ${a.refsRequested} referee${a.refsRequested === 1 ? "" : "s"}.`
          : undefined
        : refState === "agents"
          ? "Your referees are on file. Your agents ask them once the application is planned."
          : `${h.referees ? `${h.referees} of ${n} on file. ` : ""}Add each referee's name and email.${a.references == null ? " Usually " + n + "; your agents confirm when they plan this application." : ""}`,
    alt: refState === "missing" ? { label: "Add referees", href: "/profile?tab=details" } : undefined,
  });
  const reqs = a.requirements.join(" ").toLowerCase();
  if (/bank|financ|proof of funds|sponsor|affidavit/.test(reqs))
    rows.push({ id: "financial", label: "Proof of funds", unlocks: "This application asks for a bank statement or sponsor letter.", state: has(h, "financial") ? "done" : "missing", kind: "financial" });
  if (/portfolio|writing sample|publication|research proposal/.test(reqs))
    rows.push({ id: "portfolio", label: /research proposal/.test(reqs) ? "Research proposal or writing sample" : "Portfolio or writing sample", unlocks: "This application asks for examples of your work.", state: has(h, "portfolio") ? "done" : "missing", kind: "portfolio" });
  rows.push({ id: "passport", label: "Passport", unlocks: "Your agents fill your name, birth date and nationality exactly as the forms want them.", state: has(h, "passport") ? "done" : "optional", kind: "passport" });
  return rows;
}

// a row's label mid-sentence: "your transcript", "your CV", "your IELTS, TOEFL or Duolingo result"
export const inSentence = (label: string) => (/^(CV|IELTS|GRE|English)/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1));

// "3 of 6": what's counted (the passport is optional, and references the agents are handling count as done)
export function docCount(rows: DocRow[]): { done: number; total: number; missing: DocRow[] } {
  const counted = rows.filter((r) => r.state !== "optional" && !(r.id === "passport"));
  const missing = counted.filter((r) => r.state === "missing");
  return { done: counted.length - missing.length, total: counted.length, missing };
}

// the email asking their university for an english-medium letter (no model call: their own facts in a template)
export function englishLetterEmail(p: { name: string | null; degree: string | null; field: string | null; institution: string | null; year: string | null }): { subject: string; body: string } {
  const degree = [p.degree, p.field ? `in ${p.field}` : null].filter(Boolean).join(" ") || "my degree";
  const where = p.institution ?? "the university";
  return {
    subject: "Request for a medium of instruction letter",
    body: `Dear Sir or Madam,

I graduated with ${degree} from ${where}${p.year ? ` in ${p.year}` : ""}. I am applying for postgraduate study abroad, and the universities ask for an official letter confirming that English was the medium of instruction for my degree.

Could you please issue a letter on university letterhead, signed and stamped, stating that the medium of instruction and assessment for my programme was English? I am happy to pay any fee and to provide my matriculation number and any other details you need.

Thank you for your help.

Yours faithfully,
${p.name ?? ""}`.trim(),
  };
}

// pull the agents' "other requirements" out of a positioning brief written before they were stored separately
export function requirementsFromBrief(text: string | null | undefined): string[] {
  if (!text) return [];
  const m = text.match(/## other requirements\n([\s\S]*?)(\n## |\n_|$)/);
  return m ? m[1].split("\n").map((l) => l.replace(/^- /, "").trim()).filter(Boolean) : [];
}
