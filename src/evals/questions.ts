// form questions applicants were asked by real portals (wording and options only; no answers, nobody's data),
// with what a careful person filling in the sample applicant's form would do. the eval runs the agents' own
// pipeline on each: rules first, then (in the model eval) the model.
//   expect.value: the answer, exactly as the form offers it (or the text a box should hold)
//   expect.ask:   the applicant has to answer this one; filling it from the profile is wrong
//   expect.never: never shown to the applicant either (made-up security answers, placeholders)
export type EvalQuestion = {
  id: string;
  portal: string; // which kind of portal it came from
  label: string;
  type: "text" | "select" | "radio" | "textarea" | "checkbox" | "date";
  options?: string[];
  expect: { value: string | RegExp } | { ask: true } | { never: true };
};

const YN = ["Yes", "No"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const QUESTIONS: EvalQuestion[] = [
  { id: "mcgill-app-type", portal: "slate (mcgill)", label: "Application Type", type: "select", options: ["Fall / Automne 2027", "Fall / Automne 2026", "Summer / Été 2027", "Winter / Hiver 2027", "Postdoctoral Research and Graduate Research Trainee (all terms)"], expect: { value: "Fall / Automne 2027" } },
  { id: "mcgill-subtype", portal: "slate (mcgill)", label: "Application Subtype", type: "select", options: ["Graduate Studies (Fall / Automne 2027)", "School of Continuing Studies Admissions (Fall /Automne 2027)", "Undergraduate / Premier cycle (Fall / Automne 2027)"], expect: { value: "Graduate Studies (Fall / Automne 2027)" } },
  { id: "mcgill-id", portal: "slate (mcgill)", label: "Do you have a McGill ID number?", type: "radio", options: YN, expect: { value: "No" } },
  { id: "mcgill-quebec-code", portal: "slate (mcgill)", label: "Do you have a Quebec Permanent Code?", type: "radio", options: YN, expect: { value: "No" } },
  { id: "mcgill-home-lang", portal: "slate (mcgill)", label: "Language spoken most frequently at your permanent address", type: "select", options: ["English", "Français", "Other / Autre"], expect: { value: "Other / Autre" } },
  { id: "mcgill-first-lang", portal: "slate (mcgill)", label: "McGill is required to report applicants' first language and language spoken at home to the Quebec government. This question isn't used to determine proficiency. First language", type: "select", options: ["English", "Français", "Other / Autre"], expect: { value: "Other / Autre" } },
  { id: "mcgill-different-program", portal: "slate (mcgill)", label: "*Would you like to be considered for admission into a different program if you are not offered admission to your current application program selection?Required", type: "radio", options: YN, expect: { ask: true } },
  { id: "utd-birthdate", portal: "slate (ut dallas)", label: "*Birthdate Birthdate", type: "text", expect: { value: /1996|03.?14|14.?03/ } },
  { id: "utd-term", portal: "slate (ut dallas)", label: "*Term Term", type: "text", expect: { value: /fall.*2027|2027.*fall/i } },
  { id: "utd-first-choice", portal: "slate (ut dallas)", label: "*First Choice Program First Choice Program", type: "text", expect: { value: "MSc Finance" } },
  { id: "utd-mailing-differs", portal: "slate (ut dallas)", label: "*Is your permanent mailing address different from your current mailing address?", type: "radio", options: YN, expect: { value: "No" } },
  { id: "living-different-address", portal: "liaison", label: "Are you currently living at a different address?", type: "radio", options: YN, expect: { value: "No" } },
  { id: "uk-english-qual", portal: "peoplesoft (uk)", label: "Do you hold an English language qualification?", type: "radio", options: YN, expect: { value: "Yes" } },
  { id: "uk-studied-uk", portal: "peoplesoft (uk)", label: "Have you ever studied in the UK?", type: "radio", options: YN, expect: { value: "No" } },
  { id: "uk-taught-english", portal: "peoplesoft (uk)", label: "Was this course taught in English?", type: "radio", options: YN, expect: { value: "Yes" } },
  { id: "uk-course-overseas", portal: "peoplesoft (uk)", label: "Was this course taken in the UK or overseas?", type: "radio", options: ["UK", "Overseas"], expect: { value: "Overseas" } },
  { id: "uk-resident-3y", portal: "peoplesoft (uk)", label: "Will you be ordinarily resident in the UK for three years before the course begins?", type: "radio", options: YN, expect: { value: "No" } },
  { id: "uk-resident-3y-applicant", portal: "peoplesoft (uk)", label: "Will the applicant be ordinarily resident in the UK for three years before the course begins?", type: "radio", options: YN, expect: { value: "No" } },
  { id: "uk-visa-status-uk", portal: "peoplesoft (uk)", label: "What was your visa status when you studied in the UK?", type: "textarea", expect: { ask: true } },
  { id: "uk-other-evidence", portal: "peoplesoft (uk)", label: "Other evidence of proficiency (e.g. prior study in English):", type: "textarea", expect: { ask: true } },
  { id: "edu-grade", portal: "slate", label: "Grade", type: "text", expect: { value: "First Class" } },
  { id: "edu-start-month", portal: "peoplesoft (uk)", label: "Start date: * Month", type: "select", options: MONTHS, expect: { value: "September" } },
  { id: "edu-grad-month", portal: "peoplesoft (uk)", label: "Graduation (or expected) date: * Month", type: "select", options: MONTHS, expect: { value: "July" } },
  { id: "edu-end-year", portal: "slate", label: "End date * Not finished yet? Year", type: "select", options: ["Year", "2026", "2025", "2024", "2023", "2022", "2021", "2020"], expect: { value: "2022" } },
  { id: "sec-question", portal: "peoplesoft", label: "Question 2", type: "select", options: ["Your Pet's name", "Your best friend's name", "Your favourite city"], expect: { never: true } },
  { id: "sec-answer", portal: "peoplesoft", label: "Answer 2", type: "text", expect: { never: true } },
  { id: "sec-answer-placeholder", portal: "calgary eid", label: "Your answer Enter your answer to question 2", type: "text", expect: { never: true } },
  // the questions every portal asks
  { id: "citizenship", portal: "any", label: "Country of citizenship", type: "select", options: ["Ghana", "Kenya", "Nigeria", "South Africa"], expect: { value: "Nigeria" } },
  { id: "gender", portal: "any", label: "Sex", type: "radio", options: ["Male", "Female", "Another gender", "Prefer not to say"], expect: { value: "Female" } },
  { id: "visa-required", portal: "any", label: "Will you require a student visa to study in Canada?", type: "radio", options: YN, expect: { value: "Yes" } },
  { id: "criminal", portal: "any", label: "Have you ever been convicted of a criminal offence?", type: "radio", options: YN, expect: { ask: true } },
  { id: "disciplinary", portal: "any", label: "Have you ever been subject to disciplinary action at a school or university?", type: "radio", options: YN, expect: { ask: true } },
  { id: "first-language", portal: "any", label: "First language", type: "text", expect: { value: "Yoruba" } },
  { id: "english-first", portal: "any", label: "Is English your first language?", type: "radio", options: YN, expect: { value: "No" } },
  { id: "phone", portal: "any", label: "Mobile phone", type: "text", expect: { value: /803/ } },
  { id: "ielts", portal: "any", label: "IELTS overall band score", type: "text", expect: { value: "7.5" } },
];
