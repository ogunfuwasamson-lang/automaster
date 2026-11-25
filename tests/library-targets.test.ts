import { describe, it, expect } from "vitest";
import { ENOUGH, pickTargets, type LibraryRow, type Want } from "@/lib/library-targets";

const hr: Want = { fields: ["Human Resource Management"], level: "masters", regions: ["us", "canada"] };
const cs: Want = { fields: ["Computer Science"], level: "masters", regions: ["uk"] };

describe("growing the checked list", () => {
  it("searches first for what applicants asked for, one field at a time", () => {
    const t = pickTargets([hr, hr, cs], [], 3);
    expect(t[0]).toMatchObject({ field: "Human Resource Management", level: "masters", people: 2 });
    expect(t.map((x) => x.field)).toContain("Computer Science");
    // two HR searches only once the distinct fields run out
    expect(t.filter((x) => x.field === "Human Resource Management").length).toBe(1);
  });

  it("skips a field and destination that already has enough programmes", () => {
    const rows: LibraryRow[] = Array.from({ length: ENOUGH }, (_, i) => ({ name: `MSc Computer Science ${i}`, degree: "MSc", school: `Uni ${i}`, region: "uk" }));
    const t = pickTargets([cs], rows, 5);
    expect(t.some((x) => x.field === "Computer Science" && x.region === "uk")).toBe(false);
  });

  it("counts programmes at the applicant's level only", () => {
    const rows: LibraryRow[] = Array.from({ length: ENOUGH }, (_, i) => ({ name: `BSc Computer Science ${i}`, degree: "BSc", school: `Uni ${i}`, region: "uk" }));
    const t = pickTargets([cs], rows, 1);
    expect(t[0]).toMatchObject({ field: "Computer Science", region: "uk", have: 0 });
  });

  it("falls back to common fields when applicants' choices are covered", () => {
    const t = pickTargets([], [], 10);
    expect(t).toHaveLength(10);
    expect(new Set(t.map((x) => x.field)).size).toBe(10);
  });

  it("ignores destinations it doesn't know and odd field text", () => {
    const t = pickTargets([{ fields: ["x", "Nursing"], level: null, regions: ["mars"] }], [], 30);
    expect(t.some((x) => x.region === "mars" || x.field === "x")).toBe(false);
  });
});
