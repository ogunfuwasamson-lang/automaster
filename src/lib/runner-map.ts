import { countryCode } from "@/lib/country-codes";
// turns a portal page's fields into values from the fill sheet. pure; the model only ever picks a sheet KEY,
// never writes a value, so it can't invent facts about the applicant.
import { CERTIFY, NEVER_FILL, keyForLabel, type FillSheet } from "@/lib/fillsheet";
import { cleanLabel as cleanLabelLocal } from "@/lib/labels";

export interface PageField {
  id: string; // runner's handle for the element
  label: string;
  type: string; // text, email, tel, date, number, textarea, select, radio, checkbox, file
  name?: string;
  options?: string[]; // select / radio choices, as shown
  required?: boolean;
  combo?: boolean; // a search-as-you-type box: type the value, then pick it from the list that appears
  aria?: boolean; // a dropdown that is a button opening a list (salesforce lightning): open it, then click the option
  maxLength?: number; // the most characters the box takes
}

export type Fill =
  | { id: string; action: "fill"; value: string; source: string }
  | { id: string; action: "choose"; option: string; source: string }
  | { id: string; action: "check"; source: string }
  | { id: string; action: "upload"; file: string; source: string } // file = sheet file key
  | { id: string; action: "skip"; reason: string };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const ALIASES: Record<string, string[]> = {
  nigeria: ["nigerian", "ng", "nga", "federal republic of nigeria"],
  "united states": ["usa", "us", "united states of america", "american"],
  "united kingdom": ["uk", "great britain", "british", "england"],
  male: ["man", "m", "male m"],
  female: ["woman", "f", "female f"],
  yes: ["true", "y", "oui", "si"],
  no: ["false", "n", "non"],
  "prefer not to say": ["prefer not to answer", "decline to answer", "rather not say", "do not wish to disclose", "i prefer not to say", "not disclosed", "decline to state", "prefer not to disclose"],
  "non binary": ["nonbinary", "non binary person"],
  "another gender": ["other gender", "gender not listed", "prefer to self describe", "self describe"],
  english: ["anglais", "ingles", "englisch"],
  french: ["francais", "frances"],
  "full time": ["full-time", "fulltime", "ft"],
  "part time": ["part-time", "parttime", "pt"],
  "search engine": ["internet search", "internet", "google", "web search", "online search", "search engine google", "online"],
  "school website": ["university website", "website", "university web site", "the university website", "institution website", "web site"],
  "social media": ["facebook", "instagram", "linkedin", "twitter", "x", "tiktok", "youtube"],
  "friend or family": ["friend", "family", "friends or family", "word of mouth", "recommendation"],
  "education fair": ["fair", "exhibition", "recruitment fair", "education exhibition", "event"],
  rankings: ["league tables", "league table", "ranking", "university rankings"],
  myself: ["self", "applicant", "i am the applicant", "the applicant", "student", "individual", "me", "for myself", "on my own behalf"],
};

// words that mean the same thing on forms, often bilingual ("Fall / Automne 2027"): mapped to one spelling
const SYNONYM: Record<string, string> = {
  autumn: "fall", automne: "fall", otono: "fall", herbst: "fall", sept: "fall", september: "fall",
  printemps: "spring", primavera: "spring", fruhling: "spring", january: "spring", jan: "spring",
  hiver: "winter", invierno: "winter",
  ete: "summer", verano: "summer", sommer: "summer",
  masters: "master", msc: "master", ma: "master", mba: "master", meng: "master", graduate: "graduate", postgraduate: "graduate", pg: "graduate",
  bachelors: "bachelor", undergraduate: "undergraduate", ug: "undergraduate",
  fulltime: "full", parttime: "part",
};
const STOP = new Set(["the", "a", "an", "of", "and", "or", "for", "in", "to", "term", "intake", "session", "semester", "entry", "start", "year", "time"]);
const fold = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
const tokens = (s: string) =>
  norm(fold(s).replace(/full[\s-]?time/gi, "fulltime").replace(/part[\s-]?time/gi, "parttime"))
    .split(" ")
    .filter((w) => w && !STOP.has(w))
    .map((w) => SYNONYM[w] ?? w);

