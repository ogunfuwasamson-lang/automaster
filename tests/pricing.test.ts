import { describe, it, expect } from "vitest";
import { costOf, budgetCheck, categoryOf, monthStartUTC, nextMonthStartUTC } from "@/lib/pricing";
import { PLANS, planOf } from "@/lib/plans";

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
  it("paid budgets fit inside the dollar prices", () => {
    expect(PLANS.pro.aiBudgetUsd / 15).toBeLessThan(0.85);
    expect((PLANS.season.aiBudgetUsd * 6) / 199).toBeLessThan(0.76);
    expect(PLANS.free.aiBudgetUsd).toBeLessThan(PLANS.pro.aiBudgetUsd);
  });
  it("everyone without an active paid plan is on free", () => {
    expect(planOf("enterprise").id).toBe("free");
    expect(planOf("free").id).toBe("free");
    expect(planOf(null).id).toBe("free");
  });
  it("a paid plan counts until it lapses", () => {
    const now = new Date("2026-11-10T00:00:00Z");
    expect(planOf("pro", "2026-12-01T00:00:00Z", now).id).toBe("pro");
    expect(planOf("pro", "2026-11-01T00:00:00Z", now).id).toBe("free");
    expect(planOf("season", "2027-04-01T00:00:00Z", now).id).toBe("season");
    expect(planOf("season", null, now).id).toBe("season"); // granted by hand, no end date
    expect(planOf("pro", null, now).id).toBe("free"); // marked pro back when pro was free
  });
});
