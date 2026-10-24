// api cost accounting. prices from platform.claude.com/docs/en/about-claude/pricing (oct 2026), usd per million tokens.
// pure module: no db, so it's testable and usable anywhere.

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
}

interface Rate {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}

// haiku 5.5 is priced by prompt length; everything else is flat
const RATES: Record<string, Rate | { upTo100k: Rate; over100k: Rate }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.1 },
  "claude-haiku-5-5": {
    upTo100k: { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01 },
    over100k: { input: 0.5, output: 2.5, cacheWrite: 0.625, cacheRead: 0.05 },
  },
};
const WEB_SEARCH_USD = 10 / 1000;
// unknown model: price it like the most expensive we use so budgets err on the safe side
const FALLBACK: Rate = { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 };

export function costOf(model: string, u: Usage): number {
  const cw = u.cache_creation_input_tokens ?? 0;
  const cr = u.cache_read_input_tokens ?? 0;
  const entry = RATES[model];
  let rate: Rate;
  if (!entry) rate = FALLBACK;
  else if ("upTo100k" in entry) rate = u.input_tokens + cw + cr > 100_000 ? entry.over100k : entry.upTo100k;
  else rate = entry;
  const tokens = (u.input_tokens * rate.input + u.output_tokens * rate.output + cw * rate.cacheWrite + cr * rate.cacheRead) / 1e6;
  const searches = (u.server_tool_use?.web_search_requests ?? 0) * WEB_SEARCH_USD;
  return Math.round((tokens + searches) * 1e6) / 1e6;
}

// ---------------------------------------------------------------------------
// budgets: each user gets a monthly allowance, split so one feature can't starve the rest
// ---------------------------------------------------------------------------
export type Category = "research" | "writing" | "core";

export const CATEGORY_SHARE: Record<Category, number> = {
  research: 0.45, // recon, scholarships: web research is the expensive part
  writing: 0.35, // strategist, writer, red team
  core: 0.2, // interview, document reading, profile cleanup
};

export function categoryOf(agent: string): Category {
  if (agent === "recon") return "research";
  if (agent === "strategist" || agent === "writer" || agent === "redteam" || agent === "closer") return "writing";
  return "core";
}

export const DEFAULT_MONTHLY_BUDGET_USD = 25;

export interface Spend {
  total: number;
  byCategory: Record<Category, number>;
}

export function budgetCheck(spend: Spend, monthly: number, category: Category): { ok: boolean; reason: string } {
  // reasons are user-visible (job errors): no amounts. the admin page has the numbers.
  if (spend.total >= monthly) return { ok: false, reason: "monthly limit reached" };
  const cap = monthly * CATEGORY_SHARE[category];
  if (spend.byCategory[category] >= cap) return { ok: false, reason: `monthly ${category} limit reached` };
  return { ok: true, reason: "" };
}

export function monthStartUTC(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export function nextMonthStartUTC(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}
