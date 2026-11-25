// the four kinds of stop on signed applications in nov 2026, as pure checks: a site's password rules (hkust), a
// "page not found" taken for the application site (arkansas), a page still drawing itself (liaison), a "Submit"
// outside the application and a button for another degree (ku leuven), and jobs parked by the credit rules shown as
// "running" for days
import { describe, expect, it } from "vitest";
import { buildPassword, DEFAULT_POLICY, fitsPolicy, passwordPolicy } from "@/lib/password-policy";
import { portalVerdict } from "@/lib/portal-check";
import { forThisLevel, insideApplication, isBlank, realFields } from "@/lib/cloud-engine";
import { portalSentence, runnerWaitWhy, ourSide } from "@/lib/portal-progress";
import { appWaiting } from "@/lib/waiting";

const rand = (n: number) => Math.floor(Math.random() * n);

describe("password rules", () => {
  const hkust = "Password: 12-20 characters, letters and numbers only, with at least one upper case letter, one lower case letter and one number.";
  it("reads letters-and-numbers-only with its length", () => {
    expect(passwordPolicy(hkust)).toEqual({ min: 12, max: 20, symbols: "none" });
  });
  it("reads hkust's real page: the username's rule first, the password's after it, then its error", () => {
    const page = "Create an Account Name in English (same as in identity documents) Family Name/ Surname/ Last Name Given Names/ Other Names Username (8-15 characters, at least 1 alphabet (lower case only) & 1 number) Password (12-20 characters, at least 1 upper case, 1 lower case & 1 number) Retype Password Email Address";
    const first = passwordPolicy(page)!;
    expect(first).toMatchObject({ min: 12, max: 20, symbols: "allowed" });
    for (let i = 0; i < 100; i++) expect(buildPassword(first, rand)).toMatch(/^[A-Za-z0-9]{12,20}$/);
    expect(passwordPolicy(`Error: Password must be alphanumeric. ${page}`)).toMatchObject({ min: 12, max: 20, symbols: "none" });
  });
  it("reads the rule from the site's error too", () => {
    expect(passwordPolicy("Your password must be 12-20 characters and contain letters and numbers only.")?.symbols).toBe("none");
  });
  it("reads a required symbol and a minimum", () => {
    const p = passwordPolicy("Passwords must be at least 10 characters and must contain at least one number and one special character.");
    expect(p).toMatchObject({ min: 10, symbols: "required" });
  });
  it("says nothing when the page has no rules", () => {
    expect(passwordPolicy("Create your account to start your application.")).toBeNull();
  });
  it("the old password breaks hkust's rules, a new one keeps them", () => {
    const p = passwordPolicy(hkust)!;
    expect(fitsPolicy("Eval-pass-9Q!", p)).toBe(false);
    for (let i = 0; i < 200; i++) expect(fitsPolicy(buildPassword(p, rand), p)).toBe(true);
  });
  it("the default still has upper, lower, a digit and a symbol", () => {
    for (let i = 0; i < 200; i++) expect(fitsPolicy(buildPassword(DEFAULT_POLICY, rand), DEFAULT_POLICY)).toBe(true);
  });
});

describe("finding the application site", () => {
  it("a 'page not found' served as a normal page is missing, not the application", () => {
    const html = `<html><head><title>Page Not Found | Walton College</title></head><body><h1>Page Not Found</h1><p>Whoops! We couldn't find your page. Use the search bar at the top of the page.</p><form><input type="search" name="q"></form></body></html>`;
    expect(portalVerdict("https://walton.uark.edu/apply/index.php", html).verdict).toBe("missing");
  });
  it("a sign-in page is still a sign-in page", () => {
    const html = `<html><head><title>Apply</title></head><body><h1>Sign in</h1><form><input name="email"><input type="password" name="pw"><button>Sign in</button></form><a href="/account/register">Create an account</a></body></html>`;
    expect(portalVerdict("https://apply.example.edu/account/login", html).verdict).toBe("signin");
  });
  it("a page with nothing drawn yet is blank; a short thank-you page isn't", () => {
    expect(isBlank({ body: "", allFields: [], buttons: [] })).toBe(true);
    expect(isBlank({ body: "Loading…", allFields: [], buttons: [] })).toBe(true);
    expect(isBlank({ body: "Thanks for subscribing", allFields: [], buttons: [] })).toBe(false);
  });
});

describe("a Submit that isn't the application's", () => {
  it("is outside the application until signed in, an account made or a form page filled", () => {
    expect(insideApplication({})).toBe(false);
    expect(insideApplication({ signedIn: true })).toBe(true);
    expect(insideApplication({ formPages: ["x"] })).toBe(true);
  });
  it("a newsletter box isn't a form to submit", () => {
    expect(realFields({ allFields: [{ id: "1", label: "Stay informed: your email", type: "email" }] as never })).toBe(0);
  });
  it("a master's applicant's navigator doesn't see 'Apply for a PhD degree'", () => {
    const b = [{ id: "1", label: "Apply for a PhD degree" }, { id: "2", label: "Apply for a master's degree" }, { id: "3", label: "Apply as non-Flemish degree holder" }];
    expect(forThisLevel(b, "master").map((x) => x.id)).toEqual(["2", "3"]);
    expect(forThisLevel(b, undefined)).toHaveLength(3);
  });
});

describe("parked by the credit rules", () => {
  it("a monthly limit waits for a date; a locked account needs credits", () => {
    expect(runnerWaitWhy("budget: monthly core limit reached")).toEqual({ credits: false, text: "this month's allowance for agent work is used up" });
    expect(runnerWaitWhy("budget: the agents unlock when you buy your first submission, or when 2 friends you invite finish setup").credits).toBe(true);
  });
  it("the application says so instead of 'finding the portal'", () => {
    const wait = portalSentence({ status: "packet_approved", runnerStatus: "ready", school: "Lancaster University", st: { wait: { until: "2026-12-01T00:00:00Z", why: "this month's allowance for agent work is used up" } } });
    expect(wait).toBe("Waiting until 1 December: this month's allowance for agent work is used up. The agents carry on by themselves then.");
    const credits = { status: "packet_approved", runnerStatus: "needs_you", reason: "credits", school: "Oxford" } as const;
    expect(ourSide(credits)).toBe(false);
    expect(portalSentence(credits)).toMatch(/waiting for credits/);
  });
  it("the dashboard asks for credits, and for the extension on a blocked site", () => {
    const base = { id: "a1", school: "NUS", status: "packet_approved", runnerStatus: "needs_you", fee: null } as const;
    expect(appWaiting({ ...base, reason: "credits" } as never)?.href).toBe("/credits");
    expect(appWaiting({ ...base, reason: "blocked" } as never)?.action).toBe("Add to Chrome");
  });
});
