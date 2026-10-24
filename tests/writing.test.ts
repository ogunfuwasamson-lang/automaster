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
    expect(nextStep({ round: 3, verdict: "revise", unsupportedClaims: 2, fits: false })).toBe("ready");
  });
  it("spots clichés", () => {
    expect(clichesIn("Ever since I was a child I wanted to delve into finance")).toEqual(["ever since i was a child", "delve"]);
  });
});
