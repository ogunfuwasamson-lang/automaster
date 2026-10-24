import { describe, it, expect } from "vitest";
import { wordCount, withinLimit, nextStep, clichesIn } from "@/lib/writing";

describe("writing helpers", () => {
  it("counts words", () => {
    expect(wordCount("  one two\nthree   four ")).toBe(4);
    expect(wordCount("")).toBe(0);
  });
  it("checks limits both ways", () => {
    const text = Array(500).fill("w").join(" ");
    expect(withinLimit(text, 500).ok).toBe(true);
    expect(withinLimit(text, 400).ok).toBe(false);
    expect(withinLimit(text, 1000).ok).toBe(false);
    expect(withinLimit(text, null).ok).toBe(true);
  });
  it("stops on pass, keeps going on problems, caps rounds", () => {
    expect(nextStep({ round: 1, verdict: "pass", unsupportedClaims: 0, fits: true })).toBe("ready");
    expect(nextStep({ round: 1, verdict: "pass", unsupportedClaims: 1, fits: true })).toBe("revise");
    expect(nextStep({ round: 1, verdict: "pass", unsupportedClaims: 0, fits: false })).toBe("revise");
    expect(nextStep({ round: 2, verdict: "revise", unsupportedClaims: 2, fits: false })).toBe("ready");
  });
  it("spots clichés", () => {
    expect(clichesIn("Ever since I was a child I wanted to delve into finance")).toEqual(["ever since i was a child", "delve"]);
  });
});

describe("disputed figures", () => {
  it("pulls money, percents, big numbers and team sizes out of conflict options", async () => {
    const { disputedFigures } = await import("@/lib/writing");
    expect(disputedFigures(["$5M in one year", "$10M in one year"])).toEqual(["$5m", "$10m"]);
    expect(disputedFigures(["3-person team", "5-member team"])).toEqual(["3-person", "5-member"]);
    expect(disputedFigures(["Over $700k in SQLs", "$4.5M SQLs"])).toEqual(["$700k", "$4.5m"]);
  });
  it("masks them everywhere except user-confirmed facts", async () => {
    const { maskDisputed } = await import("@/lib/writing");
    const sheet = { work: [{ highlights: ["generated $10M in volume", "grew users to 150,000"] }], confirmed_facts: [{ topic: "x", value: "$10M" }] };
    const masked = maskDisputed(sheet, ["$10m"]);
    expect(masked.work[0].highlights[0]).toBe("generated [disputed figure] in volume");
    expect(masked.work[0].highlights[1]).toBe("grew users to 150,000");
    expect(masked.confirmed_facts[0].value).toBe("$10M");
  });
  it("finds placeholders", async () => {
    const { placeholdersIn } = await import("@/lib/writing");
    expect(placeholdersIn("I want Babson because [insert specific course].")).toEqual(["[insert specific course]"]);
    expect(placeholdersIn("A clean sentence.")).toEqual([]);
  });
});
