// the fill sheet: everything a school's portal asks, answered from the applicant's own data.
// pure (no db) so the runner's mapping is testable. the runner fills ONLY from this sheet:
// anything not here is left for the applicant. government id numbers are never here.
import type { Profile } from "@/lib/profile";
import { levelOf, LEVEL_LABEL } from "@/lib/profile";

import { PORTAL_DETAIL_FIELDS, type PortalDetails, type RecommenderRow } from "@/lib/portal-fields";
export { PORTAL_DETAIL_FIELDS, type PortalDetails, type RecommenderRow } from "@/lib/portal-fields";

export interface SheetEssay {
  artifact_id: string;
  title: string;
  prompt: string | null;
  kind: string;
  text: string;
}

export interface SheetFile {
  key: string; // cv, transcript, degree_cert, test_score, essay:<artifact id>
  label: string;
  url: string; // runner api path that serves it
  filename: string;
}

export interface FillSheet {
  application_id: string;
  school: string;
  program: string;
  portal_url: string | null;
  attested: boolean;
  fields: Record<string, string>;
  essays: SheetEssay[];
  files: SheetFile[];
  missing: string[]; // things portals usually need that we don't have
  // answers the applicant gave to portal questions (key "answer:<n>" in fields), matched to fields by question
  answers?: { key: string; question: string }[];
}

const norm = (x: string) => x.toLowerCase().replace(/[^a-z]/g, "");

function splitName(full: string | null | undefined) {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: "", middle: "", last: "" };
  if (parts.length === 1) return { first: parts[0], middle: "", last: "" };
  return { first: parts[0], middle: parts.slice(1, -1).join(" "), last: parts[parts.length - 1] };
}

const year = (d: string | null) => (d ? d.slice(0, 4) : "");
const month = (d: string | null) => (d && /^\d{4}-\d{2}/.test(d) ? d.slice(5, 7) : "");

