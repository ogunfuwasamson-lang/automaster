// document kinds the applicant can upload. shared by the uploader (client), the documents page (server), the
// upload route and the intake agent, so a new kind only needs adding here.
export const DOC_KINDS = [
  ["cv", "CV or résumé"],
  ["transcript", "Transcript"],
  ["degree_certificate", "Degree certificate"],
  ["test_score", "Test score report"],
  ["english_letter", "English-medium letter"],
  ["passport", "Passport or ID"],
  ["reference_letter", "Reference letter"],
  ["old_essay", "Old essay or SOP"],
  ["award", "Award, certificate or achievement"],
  ["portfolio", "Portfolio or writing sample"],
  ["financial", "Bank statement or sponsor letter"],
  ["other", "Something else"],
] as const;

export type DocKind = (typeof DOC_KINDS)[number][0];
export const DOC_KIND_IDS = DOC_KINDS.map(([k]) => k) as unknown as [DocKind, ...DocKind[]];

// what each kind does for the applicant, shown when they're choosing what to add during setup
export const DOC_KIND_WHY: Partial<Record<DocKind, string>> = {
  cv: "Builds most of your profile",
  transcript: "Grades and courses for every form",
  degree_certificate: "Proof of your degree",
  test_score: "IELTS, TOEFL, GRE, GMAT, SAT and others",
  english_letter: "Your university's letter that your degree was taught in English: many schools accept it instead of IELTS",
  passport: "Name, birth date and passport details, exactly as portals want them",
  reference_letter: "So agents know who your referees are",
  old_essay: "Your voice, so drafts sound like you",
  award: "Prizes, sport, scholarships, leadership: these unlock waivers and funding",
  portfolio: "Projects, publications, design or writing work",
  financial: "Proof of funds some schools ask for",
};

// what a file probably is, from its name: the intake agent checks and corrects it after reading ("other" when
// there's no clue and something is already on file)
export function guessKind(name: string, already: number): string {
  if (/\b(cv|resume|résumé)\b/i.test(name)) return "cv";
  if (/transcript|record|marksheet|result/i.test(name)) return "transcript";
  if (/medium.?of.?instruction|\bmoi\b|english.?(medium|proficiency).?letter/i.test(name)) return "english_letter";
  if (/ielts|toefl|gre|gmat|sat|duolingo|pte|score/i.test(name)) return "test_score";
  if (/passport|national.?id|\bid\b/i.test(name)) return "passport";
  if (/reference|recommendation|lor\b/i.test(name)) return "reference_letter";
  if (/degree|diploma|certificate|cert/i.test(name)) return /award|prize|winner/i.test(name) ? "award" : "degree_certificate";
  if (/award|prize|honou?r|scholarship/i.test(name)) return "award";
  if (/bank|sponsor|affidavit|proof.?of.?fund/i.test(name)) return "financial";
  if (/sop|statement|essay|personal/i.test(name)) return "old_essay";
  if (/portfolio|sample|publication|paper/i.test(name)) return "portfolio";
  return already ? "other" : "cv";
}
