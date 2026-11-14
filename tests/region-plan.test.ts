import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { regionPlan } = await import("@/agents/recon");

describe("regionPlan", () => {
  const nine = ["us", "uk", "ca", "eu", "au", "asia", "me", "af", "latam"];
  it("never plans more programmes than the run's total", () => {
    for (const total of [3, 5, 12, 20]) for (let w = 1; w <= 9; w++) {
      const p = regionPlan(nine.slice(0, w), total, 0);
      expect(p.regions.length * p.perRegion).toBeLessThanOrEqual(total);
      expect(p.regions.length).toBeGreaterThan(0);
    }
  });
  it("gives each region at least 3 when the total allows", () => {
    expect(regionPlan(nine, 12, 0)).toEqual({ regions: ["us", "uk", "ca", "eu"], perRegion: 3 });
    expect(regionPlan(["us", "uk"], 12, 0)).toEqual({ regions: ["us", "uk"], perRegion: 6 });
  });
  it("takes turns through the regions on later runs", () => {
    expect(regionPlan(nine, 12, 1).regions).toEqual(["au", "asia", "me", "af"]);
    expect(regionPlan(nine, 12, 2).regions).toEqual(["latam", "us", "uk", "ca"]);
    expect(regionPlan(["us"], 12, 5)).toEqual({ regions: ["us"], perRegion: 12 });
  });
  it("handles nothing to do", () => {
    expect(regionPlan([], 12, 0)).toEqual({ regions: [], perRegion: 0 });
  });
});