export function buildSheet(a: {
  applicationId: string;
  school: string;
  program: string;
  degree: string | null;
  portalUrl: string | null;
  attested: boolean;
  accountEmail: string | null;
  schoolCountry?: string | null;
  profile: Profile;
  details: PortalDetails;
  recommenders: RecommenderRow[];
  essays: SheetEssay[];
  documents: { id: string; kind: string; filename: string }[];
}): FillSheet {
  const p = a.profile;
  const d = a.details;
  const name = splitName(p.identity.full_name);
  const f: Record<string, string> = {};
  const set = (k: string, v: string | number | null | undefined) => {
    if (v !== null && v !== undefined && String(v).trim() !== "") f[k] = String(v).trim();
  };

  // a detail the applicant confirmed in conversation counts as much as one typed into the form details
  const fact = (re: RegExp) => p.confirmed_facts.find((x) => re.test(x.topic))?.value ?? null;

  // personal
  set("full_name", p.identity.full_name);
  // the legal name as the applicant gave it (exactly as on the passport) beats one split from the full name
  const legal = !!(d.legal_first_name || d.legal_last_name);
  // a name with a digit in it is a typo: left blank, so the agents ask instead of typing it into an account
  const okName = (v: string | null | undefined) => (v && /\d/.test(v) ? null : v);
  set("first_name", okName(legal ? d.legal_first_name : name.first));
  set("middle_name", okName(legal ? d.legal_middle_name : name.middle));
  set("last_name", okName(legal ? d.legal_last_name : name.last));
  set("preferred_name", d.preferred_name || name.first);
  set("email", d.email || a.accountEmail);
  // portals that want a user id as well as an email: the email's local part
  set("username", (d.email || a.accountEmail || "").split("@")[0].replace(/[^a-z0-9._-]/gi, "").slice(0, 30));
  // portals that want the user id built from the name ("eID: first.last", "firstname.lastname")
  const ascii = (v?: string | null) => (v ?? "").normalize("NFKD").replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (f.first_name && f.last_name) {
    set("username_first_last", `${ascii(f.first_name)}.${ascii(f.last_name)}`.slice(0, 30));
    set("username_firstlast", `${ascii(f.first_name)}${ascii(f.last_name)}`.slice(0, 30));
  }
  const phone = d.phone || fact(/\b(phone|mobile)\b/i);
  set("phone", phone);
  // split for portals with a separate dialling-code box: "+234 803 123 4567" -> "+234" and "8031234567"
  const pm = (phone ?? "").replace(/[^\d+]/g, "").match(/^\+(\d{1,3})(\d{6,12})$/);
  if (pm) {
    const cc = DIAL.find((c) => pm[1].startsWith(c)) ?? pm[1].slice(0, 3);
    set("phone_country_code", `+${cc}`);
    set("phone_number", (pm[1] + pm[2]).slice(cc.length).replace(/^0/, ""));
    set("phone_local", `0${(pm[1] + pm[2]).slice(cc.length).replace(/^0/, "")}`);
  }
  const dob = d.date_of_birth || fact(/date of birth|birth ?date|\bdob\b/i);
  set("date_of_birth", dob);
  if (dob && /^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    set("dob_year", dob.slice(0, 4));
    set("dob_month", dob.slice(5, 7));
    set("dob_day", dob.slice(8, 10));
  }
  set("gender", d.gender || fact(/\b(gender|sex)\b/i));
  set("citizenship", p.identity.citizenship);
  set("country_of_birth", d.country_of_birth || fact(/(country|place) of birth|birth ?(country|place)|born in/i));
  set("country_of_residence", p.identity.country_of_residence);
  set("address_line1", d.address_line1);
  set("address_line2", d.address_line2);
  set("city", d.city || p.identity.city);
  set("state", d.state);
  set("postal_code", d.postal_code);
  set("country", d.country || p.identity.country_of_residence);
  set("linkedin", d.linkedin);
  set("website", d.website);
  set("nationality", p.identity.citizenship);
  // plain facts that follow from where they live and what they speak, for the yes/no questions forms ask
  const lives = (d.country || p.identity.country_of_residence || "").trim();
  if (lives) set("lives_in", lives);
  const firstLang = d.first_language || fact(/(first|native|mother).{0,10}(language|tongue)/i);
  if (firstLang) set("english_first_language", /^english\b/i.test(firstLang.trim()) ? "Yes" : "No");
  // everything else on the profile details (languages, background, family, activities, the yes/no questions):
  // offered under its own key, so a form question about it is filled without asking
  for (const fd of PORTAL_DETAIL_FIELDS) if (!(fd.key in f)) set(fd.key, /^(legal_.*_name|preferred_name)$/.test(fd.key) ? okName(d[fd.key]) : d[fd.key]);

  // the application itself
  set("program", a.program);
  set("degree", a.degree);
  set("level", LEVEL_LABEL[levelOf(p)]);
  set("entry_term", p.goals.target_term);
  if (p.goals.target_term) {
    const m = p.goals.target_term.match(/(fall|spring|summer|winter|autumn)[\s-]*(\d{4})/i);
    if (m) {
      set("entry_season", m[1][0].toUpperCase() + m[1].slice(1).toLowerCase());
      set("entry_year", m[2]);
    }
  }
  set("field_of_interest", p.goals.fields?.join(", "));
  // answers most portals ask up front. applying through an agent is never the case here: the applicant applies.
  set("applying_as", "myself");
  // "do you have a mcgill id number / student number?": only if they studied there before
  const studiedHere = (p.education ?? []).some((e) => e.institution && a.school && norm(e.institution).includes(norm(a.school).split(" ").filter((w) => w.length > 3)[0] ?? "\u0000"));
  set("has_school_id", studiedHere ? "" : "No");
  // quebec's permanent code (code permanent) is issued to people who studied in quebec
  set("has_quebec_code", /quebec|québec/i.test(`${(p.education ?? []).map((e) => `${e.institution ?? ""} ${e.country ?? ""}`).join(" ")} ${p.identity.country_of_residence ?? ""}`) ? "" : "No");
  // "application type" / "admit type": graduate or undergraduate, from the level they're applying at
  set("application_type", levelOf(p) === "undergraduate" ? "Undergraduate" : "Graduate");
  set("study_mode", /part.?time|online|executive/i.test(`${a.program} ${a.degree ?? ""}`) ? (/online/i.test(a.program) ? "Online" : "Part-time") : "Full-time");
  if (p.identity.citizenship && a.schoolCountry) {
    const same = norm(p.identity.citizenship).startsWith(norm(a.schoolCountry).slice(0, 5)) || norm(a.schoolCountry).startsWith(norm(p.identity.citizenship).slice(0, 5));
    set("visa_required", same ? "No" : "Yes");
  }
  if (p.goals.target_term) {
    const m = p.goals.target_term.match(/(fall|autumn|spring|summer|winter)[\s-]*(\d{4})/i);
    if (m) set("entry_start", `${({ fall: "September", autumn: "September", spring: "January", winter: "January", summer: "May" } as Record<string, string>)[m[1].toLowerCase()]} ${m[2]}`);
  }
  set("research_interests", p.goals.research_interests?.join(", "));
  set("short_term_goal", p.goals.short_term_goal);
  set("long_term_goal", p.goals.long_term_goal);

  // education: most recent first
  const edu = [...p.education].sort((x, y) => (y.end ?? "9999").localeCompare(x.end ?? "9999"));
  edu.slice(0, 3).forEach((e, i) => {
    const n = i + 1;
    set(`edu${n}_institution`, e.institution);
    set(`edu${n}_degree`, e.degree);
    set(`edu${n}_major`, e.field);
    set(`edu${n}_country`, e.country);
    set(`edu${n}_start_year`, year(e.start));
    set(`edu${n}_start_month`, month(e.start));
    set(`edu${n}_end_year`, year(e.end));
    set(`edu${n}_end_month`, month(e.end));
    set(`edu${n}_grade`, e.grade);
    set(`edu${n}_gpa`, e.gpa);
    set(`edu${n}_gpa_scale`, e.gpa_scale);
  });

  // work: current first
  const work = [...p.work].sort((x, y) => (y.end ?? "9999").localeCompare(x.end ?? "9999") || (y.start ?? "").localeCompare(x.start ?? ""));
  work.slice(0, 4).forEach((w, i) => {
    const n = i + 1;
    set(`work${n}_employer`, w.company);
    set(`work${n}_title`, w.role);
    set(`work${n}_location`, w.location);
    set(`work${n}_start_year`, year(w.start));
    set(`work${n}_start_month`, month(w.start));
    set(`work${n}_end_year`, w.end ? year(w.end) : "");
    set(`work${n}_end_month`, w.end ? month(w.end) : "");
    set(`work${n}_current`, w.end ? "no" : "yes");
    set(`work${n}_description`, w.highlights.slice(0, 4).join("; "));
  });
  const months = work.reduce((sum, w) => {
    const s = Date.parse((w.start ?? "").length === 4 ? `${w.start}-01` : `${w.start}`);
    const e = w.end ? Date.parse(w.end.length === 4 ? `${w.end}-12` : w.end) : Date.now();
    return Number.isFinite(s) && Number.isFinite(e) && e > s ? sum + (e - s) / (30.44 * 86_400_000) : sum;
  }, 0);
  if (months > 0) set("years_of_experience", Math.floor(months / 12));

  // tests
  for (const t of p.tests) {
    if (t.status !== "taken") continue;
    const k = t.name.toLowerCase();
    set(`${k}_score`, t.score);
    set(`${k}_date`, t.date);
  }
  set("english_route", p.english.route === "waiver" ? "medium of instruction was English" : p.english.route === "test" ? "test" : null);

  // recommenders
  a.recommenders.slice(0, 4).forEach((r, i) => {
    const n = i + 1;
    const rn = splitName(r.name);
    set(`rec${n}_name`, r.name);
    set(`rec${n}_first_name`, rn.first);
    set(`rec${n}_last_name`, rn.last);
    set(`rec${n}_email`, r.email);
    set(`rec${n}_title`, r.title);
    set(`rec${n}_organization`, r.organization);
    set(`rec${n}_relationship`, r.relationship);
    set(`rec${n}_phone`, r.phone);
  });

  const files: SheetFile[] = [];
  const latest = (kind: string) => a.documents.filter((x) => x.kind === kind || (kind === "degree_cert" && x.kind === "degree_certificate")).at(-1);
  for (const [kind, label] of [["cv", "resume / CV"], ["transcript", "transcript"], ["degree_cert", "degree certificate"], ["test_score", "test score report"]] as const) {
    const doc = latest(kind);
    if (doc) files.push({ key: kind, label, url: `/api/runner/file?application=${a.applicationId}&document=${doc.id}`, filename: doc.filename });
  }
  for (const e of a.essays) {
    files.push({ key: `essay:${e.artifact_id}`, label: e.title, url: `/api/runner/file?application=${a.applicationId}&artifact=${e.artifact_id}`, filename: `${e.title.replace(/[^\w\- ]+/g, "").slice(0, 60) || "essay"}.pdf` });
  }

  const missing: string[] = [];
  for (const k of PORTAL_DETAIL_FIELDS.filter((x) => x.required)) if (!f[k.key === "country" ? "country" : k.key]) missing.push(k.label);
  if (!files.some((x) => x.key === "cv")) missing.push("CV (upload it on documents)");
  if (!files.some((x) => x.key === "transcript")) missing.push("transcript (upload it on documents)");
  if (!a.recommenders.length) missing.push("recommenders' names and emails");

  // everything the applicant confirmed in conversation, including answers to portal questions
  const answers = p.confirmed_facts.map((x, i) => ({ key: `answer:${i}`, question: x.topic }));
  p.confirmed_facts.forEach((x, i) => set(`answer:${i}`, x.value));

  return { application_id: a.applicationId, school: a.school, program: a.program, portal_url: a.portalUrl, attested: a.attested, fields: f, essays: a.essays, files, missing, answers };
}

