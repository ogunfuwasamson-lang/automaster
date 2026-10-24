// turns a portal page's fields into values from the fill sheet. pure; the model only ever picks a sheet KEY,
// never writes a value, so it can't invent facts about the applicant.
import { CERTIFY, NEVER_FILL, keyForLabel, type FillSheet } from "@/lib/fillsheet";

export interface PageField {
  id: string; // runner's handle for the element
  label: string;
  type: string; // text, email, tel, date, number, textarea, select, radio, checkbox, file
  name?: string;
  options?: string[]; // select / radio choices, as shown
  required?: boolean;
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
  male: ["man", "m"],
  female: ["woman", "f"],
  yes: ["true", "y"],
  no: ["false", "n"],
};

// pick the option that best matches a sheet value ("Nigeria" -> "Nigeria (NG)", "fall 2027" -> "Fall 2027")
export function bestOption(value: string, options: string[]): string | null {
  const v = norm(value);
  if (!v || !options.length) return null;
  const opts = options.map((o) => ({ o, n: norm(o) })).filter((x) => x.n && !/^(select|choose|please|--)/.test(x.n));
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

// first pass: rules only. returns fills plus the fields the model should look at.
export function mapByRules(fields: PageField[], sheet: FillSheet): { fills: Fill[]; unresolved: PageField[] } {
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
    const key = keyForLabel(f.label) ?? (f.name ? keyForLabel(f.name.replace(/[_\-.[\]]+/g, " ")) : null);
    const r = key ? resolve(f, key, sheet) : null;
    if (r) fills.push(r);
    else if (key && !sheet.fields[key] && !key.startsWith("essay:")) fills.push({ id: f.id, action: "skip", reason: `missing:${key}` });
    else unresolved.push(f);
  }
  return { fills, unresolved };
}

// turn a chosen sheet key into a fill for this field (or null if the sheet has no usable value)
export function resolve(f: PageField, key: string, sheet: FillSheet): Fill | null {
  if (key.startsWith("essay:")) {
    const e = sheet.essays.find((x) => `essay:${x.artifact_id}` === key);
    if (!e) return null;
    return f.type === "file" ? { id: f.id, action: "upload", file: key, source: key } : { id: f.id, action: "fill", value: e.text, source: key };
  }
  if (f.type === "file") return sheet.files.some((x) => x.key === key) ? { id: f.id, action: "upload", file: key, source: key } : null;
  const value = sheet.fields[key];
  if (!value) return null;
  if (f.type === "select" || f.type === "radio") {
    const opt = bestOption(value, f.options ?? []);
    return opt ? { id: f.id, action: "choose", option: opt, source: key } : null;
  }
  if (f.type === "checkbox") return null; // yes/no questions are the applicant's call
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
  return [...fields, ...essays, ...files].join("\n");
}
