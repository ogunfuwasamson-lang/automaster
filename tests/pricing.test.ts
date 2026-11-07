import { describe, it, expect } from "vitest";
import { costOf, budgetCheck, categoryOf, monthStartUTC, nextMonthStartUTC } from "@/lib/pricing";
import { BUDGET_PER_SUBMISSION_USD, PLANS, planOf } from "@/lib/plans";
import { friendlyAmount, pricingFor } from "@/lib/geo-pricing";

describe("costOf", () => {
  it("prices sonnet", () => {
    expect(costOf("claude-sonnet-5-5", { input_tokens: 1_000_000, output_tokens: 100_000 })).toBeCloseTo(3, 6);
  });
  it("prices cache reads and writes", () => {
    expect(costOf("claude-sonnet-5-5", { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 1_000_000 })).toBeCloseTo(2.6, 6);
  });
  it("prices haiku by prompt length", () => {
    expect(costOf("claude-haiku-5-5", { input_tokens: 50_000, output_tokens: 1000 })).toBeCloseTo(0.0055, 6);
    expect(costOf("claude-haiku-5-5", { input_tokens: 150_000, output_tokens: 1000 })).toBeCloseTo(0.0775, 6);
  });
  it("adds web searches", () => {
    expect(costOf("claude-haiku-5-5", { input_tokens: 0, output_tokens: 0, server_tool_use: { web_search_requests: 5 } })).toBeCloseTo(0.05, 6);
  });
  it("prices unknown models conservatively", () => {
    expect(costOf("mystery", { input_tokens: 1_000_000, output_tokens: 0 })).toBeCloseTo(4, 6);
  });
  it("the old recon bill: 10.8M in / 0.66M out", () => {
    expect(costOf("claude-sonnet-5-5", { input_tokens: 10_811_000, output_tokens: 658_263 })).toBeGreaterThan(28);
    // same work on haiku, split into sub-100k prompts
    expect(costOf("claude-haiku-5-5", { input_tokens: 10_811_000 / 200, output_tokens: 658_263 / 200 }) * 200).toBeLessThan(1.5);
  });
});

describe("budgets", () => {
  const spend = (research: number, writing: number, core: number) => ({ total: research + writing + core, byCategory: { research, writing, core } });
  it("caps total and per category", () => {
    expect(budgetCheck(spend(5, 5, 1), 25, "research").ok).toBe(true);
    expect(budgetCheck(spend(8.8, 0, 0), 25, "research").ok).toBe(false); // 35% of 25 = 8.75
    expect(budgetCheck(spend(8.8, 0, 0), 25, "writing").ok).toBe(true); // other categories keep going
    expect(budgetCheck(spend(10, 8.7, 6.3), 25, "core").ok).toBe(false); // total hit
  });
  it("maps agents to categories", () => {
    expect(categoryOf("recon")).toBe("research");
    expect(categoryOf("redteam")).toBe("writing");
    expect(categoryOf("interviewer")).toBe("core");
  });
  it("month boundaries are UTC", () => {
    expect(monthStartUTC(new Date("2026-10-24T09:00:00Z"))).toBe("2026-10-01T00:00:00.000Z");
    expect(nextMonthStartUTC(new Date("2026-12-31T23:00:00Z"))).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("plans", () => {
  it("pro's budget leaves margin inside $20, and a paid submission covers its agent work", () => {
    expect(PLANS.pro.aiBudgetUsd / 20).toBeLessThanOrEqual(0.75);
    expect(BUDGET_PER_SUBMISSION_USD).toBeLessThan(1.9);
  });
  it("pro counts only while paid up; old accounts are on free", () => {
    const now = new Date("2026-11-01T00:00:00Z");
    expect(planOf("pro", "2026-11-20T00:00:00Z", now).id).toBe("pro");
    expect(planOf("pro", "2026-10-20T00:00:00Z", now).id).toBe("free");
    expect(planOf("pro", null, now).id).toBe("free");
    expect(planOf("free", null, now).id).toBe("free");
    expect(planOf(null).id).toBe("free");
  });
});

describe("prices by country", () => {
  it("rounds converted prices like a price tag", () => {
    expect(friendlyAmount(1.86)).toBe("1.90");
    expect(friendlyAmount(21.58)).toBe("22.00");
    expect(friendlyAmount(241.5)).toBe("240.00");
    expect(friendlyAmount(7960)).toBe("8000.00");
    expect(friendlyAmount(10917)).toBe("11000.00");
  });
  it("uses the refreshed amounts when they're passed in", () => {
    expect(pricingFor("GH", { GHS: "92.00" })).toMatchObject({ amount: "92.00", label: "GH₵92 for 5 submissions" });
  });
  it("sells africa a pack of 5 submissions for ₦10,000 or its equivalent", () => {
    expect(pricingFor("NG")).toMatchObject({ model: "pack", currency: "NGN", amount: "10000.00", size: 5, label: "₦10,000 for 5 submissions", each: "₦2,000" });
    expect(pricingFor("ke")).toMatchObject({ model: "pack", currency: "KES", label: "KSh 960 for 5 submissions" });
    expect(pricingFor("SN")).toMatchObject({ model: "pack", currency: "XOF" });
    expect(pricingFor("ZA")).toMatchObject({ model: "pack", currency: "USD", amount: "7.60", each: "$1.52" });
  });
  it("gives everyone else 3 free applications, then $20 a month", () => {
    expect(pricingFor("US")).toMatchObject({ model: "subscription", amount: "20.00", free: 3 });
    expect(pricingFor("GB")).toMatchObject({ model: "subscription" });
    expect(pricingFor(null)).toMatchObject({ model: "subscription" });
  });
});
