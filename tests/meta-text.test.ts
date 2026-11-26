import { describe, it, expect } from "vitest";
import { metaDescription } from "@/lib/meta-text";

describe("meta descriptions", () => {
  it("keeps short ones, and cuts long ones to whole sentences or a clause, under 160", () => {
    expect(metaDescription("A short one.")).toBe("A short one.");
    const two = "Universities and visa officers ask about gaps in your history. How to explain a gap year, unemployment or a career change in a statement of purpose, with examples that work.";
    // a first sentence too short to stand alone is kept, and the next cut at a clause
    expect(metaDescription(two)).toBe("Universities and visa officers ask about gaps in your history. How to explain a gap year, unemployment or a career change in a statement of purpose…");
    const long = "Which countries and universities take students in January 2027, and how their deadlines work. The UK, Canada, Australia, Germany and others run a second intake, with funding that is thinner than in September.";
    expect(metaDescription(long)).toBe("Which countries and universities take students in January 2027, and how their deadlines work.");
    const one = "How graduate assistantships work: teaching, research and graduate assistant roles, what they pay, how tuition waivers work, and how international students find and apply for them at US universities in 2027.";
    const m = metaDescription(one);
    expect(m.length).toBeLessThanOrEqual(160);
    expect(m.endsWith("…")).toBe(true);
    expect(m).toMatch(/^How graduate assistantships work: teaching, research/);
  });
});
