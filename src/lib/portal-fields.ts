// the details application portals ask for, beyond the study profile. no imports, so client forms stay small.
// every field here is saved in profiles.portal_details, offered to the form-filling agents under its key, and
// shown in the profile under its group. only the contact basics are required; everything else is optional, and
// the sensitive ones always offer "Prefer not to say". passport and ID numbers are never stored.

export type DetailKind = "text" | "email" | "tel" | "date" | "url" | "select" | "yes_no" | "long";

export interface DetailField {
  key: string;
  label: string;
  kind?: DetailKind;
  options?: string[];
  required?: boolean;
  hint?: string;
}

export type PortalDetails = Record<string, string | null | undefined>;

const PNTS = "Prefer not to say";
const YN_PNTS = ["Yes", "No", PNTS];
const EDUCATION = ["No formal education", "Primary school", "Secondary / high school", "Vocational or technical", "Some university", "Bachelor's degree", "Master's degree", "Doctorate or professional degree", "Don't know"];

export const DETAIL_GROUPS: { id: string; title: string; why: string; fields: DetailField[] }[] = [
  {
    id: "contact",
    title: "Contact and identity",
    why: "Every portal starts here.",
    fields: [
      { key: "email", label: "Email for applications", kind: "email", required: true },
      { key: "phone", label: "Phone (with country code)", kind: "tel", required: true },
      { key: "date_of_birth", label: "Date of birth", kind: "date", required: true },
      { key: "title", label: "Title", kind: "select", options: ["Mr", "Ms", "Mrs", "Mx", "Dr", "None"] },
      { key: "preferred_name", label: "Preferred first name" },
      { key: "other_names", label: "Other or previous names", hint: "A maiden name, or names on old transcripts" },
      { key: "gender", label: "Gender", kind: "select", options: ["Male", "Female", "Non-binary", "Another gender", PNTS] },
      { key: "pronouns", label: "Pronouns", kind: "select", options: ["he/him", "she/her", "they/them", "Another", PNTS] },
      { key: "marital_status", label: "Marital status", kind: "select", options: ["Single", "Married", "Divorced", "Widowed", "Separated", PNTS] },
      { key: "linkedin", label: "LinkedIn URL", kind: "url" },
      { key: "website", label: "Website or portfolio", kind: "url" },
    ],
  },
  {
    id: "address",
    title: "Address",
    why: "Your permanent address. Portals send offers and visa letters here.",
    fields: [
      { key: "address_line1", label: "Address line 1", required: true },
      { key: "address_line2", label: "Address line 2" },
      { key: "city", label: "City", required: true },
      { key: "state", label: "State / province" },
      { key: "postal_code", label: "Postal code" },
      { key: "country", label: "Country", required: true },
      { key: "mailing_address", label: "Mailing address, if different", kind: "long" },
      { key: "hometown", label: "Hometown (where you grew up)" },
    ],
  },
  {
    id: "citizenship",
    title: "Citizenship and travel",
    why: "Decides visa questions and which scholarships you qualify for.",
    fields: [
      { key: "country_of_birth", label: "Country of birth" },
      { key: "city_of_birth", label: "City of birth" },
      { key: "second_citizenship", label: "Second citizenship, if any" },
      { key: "passport_country", label: "Country that issued your passport" },
      { key: "passport_expiry", label: "Passport expiry date", kind: "date", hint: "Not the number: that stays with you" },
      { key: "current_visa", label: "Current visa or residence status", hint: "e.g. none, F-1 student, UK Skilled Worker, permanent resident" },
      { key: "studied_in_country_before", label: "Studied in the country you're applying to before?", kind: "yes_no", options: ["Yes", "No"] },
      { key: "previous_visa_refusal", label: "Ever been refused a visa?", kind: "yes_no", options: YN_PNTS },
    ],
  },
  {
    id: "languages",
    title: "Languages",
    why: "Portals ask these to decide English test requirements.",
    fields: [
      { key: "first_language", label: "First language" },
      { key: "home_language", label: "Language spoken most at home" },
      { key: "other_languages", label: "Other languages, with level", hint: "e.g. French (fluent), Yoruba (native)" },
      { key: "english_medium_education", label: "Was your degree taught in English?", kind: "yes_no", options: ["Yes", "No"] },
    ],
  },
  {
    id: "background",
    title: "Background",
    why: "Optional. Many schools ask for statistics, and some scholarships are for particular groups. Answer only what you want to.",
    fields: [
      { key: "race_ethnicity", label: "Race or ethnicity", kind: "select", options: ["Black or African", "African American", "White", "Asian", "South Asian", "East Asian", "Southeast Asian", "Middle Eastern or North African", "Hispanic or Latino", "Indigenous", "Pacific Islander", "Mixed or multiple", "Another", PNTS] },
      { key: "hispanic_latino", label: "Hispanic or Latino?", kind: "yes_no", options: YN_PNTS },
      { key: "religion", label: "Religion or faith", kind: "select", options: ["Christian", "Muslim", "Jewish", "Hindu", "Buddhist", "Sikh", "Traditional or indigenous faith", "Another", "None", PNTS] },
      { key: "disability", label: "Do you have a disability or long-term condition?", kind: "yes_no", options: YN_PNTS, hint: "Schools use this to offer support, never to judge your application" },
      { key: "lgbtq", label: "Do you identify as LGBTQ+?", kind: "yes_no", options: YN_PNTS },
      { key: "military_service", label: "Military or national service", kind: "select", options: ["None", "Completed national service (e.g. NYSC)", "Veteran", "Currently serving", PNTS] },
      { key: "first_generation", label: "First in your family to go to university?", kind: "yes_no", options: ["Yes", "No"] },
      { key: "refugee_or_displaced", label: "Refugee or displaced person?", kind: "yes_no", options: YN_PNTS },
    ],
  },
  {
    id: "family",
    title: "Family",
    why: "Asked on most undergraduate and many graduate forms; also opens need-based and first-generation awards.",
    fields: [
      { key: "parent1_relationship", label: "Parent or guardian 1", kind: "select", options: ["Mother", "Father", "Guardian", "Other"] },
      { key: "parent1_education", label: "Their highest education", kind: "select", options: EDUCATION },
      { key: "parent1_occupation", label: "Their occupation" },
      { key: "parent2_relationship", label: "Parent or guardian 2", kind: "select", options: ["Mother", "Father", "Guardian", "Other", "None"] },
      { key: "parent2_education", label: "Their highest education", kind: "select", options: EDUCATION },
      { key: "parent2_occupation", label: "Their occupation" },
      { key: "siblings", label: "Number of siblings" },
      { key: "dependents", label: "Children or other dependents", kind: "select", options: ["None", "1", "2", "3 or more", PNTS] },
      { key: "household_income", label: "Household income per year (USD)", kind: "select", options: ["Under $10,000", "$10,000 to $25,000", "$25,000 to $50,000", "$50,000 to $100,000", "Over $100,000", PNTS] },
    ],
  },
  {
    id: "interests",
    title: "Interests and activities",
    why: "What essays, interviews and scholarships are made of. A line each is enough.",
    fields: [
      { key: "hobbies", label: "Hobbies", kind: "long", hint: "What you do for fun, and how seriously" },
      { key: "interests", label: "Interests and causes you care about", kind: "long" },
      { key: "sports", label: "Sports, and at what level", hint: "e.g. football, university first team" },
      { key: "arts_music", label: "Arts, music, writing or performance" },
      { key: "volunteering", label: "Volunteering and community work", kind: "long", hint: "Where, what you did, roughly how long" },
      { key: "leadership", label: "Clubs, societies and leadership roles", kind: "long" },
      { key: "awards", label: "Awards, competitions and honours", kind: "long", hint: "Name, year, and what it was for" },
      { key: "skills", label: "Skills and certifications", kind: "long", hint: "Software, tools, licences, courses" },
      { key: "publications", label: "Publications, projects or patents", kind: "long" },
    ],
  },
  {
    id: "application",
    title: "Application questions",
    why: "The yes/no and housekeeping questions near the end of most forms.",
    fields: [
      { key: "how_heard", label: "How you heard about the schools", kind: "select", options: ["Search engine", "School website", "Social media", "Friend or family", "Alumni", "Education fair", "Rankings", "Employer"] },
      { key: "funding_source", label: "How you'll pay for your studies", kind: "select", options: ["Scholarship or funding", "Family", "Personal savings", "Employer sponsorship", "Loan", "A mix of these"] },
      { key: "employer_sponsored", label: "Is an employer sponsoring you?", kind: "yes_no", options: ["Yes", "No"] },
      { key: "previously_applied", label: "Applied to any of these schools before?", hint: "Which, and when" },
      { key: "disciplinary_history", label: "Ever had academic or disciplinary action at school or university?", kind: "yes_no", options: ["Yes", "No"] },
      { key: "criminal_history", label: "Ever been convicted of a criminal offence?", kind: "yes_no", options: ["Yes", "No"] },
      { key: "emergency_contact_name", label: "Emergency contact name" },
      { key: "emergency_contact_relationship", label: "Their relationship to you" },
      { key: "emergency_contact_phone", label: "Their phone", kind: "tel" },
      { key: "emergency_contact_email", label: "Their email", kind: "email" },
    ],
  },
];

