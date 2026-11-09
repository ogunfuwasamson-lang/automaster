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

describe("dates in the page's format", () => {
  it("follows a spelled format or an example date", async () => {
    const { dateAs } = await import("@/lib/cloud-engine");
    expect(dateAs("1990-05-14", "Example date: 12/31/2000")).toBe("05/14/1990");
    expect(dateAs("1990-05-14", "e.g. 31/12/2000")).toBe("14/05/1990");
    expect(dateAs("1990-05-14", "Date of birth (DD-MM-YYYY)")).toBe("14-05-1990");
    expect(dateAs("1990-05-14", "mm/dd/yyyy")).toBe("05/14/1990");
    expect(dateAs("1990-05-14", "Date of birth")).toBe("1990-05-14");
  });
});

describe("peoplesoft dates", () => {
  it("are month first by default", async () => {
    const { dateAs } = await import("@/lib/cloud-engine");
    expect(dateAs("1993-06-11", "Date of Birth https://pgapplication.manchester.ac.uk/psc/apply/EMPLOYEE/SA/c/X.GBL")).toBe("06/11/1993");
  });
});

import { USERNAME_TAKEN, withNumber } from "@/lib/cloud-engine";
describe("a taken username on a sign-up form", () => {
  it("recognises the portal saying so, but not a registered email", () => {
    expect(USERNAME_TAKEN.test("This eID is already taken. Please choose another.")).toBe(true);
    expect(USERNAME_TAKEN.test("Username not available")).toBe(true);
    expect(USERNAME_TAKEN.test("That user name already exists")).toBe(true);
    expect(USERNAME_TAKEN.test("This email address is already registered")).toBe(false);
    expect(USERNAME_TAKEN.test("Password must be at least 10 characters")).toBe(false);
  });
  it("adds a number before the last name", () => {
    expect(withNumber("samson.ogunfuwa", 2)).toBe("samson2.ogunfuwa");
    expect(withNumber("samson2.ogunfuwa", 3)).toBe("samson3.ogunfuwa");
    expect(withNumber("samsono", 2)).toBe("samsono2");
  });
});

import { isBlockPage, DEAD_END } from "@/lib/cloud-engine";
describe("pages the agents can't work on", () => {
  it("knows cloudflare's security check (leicester)", () => {
    expect(isBlockPage({ title: "Just a moment...", body: "" })).toBe(true);
    expect(isBlockPage({ title: "le.ac.uk", body: "le.ac.uk Performing security verification This website uses a security service to protect against malicious bots." })).toBe(true);
    expect(isBlockPage({ title: "Management MSc | University of Leicester", body: "Apply now. Entry requirements." })).toBe(false);
  });
  it("knows a page that ended the session (manchester peoplesoft)", () => {
    expect(DEAD_END.test("New Window Personalize Page An error has occurred that has stopped this transaction from continuing.")).toBe(true);
    expect(DEAD_END.test("Your session has expired. Please sign in again.")).toBe(true);
    expect(DEAD_END.test("Personal details. Date of birth.")).toBe(false);
  });
});

import { classify } from "@/lib/cloud-engine";
it("treats slate's 'Error generating captcha token' as a bot check (bu, brandeis)", () => {
  const snap = { confirmation: false, captcha: false, payment: false, allFields: [{ id: "a", type: "email", label: "Email" }], fields: [], buttons: [], body: "Register. Error generating captcha token.", errors: [] } as unknown as Parameters<typeof classify>[0];
  expect(classify(snap)).toBe("captcha");
});

import { IDP_HOST } from "@/lib/cloud-engine";
it("knows other companies' sign-in and recovery hosts (hec montréal → microsoft)", () => {
  for (const h of ["login.microsoftonline.com", "account.live.com", "accounts.google.com", "appleid.apple.com", "dev-123.okta.com"]) expect(IDP_HOST.test(h)).toBe(true);
  for (const h of ["enligne.hec.ca", "future.mcgill.ca", "grad.bu.edu", "utdcomet.my.site.com"]) expect(IDP_HOST.test(h)).toBe(false);
});

import { isSecAnswer } from "@/lib/cloud-engine";
import { notForApplicant } from "@/lib/portal-questions";
describe("security answers (calgary eID)", () => {
  it("are answer boxes even when they name the question", () => {
    expect(isSecAnswer("Your answer Enter your answer to question 3")).toBe(true);
    expect(isSecAnswer("Answer 1 *")).toBe(true);
    expect(isSecAnswer("Security question 1")).toBe(false);
  });
  it("never reach the applicant as questions, nor do placeholders", () => {
    expect(notForApplicant("Your answer Enter your answer to question 2")).toBe(true);
    expect(notForApplicant("Type your answer")).toBe(true);
    expect(notForApplicant("Password recovery question 1")).toBe(true);
    expect(notForApplicant("Have you previously applied to this university?")).toBe(false);
  });
});

import { LOGIN_REFUSED } from "@/lib/cloud-engine";
describe("refused sign-in", () => {
  it("knows the ways portals say no", () => {
    for (const t of ["Unknown user ID or password", "Invalid username or password.", "The password does not match", "Identifiant inconnu", "We couldn't sign you in: email not recognised"])
      expect(LOGIN_REFUSED.test(t), t).toBe(true);
    for (const t of ["Sign in to your account", "Forgot your user ID?", "Unknown"]) expect(LOGIN_REFUSED.test(t), t).toBe(false);
  });
});

import { olderThan } from "@/lib/extension";
describe("extension version", () => {
  it("compares versions by number, not text", () => {
    expect(olderThan("1.2.9", "1.3.0")).toBe(true);
    expect(olderThan("1.2.10", "1.2.9")).toBe(false);
    expect(olderThan("1.3.0", "1.3.0")).toBe(false);
    expect(olderThan(null, "1.3.0")).toBe(false);
  });
});
