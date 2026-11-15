import { describe, expect, it } from "vitest";
import { ORIGINS, fitsFor, origin, usLine } from "@/content/countries";
import { LOCAL, LANGS } from "@/content/i18n";

const status = (slug: string, award: string) => fitsFor(origin(slug)!).find((f) => f.name.startsWith(award))?.status;

describe("home-country pages", () => {
  it("has one page per country", () => {
    const slugs = ORIGINS.map((o) => o.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(ORIGINS.map((o) => o.iso)).size).toBe(ORIGINS.length);
  });
  it("follows each award's own nationality rules", () => {
    expect(status("united-kingdom", "Gates Cambridge")).toBe("no");
    expect(status("united-kingdom", "Chevening")).toBe("no");
    expect(status("united-states", "Fulbright")).toBe("no");
    expect(status("japan", "MEXT")).toBe("no");
    expect(status("germany", "DAAD")).toBe("no");
    expect(status("united-states", "Gates Cambridge")).toBe("open");
    expect(status("germany", "JJ/WBGSP")).toBe("no");
    expect(status("nigeria", "JJ/WBGSP")).toBe("open");
  });
  it("gives every high-income outbound country a home route", () => {
    for (const o of ORIGINS.filter((x) => x.outbound)) {
      expect(o.highIncome).toBe(true);
      expect((o.local?.length ?? 0) + (o.fundAbroad ? 1 : 0)).toBeGreaterThan(0);
    }
    expect(usLine(origin("united-states")!)).toMatch(/don't need a student visa/);
  });
});

describe("translated guides", () => {
  it("have unique slugs and related links that exist", () => {
    for (const lang of LANGS) {
      const slugs = LOCAL[lang].map((g) => g.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      for (const g of LOCAL[lang]) {
        expect(g.lang).toBe(lang);
        for (const r of g.related ?? []) expect(slugs).toContain(r);
      }
    }
  });
});
