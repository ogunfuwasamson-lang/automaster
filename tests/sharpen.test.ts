import { describe, expect, it } from "vitest";
import { emptyProfile } from "@/lib/profile";
import { applySharpen, matchCriteria, sharpenQuestions, sharpenState } from "@/lib/sharpen";
import { prefScore, rankMatches, type LibraryProgram } from "@/lib/match-rules";
import { openScholarships } from "@/lib/open-scholarships";
import { todaysTask } from "@/lib/today";

const masters = () => {
  const p = emptyProfile();
  return { ...p, goals: { ...p.goals, study_level: "masters" as const } };
};

describe("sharpen your matches", () => {
  it("asks seven things of a master's applicant, five of an undergraduate", () => {
    expect(sharpenQuestions("masters").map((q) => q.key)).toEqual(["citizenship", "funding", "budget", "english", "tests", "grades", "applying"]);
    expect(sharpenQuestions("undergraduate").map((q) => q.key)).not.toContain("grades");
    expect(sharpenQuestions("undergraduate").find((q) => q.key === "tests")?.ask).toContain("SAT");
  });

  it("files each answer where the agents already look", () => {
    let p = masters();
    p = applySharpen(p, "citizenship", "Nigeria");
    p = applySharpen(p, "funding", "partial");
    p = applySharpen(p, "budget", "5to15k");
    p = applySharpen(p, "english", "waiver");
    p = applySharpen(p, "tests", "avoid");
    p = applySharpen(p, "grades", "upper_second");
    p = applySharpen(p, "applying", "this_cycle");
    expect(p.identity.citizenship).toBe("Nigeria");
    expect(p.funding).toMatchObject({ need: "partial", annual_budget_usd: 15000 });
    expect(p.english.route).toBe("waiver");
    expect(p.goals).toMatchObject({ gmat_gre_plan: "avoid", applying: "this_cycle" });
    expect(p.confirmed_facts).toContainEqual({ topic: "degree result", value: expect.stringContaining("2:1") });
    expect(sharpenState(p)).toMatchObject({ done: 7, total: 7, open: [] });
    expect(matchCriteria(p)).toEqual({ need: "partial", budget: 15000, avoidTests: true, waiver: true });
  });

  it("doesn't ask the budget of someone who needs full funding, or what's already known", () => {
    let p = applySharpen(masters(), "funding", "full");
    expect(sharpenState(p).open.map((q) => q.key)).not.toContain("budget");
    expect(sharpenState(p, "Ghana").open.map((q) => q.key)).not.toContain("citizenship"); // the passport answers it
    p = applySharpen(p, "english", "skip");
    expect(sharpenState(p).open.map((q) => q.key)).toContain("english"); // english has no skip record: asked again later
    p = applySharpen(p, "citizenship", "skip");
    expect(sharpenState(p).open.map((q) => q.key)).toContain("citizenship");
  });

  it("re-ranks by funding, budget, tests and english", () => {
    expect(prefScore({ need: "full" }, "rare", null, null)).toBeLessThan(0);
    expect(prefScore({ need: "full" }, "likely", null, null)).toBeGreaterThan(prefScore({}, "likely", null, null));
    expect(prefScore({ need: "self", budget: 15000 }, null, 40000, null)).toBe(-50);
    expect(prefScore({ need: "self", budget: 15000 }, null, 12000, null)).toBe(10);
    expect(prefScore({ waiver: true }, null, null, "accepted")).toBe(10);
    const prog = (name: string, o: Partial<LibraryProgram> = {}): LibraryProgram => ({ id: name, name, degree: "MSc", url: null, kind: "program", deadlines: [{ date: "2027-01-15" }], funding_signals: null, school: { name: `${name} U`, country: null, region: "uk", ranking_note: null }, ...o });
    const lib = [prog("MSc Finance A", { test_policy: "required" }), prog("MSc Finance B", { funding_signals: { full_funding_realistic: "rare" } }), prog("MSc Finance C", { funding_signals: { full_funding_realistic: "likely" } })];
    const plain = rankMatches(lib, { level: "masters", fields: ["Finance"], regions: ["uk"] }, "2026-11-14").map((m) => m.program);
    expect(plain).toHaveLength(3);
    const sharp = rankMatches(lib, { level: "masters", fields: ["Finance"], regions: ["uk"], need: "full", avoidTests: true }, "2026-11-14").map((m) => m.program);
    expect(sharp).toEqual(["MSc Finance C", "MSc Finance B"]); // the GRE one is gone, the rare-funding one last
  });

  it("shows the big scholarships a passport opens, in the chosen regions", () => {
    const ng = openScholarships("Nigeria", ["uk"]).map((s) => s.name);
    expect(ng).toContain("Commonwealth Master's (UK)");
    expect(ng).toContain("Mastercard Foundation Scholars");
    expect(ng).not.toContain("MEXT (Japan)"); // not a region they picked
    expect(openScholarships("Nigerian", ["uk"]).length).toBe(ng.length); // the demonym works too
    expect(openScholarships(null, ["uk"])).toEqual([]);
    expect(openScholarships("Atlantis", ["uk"])).toEqual([]);
  });

  it("comes before the form chapters in today's task", () => {
    const base = { apps: [], hasCv: true, hasTranscript: false, basicsMissing: 2, gmail: false, story: null, nextChapter: null };
    expect(todaysTask({ ...base, sharpenOpen: 4 })?.id).toBe("sharpen");
    expect(todaysTask({ ...base, sharpenOpen: 0 })?.id).toBe("basics");
    expect(todaysTask({ ...base, hasCv: false, sharpenOpen: 4 })?.id).toBe("cv");
  });
});