// pick the option that best matches a sheet value ("Nigeria" -> "Nigeria (NG)", "fall 2027" -> "Fall / Automne 2027")
export function bestOption(value: string, options: string[]): string | null {
  const v = norm(fold(value));
  if (!v || !options.length) return null;
  const opts = options.map((o) => ({ o, n: norm(fold(o)) })).filter((x) => x.n && !/^(select|choose|please|--)/.test(x.n));
  const exact = opts.find((x) => x.n === v);
  if (exact) return exact.o;
  const alias = Object.entries(ALIASES).find(([k, al]) => k === v || al.includes(v));
  if (alias) {
    const names = [alias[0], ...alias[1]];
    const hit = opts.find((x) => names.includes(x.n) || names.some((n) => x.n.split(" ").join(" ") === n));
    if (hit) return hit.o;
  }
  const starts = opts.filter((x) => x.n.startsWith(v) || v.startsWith(x.n));
  if (starts.length === 1) return starts[0].o;
  const contains = opts.filter((x) => x.n.includes(v));
  if (contains.length === 1) return contains[0].o;
  // month numbers to names
  if (/^\d{1,2}$/.test(v)) {
    const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    const name = months[Number(v) - 1];
    const m = name && opts.find((x) => x.n === name || x.n === name.slice(0, 3) || x.n === String(Number(v)) || x.n === v.padStart(2, "0"));
    if (m) return m.o;
  }
  // every word of the value appears in the option (after synonyms), on either side of a bilingual "/":
  // "Fall 2027" -> "Fall / Automne 2027", "Full-time" -> "Full time study". the closest fit wins, only if it's clear.
  const want = [...new Set(tokens(value))];
  if (!want.length) return null;
  const scored = opts
    .map((x) => {
      const have = new Set(tokens(x.o));
      const all = want.every((w) => have.has(w));
      return { o: x.o, all, extra: have.size - want.filter((w) => have.has(w)).length };
    })
    .filter((x) => x.all)
    .sort((a, b) => a.extra - b.extra);
  if (scored.length === 1 || (scored.length > 1 && scored[0].extra < scored[1].extra)) return scored[0].o;
  return null;
}

function essayFor(label: string, sheet: FillSheet) {
  const l = norm(label);
  if (!/(essay|statement|purpose|personal|motivation|why|goals|cover letter|describe|tell us)/.test(l)) return null;
  let best: { id: string; score: number } | null = null;
  for (const e of sheet.essays) {
    const words = new Set(norm(`${e.title} ${e.prompt ?? ""}`).split(" ").filter((w) => w.length > 3));
    const score = l.split(" ").filter((w) => words.has(w)).length;
    if (score > 0 && (!best || score > best.score)) best = { id: e.artifact_id, score };
  }
  if (best) return best.id;
  return sheet.essays.length === 1 ? sheet.essays[0].artifact_id : null;
}

function fileFor(label: string, sheet: FillSheet): string | null {
  const l = norm(label);
  const has = (k: string) => sheet.files.some((f) => f.key === k);
  if (/(resume|cv|curriculum)/.test(l) && has("cv")) return "cv";
  if (/(transcript|academic record|marksheet|mark sheet)/.test(l) && has("transcript")) return "transcript";
  if (/(degree certificate|diploma|certificate)/.test(l) && has("degree_cert")) return "degree_cert";
  if (/(score report|test score)/.test(l) && has("test_score")) return "test_score";
  const essay = essayFor(label, sheet);
  return essay ? `essay:${essay}` : null;
}

// when the question text is unclear, the answers can give it away
export function keyForOptions(options: string[]): string | null {
  const o = options.map((x) => x.toLowerCase().trim());
  // a field whose label says nothing useful ("My details") still gives itself away by its options
  if (o.some((x) => /^(male|man|m)$/.test(x)) && o.some((x) => /^(female|woman|f)$/.test(x))) return "gender";
  if (o.filter((x) => /^(mr|mrs|ms|miss|mx|dr)\.?$/.test(x)).length >= 3) return "title";
  if (o.filter((x) => /\+\s?\d{1,3}\b|\(\+?\d{1,3}\)/.test(x)).length >= 10) return "phone_country_code";
  if (o.filter((x) => /^(single|married|divorced|widowed|separated)\b/.test(x)).length >= 3) return "marital_status";
  if (o.some((x) => /full.?time/.test(x)) && o.some((x) => /part.?time/.test(x))) return "study_mode";
  if (o.some((x) => /myself|my own behalf/.test(x)) && o.some((x) => /agent/.test(x))) return "applying_as";
  return null;
}

export { cleanLabel } from "@/lib/labels";

