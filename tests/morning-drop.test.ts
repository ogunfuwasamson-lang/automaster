import { describe, expect, it } from "vitest";
import { daySlot, localMorningUTC, researchAt } from "@/lib/drop";
import { cleanName, fieldScore, fieldTerms, levelOfDegree, nextDeadline, rankMatches, type LibraryProgram } from "@/lib/match-rules";

describe("morning drop", () => {
  it("puts three programmes on each morning, regions mixed", () => {
    // 4 regions x 3 picks = 12 programmes: mornings 0..3, three each
    const days: number[] = [];
    for (let slot = 0; slot < 4; slot++) for (let i = 0; i < 3; i++) days.push(daySlot(i, slot, 4));
    const per = days.reduce<Record<number, number>>((m, d) => ({ ...m, [d]: (m[d] ?? 0) + 1 }), {});
    expect(per).toEqual({ 0: 3, 1: 3, 2: 3, 3: 3 });
    // the first morning has the best pick of three different regions
    expect([0, 1, 2, 3].map((slot) => daySlot(0, slot, 4))).toEqual([0, 0, 0, 1]);
  });

  it("finds 5am in the applicant's own time zone", () => {
    const now = new Date("2026-11-14T16:00:00Z"); // 17:00 in Lagos (UTC+1), 19:00 in Istanbul (UTC+3)
    expect(localMorningUTC("Africa/Lagos", 1, 5, now).toISOString()).toBe("2026-11-15T04:00:00.000Z");
    expect(localMorningUTC("Europe/Istanbul", 1, 5, now).toISOString()).toBe("2026-11-15T02:00:00.000Z");
    expect(localMorningUTC("America/New_York", 1, 5, now).toISOString()).toBe("2026-11-15T10:00:00.000Z");
    expect(localMorningUTC("Not/AZone", 1, 5, now).toISOString()).toBe("2026-11-15T05:00:00.000Z");
  });

  it("day 1 is the next 5am: tomorrow in the evening, later today before dawn", () => {
    expect(researchAt(0, "Africa/Lagos", 0, new Date("2026-11-14T16:00:00Z"))).toBeNull();
    expect(researchAt(1, "Africa/Lagos", 0, new Date("2026-11-14T16:00:00Z"))!.toISOString()).toBe("2026-11-15T04:00:00.000Z");
    expect(researchAt(1, "Africa/Lagos", 1, new Date("2026-11-14T01:30:00Z"))!.toISOString()).toBe("2026-11-14T04:02:00.000Z");
    expect(researchAt(3, "Africa/Lagos", 2, new Date("2026-11-14T16:00:00Z"))!.toISOString()).toBe("2026-11-17T04:04:00.000Z");
  });
});

const prog = (o: Partial<Omit<LibraryProgram, "school">> & { name: string; region: string; country?: string; school?: string }): LibraryProgram => ({
  id: o.name,
  name: o.name,
  degree: o.degree ?? "MSc",
  url: null,
  kind: o.kind ?? "program",
  deadlines: o.deadlines ?? [{ date: "2027-01-15", round: "Main round" }],
  funding_signals: o.funding_signals ?? null,
  school: { name: o.school ?? `${o.name} University`, country: o.country ?? null, region: o.region, ranking_note: null },
});

