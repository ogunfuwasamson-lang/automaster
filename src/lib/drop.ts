// the morning drop: an unpaid applicant's shortlist research is spread over several mornings (3 programmes a
// day) instead of all at once. the spend is the same; the applicant gets something new each morning and a reason
// to come back (nov 2026: 77% of sign-ups never returned after the first day). the research runs early, so the
// 7am email (lib/digest) has it. pure, so tests and the agents agree.

export const PER_DAY = 3;
export const RESEARCH_HOUR = 5; // local time: done before the 7am email

// which morning a programme belongs to. regions are interleaved so each morning mixes them:
// pick i of region `slot` (of `regions`) is the (i * regions + slot)th programme overall
export function daySlot(i: number, slot: number, regions: number, perDay = PER_DAY): number {
  const g = i * Math.max(1, regions) + Math.max(0, slot);
  return Math.floor(g / Math.max(1, perDay));
}

// the UTC instant of `hour`:00 local time, `daysAhead` days from today in that time zone
export function localMorningUTC(tz: string | null | undefined, daysAhead: number, hour = RESEARCH_HOUR, now = new Date()): Date {
  const zone = safeZone(tz);
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now).split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d + daysAhead, hour, 0, 0);
  // that wall-clock time read as UTC, corrected by the zone's offset at that moment (twice, for a DST edge)
  let t = guess - offsetMs(zone, new Date(guess));
  t = guess - offsetMs(zone, new Date(t));
  return new Date(t);
}

function safeZone(tz: string | null | undefined): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

// how far the zone's wall clock is ahead of UTC at `at`
function offsetMs(tz: string, at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const wall = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute), Number(parts.second));
  return wall - Math.floor(at.getTime() / 1000) * 1000;
}

// when a programme in morning `day` should be researched: day 0 is now; day 1 the next 5am local (later today if
// it's still before 5), and so on, a couple of minutes apart so a morning's three don't all start at once
export function researchAt(day: number, tz: string | null | undefined, index: number, now = new Date()): Date | null {
  if (day <= 0) return null;
  const first = localMorningUTC(tz, 0, RESEARCH_HOUR, now).getTime() > now.getTime() ? 0 : 1;
  return new Date(localMorningUTC(tz, first + day - 1, RESEARCH_HOUR, now).getTime() + (index % PER_DAY) * 2 * 60_000);
}