export const PORTAL_DETAIL_FIELDS: DetailField[] = DETAIL_GROUPS.flatMap((g) => g.fields);

export interface RecommenderRow {
  name: string;
  email: string | null;
  title: string | null;
  organization: string | null;
  relationship: string | null;
  phone: string | null;
}

// a portal question that one of these details answers, so a tapped answer shows up in the profile too
const GUESS: [RegExp, string][] = [
  [/language.*(home|permanent address|most (often|frequently))/i, "home_language"],
  [/(first|native|mother).{0,10}(language|tongue)/i, "first_language"],
  [/hispanic|latin[oa]/i, "hispanic_latino"],
  [/\b(race|ethnic)/i, "race_ethnicity"],
  [/religio|faith/i, "religion"],
  [/disabilit/i, "disability"],
  [/lgbt|sexual orientation/i, "lgbtq"],
  [/military|veteran|armed forces|national service/i, "military_service"],
  [/first.{0,20}(generation|in (your|the) family)/i, "first_generation"],
  [/refugee|displaced/i, "refugee_or_displaced"],
  [/marital/i, "marital_status"],
  [/pronoun/i, "pronouns"],
  [/(city|town|place) of birth/i, "city_of_birth"],
  [/(second|dual|other) (citizenship|nationality)/i, "second_citizenship"],
  [/how did you (hear|learn)|how you heard|referral source/i, "how_heard"],
  [/(visa|permit).{0,30}(refused|denied|rejected)|(refused|denied).{0,20}visa/i, "previous_visa_refusal"],
  [/current (visa|immigration) status|visa status/i, "current_visa"],
  [/convicted|criminal/i, "criminal_history"],
  [/disciplinary|academic (misconduct|probation)/i, "disciplinary_history"],
  [/emergency contact.*name|name of (your )?emergency/i, "emergency_contact_name"],
  [/(applied|application).{0,30}(before|previously)|previously applied/i, "previously_applied"],
  [/(fund|finance|pay for).{0,30}(studies|education|program)/i, "funding_source"],
  [/employer.{0,20}(sponsor|support)/i, "employer_sponsored"],
];

