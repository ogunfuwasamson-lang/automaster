import { describe, expect, it } from "vitest";
import { angles, copy, dueStep, emailNudge, pickNudge, type NudgeCtx } from "@/lib/nudge-rules";
import { DEFAULT_POLICY, ANGLES } from "@/lib/credit-policy";

const pack: NudgeCtx = { model: "pack", price: "₦10,000 for 5 submissions", programs: 12, essays: 4, ready: 1, nearest: { school: "University of Leeds, UK", days: 30 }, freeLeft: null };
const sub: NudgeCtx = { ...pack, model: "subscription", price: "$20 a month", freeLeft: 1 };

describe("nudges", () => {
  it("only offers angles that are true for the applicant", () => {
    expect(angles({ ...pack, nearest: null, ready: 0, programs: 0 })).toEqual(["handsoff", "funding", "value"]);
    expect(angles(pack)).toContain("deadline");
    expect(angles(pack)).not.toContain("freeleft");
    expect(angles(sub)).toContain("freeleft");
  });
  it("rotates the angle day by day", () => {
    const seen = new Set(Array.from({ length: 10 }, (_, d) => pickNudge(pack, 7, d)!.angle));
    expect(seen.size).toBeGreaterThan(3);
  });
  it("a deadline inside two weeks always leads, unless the operator switched it off", () => {
    const soon = { ...pack, nearest: { school: "UCL", days: 5 } };
    for (let d = 0; d < 5; d++) expect(pickNudge(soon, 1, d)!.angle).toBe("deadline");
    expect(pickNudge(soon, 1, 0, { deadline: { on: false, headline: "", body: "", cta: "" } })!.angle).not.toBe("deadline");
  });
  it("is null when every angle is off", () => {
    const off = Object.fromEntries(ANGLES.map((a) => [a, { on: false, headline: "", body: "", cta: "" }]));
    expect(pickNudge(pack, 1, 1, off)).toBeNull();
  });
  it("the operator's wording wins, with placeholders filled", () => {
    const n = copy("deadline", pack, { prices: true }, { deadline: { on: true, headline: "{school}: {days} days left", body: "", cta: "Do it" } });
    expect(n.headline).toBe("University of Leeds: 30 days left");
    expect(n.cta).toBe("Do it");
    expect(n.body).toMatch(/Portals/);
  });
  it("emails never carry a price; the app does", () => {
    for (let s = 0; s < 5; s++) {
      const n = emailNudge(pack, s)!;
      expect(`${n.headline} ${n.body} ${n.cta}`).not.toMatch(/₦|\$|10,000/);
    }
    expect(copy("value", pack).body).toContain("₦10,000");
  });
  it("sends one email step at a time, spaced out", () => {
    const days = DEFAULT_POLICY.nudges.emailDays;
    const now = Date.now();
    expect(dueStep(days, 0, [], null, now)).toBeNull();
    expect(dueStep(days, 1, [], null, now)).toBe(0);
    expect(dueStep(days, 30, [0], now - 86_400_000, now)).toBeNull(); // too soon after the last
    expect(dueStep(days, 30, [0], now - 3 * 86_400_000, now)).toBe(1);
    expect(dueStep(days, 30, [0, 1, 2, 3, 4], null, now)).toBeNull();
  });
});
