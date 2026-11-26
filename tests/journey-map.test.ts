import { describe, it, expect } from "vitest";
import { journeyMap, tickKey, type MapApp } from "@/lib/journey-map";
import { visaSteps, arrivalSteps } from "@/lib/journey-steps";

const app = (o: Partial<MapApp> = {}): MapApp => ({ id: "a1", school: "University of Toronto", country: "Canada", status: "shortlisted", verified: false, aid: 0, acceptBy: null, scholarshipsChecked: false, ...o });

describe("the journey map", () => {
  it("starts at the profile for a new applicant", () => {
    const m = journeyMap({ hasCv: false, basicsMissing: 3, apps: [], ticks: new Set() });
    expect(m.stages).toHaveLength(10);
    expect(m.current?.id).toBe("profile");
    expect(m.done).toBe(0);
  });

  it("moves to admitted, and asks to confirm an admission nothing backs yet", () => {
    const m = journeyMap({ hasCv: true, basicsMissing: 0, apps: [app({ status: "admitted" })], ticks: new Set() });
    expect(m.current?.id).toBe("admitted");
    expect(m.pendingAdmission?.id).toBe("a1");
    expect(m.current?.href).toBe("/applications/a1#admission");
    expect(m.stages.find((s) => s.id === "visa")?.state).toBe("todo");
  });

  it("opens funding and the visa steps for the destination's country once confirmed", () => {
    const m = journeyMap({ hasCv: true, basicsMissing: 0, apps: [app({ status: "admitted", verified: true, scholarshipsChecked: true })], ticks: new Set() });
    expect(m.destination?.id).toBe("a1");
    expect(m.current?.id).toBe("funding");
    const funding = m.stages.find((s) => s.id === "funding")!;
    expect(funding.steps?.find((x) => x.id === "plan")).toMatchObject({ done: true, auto: true });
    expect(m.stages.find((s) => s.id === "visa")?.what).toBe("Canadian study permit");
  });

  it("an admission from before Ivyward counts the stages before it as done", () => {
    const m = journeyMap({ hasCv: false, basicsMissing: 2, apps: [app({ status: "admitted", verified: true })], ticks: new Set() });
    expect(m.stages.slice(0, 5).every((s) => s.state === "done")).toBe(true);
  });

  it("ticks move the journey on, to the first day", () => {
    const ticks = new Set([tickKey("a1", "funding", "accept"), tickKey("a1", "visa", "granted")]);
    const m = journeyMap({ hasCv: true, basicsMissing: 0, apps: [app({ status: "accepted", verified: true })], ticks });
    expect(m.current?.id).toBe("fees");
  });

  it("goes with the school they accepted, else the best-funded confirmed admission", () => {
    const apps = [app({ id: "a", status: "admitted", verified: true, aid: 5000 }), app({ id: "b", status: "admitted", verified: true, aid: 20000, school: "McGill University" })];
    expect(journeyMap({ hasCv: true, basicsMissing: 0, apps, ticks: new Set() }).destination?.id).toBe("b");
    expect(journeyMap({ hasCv: true, basicsMissing: 0, apps: [{ ...apps[0], status: "accepted" }, apps[1]], ticks: new Set() }).destination?.id).toBe("a");
  });

  it("names each country's visa and its arrival steps", () => {
    expect(visaSteps("United Kingdom").name).toBe("UK Student visa");
    expect(visaSteps("United States").steps[0].label).toMatch(/I-20/);
    expect(visaSteps("Narnia").name).toBe("Student visa");
    expect(arrivalSteps("China").some((s) => /30 days/.test(s.label))).toBe(true);
  });
});
