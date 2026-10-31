// document kinds the applicant can upload. shared by the uploader (client), the documents page (server), the
// upload route and the intake agent, so a new kind only needs adding here.
export const DOC_KINDS = [
  ["cv", "CV or résumé"],
  ["transcript", "Transcript"],
  ["degree_certificate", "Degree certificate"],
  ["test_score", "Test score report"],
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
  passport: "Name, birth date and passport details, exactly as portals want them",
  reference_letter: "So agents know who your referees are",
  old_essay: "Your voice, so drafts sound like you",
  award: "Prizes, sport, scholarships, leadership: these unlock waivers and funding",
  portfolio: "Projects, publications, design or writing work",
  financial: "Proof of funds some schools ask for",
};
