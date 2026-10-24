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
    const p = mergeProfile(emptyProfile(), { preferences: { regions: null, locations: [], avoid: null, stem_preferred: null, max_applications: null } });
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
    expect(keys.slice(0, 5)).toEqual(["goals.study_level", "goals.fields", "preferences.regions", "goals.degree_types", "funding.need"]);
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

describe("cleanup support", () => {
  it("skipped gaps are never asked again", async () => {
    const { profileGaps: gaps, mergeProfile: merge, emptyProfile: empty } = await import("@/lib/profile");
    const p = merge(empty(), { skipped_gaps: ["preferences.max_applications", "goals.fields"] });
    const keys = gaps(p).map((g) => g.key);
    expect(keys).not.toContain("goals.fields");
    expect(keys).not.toContain("preferences.max_applications");
  });

  it("rebuild replaces content but keeps user-confirmed facts and skips", async () => {
    const { rebuildProfile, confirmFact, emptyProfile: empty, mergeProfile: merge } = await import("@/lib/profile");
    let p = merge(empty(), { work: [{ company: "A", role: "x", start: null, end: null, location: null, highlights: [] }], skipped_gaps: ["stories"] });
    p = confirmFact(p, "Trove volume", "$5M");
    p = confirmFact(p, "trove  VOLUME", "$10M"); // same topic, new answer replaces
    const r = rebuildProfile({ work: [{ company: "B", role: "y", start: null, end: null, location: null, highlights: [] }] }, p);
    expect(r.work.map((w) => w.company)).toEqual(["B"]);
    expect(r.confirmed_facts).toEqual([{ topic: "trove  VOLUME", value: "$10M" }]);
    expect(r.skipped_gaps).toEqual(["stories"]);
  });

  it("brief stays short even for a big profile", async () => {
    const { profileBrief, emptyProfile: empty } = await import("@/lib/profile");
    const p = { ...empty(), work: Array.from({ length: 15 }, (_, i) => ({ company: `C${i}`, role: "r", start: "2020", end: null, location: null, highlights: Array(10).fill("long highlight text ".repeat(5)) })) };
    expect(profileBrief(p, "fall-2027").length).toBeLessThan(2500);
    expect(profileBrief(p, "fall-2027")).toContain("fall-2027");
  });
});

describe("sortWork", () => {
  it("puts current roles first, then most recent", async () => {
    const { sortWork } = await import("@/lib/profile");
    const w = [
      { company: "Trove", start: "2020-08", end: "2022-05" },
      { company: "Finecore", start: "2026-02", end: null },
      { company: "Vendy", start: "2024-07", end: "2025-12" },
      { company: "NYSC", start: "2020-03", end: "2021-03" },
    ];
    expect(sortWork(w).map((x) => x.company)).toEqual(["Finecore", "Vendy", "Trove", "NYSC"]);
  });
});

describe("regions", () => {
  it("normalizes region words", async () => {
    const { normalizeRegions } = await import("@/lib/profile");
    expect(normalizeRegions(["USA", "the UK", "Germany", "Asia", "latin america", "mars"])).toEqual(["us", "uk", "europe", "asia", "latin_america"]);
  });
  it("asks for regions and degree types early, in any field", async () => {
    const { profileGaps, emptyProfile } = await import("@/lib/profile");
    const keys = profileGaps(emptyProfile()).map((g) => g.key);
    expect(keys.slice(0, 4)).toEqual(["goals.study_level", "goals.fields", "preferences.regions", "goals.degree_types"]);
    expect(JSON.stringify(profileGaps(emptyProfile()))).not.toMatch(/finance|fintech/);
  });
});

describe("study levels", () => {
  it("asks level-appropriate questions", async () => {
    const { profileGaps, emptyProfile, mergeProfile } = await import("@/lib/profile");
    const base = emptyProfile();
    const ug = mergeProfile(base, { goals: { ...base.goals, study_level: "undergraduate" } });
    const phd = mergeProfile(base, { goals: { ...base.goals, study_level: "phd" } });
    const ask = (p: typeof base, key: string) => profileGaps(p).find((g) => g.key === key)?.ask ?? "";
    expect(ask(ug, "goals.gmat_gre_plan")).toContain("SAT/ACT");
    expect(ask(ug, "education")).toMatch(/WAEC|A-levels|IB/);
    expect(profileGaps(phd).map((g) => g.key)).toContain("goals.research_interests");
    expect(profileGaps(ug).map((g) => g.key)).not.toContain("goals.research_interests");
    expect(ask(phd, "goals.gmat_gre_plan")).toContain("GRE");
  });
  it("parses level from the wire", async () => {
    const { fromWire } = await import("@/lib/profile");
    const p = fromWire({ facts: [{ field: "goals.study_level", value: "PhD" }], lists: [{ field: "goals.research_interests", values: ["fintech adoption"] }], education: [], work: [], tests: [], stories: [] });
    expect(p.goals?.study_level).toBe("phd");
    expect(p.goals?.research_interests).toEqual(["fintech adoption"]);
  });
});