// ---------------------------------------------------------------------------
// label -> sheet key. the runner tries these before asking the model.
// order matters: more specific patterns first.
// ---------------------------------------------------------------------------
// the start of international dialling codes, longest first ("+234" not "+23")
const DIAL = ["1", "7", "20", "27", "30", "31", "32", "33", "34", "36", "39", "40", "41", "43", "44", "45", "46", "47", "48", "49", "51", "52", "53", "54", "55", "56", "57", "58", "60", "61", "62", "63", "64", "65", "66", "81", "82", "84", "86", "90", "91", "92", "93", "94", "95", "98", "211", "212", "213", "216", "218", "220", "221", "222", "223", "224", "225", "226", "227", "228", "229", "230", "231", "232", "233", "234", "235", "236", "237", "238", "239", "240", "241", "242", "243", "244", "245", "246", "248", "249", "250", "251", "252", "253", "254", "255", "256", "257", "258", "260", "261", "262", "263", "264", "265", "266", "267", "268", "269", "290", "291", "297", "298", "299", "350", "351", "352", "353", "354", "355", "356", "357", "358", "359", "370", "371", "372", "373", "374", "375", "376", "377", "378", "380", "381", "382", "383", "385", "386", "387", "389", "420", "421", "423", "852", "853", "855", "856", "880", "886", "960", "961", "962", "963", "964", "965", "966", "967", "968", "970", "971", "972", "973", "974", "975", "976", "977", "992", "993", "994", "995", "996", "998"].sort((a, b) => b.length - a.length);