describe("instant matches", () => {
  it("reads the level from free-text degrees", () => {
    expect(levelOfDegree("MSc")).toBe("masters");
    expect(levelOfDegree("Master of Science")).toBe("masters");
    expect(levelOfDegree("MBA")).toBe("masters");
    expect(levelOfDegree("Thesis master's (research-based)")).toBe("masters");
    expect(levelOfDegree("PhD")).toBe("phd");
    expect(levelOfDegree("Bachelor of Engineering (Honours)")).toBe("undergraduate");
    expect(levelOfDegree("BSc")).toBe("undergraduate");
    expect(levelOfDegree("Scholarship")).toBeNull();
  });

  it("turns fields into the words programme names use", () => {
    expect(fieldTerms(["Computer Science"])).toEqual(expect.arrayContaining(["computer", "computing", "software"]));
    expect(fieldTerms(["Data Science"])).toEqual(expect.arrayContaining(["data", "analytics"]));
    expect(fieldTerms([])).toEqual([]);
  });

  it("strips research notes from names", () => {
    expect(cleanName("Online MSc in Innovation & Entrepreneurship (recommended track; Executive MSc track also exists)")).toBe("Online MSc in Innovation & Entrepreneurship");
    expect(cleanName("ECT+ (Erasmus Mundus Master of Science, coordinated by EHU; consortium of six)")).toBe("ECT+ (Erasmus Mundus Master of Science)");
  });

  it("skips rounds that have passed", () => {
    expect(nextDeadline([{ date: "2026-11-01" }, { date: "2027-01-10", round: "R2" }], "2026-11-14")).toEqual({ date: "2027-01-10", round: "R2" });
    expect(nextDeadline([{ date: "2026-11-15" }], "2026-11-14")).toBeNull(); // too close to start
  });

  it("matches level, region and field, funded first, at most two a school", () => {
    const lib = [
      prog({ name: "MSc Data Science", region: "uk", funding_signals: { full_funding_realistic: "possible" } }),
      prog({ name: "MSc Business Analytics", region: "uk", funding_signals: { full_funding_realistic: "likely" } }),
      prog({ name: "MSc Data Science", region: "us", degree: "MS" }), // wrong region
      prog({ name: "PhD in Data Science", region: "uk", degree: "PhD" }), // wrong level
      prog({ name: "MSc Marine Biology", region: "uk" }), // wrong field
      prog({ name: "Online MSc Data Analytics", region: "uk" }), // online
      prog({ name: "MSc Data Engineering", region: "uk", deadlines: [{ date: "2026-10-01" }] }), // closed
      prog({ name: "MSc Statistics and Data", region: "uk", school: "Same U" }),
      prog({ name: "MSc Data Analytics", region: "uk", school: "Same U" }),
      prog({ name: "MSc Applied Data Science", region: "uk", school: "Same U" }),
    ];
    const out = rankMatches(lib, { level: "masters", fields: ["Data Science"], regions: ["uk"] }, "2026-11-14");
    // "Business Analytics" is only related to data science: not shown when real matches exist
    expect(out.map((m) => m.program)).toEqual(["MSc Data Science", "MSc Applied Data Science", "MSc Statistics and Data"]);
    expect(out[0].funding).toBe("funding possible");
    const mba = rankMatches([prog({ name: "Full-Time MBA", region: "us", degree: "MBA", funding_signals: { full_funding_realistic: "likely" } })], { level: "masters", fields: ["Business"], regions: ["us"] }, "2026-11-14");
    expect(mba).toHaveLength(1); // "Business" covers an MBA
    expect(fieldScore("MSc Business Analytics", ["Data Science"])).toBe(25); // related only: not shown
    expect(fieldScore("MSc Public Health", ["Public Health"])).toBeGreaterThanOrEqual(100);
    expect(fieldScore("MSc Marine Science", ["Data Science"])).toBe(0);
    expect(fieldScore("Master of Science in Nursing", ["Public Health"])).toBe(25);
  });

  it("doesn't match a field on one word it shares with another subject (25 nov 2026)", () => {
    const ag = "Thesis master's, Faculty of Agricultural and Environmental Sciences (Macdonald Campus); specific department not confirmed, environmental option likely under Natural Resource Sciences or Bieler School of Environment";
    expect(fieldScore(ag, ["Human Resource", "People Management"])).toBeLessThan(40);
    expect(fieldScore("MSc Natural Resource Sciences", ["Human Resource"])).toBeLessThan(40);
    expect(fieldScore("MSc Human Resource Management", ["Human Resource"])).toBeGreaterThanOrEqual(100);
    expect(fieldScore("MA Industrial Relations", ["Human Resource"])).toBeGreaterThanOrEqual(40);
    expect(fieldScore("MSc Organizational Behavior", ["People Management"])).toBeGreaterThanOrEqual(40);
    expect(fieldScore("MSc Public Policy", ["Public Health"])).toBeLessThan(40);
    expect(fieldScore("MSc Health Policy", ["Public Health"])).toBeGreaterThanOrEqual(40);
    expect(fieldScore("MSc Information Systems", ["Information Technology"])).toBeGreaterThanOrEqual(40); // "technology" is generic, "information" ambiguous: full phrase needed
    const lib = [prog({ name: ag, region: "canada" }), prog({ name: "MSc Human Resource Management", region: "canada", school: "Other U" })];
    expect(rankMatches(lib, { level: "masters", fields: ["Human Resource", "People Management"], regions: ["canada"] }, "2026-11-14").map((m) => m.program)).toEqual(["MSc Human Resource Management"]);
  });

  it("never shortlists a library row whose name is a research note", () => {
    const lib = [prog({ name: "Thesis master's in environment; specific department not confirmed", region: "uk" })];
    expect(rankMatches(lib, { level: "masters", fields: [], regions: ["uk"] }, "2026-11-14")).toEqual([]);
  });

  it("returns nothing rather than unrelated programmes", () => {
    const lib = [prog({ name: "MSc Marine Biology", region: "uk" })];
    expect(rankMatches(lib, { level: "masters", fields: ["Law"], regions: ["uk"] }, "2026-11-14")).toEqual([]);
    // no field named: a subject they didn't choose is never placed; a general first-year admission route is
    expect(rankMatches(lib, { level: "masters", fields: [], regions: ["uk"] }, "2026-11-14")).toEqual([]);
    const ug = [prog({ name: "Undergraduate First-Year Admission (Fall 2027)", region: "uk", degree: "Bachelor's" }), prog({ name: "Bachelor of Nursing", region: "uk", degree: "Bachelor's", school: "B U" })];
    expect(rankMatches(ug, { level: "undergraduate", fields: [], regions: ["uk"] }, "2026-11-14").map((m) => m.school)).toHaveLength(1);
  });
});
