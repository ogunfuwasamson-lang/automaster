import { describe, expect, it } from "vitest";
import { gate, nextDayUTC, tierOf } from "@/lib/credit-rules";
import { DEFAULT_POLICY, parsePolicy, fill } from "@/lib/credit-policy";
const INACTIVE_DAYS = DEFAULT_POLICY.inactiveDays;
import type { Spend } from "@/lib/pricing";

const spend = (research = 0, writing = 0, core = 0): Spend => ({ total: research + writing + core, byCategory: { research, writing, core } });
const base = { spend: spend(), todayUsd: 0, lastActiveMs: Date.now(), now: Date.now() };

describe("tierOf", () => {
  const s = { paid: false, staff: false, documents: 0, gmail: false, signed: false };
  it("starter until a document, gmail or a signature", () => {
    expect(tierOf(s)).toBe("starter");
    expect(tierOf({ ...s, documents: 1 })).toBe("engaged");
    expect(tierOf({ ...s, gmail: true })).toBe("engaged");
    expect(tierOf({ ...s, signed: true })).toBe("engaged");
  });
  it("paying and staff accounts outrank engagement", () => {
    expect(tierOf({ ...s, documents: 3, paid: true })).toBe("paid");
    expect(tierOf({ ...s, paid: true, staff: true })).toBe("staff");
  });
});

describe("gate", () => {
  it("never holds core work (interview, document reading), whoever it is", () => {
    expect(gate({ ...base, tier: "starter", category: "core", spend: spend(5, 5), todayUsd: 999 }).ok).toBe(true);
  });
  it("a starter gets the allowance for research and writing together, then waits for a document or gmail", () => {
    expect(gate({ ...base, tier: "starter", category: "research", spend: spend(0.3, 0.1) }).ok).toBe(true);
    const g = gate({ ...base, tier: "starter", category: "writing", spend: spend(0.3, 0.2) });
    expect(g).toMatchObject({ ok: false, kind: "starter" });
  });
  it("the allowance doesn't apply once engaged", () => {
    expect(gate({ ...base, tier: "engaged", category: "research", spend: spend(3, 2) }).ok).toBe(true);
  });
  it("starters wait from 60% of the daily limit; engaged keep going until twice the limit", () => {
    expect(gate({ ...base, tier: "starter", category: "research", todayUsd: 5.9 }).ok).toBe(true);
    expect(gate({ ...base, tier: "starter", category: "research", todayUsd: 6 })).toMatchObject({ ok: false, kind: "day" });
    expect(gate({ ...base, tier: "engaged", category: "research", todayUsd: 12 }).ok).toBe(true);
    expect(gate({ ...base, tier: "engaged", category: "writing", todayUsd: 20 })).toMatchObject({ ok: false, kind: "day" });
  });
  it("paid and staff are never held by the day", () => {
    expect(gate({ ...base, tier: "paid", category: "research", todayUsd: 100 }).ok).toBe(true);
    expect(gate({ ...base, tier: "staff", category: "writing", todayUsd: 100 }).ok).toBe(true);
  });
  it("a limit of 0 switches the daily limit off", () => {
    expect(gate({ ...base, tier: "starter", category: "research", todayUsd: 100, policy: { dailyLimitUsd: 0 } }).ok).toBe(true);
  });
  it("research waits for applicants who've been away, writing doesn't", () => {
    const away = Date.now() - (INACTIVE_DAYS + 1) * 86_400_000;
    expect(gate({ ...base, tier: "engaged", category: "research", lastActiveMs: away })).toMatchObject({ ok: false, kind: "inactive" });
    expect(gate({ ...base, tier: "engaged", category: "writing", lastActiveMs: away }).ok).toBe(true);
    expect(gate({ ...base, tier: "paid", category: "research", lastActiveMs: away }).ok).toBe(true);
  });
  it("reasons carry no amounts", () => {
    const g = gate({ ...base, tier: "starter", category: "research", spend: spend(1) });
    expect(g.ok ? "" : g.reason).not.toMatch(/\$|\d/);
  });
});

it("holds run again at the next UTC midnight", () => {
  expect(nextDayUTC(new Date("2026-11-12T19:47:00Z"))).toBe("2026-11-13T00:00:00.000Z");
  expect(nextDayUTC(new Date("2026-12-31T23:59:00Z"))).toBe("2027-01-01T00:00:00.000Z");
});

describe("policy", () => {
  it("the operator's numbers change the gate", () => {
    expect(gate({ ...base, tier: "starter", category: "research", spend: spend(0.6), policy: { starterUsd: 1 } }).ok).toBe(true);
    expect(gate({ ...base, tier: "engaged", category: "research", todayUsd: 3, policy: { dailyLimitUsd: 1, runawayMultiple: 2 } })).toMatchObject({ ok: false, kind: "day" });
    const away = Date.now() - 400 * 86_400_000;
    expect(gate({ ...base, tier: "engaged", category: "research", lastActiveMs: away, policy: { inactiveDays: 0 } }).ok).toBe(true);
  });
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
