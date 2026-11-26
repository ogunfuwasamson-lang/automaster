import { describe, it, expect } from "vitest";
import { journeyMap, tickKey, type MapApp } from "@/lib/journey-map";
import { visaSteps, arrivalSteps } from "@/lib/journey-steps";

const app = (o: Partial<MapApp> = {}): MapApp => ({ id: "a1", school: "University of Toronto", programme: "MSc Data Science", country: "Canada", status: "shortlisted", runner: null, deadline: null, verified: false, aid: 0, acceptBy: null, scholarshipsChecked: false, ...o });

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
    expect(m.stages.find((s) => s.id === "visa")?.title).toBe("Canadian study permit");
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

  it("lists the applicant's own schools at each stop, what needs them first", () => {
    const apps = [
      app({ id: "s1", status: "submitted", school: "McGill University" }),
      app({ id: "s2", status: "interview", school: "University of Ottawa" }),
      app({ id: "s3", status: "rejected", school: "Queen's University" }),
      app({ id: "p1", status: "ready_for_review", school: "York University" }),
      app({ id: "p2", status: "packet_approved", runner: "running", school: "Dalhousie University" }),
      app({ id: "a1", status: "admitted", verified: false, school: "University of Toronto" }),
    ];
    const m = journeyMap({ hasCv: true, hasTranscript: false, basicsMissing: 0, apps, ticks: new Set() });
    const submitted = m.stages.find((s) => s.id === "submitted")!;
    expect(submitted.items.map((x) => x.status)).toEqual(["Interview", "Waiting for a decision", "Not admitted"]);
    expect(submitted.summary).toMatch(/2 applications waiting for a decision, 1 needing you. 1 turned down/);
    const apply = m.stages.find((s) => s.id === "apply")!;
    expect(apply.items[0]).toMatchObject({ title: "York University", status: "Ready for you to sign", href: "/applications/p1#sign" });
    expect(apply.attention).toBe(1);
    const admitted = m.stages.find((s) => s.id === "admitted")!;
    expect(admitted.items[0]).toMatchObject({ status: "Confirm it with the letter", href: "/applications/a1#admission" });
    expect(m.stages.find((s) => s.id === "profile")!.items.find((x) => x.id === "transcript")?.status).toBe("Missing");
  });

  it("names each country's visa and its arrival steps", () => {
    expect(visaSteps("United Kingdom").name).toBe("UK Student visa");
    expect(visaSteps("United States").steps[0].label).toMatch(/I-20/);
    expect(visaSteps("Narnia").name).toBe("Student visa");
    expect(arrivalSteps("China").some((s) => /30 days/.test(s.label))).toBe(true);
  });
});

describe("the map and the US suspension", () => {
  it("flags US schools for a Nigerian applicant, and the visa stop when the US is where they're going", () => {
    const apps = [app({ id: "u1", country: "United States", school: "Boston University" }), app({ id: "u2", country: "United States", status: "preparing", school: "Tufts University" }), app({ id: "c1" })];
    const m = journeyMap({ hasCv: true, basicsMissing: 0, apps, ticks: new Set(), citizenship: "Nigerian" });
    expect(m.stages.find((s) => s.id === "shortlist")!.summary).toMatch(/One is in the US, where new student visas for nationals of Nigeria are suspended/);
    expect(m.stages.find((s) => s.id === "apply")!.summary).toMatch(/One is in the US/);
    const admitted = journeyMap({ hasCv: true, basicsMissing: 0, apps: [app({ id: "u1", country: "United States", status: "admitted", verified: true })], ticks: new Set(), citizenship: "Nigeria" });
    const visa = admitted.stages.find((s) => s.id === "visa")!;
    expect(visa.items[0]).toMatchObject({ id: "us-suspension", tone: "signal" });
    expect(visa.href).toBe("/guides/us-f1-student-visa-after-admission");
    const ghana = journeyMap({ hasCv: true, basicsMissing: 0, apps, ticks: new Set(), citizenship: "Ghanaian" });
    expect(ghana.stages.find((s) => s.id === "shortlist")!.summary).not.toMatch(/US/);
  });
});
