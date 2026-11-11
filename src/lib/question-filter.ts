import { isSecAnswer } from "@/lib/cloud-engine";

// never the applicant's to answer here: security answers and passwords are made up and saved with the login by the
// agents, and a label that's only a placeholder ("Your answer", "Type here") isn't a question anyone can answer.
// calgary's recovery answers once reached the applicant as "Your answer Enter your answer to question 3"
export function notForApplicant(label: string, type?: string) {
  const l = label.replace(/\s+/g, " ").trim();
  if (type === "password" || /\b(password|passcode|pin)\b/i.test(l)) return true;
  if (isSecAnswer(l) || /\b(security|secret|recovery|memorable|challenge) (question|answer)/i.test(l)) return true;
  // peoplesoft's account page labels its security pairs only "Question 1 *" / "Answer 1 *" (manchester)
  if (/^\*?\s*(question|answer)\s*\d\b[\s.:*]*$/i.test(l)) return true;
  return !l || /^(your answer|answer|type (your answer|here)|enter (your )?(answer|text|value)( here)?|select|choose|please select)[\s.:*]*$/i.test(l);
}

