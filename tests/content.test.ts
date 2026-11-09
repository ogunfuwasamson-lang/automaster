import { describe, it, expect } from "vitest";
import { GUIDES, SCHOLARSHIPS } from "@/content";
import { UNIVERSITIES } from "@/content/universities";

// the public library: what search engines and AI assistants read. broken links or titles cut off in results cost
// rankings, so they fail here
describe("guides", () => {
  const slugs = new Set(GUIDES.map((g) => g.slug));
  it("have unique slugs", () => {
    expect(slugs.size).toBe(GUIDES.length);
  });
  it("link only to pages that exist", () => {
    const sch = new Set([...SCHOLARSHIPS.map((x) => `scholarships/${x.slug}`), ...UNIVERSITIES.map((u) => `universities/${u.slug}`)]);
    const bad = GUIDES.flatMap((g) => (g.related ?? []).filter((r) => !slugs.has(r) && !sch.has(r)).map((r) => `${g.slug} -> ${r}`));
    expect(bad).toEqual([]);
    const inBody = GUIDES.flatMap((g) => [...g.body.matchAll(/\]\(\/guides\/([a-z0-9-]+)\)/g)].map((m) => m[1]).filter((x) => !slugs.has(x)).map((x) => `${g.slug} -> ${x}`));
    expect(inBody).toEqual([]);
  });
  it("fit in search results", () => {
    const long = GUIDES.filter((g) => (g.seoTitle ?? g.title).length > 60).map((g) => `${g.slug} (${(g.seoTitle ?? g.title).length})`);
    expect(long).toEqual([]);
  });
  it("answer the question up front and cite sources", () => {
    for (const g of GUIDES) {
      expect(g.answer.length, g.slug).toBeGreaterThan(120);
      expect(g.faq.length, g.slug).toBeGreaterThan(0);
      expect(g.sources.length, g.slug).toBeGreaterThan(0);
    }
  });
});
