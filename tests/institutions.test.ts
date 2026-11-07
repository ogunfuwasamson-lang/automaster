import { describe, it, expect, vi, beforeEach } from "vitest";

// a tiny in-memory stand-in for the supabase query builder, enough for findInstitution
type Row = Record<string, unknown>;
let rows: Row[] = [];
vi.mock("@/lib/supabase/admin", () => ({
  admin: () => ({
    from: () => {
      let out = [...rows];
      const q = {
        select: () => q,
        eq: (k: string, v: unknown) => ((out = out.filter((r) => r[k] === v)), q),
        ilike: (k: string, v: string) => ((out = out.filter((r) => String(r[k]).toLowerCase() === v.replace(/\\(.)/g, "$1").toLowerCase())), q),
        contains: (k: string, v: string[]) => ((out = out.filter((r) => v.every((x) => (r[k] as string[]).includes(x)))), q),
        limit: () => Promise.resolve({ data: out }),
      };
      return q;
    },
  }),
}));

import { domainCandidates, findInstitution, isDefunct, registryBrief, type Institution } from "@/lib/institutions";

const inst = (o: Partial<Institution>): Institution => ({
  id: o.registry_id ?? "x", country: "US", registry: "ipeds", registry_id: "1", name: "X", aliases: [], region: null, city: null,
  type: null, control: null, highest_award: null, status: "active", recognition: null, website: null, domain: null,
  admissions_url: null, financial_aid_url: null, application_url: null, net_price_url: null, international_url: null,
  school_id: null, checked_at: "2026-11-07T00:00:00Z", ...o,
});

describe("domainCandidates", () => {
  it("walks up from the host, without www", () => {
    expect(domainCandidates("https://www.gsb.stanford.edu/programs/msx")).toEqual(["gsb.stanford.edu", "stanford.edu"]);
    expect(domainCandidates("mit.edu")).toEqual(["mit.edu"]);
  });
  it("never returns a bare public suffix", () => {
    expect(domainCandidates("https://www.lse.ac.uk/study")).toEqual(["lse.ac.uk"]);
    expect(domainCandidates("https://unilag.edu.ng")).toEqual(["unilag.edu.ng"]);
  });
  it("ignores junk", () => {
    expect(domainCandidates("")).toEqual([]);
    expect(domainCandidates(null)).toEqual([]);
    expect(domainCandidates("http://10.0.0.1/x")).toEqual([]);
    expect(domainCandidates("localhost")).toEqual([]);
  });
});

describe("findInstitution", () => {
  beforeEach(() => {
    rows = [
      inst({ registry_id: "243744", name: "Stanford University", domain: "stanford.edu", website: "https://www.stanford.edu/" }),
      inst({ registry_id: "100", name: "Old College", domain: "oldcollege.edu", status: "closed" }),
      inst({ registry_id: "101", name: "Old College of Arts", domain: "oldcollege.edu" }),
      inst({ registry_id: "200", name: "Massachusetts Institute of Technology", aliases: ["MIT"], domain: "mit.edu" }),
    ];
  });
  it("matches a program page to its school by domain", async () => {
    expect((await findInstitution({ name: "Stanford GSB", url: "https://www.gsb.stanford.edu/x" }))?.registry_id).toBe("243744");
  });
  it("prefers the open institution on a shared domain", async () => {
    expect((await findInstitution({ name: "Old College", url: "https://oldcollege.edu" }))?.registry_id).toBe("101");
  });
  it("falls back to the official name, then aliases", async () => {
    expect((await findInstitution({ name: "stanford university" }))?.registry_id).toBe("243744");
    expect((await findInstitution({ name: "MIT" }))).toBeNull(); // too short to match by name
    rows.push(inst({ registry_id: "300", name: "University of Lagos", aliases: ["UNILAG"] }));
    expect((await findInstitution({ name: "UNILAG" }))?.registry_id).toBe("300");
  });
  it("returns null when nothing matches", async () => {
    expect(await findInstitution({ name: "Nowhere University", url: "https://nowhere.example" })).toBeNull();
  });
});

describe("registry brief", () => {
  it("lists the official pages and flags closed schools", () => {
    const i = inst({ name: "Stanford University", admissions_url: "https://admission.stanford.edu", status: "active", recognition: "Title IV participating (IPEDS)" });
    const b = registryBrief(i);
    expect(b).toContain("IPEDS 1");
    expect(b).toContain("admissions: https://admission.stanford.edu");
    expect(b).not.toContain("net price");
    expect(isDefunct(i)).toBe(false);
    expect(isDefunct(inst({ status: "merged" }))).toBe(true);
    expect(isDefunct(null)).toBe(false);
  });
});