export const LABEL_RULES: [RegExp, string][] = [
  // words forms use for the same thing: tried before the general rules below. most specific first.
  [/\bemergency\s*contact.*\b(phone|number|tel|mobile)\b/i, "emergency_contact_phone"],
  [/\bemergency\s*contact.*\be-?mail\b/i, "emergency_contact_email"],
  [/\bemergency\s*contact.*\brelation/i, "emergency_contact_relationship"],
  [/\bemergency\s*contact/i, "emergency_contact_name"],
  [/\b(country|dial(l?ing)?|international|area)\s*(phone\s*)?code\b|\bphone\s*prefix\b|\bcalling code\b/i, "phone_country_code"],
  [/\b(fore\s*names?|given\s*names?|christian\s*name)\b/i, "first_name"],
  [/\b(family\s*name|last\s*names?|surname)\b/i, "last_name"],
  [/^(?!.*\b(job|position|course|programme|program|thesis|dissertation)\b).*\b(salutation|honorific|title)\s*\*?\s*$|^\s*(salutation|title)\b(?!.*\b(job|course)\b)/i, "title"],
  [/\b(nationality|citizen(ship)?|passport\s*country|country\s*of\s*citizenship)\b/i, "citizenship"],
  [/\b(sex|gender|gender identity|legal sex|sex at birth)\b/i, "gender"],
  [/\bis english your (first|native|main)\b|english.*\b(first|native|mother|main)\b.{0,10}(language|tongue)/i, "english_first_language"],
  [/\b(first|native|mother|home|main)\s*(language|tongue)\b|\blanguage\s*(spoken\s*)?(most\s*)?(at\s*home|often)\b/i, "first_language"],
  [/^(?!.*\b(no|none|don.?t have|do not have)\b).*\b(mobile|cell(ular)?|telephone|phone|contact\s*number|tel\.?|whats\s*app)\b/i, "phone"],
  [/\bmarital\s*status|civil\s*status\b/i, "marital_status"],
  [/\b(ethnic|ethnicity|race)\b/i, "race_ethnicity"],
  [/\breligio|\bfaith\b/i, "religion"],
  [/\bdisabilit|special\s*(needs|requirements)|learning\s*difficult/i, "disability"],
  [/\b(city|town|place)\s*of\s*birth\b/i, "city_of_birth"],
  [/\bhow\s*did\s*you\s*(hear|find|learn)|where\s*did\s*you\s*hear|source\s*of\s*(information|referral)/i, "how_heard"],
  [/\bpronoun/i, "pronouns"],
  [/\b(post\s*code|postcode|zip(\s*code)?|postal\s*code)\b/i, "postal_code"],
  [/^\s*(country|country\s*\/\s*region|country or region|country of (residence|domicile))\s*\*?\s*$/i, "country"],
  [/^(?!.*\bcountry\b).*\b(county|state|province|region)\s*(\/\s*(state|province|county))?\s*\*?\s*$/i, "state"],
  [/\b(re-?enter|confirm|verify)\b.*e-?mail/i, "email"],
  [/\b(first|given)\s*name/i, "first_name"],
  [/\bmiddle\s*name/i, "middle_name"],
  [/\b(last|family|sur)\s*name|surname/i, "last_name"],
  [/\bpreferred\s*(first\s*)?name|nick\s*name/i, "preferred_name"],
  [/^\s*(full\s*)?(legal\s*)?name\s*\*?\s*$/i, "full_name"],
  [/e-?mail/i, "email"],
  [/\b(birth|dob)\w*\b.*\b(month|mm|m)\s*\*?$|\bbirth\s*month\b/i, "dob_month"],
  [/\b(birth|dob)\w*\b.*\b(day|dd|d)\s*\*?$|\bbirth\s*day\b/i, "dob_day"],
  [/\b(birth|dob)\w*\b.*\b(year|yyyy|y)\s*\*?$|\bbirth\s*year\b/i, "dob_year"],
  [/\b(date\s*of\s*birth|birth\s*date|birthdate|dob)\b/i, "date_of_birth"],
  [/\b(user\s*(id|name)|login\s*(id|name)|choose a (user|login)|identifiant|nom d.utilisateur)\b/i, "username"],
  [/\bcitizenship|nationality\b/i, "citizenship"],
  [/\b(country|region)\s*(\/\s*region\s*)?of\s*birth|birth\s*(country|place)|place of birth/i, "country_of_birth"],
  [/\bpermanent\s*residen|country\s*of\s*domicile|domicile/i, "country_of_residence"],
  [/\b(application|applicant|admission|admit)\s+type\b|type of (application|applicant|admission)/i, "application_type"],
  [/applying (for myself|using an (education )?agent|through an agent)|education agent|use an agent|who are you applying for/i, "applying_as"],
  [/\b(permanent code|code permanent)\b/i, "has_quebec_code"],
  [/\bdo you (have|hold) (a|an|your)?\s*[\w .'&-]{0,40}\b(student|id|identification|matriculation)\s*(number|no\.?|#)/i, "has_school_id"],
  [/\b(mode of study|study mode|attendance mode|full.?time or part.?time|part.?time or full.?time)\b|^\s*full.?time\s+part.?time\s*$|^\s*part.?time\s+full.?time\s*$/i, "study_mode"],
  [/\b(do you|will you) (require|need) a (student )?visa|\bvisa (required|needed)|require a visa/i, "visa_required"],
  [/\b(start date|intake|entry (date|point|month)|course start|commenc|when (do|would) you (like|want|intend) to start)/i, "entry_start"],
  [/\bcountry\s*of\s*(permanent\s*)?residen/i, "country_of_residence"],
  [/\b(address|street)\b.*\b(2|two|line\s*2)\b/i, "address_line2"],
  [/\b(street|address)(\s*line\s*1)?\b/i, "address_line1"],
  [/\b(city|town)\b/i, "city"],
  [/^(?!.*\bcountry\b).*\b(state|province|region)\b/i, "state"],
  [/\b(zip|postal|post)\s*code\b/i, "postal_code"],
  [/^\s*country\s*\*?\s*$/i, "country"],
  [/linkedin/i, "linkedin"],
  [/\b(personal\s*)?(website|portfolio)\b/i, "website"],
  [/\b(entry|start|intended)\s*(term|semester|session)\b/i, "entry_term"],
  [/\bentry\s*year|start\s*year\s*of\s*study/i, "entry_year"],
  [/\b(program|programme)\s*(of\s*interest|name)?\b/i, "program"],
  [/\b(institution|university|college|school)\s*(name|attended)?\b/i, "edu1_institution"],
  [/\b(major|field\s*of\s*study|concentration|discipline)\b/i, "edu1_major"],
  [/\b(degree\s*(earned|awarded|obtained|type)?)\b/i, "edu1_degree"],
  [/\bgpa\s*scale|out\s*of\b/i, "edu1_gpa_scale"],
  [/\b(gpa|cgpa|grade\s*point)\b/i, "edu1_gpa"],
  [/\b(class\s*of\s*degree|classification|final\s*grade)\b/i, "edu1_grade"],
  [/\b(graduation|completion)\s*(date|year)\b/i, "edu1_end_year"],
  [/\b(employer|company|organi[sz]ation)\b/i, "work1_employer"],
  [/\b(job\s*title|position|role)\b/i, "work1_title"],
  [/\byears\s*of\s*(full[-\s]*time\s*)?(work\s*)?experience\b/i, "years_of_experience"],
  [/\bgre\b.*\bscore|\bgre\b/i, "gre_score"],
  [/\bgmat\b/i, "gmat_score"],
  [/\btoefl\b/i, "toefl_score"],
  [/\bielts\b/i, "ielts_score"],
  [/\bduolingo\b/i, "duolingo_score"],
];

// recommender blocks: "recommender 2 email", "reference #1 name"
const REC = /\b(recommender|referee|reference|recommendation)\s*#?\s*(\d)\b/i;

export function keyForLabel(label: string): string | null {
  const l = label.replace(/\s+/g, " ").trim();
  if (!l) return null;
  const rec = l.match(REC);
  if (rec) {
    const n = rec[2];
    if (/e-?mail/i.test(l)) return `rec${n}_email`;
    if (/first/i.test(l)) return `rec${n}_first_name`;
    if (/last|sur/i.test(l)) return `rec${n}_last_name`;
    if (/title|position/i.test(l)) return `rec${n}_title`;
    if (/organi|institution|company|employer/i.test(l)) return `rec${n}_organization`;
    if (/relationship/i.test(l)) return `rec${n}_relationship`;
    if (/phone/i.test(l)) return `rec${n}_phone`;
    if (/name/i.test(l)) return `rec${n}_name`;
    return null;
  }
  for (const [re, key] of LABEL_RULES) if (re.test(l)) return key;
  return null;
}

// fields the runner must never fill, whatever the label matching says
export { NEVER_FILL } from "@/lib/never-fill";

// the certification box on a submit page
export const CERTIFY = /\b(certify|attest|i\s*confirm|i\s*declare|i\s*affirm|i\s*agree\s*that\s*(the|all)\s*information|true\s*and\s*(complete|accurate)|my\s*own\s*work)\b/i;
