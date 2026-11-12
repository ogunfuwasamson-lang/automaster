// every knob behind "who gets AI credit first" and "how we ask engaged applicants to pay", in one place the
// operator edits from the console (stored as JSON in billing_settings, so no schema change). pure: parsing clamps
// anything odd back to a safe value, so a typo can't switch the limits off by accident.

export const ANGLES = ["deadline", "ready", "progress", "handsoff", "funding", "value", "freeleft"] as const;
export type Angle = (typeof ANGLES)[number];

export interface AngleSetting {
  on: boolean;
  headline: string; // "" = the built-in wording
  body: string;
  cta: string;
}

export interface CreditPolicy {
  dailyLimitUsd: number; // the platform's AI spend in a UTC day before only serious accounts' work runs (0 = off)
  starterUsd: number; // research + writing a month before a document or gmail
  staffMonthlyUsd: number; // admins and team accounts, each, a month
  starterShareOfDay: number; // starters' research and writing wait once the day passes this share of the limit
  runawayMultiple: number; // past this multiple of the limit, only paid and staff work runs
  inactiveDays: number; // no research for unpaid accounts away this long (0 = off)
  nudges: {
    inApp: boolean; // the card on the dashboard
    email: boolean; // the email sequence
    emailDays: number[]; // days after a document or gmail
    emailGapDays: number; // at least this many days between two emails
    snoozeDays: number; // "Not now" hides the card this long
    angles: Record<Angle, AngleSetting>;
  };
}

const blank = (): AngleSetting => ({ on: true, headline: "", body: "", cta: "" });

export const DEFAULT_POLICY: CreditPolicy = {
  dailyLimitUsd: 10,
  starterUsd: 0.5,
  staffMonthlyUsd: 50,
  starterShareOfDay: 0.6,
  runawayMultiple: 2,
  inactiveDays: 14,
  nudges: {
    inApp: true,
    email: true,
    emailDays: [1, 3, 7, 14, 21],
    emailGapDays: 2,
    snoozeDays: 3,
    angles: Object.fromEntries(ANGLES.map((a) => [a, blank()])) as Record<Angle, AngleSetting>,
  },
};

const num = (v: unknown, d: number, min: number, max: number) => {
  // only a real number counts: null (an emptied box), "" and junk keep the default instead of becoming 0
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export function parsePolicy(raw: unknown): CreditPolicy {
  let o: Record<string, unknown> = {};
  try {
    o = (typeof raw === "string" ? JSON.parse(raw) : raw) ?? {};
  } catch {}
  if (typeof o !== "object" || Array.isArray(o)) o = {};
  const d = DEFAULT_POLICY;
  const n = (o.nudges ?? {}) as Record<string, unknown>;
  const a = (n.angles ?? {}) as Record<string, Partial<AngleSetting>>;
  const days = Array.isArray(n.emailDays) ? [...new Set((n.emailDays as unknown[]).map((x) => Math.round(Number(x))).filter((x) => x >= 0 && x <= 365))].sort((x, y) => x - y).slice(0, 12) : d.nudges.emailDays;
  return {
    dailyLimitUsd: num(o.dailyLimitUsd, d.dailyLimitUsd, 0, 10_000),
    starterUsd: num(o.starterUsd, d.starterUsd, 0, 1000),
    staffMonthlyUsd: num(o.staffMonthlyUsd, d.staffMonthlyUsd, 0, 10_000),
    starterShareOfDay: num(o.starterShareOfDay, d.starterShareOfDay, 0, 1),
    runawayMultiple: num(o.runawayMultiple, d.runawayMultiple, 1, 100),
    inactiveDays: Math.round(num(o.inactiveDays, d.inactiveDays, 0, 365)),
    nudges: {
      inApp: bool(n.inApp, d.nudges.inApp),
      email: bool(n.email, d.nudges.email),
      emailDays: days,
      emailGapDays: num(n.emailGapDays, d.nudges.emailGapDays, 0, 60),
      snoozeDays: num(n.snoozeDays, d.nudges.snoozeDays, 0, 60),
      angles: Object.fromEntries(
        ANGLES.map((k) => [k, { on: bool(a[k]?.on, true), headline: text(a[k]?.headline, 120), body: text(a[k]?.body, 600), cta: text(a[k]?.cta, 40) }]),
      ) as Record<Angle, AngleSetting>,
    },
  };
}

// placeholders the operator can use in their own wording
export const PLACEHOLDERS = ["{school}", "{days}", "{ready}", "{programs}", "{essays}", "{what}", "{price}", "{free_left}"] as const;

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
