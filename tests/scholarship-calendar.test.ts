import { describe, expect, it } from "vitest";
import { CALENDAR, phaseOf } from "@/content/scholarship-calendar";
import { SCHOLARSHIPS } from "@/content";

describe("scholarship deadline calendar", () => {
  it("links every row to a profile we have", () => {
    const slugs = new Set(SCHOLARSHIPS.map((s) => `/scholarships/${s.slug}`));
    for (const e of CALENDAR) expect(slugs.has(e.href)).toBe(true);
  });
  it("moves a published deadline to closed once it passes", () => {
    const gates = CALENDAR.find((e) => e.name.startsWith("Gates Cambridge (international"))!;
    expect(phaseOf(gates, "2026-11-15")).toBe("open");
    expect(phaseOf(gates, "2027-01-07")).toBe("closed");
    for (const e of CALENDAR.filter((x) => x.phase === "closed")) expect(e.next).toBeTruthy();
  });
});
