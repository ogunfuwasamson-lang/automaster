import { describe, expect, it } from "vitest";
import { CODE, NUBAN, TERMS, bonusFor, cleanCode, dayKey, earnings, isBot, monthKey, monthStart, nextBonus, platformOf, weeksOf } from "@/lib/creator-terms";

describe("creator pay", () => {
  it("pays the bonus per full hundred above the target", () => {
    expect(bonusFor(0)).toBe(0);
    expect(bonusFor(500)).toBe(0);
    expect(bonusFor(599)).toBe(0);
    expect(bonusFor(600)).toBe(20_000);
    expect(bonusFor(700)).toBe(40_000);
    expect(bonusFor(800)).toBe(60_000);
    expect(bonusFor(1000)).toBe(100_000);
  });

  it("names the next bonus step", () => {
    expect(nextBonus(120)).toEqual({ need: 480, at: 600, bonus: 20_000 });
    expect(nextBonus(600)).toEqual({ need: 100, at: 700, bonus: 40_000 });
    expect(nextBonus(651)).toEqual({ need: 49, at: 700, bonus: 40_000 });
  });

  it("counts base pay at once and a month's bonus once it's over", () => {
    const now = new Date("2026-12-10T12:00:00Z");
    const e = earnings(
      [
        { month: "2026-11", qualified: 610, base: 610 * TERMS.rate },
        { month: "2026-12", qualified: 605, base: 605 * TERMS.rate },
      ],
      now,
    );
    expect(e.months.map((m) => [m.key, m.qualified, m.closed])).toEqual([
      ["2026-12", 605, false],
      ["2026-11", 610, true],
    ]);
    expect(e.earned).toBe(610 * 350 + 20_000 + 605 * 350);
    expect(e.pendingBonus).toBe(20_000);
  });

  it("puts a sign-up in its Lagos month", () => {
    // 23:30 UTC on 30 November is 00:30 on 1 December in Lagos
    expect(monthKey("2026-11-30T23:30:00Z")).toBe("2026-12");
    expect(dayKey("2026-11-30T23:30:00Z")).toBe("2026-12-01");
    expect(monthStart("2026-12")).toBe("2026-11-30T23:00:00.000Z");
  });
});

describe("creator content", () => {
  it("splits a month into weeks", () => {
    const w = weeksOf("2026-11"); // 1 November 2026 is a Sunday: the stub joins the first full week
    expect(w[0]).toEqual({ from: "2026-11-01", to: "2026-11-08" });
    expect(w[w.length - 1].to).toBe("2026-11-30");
    expect(w.length).toBe(4);
    expect(weeksOf("2026-12")[0]).toEqual({ from: "2026-12-01", to: "2026-12-06" });
  });

  it("tells the platform from the address", () => {
    expect(platformOf("https://www.tiktok.com/@a/video/1")).toBe("TikTok");
    expect(platformOf("https://vm.tiktok.com/ZM123/")).toBe("TikTok");
    expect(platformOf("https://www.instagram.com/reel/abc/")).toBe("Instagram");
    expect(platformOf("https://youtu.be/abc")).toBe("YouTube");
    expect(platformOf("https://x.com/a/status/1")).toBe("X");
    expect(platformOf("https://example.com/v")).toBe("Other");
    expect(platformOf("javascript:alert(1)")).toBeNull();
    expect(platformOf("not a url")).toBeNull();
  });
});

describe("creator links and banks", () => {
  it("cleans a link code", () => {
    expect(cleanCode("Tolu on TikTok!")).toBe("tolu-on-tiktok");
    expect(CODE.test("tolu-on-tiktok")).toBe(true);
    expect(CODE.test("-bad")).toBe(false);
    expect(CODE.test("ab")).toBe(false);
  });

  it("checks a NUBAN", () => {
    expect(NUBAN.test("0123456789")).toBe(true);
    expect(NUBAN.test("012345678")).toBe(false);
    expect(NUBAN.test("01234567a9")).toBe(false);
  });

  it("leaves link previews out of visits", () => {
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot("WhatsApp/2.23")).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 TikTok 32.0")).toBe(false);
  });
});