export function detailFor(question: string): string | null {
  for (const [re, key] of GUESS) if (re.test(question)) return key;
  return null;
}

const SENSITIVE = new Set(["race_ethnicity", "hispanic_latino", "religion", "disability", "lgbtq", "refugee_or_displaced", "household_income", "criminal_history", "disciplinary_history", "previous_visa_refusal", "marital_status", "dependents"]);
const CONTACT = new Set(["email", "phone", "address_line1", "address_line2", "postal_code", "mailing_address", "emergency_contact_name", "emergency_contact_relationship", "emergency_contact_phone", "emergency_contact_email", "linkedin", "website", "passport_expiry"]);

// the details as plain lines for an agent. "activities" (for essays): interests and achievements only. "eligibility"
// (scholarships, fee waivers): adds background and family, never contact details. "all": what's on file, for Ivyward AI.
export function detailsBrief(d: PortalDetails | null | undefined, scope: "activities" | "eligibility" | "all"): string {
  if (!d) return "";
  const lines: string[] = [];
  for (const g of DETAIL_GROUPS) {
    if (scope === "activities" && g.id !== "interests") continue;
    for (const f of g.fields) {
      const v = (d[f.key] ?? "").toString().trim();
      if (!v || v === "Prefer not to say") continue;
      if (scope !== "all" && CONTACT.has(f.key)) continue;
      if (scope === "activities" && SENSITIVE.has(f.key)) continue;
      lines.push(`${f.label}: ${v.slice(0, 600)}`);
    }
  }
  return lines.join("\n");
}

export const isSensitiveDetail = (key: string) => SENSITIVE.has(key);
