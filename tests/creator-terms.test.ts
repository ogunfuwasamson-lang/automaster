import { describe, expect, it } from "vitest";
import { checkDetails, describe as describeDetails } from "@/lib/payout-methods";
import { CODE, TERMS, bonusFor, cleanCode, dayKey, earnings, isBot, monthKey, monthStart, nextBonus, platformOf, weeksOf } from "@/lib/creator-terms";

describe("creator pay", () => {
  it("pays the bonus per full hundred from 500", () => {
    expect(bonusFor(0)).toBe(0);
    expect(bonusFor(500)).toBe(0);
    expect(bonusFor(599)).toBe(0);
    expect(bonusFor(600)).toBe(20_000);
    expect(bonusFor(1500)).toBe(200_000);
    // the founder's example: 1,000 in a month is N350,000 base and N100,000 bonus
    expect(1000 * TERMS.rate + bonusFor(1000)).toBe(450_000);
  });

  it("names the next bonus step", () => {
    expect(nextBonus(120)).toEqual({ need: 480, at: 600, bonus: 20_000 });
    expect(nextBonus(600)).toEqual({ need: 100, at: 700, bonus: 40_000 });
    expect(nextBonus(1651)).toEqual({ need: 49, at: 1700, bonus: 240_000 });
  });

  it("pays a month only from the floor, base at once, bonus once it's over", () => {
    const now = new Date("2026-12-10T12:00:00Z");
    const e = earnings(
      [
        { month: "2026-10", qualified: 299, base: 299 * TERMS.rate },
        { month: "2026-11", qualified: 1610, base: 1610 * TERMS.rate },
        { month: "2026-12", qualified: 1605, base: 1605 * TERMS.rate },
      ],
      now,
    );
    expect(e.months.map((m) => [m.key, m.qualified, m.closed, m.unlocked])).toEqual([
      ["2026-12", 1605, false, true],
      ["2026-11", 1610, true, true],
      ["2026-10", 299, true, false],
    ]);
    // october ended below 300 and pays nothing; november pays base and bonus; december's base counts, its bonus waits
    expect(e.earned).toBe(1610 * 350 + 220_000 + 1605 * 350);
    expect(e.pendingBonus).toBe(220_000);
    expect(e.lockedBase).toBe(0);
  });

  it("holds this month's pay until it reaches the floor", () => {
    const e = earnings([{ month: "2026-12", qualified: 120, base: 120 * TERMS.rate }], new Date("2026-12-10T12:00:00Z"));
    expect(e.earned).toBe(0);
    expect(e.lockedBase).toBe(120 * 350);
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

  it("leaves link previews out of visits", () => {
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot("WhatsApp/2.23")).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 TikTok 32.0")).toBe(false);
  });
});

describe("payout details", () => {
  it("checks a Nigerian account and labels it", () => {
    const r = checkDetails("NGN", "bank", { bank_name: "Guaranty Trust Bank (GTBank)", account_number: "012 345 6789", account_name: "Tolu Adeyemi" });
    expect(r).toEqual({ currency: "NGN", method: "bank", account_name: "Tolu Adeyemi", label: "Guaranty Trust Bank (GTBank), ending 6789", details: { bank_name: "Guaranty Trust Bank (GTBank)", account_number: "0123456789", account_name: "Tolu Adeyemi" } });
    expect(checkDetails("NGN", "bank", { bank_name: "Kuda", account_number: "12345", account_name: "A B" })).toHaveProperty("error");
  });

  it("asks each currency for its own details", () => {
    expect(checkDetails("GHS", "mobile_money", { network: "MTN MoMo", phone: "024 123 4567", account_name: "Ama Mensah" })).toMatchObject({ currency: "GHS", label: "MTN MoMo, ending 4567" });
    expect(checkDetails("GBP", "bank", { account_name: "Jo Smith", bank_name: "Monzo", sort_code: "04-00-04", account_number: "12345678" })).toMatchObject({ details: { sort_code: "040004" } });
    expect(checkDetails("USD", "bank", { account_name: "Jo", bank_name: "Chase", routing_number: "12345678", account_number: "123456", account_type: "Checking" })).toHaveProperty("error");
    expect(checkDetails("EUR", "bank", { account_name: "Jo", bank_name: "N26", iban: "de89 3704 0044 0532 0130 00" })).toMatchObject({ label: "N26, ending 3000" });
  });

  it("takes any other currency by international transfer", () => {
    const r = checkDetails("OTHER", "swift", { currency: "xof", account_name: "Awa Diop", holder_address: "Dakar", bank_name: "Ecobank Senegal", swift: "ecocsndaxxx", account_number: "SN08SN0100152000048500003035", bank_country: "Senegal" });
    expect(r).toMatchObject({ currency: "XOF", method: "swift", label: "Ecobank Senegal, ending 3035" });
    expect(describeDetails("XOF", "swift", (r as { details: Record<string, string> }).details)[0]).toEqual(["Currency", "XOF"]);
  });
});
