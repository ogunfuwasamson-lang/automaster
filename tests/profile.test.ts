import { describe, it, expect } from "vitest";
import { emptyProfile, mergeProfile, profileGaps, completeness, loadProfile, WirePatch, fromWire, parseNumber, type WirePatch as W } from "@/lib/profile";
import * as z from "zod/v4";

describe("mergeProfile", () => {
  it("null never overwrites", () => {
    const a = mergeProfile(emptyProfile(), { identity: { full_name: "Samson O", citizenship: "Nigeria", country_of_residence: null, city: null } });
    const b = mergeProfile(a, { identity: { full_name: null, citizenship: null, country_of_residence: "Nigeria", city: "Lagos" } });
    expect(b.identity).toEqual({ full_name: "Samson O", citizenship: "Nigeria", country_of_residence: "Nigeria", city: "Lagos" });
  });

  it("dedupes work by company+role and merges fields", () => {
    const w = { company: "Vendy", role: "Head of BD", start: "2022", end: null, location: null, highlights: ["onboarded 2,000 SMEs"] };
    const a = mergeProfile(emptyProfile(), { work: [w] });
    const b = mergeProfile(a, { work: [{ ...w, company: "vendy ", location: "Lagos", highlights: ["onboarded 2,000 SMEs", "3x revenue"] }] });
    expect(b.work).toHaveLength(1);
    expect(b.work[0].location).toBe("Lagos");
    expect(b.work[0].highlights).toEqual(["onboarded 2,000 SMEs", "3x revenue"]);
  });

  it("empty array marks a question as answered", () => {
    const p = mergeProfile(emptyProfile(), { preferences: { locations: [], avoid: null, stem_preferred: null, max_applications: null } });
    expect(p.preferences.locations).toEqual([]);
    expect(profileGaps(p).map((g) => g.key)).not.toContain("preferences.locations");
  });

  it("tests merge by name, newest wins", () => {
    const a = mergeProfile(emptyProfile(), { tests: [{ name: "IELTS", status: "planned", score: null, date: null }] });
    const b = mergeProfile(a, { tests: [{ name: "IELTS", status: "taken", score: "7.5", date: "2026-11-02" }] });
    expect(b.tests).toEqual([{ name: "IELTS", status: "taken", score: "7.5", date: "2026-11-02" }]);
  });
});

describe("gaps", () => {
  it("empty profile starts with field choice and funding", () => {
    const keys = profileGaps(emptyProfile()).map((g) => g.key);
    expect(keys.slice(0, 2)).toEqual(["goals.fields", "funding.need"]);
    expect(completeness(emptyProfile())).toBeLessThan(10);
  });

  it("budget only asked when not fully funded", () => {
    const full = mergeProfile(emptyProfile(), { funding: { need: "full", annual_budget_usd: null, application_fee_budget_usd: null, notes: null } });
    expect(profileGaps(full).map((g) => g.key)).not.toContain("funding.annual_budget_usd");
    const partial = mergeProfile(emptyProfile(), { funding: { need: "partial", annual_budget_usd: null, application_fee_budget_usd: null, notes: null } });
    expect(profileGaps(partial).map((g) => g.key)).toContain("funding.annual_budget_usd");
  });
});

describe("loadProfile", () => {
  it("fills missing sections from old or partial rows", () => {
    const p = loadProfile({ identity: { full_name: "X" } });
    expect(p.identity.full_name).toBe("X");
    expect(p.identity.city).toBeNull();
    expect(p.work).toEqual([]);
    expect(loadProfile(null)).toEqual(emptyProfile());
  });
});

const blank: W = { facts: [], lists: [], education: [], work: [], tests: [], stories: [] };

describe("wire schema", () => {
  it("fits structured output limits: no unions, no optionals, no unsupported keywords", () => {
    const js = JSON.stringify(z.toJSONSchema(WirePatch));
    expect(js).not.toContain("anyOf");
    expect(js).not.toMatch(/"type":\[/);
    for (const bad of ["minLength", "maxLength", "pattern", "minimum", "maximum"]) expect(js).not.toContain(bad);
    // every object lists all its properties as required
    const walk = (node: unknown): void => {
      if (!node || typeof node !== "object") return;
      const o = node as Record<string, unknown>;
      if (o.type === "object" && o.properties) {
        expect(new Set(o.required as string[])).toEqual(new Set(Object.keys(o.properties as object)));
      }
      Object.values(o).forEach(walk);
    };
    walk(z.toJSONSchema(WirePatch));
  });

  it("converts facts with coercion and drops junk", () => {
    const p = fromWire({
      ...blank,
      facts: [
        { field: "funding.need", value: "Partial" },
        { field: "funding.annual_budget_usd", value: "$15,000" },
        { field: "funding.application_fee_budget_usd", value: "1.2k" },
        { field: "goals.gmat_gre_plan", value: "will take" },
        { field: "english.route", value: "maybe?" },
        { field: "preferences.stem_preferred", value: "yes" },
        { field: "identity.city", value: "  " },
      ],
      lists: [
        { field: "preferences.locations", values: [] },
        { field: "goals.fields", values: ["finance", " fintech "] },
        { field: "skills", values: ["sql"] },
      ],
    });
    expect(p.funding).toEqual({ need: "partial", annual_budget_usd: 15000, application_fee_budget_usd: 1200, notes: null });
    expect(p.goals?.gmat_gre_plan).toBe("will_take");
    expect(p.goals?.fields).toEqual(["finance", "fintech"]);
    expect(p.english).toBeUndefined();
    expect(p.identity).toBeUndefined();
    expect(p.preferences?.locations).toEqual([]);
    expect(p.preferences?.stem_preferred).toBe(true);
    expect(p.skills).toEqual(["sql"]);
    const merged = mergeProfile(emptyProfile(), p);
    expect(merged.preferences.locations).toEqual([]);
    expect(merged.identity.city).toBeNull();
  });

  it("converts list items, treating blank as null", () => {
    const p = fromWire({
      ...blank,
      education: [{ institution: "UNILAG", degree: "B.Sc", field: "Economics", country: "Nigeria", start: "2010", end: "2014", grade: "Second Class Upper", gpa: "", gpa_scale: "" }],
      work: [{ company: "Vendy", role: "Head of BD", start: "2022", end: "", location: "Lagos", highlights: ["onboarded 2,000 SMEs", ""] }, { company: "", role: "x", start: "", end: "", location: "", highlights: [] }],
    });
    expect(p.education?.[0]).toMatchObject({ institution: "UNILAG", gpa: null, grade: "Second Class Upper" });
    expect(p.work).toHaveLength(1);
    expect(p.work?.[0]).toMatchObject({ end: null, highlights: ["onboarded 2,000 SMEs"] });
  });

  it("parses money-ish numbers", () => {
    expect(parseNumber("20000")).toBe(20000);
    expect(parseNumber("$20,000 USD")).toBe(20000);
    expect(parseNumber("25k")).toBe(25000);
    expect(parseNumber("about 20k")).toBeNull();
  });
});
