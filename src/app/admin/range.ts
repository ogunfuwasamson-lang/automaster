// the operator console's period: one range every view reads, carried in the url (?range=7d, or ?from=…&to=…).
// dates are UTC days; `to` is the end of its day.

export type Range = { key: string; from: string; to: string; label: string; days: number; allTime: boolean };

export const PRESETS = [
  ["today", "Today"],
  ["7d", "7 days"],
  ["30d", "30 days"],
  ["month", "This month"],
  ["90d", "90 days"],
  ["all", "All time"],
] as const;

const DAY = 86_400_000;
const EPOCH = "2024-01-01T00:00:00.000Z";
const isDay = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function parseRange(sp: { range?: string; from?: string; to?: string }, now = Date.now()): Range {
  const endOfToday = new Date(new Date(now).toISOString().slice(0, 10) + "T23:59:59.999Z").toISOString();
  const startOf = (daysBack: number) => new Date(new Date(now - daysBack * DAY).toISOString().slice(0, 10) + "T00:00:00.000Z").toISOString();
  const make = (key: string, from: string, to: string, label: string, allTime = false): Range => ({
    key,
    from,
    to,
    label,
    days: Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / DAY)),
    allTime,
  });
  if (isDay(sp.from) || isDay(sp.to)) {
    let from = isDay(sp.from) ? `${sp.from}T00:00:00.000Z` : EPOCH;
    let to = isDay(sp.to) ? `${sp.to}T23:59:59.999Z` : endOfToday;
    if (from > to) [from, to] = [`${to.slice(0, 10)}T00:00:00.000Z`, `${from.slice(0, 10)}T23:59:59.999Z`];
    return make("custom", from, to, `${fmt(from)} to ${fmt(to)}`);
  }
  switch (sp.range) {
    case "today":
      return make("today", startOf(0), endOfToday, "today");
    case "7d":
      return make("7d", startOf(6), endOfToday, "the last 7 days");
    case "90d":
      return make("90d", startOf(89), endOfToday, "the last 90 days");
    case "month": {
      const d = new Date(now);
      return make("month", new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString(), endOfToday, "this month");
    }
    case "all":
      return make("all", EPOCH, endOfToday, "all time", true);
    default:
      return make("30d", startOf(29), endOfToday, "the last 30 days");
  }
}

export const inRange = (iso: string | null | undefined, r: Range) => !!iso && iso >= r.from && iso <= r.to;

// the query string that keeps the period (and the account scope) when moving between views
export function keep(r: Range, everyone: boolean) {
  const q = new URLSearchParams();
  if (r.key === "custom") {
    q.set("from", r.from.slice(0, 10));
    q.set("to", r.to.slice(0, 10));
  } else if (r.key !== "30d") q.set("range", r.key);
  if (everyone) q.set("all", "1");
  return q;
}

export function href(view: string, r: Range, everyone: boolean, extra: Record<string, string> = {}) {
  const q = keep(r, everyone);
  if (view !== "overview") q.set("view", view);
  for (const [k, v] of Object.entries(extra)) q.set(k, v);
  const s = q.toString();
  return s ? `/admin?${s}` : "/admin";
}
