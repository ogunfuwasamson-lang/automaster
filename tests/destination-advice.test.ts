import { describe, it, expect } from "vitest";
import { adviceFor, destinationOptions, type Want } from "@/lib/destination-advice";
import type { PublicProgramme } from "@/lib/programme-pages";

const prog = (o: Partial<PublicProgramme>): PublicProgramme => ({ id: Math.random().toString(36).slice(2), name: "MPH Public Health", school: "A University", country: null, region: "us", level: "masters", degree: "MPH", url: null, tuition: null, testPolicy: "not_required", moi: null, funding: "possible", deadlines: [], checked: null, ...o });
const want = (o: Partial<Want> = {}): Want => ({ level: "masters", fields: ["Public Health"], regions: ["uk", "europe"], fundingNeed: "full", gre: false, ...o });

const library: PublicProgramme[] = [
  ...Array.from({ length: 4 }, () => prog({ region: "us", funding: "likely" })),
  ...Array.from({ length: 2 }, () => prog({ region: "canada", funding: "possible" })),
  prog({ region: "uk", funding: "rare" }),
  prog({ region: "uk", funding: "rare" }),
  prog({ region: "europe", funding: "rare" }),
  prog({ region: "us", funding: "likely", testPolicy: "required" }),
  prog({ region: "us", name: "MSc Computer Science", degree: "MSc", funding: "likely" }),
];

describe("where to apply", () => {
  it("suggests a place with clearly more funded programmes in their field", () => {
    const a = adviceFor(want(), destinationOptions(want(), library));
    expect(a?.add.map((o) => o.region)).toContain("us");
    expect(a?.text).toMatch(/fully funded master's in Public Health/);
    expect(a?.text).toBe("You picked the UK and Europe. For a fully funded master's in Public Health, Ivyward's checked list has 4 programmes in the US and 2 in Canada where full funding is realistic, against 0 in your picks. Add the US and Canada to your search?");
    expect(a?.text).toMatch(/Add .*the US.* to your search\?$/);
  });

  it("leaves out programmes that need a GRE they won't take, and other fields", () => {
    const us = destinationOptions(want(), library).find((o) => o.region === "us")!;
    expect(us.funded).toBe(4);
    expect(destinationOptions(want({ gre: true }), library).find((o) => o.region === "us")!.funded).toBe(5);
  });

  it("says nothing when their picks are as good, or there's nothing to go on", () => {
    expect(adviceFor(want({ regions: ["us", "uk"] }), destinationOptions(want({ regions: ["us", "uk"] }), library))).toBeNull();
    expect(adviceFor(want(), destinationOptions(want({ fields: [] }), library))).toBeNull();
    expect(adviceFor(want({ regions: [] }), destinationOptions(want(), library))).toBeNull();
  });

  it("counts every fitting programme for someone paying their own way", () => {
    const w = want({ fundingNeed: "self", regions: ["europe"] });
    const a = adviceFor(w, destinationOptions(w, library));
    expect(a?.text).toMatch(/programmes? that fit you|that fit you/);
  });

  it("names a scholarship open to them in the suggested place", () => {
    const a = adviceFor(want(), destinationOptions(want(), library, (r) => (r === "us" ? ["Fulbright Foreign Student Program"] : [])));
    expect(a?.text).toMatch(/Fulbright Foreign Student Program is also open to you there/);
  });
});
