// pure helpers for the writing pipeline. no db, no model: easy to test.

export function wordCount(text: string): number {
  return (text.trim().match(/\S+/g) ?? []).length;
}

// a draft must land within the limit (and not absurdly short). when there's no limit, anything goes.
export function withinLimit(text: string, limit: number | null): { ok: boolean; words: number; note: string } {
  const words = wordCount(text);
  if (!limit) return { ok: true, words, note: "" };
  if (words > limit) return { ok: false, words, note: `${words} words, over the ${limit} limit` };
  if (words < Math.floor(limit * 0.6)) return { ok: false, words, note: `${words} words, well under the ${limit} limit` };
  return { ok: true, words, note: "" };
}

export const MAX_ROUNDS = 2; // two passes catch most issues; a third rarely pays for itself

export type Verdict = "pass" | "revise";

// the loop stops when the red team passes it with no unsupported claims and it fits the limit,
// or after MAX_ROUNDS so the user isn't kept waiting on perfection.
export function nextStep(args: {
  round: number;
  verdict: Verdict;
  unsupportedClaims: number;
  fits: boolean;
}): "ready" | "revise" {
  if (args.round >= MAX_ROUNDS) return "ready";
  if (args.verdict === "pass" && args.unsupportedClaims === 0 && args.fits) return "ready";
  return "revise";
}

// phrases that make admissions readers (and ai detectors) wince. the red team gets this list.
export const CLICHES = [
  "ever since i was a child",
  "i have always been passionate",
  "in today's fast-paced world",
  "since time immemorial",
  "tapestry",
  "delve",
  "testament to",
  "a myriad of",
  "embark on a journey",
  "unwavering commitment",
  "i am writing to express",
  "dynamic and ever-evolving",
  "this program will allow me to",
  "realm",
];

export function clichesIn(text: string): string[] {
  const t = text.toLowerCase();
  return CLICHES.filter((c) => t.includes(c));
}

// ---------------------------------------------------------------------------
// disputed figures: the writer must not see numbers the applicant hasn't confirmed.
// we mask them out of the fact sheet itself instead of trusting a "don't use" instruction.
// ---------------------------------------------------------------------------
const FIGURE = /(?:[$₦£€]\s?\d[\d,.]*\s?(?:k|m|bn|million|billion)?|\d[\d,.]*\s?(?:%|k\b|m\b|bn\b|million|billion)|\b\d{3,}[\d,.]*\b|\b\d+\+?[\s-](?:member|person|people)\b)/gi;

export function disputedFigures(options: string[]): string[] {
  const out = new Set<string>();
  for (const o of options) for (const m of o.match(FIGURE) ?? []) out.add(m.trim().toLowerCase());
  return [...out].filter((f) => f.length >= 2);
}

export function maskDisputed<T>(value: T, figures: string[]): T {
  if (!figures.length) return value;
  const esc = figures.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length);
  const re = new RegExp(`(${esc.join("|")})`, "gi");
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return v.replace(re, "[disputed figure]");
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "confirmed_facts" ? x : walk(x)]));
    return v;
  };
  return walk(value) as T;
}

// drafts must never ship with template gaps
export function placeholdersIn(text: string): string[] {
  return text.match(/\[(?:[^\]]{0,60})\]|\{\{[^}]*\}\}|\b(?:TBD|TODO|XX+|lorem ipsum)\b|<insert[^>]*>/gi) ?? [];
}

// ---------------------------------------------------------------------------
// handoff to the applicant: an application is ready for their review when every written piece has a current
// version that passed the review loop (or that they wrote themselves). pure, so it can be tested.
// ---------------------------------------------------------------------------
export const NOT_AN_ESSAY = new Set(["strategy", "video_or_interview", "fee_plan", "funding_plan"]);
export type PieceState = { kind: string; current_version: number; versions: { version: number; author: string | null; status: string | null }[] };
export function essaysReady(pieces: PieceState[]): boolean {
  const essays = pieces.filter((p) => !NOT_AN_ESSAY.has(p.kind));
  if (!essays.length) return false;
  return essays.every((p) => {
    const v = p.versions.find((x) => x.version === p.current_version);
    return !!v && p.current_version > 0 && (v.status === "ready" || /^user/.test(v.author ?? ""));
  });
}

// when to remind someone their signed-off review is still waiting: a week out, three days out, the day before
export function dueBucket(daysLeft: number): "7" | "3" | "1" | null {
  if (daysLeft < 0 || daysLeft > 7) return null;
  return daysLeft <= 1 ? "1" : daysLeft <= 3 ? "3" : "7";
}

// an address an agent may email: well-formed, and one the research actually found on a page. a model asked for an
// "official contact" can produce a plausible address that exists nowhere; this is the check that it didn't
export function officialEmail(email: string, evidence: string): string {
  const e = email.trim();
  if (!/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(e)) return "";
  return evidence.toLowerCase().includes(e.toLowerCase()) ? e : "";
}

// the week a date falls in ("2026-W46"), for things that should happen at most once a week
export function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t.getTime() - yearStart) / 86_400_000 + 1) / 7)).padStart(2, "0")}`;
}

// applications that have sat ready for the applicant for two days or more, as one line for a weekly reminder.
// null when there is nothing old enough to mention
export function waitingSummary(apps: { school: string; readySince: string; deadline: string | null }[], now = new Date()): { title: string; body: string; count: number } | null {
  const old = apps.filter((a) => now.getTime() - Date.parse(a.readySince) >= 2 * 86_400_000);
  if (!old.length) return null;
  const names = [...new Set(old.map((a) => a.school))];
  const soonest = old.map((a) => a.deadline).filter((d): d is string => !!d && d >= now.toISOString().slice(0, 10)).sort()[0];
  const list = names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
  return {
    count: old.length,
    title: old.length === 1 ? `${names[0]} is still waiting for your sign-off` : `${old.length} applications are still waiting for your sign-off`,
    body: `The essays are written and checked for ${list}. Reading and approving one takes about ten minutes; the agents submit as soon as you sign.${soonest ? ` The nearest deadline is ${soonest}.` : ""}`,
  };
}
