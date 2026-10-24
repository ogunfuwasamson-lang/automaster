import { describe, it, expect } from "vitest";
import { screen, targetDeadline, upcomingDeadlines, daysUntil, type ProgramFactsLite } from "@/lib/fit";
import { emptyProfile, mergeProfile } from "@/lib/profile";

const today = "2026-10-24";
const me = mergeProfile(emptyProfile(), {
  goals: { study_level: "masters", fields: ["finance"], research_interests: null, degree_types: null, target_term: null, short_term_goal: null, long_term_goal: null, why_masters: null, gmat_gre_plan: "avoid" },
  funding: { need: "full", annual_budget_usd: null, application_fee_budget_usd: 800, notes: null },
  english: { route: "waiver", notes: null },
});
const good: ProgramFactsLite = {
  test_policy: "waivable",
  english_moi_waiver: "accepted",
  full_funding_realistic: "possible",
  deadlines: [
    { round: "R1", date: "2026-12-01", funding_priority: "yes", notes: "" },
    { round: "R2", date: "2027-02-01", funding_priority: "no", notes: "" },
  ],
};

describe("screen", () => {
  it("shortlists a clean match", () => {
    expect(screen(me, good, today)).toEqual({ verdict: "shortlisted", reasons: [] });
  });
  it("drops test-required programs when they want test-optional", () => {
    expect(screen(me, { ...good, test_policy: "required" }, today).verdict).toBe("dropped");
  });
  it("drops programs whose deadlines all passed", () => {
    const old = { ...good, deadlines: [{ round: "R1", date: "2026-10-01", funding_priority: "yes" as const, notes: "" }] };
    expect(screen(me, old, today).verdict).toBe("dropped");
  });
  it("funding never blocks the shortlist (admissions first)", () => {
    expect(screen(me, { ...good, full_funding_realistic: "rare" }, today).verdict).toBe("shortlisted");
    expect(screen(me, { ...good, full_funding_realistic: "unknown" }, today).verdict).toBe("shortlisted");
  });
  it("holds back for a check when english waiver isn't accepted or deadlines are unknown", () => {
    expect(screen(me, { ...good, english_moi_waiver: "not_accepted" }, today).verdict).toBe("researching");
    expect(screen(me, { ...good, deadlines: [] }, today).verdict).toBe("researching");
  });
  it("an english test on file makes the waiver question moot", () => {
    const withTest = mergeProfile(me, { tests: [{ name: "IELTS", status: "booked", score: null, date: null }] });
    expect(screen(withTest, { ...good, english_moi_waiver: "not_accepted" }, today).verdict).toBe("shortlisted");
  });
});

describe("deadlines", () => {
  it("prefers the upcoming funding round", () => {
    expect(targetDeadline(good.deadlines, today)?.round).toBe("R1");
    expect(targetDeadline(good.deadlines, "2026-12-02")?.round).toBe("R2");
    expect(targetDeadline(good.deadlines, "2027-03-01")).toBeNull();
  });
  it("ignores malformed dates", () => {
    expect(upcomingDeadlines([{ round: "x", date: "Jan 15", funding_priority: "no", notes: "" }], today)).toEqual([]);
  });
  it("counts days", () => {
    expect(daysUntil("2026-11-03", today)).toBe(10);
  });
});