// an answer the applicant gave to this same question before (on any school's portal)
export function answerFor(label: string, sheet: FillSheet, options: string[] = []): string | null {
  const l = norm(cleanLabelLocal(label, options));
  if (!l || !sheet.answers?.length) return null;
  const exact = sheet.answers.find((a) => norm(a.question) === l);
  if (exact) return exact.key;
  // nearly the same wording ("Country of birth" vs "Country of birth *"): most words in common
  const words = new Set(l.split(" ").filter((w) => w.length > 2));
  if (words.size < 2) return null;
  let best: { key: string; score: number } | null = null;
  for (const a of sheet.answers) {
    const aw = norm(a.question).split(" ").filter((w) => w.length > 2);
    if (aw.length < 2) continue;
    const common = aw.filter((w) => words.has(w)).length;
    const score = common / Math.max(words.size, aw.length);
    if (score >= 0.8 && (!best || score > best.score)) best = { key: a.key, score };
  }
  return best?.key ?? null;
}

// first pass: rules only. returns fills plus the fields the model should look at.
export function mapByRules(fields: PageField[], sheet: FillSheet): { fills: Fill[]; unresolved: PageField[] } {
  const hasCodeBox = fields.some((x) => keyForLabel(x.label) === "phone_country_code" || (x.type === "select" && keyForOptions(x.options ?? []) === "phone_country_code"));
  const fills: Fill[] = [];
  const unresolved: PageField[] = [];
  for (const f of fields) {
    const text = `${f.label} ${f.name ?? ""}`;
    if (NEVER_FILL.test(text) || f.type === "password") {
      fills.push({ id: f.id, action: "skip", reason: "you fill this one" });
      continue;
    }
    if (f.type === "checkbox" && CERTIFY.test(f.label)) {
      fills.push(sheet.attested ? { id: f.id, action: "check", source: "your packet attestation" } : { id: f.id, action: "skip", reason: "certification: needs your attestation" });
      continue;
    }
    if (f.type === "file") {
      const file = fileFor(f.label, sheet);
      if (file) fills.push({ id: f.id, action: "upload", file, source: file });
      else unresolved.push(f);
      continue;
    }
    if (f.type === "textarea") {
      const essay = essayFor(f.label, sheet);
      if (essay) {
        fills.push({ id: f.id, action: "fill", value: sheet.essays.find((e) => e.artifact_id === essay)!.text, source: `essay:${essay}` });
        continue;
      }
    }
    const answered = answerFor(f.label, sheet, f.options);
    const ra = answered ? resolve(f, answered, sheet) : null;
    if (ra) {
      fills.push(ra);
      continue;
    }
    let key = keyForLabel(f.label) ?? (f.name ? keyForLabel(f.name.replace(/[_\-.[\]]+/g, " ")) : null) ?? keyForOptions(f.options ?? []);
    // a date-of-birth dropdown known only by its field name ("createdobday" under a "My details" heading)
    if (!key && f.type === "select" && /dob|birth/i.test(`${f.name ?? ""}`) && datePart(f.options ?? [])) key = "date_of_birth";
    // a number box next to its own dialling-code box takes the number without the code
    if (key === "phone" && f.type !== "select" && hasCodeBox) key = sheet.fields.phone_number ? "phone_number" : key;
    const r = key ? resolve(f, key, sheet) : null;
    if (r) fills.push(r);
    else if (key && !sheet.fields[key] && !key.startsWith("essay:")) fills.push({ id: f.id, action: "skip", reason: `missing:${key}` });
    else unresolved.push(f);
  }
  return { fills, unresolved };
}

// turn a chosen sheet key into a fill for this field (or null if the sheet has no usable value)
// a select labelled only "date of birth" is one part of a split date: tell which from its options
export function datePart(options: string[]): "day" | "month" | "year" | null {
  const o = options.map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (o.some((x) => /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/.test(x)) || o.includes("month") || o.includes("mm") || o.includes("mon")) return "month";
  if (o.some((x) => /^(19|20)\d\d$/.test(x)) || o.includes("year") || o.includes("yyyy")) return "year";
  const nums = o.filter((x) => /^\d{1,2}$/.test(x)).map(Number);
  if (o.includes("day") || o.includes("dd") || (nums.length >= 28 && Math.max(...nums) === 31)) return "day";
  if (nums.length === 12 && Math.max(...nums) === 12) return "month";
  return null;
}

const RELATED: Record<string, string[]> = {
  application_type: ["entry_term", "entry_start", "level", "degree", "study_mode"],
  entry_term: ["entry_start", "entry_season"],
  entry_start: ["entry_term", "entry_season"],
  entry_season: ["entry_term", "entry_start"],
  level: ["application_type", "degree"],
  degree: ["level", "application_type", "program"],
  program: ["degree", "field_of_interest"],
  study_mode: ["application_type"],
  phone_country_code: ["lives_in", "country", "citizenship"],
  citizenship: ["nationality", "country"],
  first_language: ["english_first_language"],
  english_first_language: ["first_language"],
};

