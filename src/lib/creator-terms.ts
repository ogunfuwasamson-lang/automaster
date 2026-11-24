// the creator partnership's terms (the campaign guide, 24 nov 2026; target and pay floor changed the same day). pure,
// so the dashboard, the operator console, the payout check and the tests read the same numbers.
//   pay:     a month pays once it reaches PAY_FROM qualified sign-ups: then RATE naira for every one of them. a month
//            that ends below PAY_FROM pays nothing. on top, a bonus of BONUS_PER_STEP for every full BONUS_STEP
//            qualified sign-ups above the monthly TARGET (cumulative), paid once the month is over.
//   counts:  someone who came through the creator's link, made an account, uploaded a CV and finished the basic
//            profile in setup (level and regions). duplicates (the same device as an earlier sign-up) don't count.
//   content: VIDEOS_PER_MONTH original videos a month, at least one a week.
// months run on Lagos time. earnings are counted in naira; a creator paid in another currency gets it converted at
// the day's rate when it's sent.

export const TERMS = {
  rate: 350,
  payFrom: 300,
  target: 1500,
  bonusStep: 100,
  bonusPerStep: 20_000,
  videosPerMonth: 4,
  minWithdrawal: 5_000,
  payoutHours: 24,
  maxLinks: 10,
} as const;

export const ZONE = "Africa/Lagos";

// the version of the creator terms (components/legal/creator-terms) an applicant agrees to
export const CREATOR_TERMS_VERSION = "24 November 2026";

export const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

// the bonus for a month with this many qualified sign-ups
export function bonusFor(qualified: number): number {
  if (qualified <= TERMS.target) return 0;
  return Math.floor((qualified - TERMS.target) / TERMS.bonusStep) * TERMS.bonusPerStep;
}

// the next bonus step: how many more qualified sign-ups it takes, and what the bonus becomes
export function nextBonus(qualified: number): { need: number; at: number; bonus: number } {
  const at = qualified < TERMS.target + TERMS.bonusStep ? TERMS.target + TERMS.bonusStep : TERMS.target + (Math.floor((qualified - TERMS.target) / TERMS.bonusStep) + 1) * TERMS.bonusStep;
  return { need: at - qualified, at, bonus: bonusFor(at) };
}

// "2026-11" for a moment, in Lagos
export function monthKey(d: Date | string): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit" }).formatToParts(typeof d === "string" ? new Date(d) : d);
  return `${p.find((x) => x.type === "year")!.value}-${p.find((x) => x.type === "month")!.value}`;
}

// "2026-11-24" for a moment, in Lagos
export function dayKey(d: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(typeof d === "string" ? new Date(d) : d);
}

export const monthLabel = (key: string) => new Date(`${key}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

// the first moment of a Lagos month, as an ISO string (Lagos is UTC+1 all year)
export const monthStart = (key: string) => new Date(`${key}-01T00:00:00+01:00`).toISOString();

// unlocked: the month has reached the pay floor, so its base pay counts
export type Month = { key: string; qualified: number; base: number; bonus: number; closed: boolean; unlocked: boolean };

// what a creator has earned, month by month, from their qualified sign-ups per month (and what those earned at the
// creator's rate). a month's base pay counts as soon as it reaches the pay floor; its bonus once the month is over.
export function earnings(rows: { month: string; qualified: number; base: number }[], now = new Date()): { months: Month[]; earned: number; pendingBonus: number; lockedBase: number } {
  const cur = monthKey(now);
  const months = [...rows]
    .sort((a, b) => b.month.localeCompare(a.month))
    .map((m) => ({ key: m.month, qualified: m.qualified, base: m.base, bonus: bonusFor(m.qualified), closed: m.month < cur, unlocked: m.qualified >= TERMS.payFrom }));
  const earned = months.reduce((a, m) => a + (m.unlocked ? m.base + (m.closed ? m.bonus : 0) : 0), 0);
  const pendingBonus = months.filter((m) => !m.closed).reduce((a, m) => a + m.bonus, 0);
  // this month's pay that's still below the floor (it counts once the month reaches it)
  const lockedBase = months.filter((m) => !m.closed && !m.unlocked).reduce((a, m) => a + m.base, 0);
  return { months, earned, pendingBonus, lockedBase };
}

// the weeks of a month (monday to sunday, as far as they fall in it), for the one-video-a-week check
export function weeksOf(key: string): { from: string; to: string }[] {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const out: { from: string; to: string }[] = [];
  let start = 1;
  for (let d = 1; d <= last; d++) {
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 sunday
    if (dow === 0 || d === last) {
      out.push({ from: `${key}-${String(start).padStart(2, "0")}`, to: `${key}-${String(d).padStart(2, "0")}` });
      start = d + 1;
    }
  }
  // a stub of a day or two at either end joins the week next to it
  if (out.length > 1 && dayCount(out[0]) < 3) out.splice(0, 2, { from: out[0].from, to: out[1].to });
  if (out.length > 1 && dayCount(out[out.length - 1]) < 3) out.splice(-2, 2, { from: out[out.length - 2].from, to: out[out.length - 1].to });
  return out;
}
const dayCount = (w: { from: string; to: string }) => Number(w.to.slice(8)) - Number(w.from.slice(8)) + 1;

// where a video was posted, from its address
export function platformOf(url: string): string | null {
  let host: string;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    host = u.hostname.replace(/^(www|m|vm|vt)\./, "").toLowerCase();
  } catch {
    return null;
  }
  if (/(^|\.)tiktok\.com$/.test(host)) return "TikTok";
  if (/(^|\.)instagram\.com$/.test(host)) return "Instagram";
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) return "YouTube";
  if (/(^|\.)(x\.com|twitter\.com)$/.test(host)) return "X";
  if (/(^|\.)(facebook\.com|fb\.watch)$/.test(host)) return "Facebook";
  if (/(^|\.)linkedin\.com$/.test(host)) return "LinkedIn";
  if (/(^|\.)snapchat\.com$/.test(host)) return "Snapchat";
  if (/(^|\.)threads\.(net|com)$/.test(host)) return "Threads";
  return "Other";
}

// a link code: lowercase letters, digits and hyphens, 3 to 24 characters, starting with a letter or digit
export const CODE = /^[a-z0-9][a-z0-9-]{2,23}$/;
export const cleanCode = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);


// link previews and crawlers aren't visitors
export const isBot = (ua: string | null) => !ua || /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|embedly|vkshare|pinterest|headless|curl|wget|python|okhttp/i.test(ua);
