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
