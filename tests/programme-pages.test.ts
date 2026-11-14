import { describe, expect, it } from "vitest";
import { DESTINATIONS, FIELD_PAGES, allPages, answerOf, faqOf, keyFromPath, monthRows, monthsAhead, pathOf, publishable, rowsFor, statsOf, titleOf, type PublicProgramme } from "@/lib/programme-pages";

const today = "2026-11-14";
let n = 0;
const p = (o: Partial<PublicProgramme>): PublicProgramme => ({ id: String(n++), name: "MSc Business Analytics", school: `School ${n}`, country: "Canada", region: "canada", level: "masters", degree: "MSc", url: "https://x.edu", tuition: 30000, testPolicy: "not_required", moi: "accepted", funding: "possible", deadlines: ["2027-01-15"], checked: "2026-11-10", ...o });

describe("programme pages", () => {
  const lib = [
    p({}), p({ tuition: 50000, testPolicy: "required" }), p({ deadlines: ["2026-12-01"], moi: "not_accepted" }),
    p({ name: "MBA", tuition: 80000 }), p({ name: "MBA" }), p({ name: "MBA" }),
    p({ name: "PhD in Economics", level: "phd" }),
    p({ name: "MSc Finance", region: "uk", country: "United Kingdom", deadlines: ["2026-10-01"] }), // closed
  ];

  it("only makes a page with three or more open programmes behind it", () => {
    const paths = allPages(lib, today).map((x) => pathOf(x.key));
    expect(paths).toContain("/programmes/canada");
    expect(paths).toContain("/programmes/canada/business-analytics");
    expect(paths).toContain("/programmes/canada/mba");
    expect(paths).not.toContain("/programmes/canada/phd"); // one
    expect(paths).not.toContain("/programmes/uk"); // its only programme has closed
  });

  it("keeps field pages exact: business analytics isn't an MBA", () => {
    const mba = rowsFor(keyFromPath("canada", "mba")!, lib, today);
    expect(mba.map((r) => r.name)).toEqual(["MBA", "MBA", "MBA"]);
  });

  it("lists GRE-free programmes only where the GRE is a real question", () => {
    expect(rowsFor(keyFromPath("canada", "without-gre")!, lib, today)).toHaveLength(6);
    expect(rowsFor(keyFromPath("uk", "without-gre")!, [...lib, p({ region: "uk" }), p({ region: "uk" }), p({ region: "uk" })], today)).toHaveLength(0);
  });

  it("writes a quotable answer and questions from the rows", () => {
    const key = keyFromPath("canada", "business-analytics")!;
    const rows = rowsFor(key, lib, today);
    expect(rows[0].deadlines[0]).toBe("2026-12-01"); // soonest first
    expect(answerOf(key, rows, today)).toContain("3 master's programmes in Business Analytics in Canada");
    expect(answerOf(key, rows, today)).toContain("1 December 2026");
    const faq = faqOf(key, rows, today);
    expect(faq.find(([q]) => q.startsWith("Do I need the GRE"))?.[1]).toContain("2 of the 3");
    expect(titleOf(key, rows.length, today).title.length).toBeLessThanOrEqual(60);
    expect(statsOf(rows, today).fees).toMatchObject({ min: 30000, max: 50000, median: 30000 });
  });

  it("keeps every title short enough for search results", () => {
    for (const dest of DESTINATIONS) for (const field of [...FIELD_PAGES]) expect(titleOf({ dest, kind: "field", field }, 12, today).title.length, `${dest.slug}/${field.slug}`).toBeLessThanOrEqual(60);
  });

  it("groups deadlines by month", () => {
    expect(monthRows("2027-01", lib).length).toBe(6);
    expect(monthsAhead(lib, today).map((m) => m.month)).toEqual(["2027-01"]);
  });

  it("keeps doubtful names off public pages", () => {
    expect(publishable({ name: "Thesis master's, department not confirmed" })).toBe(false);
    expect(publishable({ name: "MSc Data Science" })).toBe(true);
  });
});
