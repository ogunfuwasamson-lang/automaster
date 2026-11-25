import { describe, expect, it } from "vitest";
import { APPLICATION_CEILING_USD, FREE_MONTHLY_USD, RESEARCH_MONTHLY_USD, gate, monthlyCapFor, nextDayUTC, overCeiling, tierOf } from "@/lib/credit-rules";
import { DEFAULT_POLICY, parsePolicy, fill } from "@/lib/credit-policy";
import type { Spend } from "@/lib/pricing";

const spend = (research = 0, writing = 0, core = 0): Spend => ({ total: research + writing + core, byCategory: { research, writing, core, apply: 0 } });

describe("who the agents work for: one credit, one application", () => {
  const s = { paid: false, staff: false };
  it("a free account is locked until it has credits, bought or earned through an invite", () => {
    expect(tierOf(s)).toBe("locked");
    expect(tierOf({ ...s, credits: 5 })).toBe("paid");
    expect(tierOf({ ...s, credits: 10 })).toBe("paid");
    expect(tierOf({ ...s, paid: true })).toBe("paid");
    expect(tierOf({ ...s, paid: true, credits: 0 })).toBe("paid");
    expect(tierOf({ ...s, staff: true })).toBe("staff");
  });
  it("the welcome submission alone doesn't start the agents, unless it pays for an application already signed", () => {
    expect(tierOf({ ...s, credits: 0 })).toBe("locked");
    expect(tierOf({ ...s, signedWithFree: true })).toBe("paid");
  });
});

describe("gate", () => {
  it("a free account gets $0.50 a month, CV reading and the interview only", () => {
    expect(FREE_MONTHLY_USD).toBe(0.5);
    expect(gate({ tier: "locked", category: "core", spend: spend(0, 0, 0.45) }).ok).toBe(true);
    expect(gate({ tier: "locked", category: "core", spend: spend(0, 0, 0.5) })).toMatchObject({ ok: false, kind: "locked" });
    expect(gate({ tier: "locked", category: "research", spend: spend() })).toMatchObject({ ok: false, kind: "locked" });
    expect(gate({ tier: "locked", category: "writing", spend: spend() })).toMatchObject({ ok: false, kind: "locked" });
  });
  it("an account with a credit has no monthly allowance, only the research ceiling", () => {
    expect(gate({ tier: "paid", category: "writing", spend: spend(2, 9, 4) }).ok).toBe(true);
    expect(gate({ tier: "paid", category: "core", spend: spend(5, 9, 4) }).ok).toBe(true);
    expect(gate({ tier: "paid", category: "research", spend: spend(RESEARCH_MONTHLY_USD - 0.01) }).ok).toBe(true);
    expect(gate({ tier: "paid", category: "research", spend: spend(RESEARCH_MONTHLY_USD) })).toMatchObject({ ok: false, kind: "research" });
  });
  it("staff aren't held", () => {
    expect(gate({ tier: "staff", category: "research", spend: spend(40) }).ok).toBe(true);
  });
  it("one application pauses for a look past its ceiling", () => {
    expect(overCeiling(APPLICATION_CEILING_USD - 0.01)).toBe(false);
    expect(overCeiling(APPLICATION_CEILING_USD)).toBe(true);
  });
  it("the operator console shows a free account's small month", () => {
    expect(monthlyCapFor("locked", 25)).toBe(0.5);
    expect(monthlyCapFor("paid", 25)).toBe(25);
    expect(monthlyCapFor("staff", 50)).toBe(50);
  });
  it("reasons carry no amounts", () => {
    for (const g of [gate({ tier: "locked", category: "research", spend: spend() }), gate({ tier: "paid", category: "research", spend: spend(9) })]) expect(g.ok ? "" : g.reason).not.toMatch(/\$|\d/);
  });
});

it("holds run again at the next UTC midnight", () => {
  expect(nextDayUTC(new Date("2026-11-12T19:47:00Z"))).toBe("2026-11-13T00:00:00.000Z");
  expect(nextDayUTC(new Date("2026-12-31T23:59:00Z"))).toBe("2027-01-01T00:00:00.000Z");
});

describe("policy", () => {
  it("parsing falls back to safe values for junk and clamps the rest", () => {
    expect(parsePolicy("not json")).toEqual(DEFAULT_POLICY);
    const p = parsePolicy({ dailyLimitUsd: "-5", starterShareOfDay: 3, runawayMultiple: 0, nudges: { emailDays: [7, "3", 3, -1, 999], angles: { ready: { on: false, headline: "Hi {school}" } } } });
    expect(p.dailyLimitUsd).toBe(0);
    expect(p.starterShareOfDay).toBe(1);
    expect(p.runawayMultiple).toBe(1);
    expect(p.nudges.emailDays).toEqual([3, 7]);
    expect(p.nudges.angles.ready).toEqual({ on: false, headline: "Hi {school}", body: "", cta: "" });
    expect(p.nudges.angles.value.on).toBe(true);
  });
  it("an emptied box (null) keeps the default instead of becoming 0", () => {
    const p = parsePolicy({ dailyLimitUsd: null, starterShareOfDay: null, starterUsd: "", inactiveDays: undefined });
    expect(p.dailyLimitUsd).toBe(DEFAULT_POLICY.dailyLimitUsd);
    expect(p.starterShareOfDay).toBe(DEFAULT_POLICY.starterShareOfDay);
    expect(p.starterUsd).toBe(DEFAULT_POLICY.starterUsd);
    expect(parsePolicy(JSON.parse(JSON.stringify({ dailyLimitUsd: NaN }))).dailyLimitUsd).toBe(DEFAULT_POLICY.dailyLimitUsd);
    expect(parsePolicy({ dailyLimitUsd: 0 }).dailyLimitUsd).toBe(0); // a real 0 still switches it off
  });
  it("fills placeholders and leaves unknown ones", () => {
    expect(fill("{school} closes in {days} days {nope}", { school: "UCL", days: 9 })).toBe("UCL closes in 9 days {nope}");
  });
});


describe("the credit price list", () => {
  it("a pack is 5 applications and 10 checks; an invite covers one application", async () => {
    const { CREDITS, applicationsFor, searchSize } = await import("@/lib/credit-prices");
    expect(CREDITS.pack).toBe(60);
    expect(CREDITS.packDays).toBe(30);
    expect(CREDITS.pro).toBe(160);
    expect(applicationsFor(CREDITS.pack - 10 * CREDITS.check)).toBe(5);
    expect(applicationsFor(CREDITS.invite)).toBe(1);
    expect(applicationsFor(9)).toBe(0);
    // a search never checks more than the wallet pays for, or more than ten a run
    expect(searchSize(20, 60)).toBe(10);
    expect(searchSize(20, 4)).toBe(4);
    expect(searchSize(20, 0)).toBe(0);
  });
});