export function resolve(f: PageField, key: string, sheet: FillSheet): Fill | null {
  if (key === "date_of_birth" && f.type === "select") {
    const part = datePart(f.options ?? []);
    if (part) key = `dob_${part}`;
  }
  // "Sep 2027" style start lists: match the month-year
  if (key === "entry_start" && (f.type === "select" || f.type === "radio") && sheet.fields.entry_start) {
    const [mon, yr] = sheet.fields.entry_start.split(" ");
    const hit = (f.options ?? []).find((o) => o.toLowerCase().includes(mon.slice(0, 3).toLowerCase()) && o.includes(yr));
    if (hit) return { id: f.id, action: "choose", option: hit, source: key };
  }
  if (key.startsWith("essay:")) {
    const e = sheet.essays.find((x) => `essay:${x.artifact_id}` === key);
    if (!e) return null;
    return f.type === "file" ? { id: f.id, action: "upload", file: key, source: key } : { id: f.id, action: "fill", value: e.text, source: key };
  }
  if (f.type === "file") return sheet.files.some((x) => x.key === key) ? { id: f.id, action: "upload", file: key, source: key } : null;
  const value = sheet.fields[key];
  if (!value) return null;
  // "do you have a … number?" keys answer a yes/no question. a box that wants the number itself stays empty
  // (calgary's optional UCID box got "No" and the form refused it)
  if (/^has_/.test(key) && f.type !== "select" && f.type !== "radio" && f.type !== "checkbox") return null;
  // "are you registering on behalf of someone / through an agent?" with Yes / No: applying for oneself is No
  if (key === "applying_as" && /^myself$/i.test(value) && (f.type === "select" || f.type === "radio")) {
    const opts = f.options ?? [];
    const no = opts.find((o) => /^\s*no\b/i.test(o));
    if (no && opts.some((o) => /^\s*yes\b/i.test(o)) && !opts.some((o) => /self|applicant|myself/i.test(o))) return { id: f.id, action: "choose", option: no, source: key };
  }
  if (f.type === "select" || f.type === "radio") {
    const opt = bestOption(value, f.options ?? []);
    if (opt) return { id: f.id, action: "choose", option: opt, source: key };
    // the label pointed at one key but the options speak about another: "Application type" whose options are
    // terms ("Fall / Automne 2027"), an "intake" list of degree levels. try the keys these questions get confused with.
    for (const k of RELATED[key] ?? []) {
      const alt = sheet.fields[k] ? bestOption(sheet.fields[k], f.options ?? []) : null;
      if (alt) return { id: f.id, action: "choose", option: alt, source: k };
    }
    return null;
  }
  // yes/no boxes are the applicant's call: only ticked when they answered yes to this question
  if (f.type === "checkbox") return key.startsWith("answer:") && /^(yes|y|true|i agree|agree|i do|correct)\b/i.test(value) ? { id: f.id, action: "check", source: key } : null;
  // a country box that takes 2 or 3 characters wants the code ("NGA"), not the name
  if ((f.maxLength === 2 || f.maxLength === 3) && /country|citizenship|nationality/i.test(`${key} ${f.label} ${f.name ?? ""}`)) {
    const code = countryCode(value, f.maxLength);
    if (code) return { id: f.id, action: "fill", value: code, source: key };
  }
  if (f.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  if (f.type === "number" && !/^-?\d+(\.\d+)?$/.test(value)) return null;
  if (f.type === "email" && !/@/.test(value)) return null;
  return { id: f.id, action: "fill", value, source: key };
}

// the menu the model picks from: keys only, with a short preview so it can tell edu1 from edu2
export function keyMenu(sheet: FillSheet): string {
  const fields = Object.entries(sheet.fields).map(([k, v]) => `${k}: ${v.length > 50 ? `${v.slice(0, 50)}…` : v}`);
  const essays = sheet.essays.map((e) => `essay:${e.artifact_id}: ${e.title}${e.prompt ? ` (${e.prompt.slice(0, 80)})` : ""}`);
  const files = sheet.files.filter((f) => !f.key.startsWith("essay:")).map((f) => `${f.key}: file, ${f.label}`);
  // answers show the question they answer, so the model can match a reworded portal question
  const answers = (sheet.answers ?? []).map((a) => `${a.key}: answers "${a.question.slice(0, 80)}"`);
  return [...fields.filter((x) => !x.startsWith("answer:")), ...answers, ...essays, ...files].join("\n");
}
