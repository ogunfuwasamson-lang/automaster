import { describe, it, expect } from "vitest";
import { stuckBudget, stuckMark } from "@/lib/runner-guard";
import { NAV_BUDGET, VISION_BUDGET, insideForm } from "@/lib/cloud-engine";
import { autoResumeAllowed, countAutoResume, AUTO_RESUMES_PER_DAY } from "@/lib/requeue";

describe("stuck guard", () => {
  it("counts stuck stops on the same page and resets on anything else", () => {
    const a = stuckMark({}, { lastFingerprint: "page-1" }, "stuck");
    expect(a).toEqual({ stopFingerprint: "page-1", stuckRepeats: 1 });
    const b = stuckMark({ ...a }, { lastFingerprint: "page-1" }, "stuck");
    expect(b.stuckRepeats).toBe(2);
    expect(stuckMark({ ...b }, { lastFingerprint: "page-2" }, "stuck").stuckRepeats).toBe(1);
    expect(stuckMark({ ...b }, { lastFingerprint: "page-1" }, "question").stuckRepeats).toBe(0);
  });
  it("gives a full budget, then a small one, then stops", () => {
    expect(stuckBudget({})).toBe("full");
    const s = { stuckRepeats: 1, navCalls: 0, visionCalls: 0 };
    expect(stuckBudget(s)).toBe("small");
    expect(NAV_BUDGET - s.navCalls).toBeLessThanOrEqual(6);
    expect(VISION_BUDGET - s.visionCalls).toBeLessThanOrEqual(12);
    expect(stuckBudget({ stuckRepeats: 2 })).toBe("stop");
  });
});

describe("automatic restarts", () => {
  it("allows a few per application per day", () => {
    const now = new Date("2026-11-08T10:00:00Z");
    let st: { autoResumes?: { day: string; n: number } } = {};
    for (let i = 0; i < AUTO_RESUMES_PER_DAY; i++) {
      expect(autoResumeAllowed(st, now)).toBe(true);
      st = { autoResumes: countAutoResume(st, now) };
    }
    expect(autoResumeAllowed(st, now)).toBe(false);
    expect(autoResumeAllowed(st, new Date("2026-11-09T00:01:00Z"))).toBe(true);
  });
});

describe("inside a form", () => {
  it("tells an application page from a resend-link page", () => {
    const f = (label: string, type = "text") => ({ id: label, label, type, required: false }) as never;
    expect(insideForm({ fields: [f("Email", "email")] })).toBe(false);
    expect(insideForm({ fields: [f("Search", "search"), f("First name"), f("Last name")] })).toBe(false);
    expect(insideForm({ fields: [f("First name"), f("Last name"), f("Date of birth")] })).toBe(true);
  });
});

describe("security questions", () => {
  it("answers are made up per site and login, and stable", async () => {
    process.env.TOKEN_ENCRYPTION_KEY ??= "0".repeat(64);
    const { securityAnswers } = await import("@/lib/vault");
    const a = securityAnswers("pgapplication.manchester.ac.uk", "x@y.com");
    expect(a).toHaveLength(3);
    expect(new Set(a).size).toBe(3);
    expect(a.every((x) => /^[a-z0-9]{8,10}$/.test(x))).toBe(true);
    expect(securityAnswers("pgapplication.manchester.ac.uk", "X@y.com")).toEqual(a);
    expect(securityAnswers("apply.other.edu", "x@y.com")).not.toEqual(a);
  });
});
