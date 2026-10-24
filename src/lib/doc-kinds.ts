// document kinds the applicant can upload. shared by the uploader (client) and the documents page (server).
export const DOC_KINDS = [
  ["cv", "CV or résumé"],
  ["transcript", "Transcript"],
  ["degree_certificate", "Degree certificate"],
  ["test_score", "Test score report"],
  ["reference_letter", "Reference letter"],
  ["old_essay", "Old essay or SOP"],
  ["other", "Something else"],
] as const;
