import { describe, expect, it } from "vitest";
import { ourSide, portalSentence, portalStages, yourTurn } from "@/lib/portal-progress";
import { appWaiting, waitingList, type WaitApp } from "@/lib/waiting";
import { ACCEPT, levelOf, portalVerdict, wrongAudience } from "@/lib/portal-check";
import { accountUrls, platformOf } from "@/lib/portal-platforms";
import { nextSection, noteProgress, offSite, SECURITY_QA, stepOf, type EngineState } from "@/lib/cloud-engine";
import { effortToday, RUNS_PER_DAY } from "@/agents/runner";
import { keyForLabel } from "@/lib/fillsheet";

const base = { status: "packet_approved", school: "McGill University", fee: 120 };

describe("whose turn a stop is", () => {
  it("a page the agents can't get past is ours, an account to create is the applicant's", () => {
    expect(ourSide({ ...base, runnerStatus: "needs_you", reason: "stuck", note: "can't find the next step" })).toBe(true);
    expect(ourSide({ ...base, runnerStatus: "failed", reason: null, note: "x" })).toBe(true);
    expect(ourSide({ ...base, runnerStatus: "needs_you", reason: null, note: "couldn't find the portal" })).toBe(true);
    expect(ourSide({ ...base, runnerStatus: "needs_you", reason: "account", note: "create it" })).toBe(false);
    expect(yourTurn({ ...base, runnerStatus: "needs_you", reason: "payment", note: "pay" })).toBe(true);
    expect(yourTurn({ ...base, runnerStatus: "running", reason: null, note: null })).toBe(false);
  });
  it("a review hold on a page that wasn't the review page is a wrong turn, not the applicant's to check", () => {
    const note = "held before submitting: This is not a pre-submit review page for the applicant's application. It is KU Leuven's general instructions page";
    expect(ourSide({ ...base, runnerStatus: "needs_you", reason: "review", note })).toBe(true);
    expect(ourSide({ ...base, runnerStatus: "needs_you", reason: "review", note: "held before submitting: the term is Fall 2027, the packet says Summer 2027" })).toBe(false);
  });
  it("a submitted application is nobody's stop", () => {
    expect(ourSide({ ...base, status: "submitted", runnerStatus: "failed", reason: null, note: "x" })).toBe(false);
  });
});

describe("the progress line", () => {
  it("marks what's done and the one step happening now", () => {
    const st = portalStages({ ...base, runnerStatus: "running", st: { portal: { ok: true }, signedIn: true, formPages: ["a", "b"], stepOf: { at: 3, of: 7 } } });
    expect(st.map((s) => s.state)).toEqual(["done", "done", "done", "now", "next", "next", "next"]);
    expect(st[3].detail).toBe("section 3 of 7");
    expect(st[5].label).toBe("Ready to pay");
  });
  it("nothing is 'now' before the agents start, and everything is done once submitted", () => {
    expect(portalStages({ ...base, runnerStatus: "idle", st: {} }).every((s) => s.state === "next")).toBe(true);
    expect(portalStages({ ...base, status: "submitted", runnerStatus: "submitted", st: {} }).every((s) => s.state === "done")).toBe(true);
  });
  it("a free application ends in a final check, not a payment", () => {
    expect(portalStages({ ...base, fee: 0, runnerStatus: "running", st: {} })[5].label).toBe("Final check");
  });
});

describe("the one sentence", () => {
  it("our side: no jargon, nothing to do", () => {
    const s = portalSentence({ ...base, runnerStatus: "needs_you", reason: "stuck", note: "can't find the next step on this page; open the portal" });
    expect(s).toBe("Ivyward is working on McGill University's portal. Nothing for you to do; you'll hear from us if we need you.");
  });
  it("the applicant's turn: the one thing to do", () => {
    expect(portalSentence({ ...base, runnerStatus: "needs_you", reason: "account" })).toMatch(/^Create your McGill University portal account/);
    expect(portalSentence({ ...base, runnerStatus: "needs_you", reason: "unpaid" })).toBe("Everything is filled in. Pay the $120 application fee and it's submitted.");
  });
  it("working: where in the portal", () => {
    expect(portalSentence({ ...base, runnerStatus: "running", st: { signedIn: true, formPages: ["a"], stepOf: { at: 2, of: 5 } } })).toBe("Filling in the form: section 2 of 5.");
    expect(portalSentence({ ...base, runnerStatus: "ready", st: {} })).toBe("Finding McGill University's application portal.");
  });
  it("paused wins over everything but submitted", () => {
    expect(portalSentence({ ...base, runnerStatus: "needs_you", reason: "stuck", pausedAll: true })).toMatch(/^All agents are paused/);
    expect(portalSentence({ ...base, runnerStatus: "idle", paused: true })).toMatch(/^Paused/);
  });
});

describe("waiting for you", () => {
  const app = (x: Partial<WaitApp>): WaitApp => ({ id: "a1", school: "Missouri State University", status: "packet_approved", runnerStatus: "needs_you", reason: null, note: null, essaysTotal: 2, essaysApproved: 2, attested: true, ...x });
  it("only the applicant's stops, each with one button", () => {
    expect(appWaiting(app({ reason: "stuck" }))).toBeNull();
    expect(appWaiting(app({ runnerStatus: "failed" }))).toBeNull();
    expect(appWaiting(app({ reason: "account" }))).toMatchObject({ title: "Create your Missouri State University portal account", action: "Show me" });
    expect(appWaiting(app({ reason: "unpaid", fee: 60 }))).toMatchObject({ title: "Pay Missouri State University's $60 application fee", action: "Pay" });
    expect(appWaiting(app({ reason: "blocked" }))?.href).toBe("/connect-chrome?then=a1");
  });
  it("essays to approve, then the packet to sign", () => {
    expect(appWaiting(app({ status: "ready_for_review", essaysApproved: 1, attested: false, runnerStatus: "idle" }))?.title).toBe("Read and approve 1 piece for Missouri State University");
    expect(appWaiting(app({ status: "ready_for_review", essaysApproved: 2, attested: false, runnerStatus: "idle" }))?.action).toBe("Sign");
  });
  it("questions from a form come before the stop itself", () => {
    expect(appWaiting(app({ reason: "question", questions: 2 }))?.title).toBe("Answer 2 questions from Missouri State University's form");
  });
  it("setup asks join the list once, urgent first", () => {
    const list = waitingList([app({ reason: "captcha" }), app({ id: "a2", status: "submitted" })], [
      { id: "n1", title: "Connect Chrome so the agents can finish blocked portals", href: "/connect-chrome", urgent: true },
      { id: "n2", title: "Connect Gmail", href: "/api/mail/connect", action_label: "Connect" },
    ]);
    expect(list.map((i) => i.key)).toEqual(["run:a1", "setup:n2"]);
  });
});

describe("checking a portal link before the browser opens", () => {
  it("a sign-in form is a portal; a page of text and links is not", () => {
    expect(portalVerdict("https://apply.example.edu/account/login", `<form><input type="email" name="email"><input type="password" name="pw"><button>Log in</button></form><a href="/account/register">Create an account</a>`).verdict).toBe("signin");
    expect(portalVerdict("https://www.kuleuven.be/english/apply", `<h1>Apply</h1><p>How to apply to KU Leuven. Read the instructions for your degree.</p><a href="/english/apply/application-instructions">Application instructions</a><a href="/english/apply/instructions-doctoral">Doctoral</a>`).verdict).toBe("info");
  });
  it("application systems that draw themselves in the browser count by their address", () => {
    expect(portalVerdict("https://GradCAS2027.cas.myliaison.com/applicant/deeplink/programSearch/organization/1", `<div id="root"></div>`).verdict).toBe("platform");
    expect(portalVerdict("https://utdcomet.my.site.com/ApplicantPortal/s/login/", null).verdict).toBe("platform");
  });
  it("slate's front page with its log-in link is a portal", () => {
    expect(ACCEPT.has(portalVerdict("https://future.mcgill.ca/apply/", `<p>Welcome. Returning users: log in to continue.</p><a href="/account/login?r=x">Log in</a><a href="/account/register?r=x">Create an account</a>`).verdict)).toBe(true);
    expect(portalVerdict("https://future.mcgill.ca/account/login?r=https%3a%2f%2ffuture.mcgill.ca%2fapply%2f&cookie=1", `<a href="/account/register?r=x">Create an account</a> Log in`).platform).toBe("slate");
  });
  it("links meant for another applicant are passed over", () => {
    expect(levelOf("MSc", "Management of Technology")).toBe("master");
    expect(levelOf("PhD", "Economics")).toBe("doctoral");
    expect(wrongAudience("Apply via Studielink /en/education/admission-and-application/bsc-dutch-diploma/apply-via-studielink", "master")).toBe(true);
    expect(wrongAudience("instructions doctoral /english/apply/application-instructions/instructions-doctoral", "master")).toBe(true);
    expect(wrongAudience("Apply for Bachelor's and Master's programmes", "master")).toBe(false);
    expect(wrongAudience("msc international diploma application", "master")).toBe(false);
    expect(wrongAudience("Exchange students", "master")).toBe(true);
  });
});

describe("portal systems", () => {
  it("knows SITS, Studielink, uni-assist and the new GradCAS address", () => {
    expect(platformOf("https://evision.le.ac.uk/urd/sits.urd/run/siw_lgn")).toBe("sits");
    expect(platformOf("https://www.studielink.nl/account/aanvragen/personalia")).toBe("studielink");
    expect(platformOf("https://my.uni-assist.de/")).toBe("uni_assist");
    expect(platformOf("https://GradCAS2027.cas.myliaison.com/applicant/deeplink/programSearch")).toBe("liaison_cas");
  });
  it("finds slate's and salesforce's create-account pages from any page of the portal", () => {
    expect(accountUrls("https://future.mcgill.ca/account/login?r=https%3a%2f%2ffuture.mcgill.ca%2fapply%2f&cookie=1")).toEqual({ create: "https://future.mcgill.ca/account/register?r=https%3A%2F%2Ffuture.mcgill.ca%2Fapply%2F", signIn: "https://future.mcgill.ca/account/login?r=https%3A%2F%2Ffuture.mcgill.ca%2Fapply%2F&cookie=1" });
    expect(accountUrls("https://future.mcgill.ca/apply/frm?id=1")?.create).toBe("https://future.mcgill.ca/account/register?r=https%3A%2F%2Ffuture.mcgill.ca%2Fapply%2F");
    expect(accountUrls("https://applygrad.auburn.edu/account/login?r=https%3A%2F%2Fapplygrad.auburn.edu%2Fportal%2Fapply")?.create).toBe("https://applygrad.auburn.edu/account/register?r=https%3A%2F%2Fapplygrad.auburn.edu%2Fportal%2Fapply");
    expect(accountUrls("https://utdcomet.my.site.com/ApplicantPortal/s/applications")).toEqual({ create: "https://utdcomet.my.site.com/ApplicantPortal/s/login/SelfRegister", signIn: "https://utdcomet.my.site.com/ApplicantPortal/s/login/" });
    expect(accountUrls("https://pgapplication.manchester.ac.uk/psc/apply/EMPLOYEE/SA/c/X")).toBeNull();
  });
});

describe("milestones the engine notes on the way", () => {
  it("reads 'step 3 of 7' and leaves anything else alone", () => {
    expect(stepOf("Application  Step 3 of 7  Education history")).toEqual({ at: 3, of: 7 });
    expect(stepOf("Page 2 / 5")).toEqual({ at: 2, of: 5 });
    expect(stepOf("Our 2 of 3 campuses")).toBeNull();
    expect(stepOf("step 9 of 4")).toBeNull();
  });
  it("counts the application's own pages, not the sign-up page before there's an account", () => {
    const st: EngineState = { steps: 0 };
    const boxes = [1, 2, 3, 4].map((i) => ({ id: `f${i}`, label: `Box ${i}`, type: "text" }));
    noteProgress(st, { url: "https://apply.x.edu/account/register", title: "Create an account", body: "", allFields: boxes }, "form");
    expect(st.formPages).toBeUndefined();
    noteProgress(st, { url: "https://apply.x.edu/apply/frm?id=1", title: "Personal background", body: "Section 1 of 6", allFields: boxes }, "form");
    expect(st.formPages).toHaveLength(1);
    expect(st.portal?.ok).toBe(true);
    expect(st.stepOf).toEqual({ at: 1, of: 6 });
    noteProgress(st, { url: "https://apply.x.edu/pay", title: "Payment", body: "", allFields: [] }, "payment");
    expect(st.paymentAt).toBeGreaterThan(0);
  });
  it("opens the first section a checklist marks as not done, never a finished one or the payment", () => {
    const s = {
      buttons: [
        { id: "1", label: "Edit", link: false, row: "Personal details Complete Edit" },
        { id: "2", label: "Edit", link: false, row: "Education history Incomplete Edit" },
        { id: "3", label: "Pay application fee", link: false, row: "Payment Not started Pay application fee" },
      ],
    };
    expect(nextSection(s)).toEqual({ id: "2", label: "Edit" });
    expect(nextSection(s, ["Edit", "Edit"])).toBeNull();
    expect(nextSection({ buttons: [{ id: "9", label: "Academic History", link: true, row: "Academic History [status-complete]" }] })).toBeNull();
  });
  it("never stays on a student-finance or visa site the portal linked to", () => {
    expect(offSite("https://www.duo.nl/particulier/student-finance/apply.jsp", "https://www.studielink.nl/")).toBe(true);
    expect(offSite("https://www.studielink.nl/account", "https://www.studielink.nl/")).toBe(false);
  });
  it("security question boxes are never a question for the applicant", () => {
    for (const l of ["Answer 3", "Question 2", "Your answer Enter your answer to question 3", "Security answer 1"]) expect(SECURITY_QA.test(l)).toBe(true);
    expect(SECURITY_QA.test("Answer the following about your studies")).toBe(false);
  });
});

describe("a day's effort per application", () => {
  it("rests after the day's runs and carries on next morning", () => {
    const now = new Date("2026-11-15T20:00:00Z");
    expect(effortToday({}, now)).toMatchObject({ runs: 0, over: false });
    expect(effortToday({ effort: { day: "2026-11-15", runs: RUNS_PER_DAY } }, now).over).toBe(true);
    expect(effortToday({ effort: { day: "2026-11-14", runs: 99 } }, now).over).toBe(false);
    expect(effortToday({}, now).resumeAt.toISOString()).toBe("2026-11-16T05:07:00.000Z");
  });
});

describe("questions real portals asked that the profile answers", () => {
  it("maps them to the fill sheet", () => {
    expect(keyForLabel("Will you be ordinarily resident in the UK for three years before the course begins?")).toBe("ordinarily_resident_3y");
    expect(keyForLabel("Was this course taken in the UK or overseas?")).toBe("edu1_abroad");
    expect(keyForLabel("End date * Not finished yet?")).toBe("edu1_in_progress");
    expect(keyForLabel("Other evidence of proficiency (e.g. prior study in English):")).toBe("english_evidence");
  });
});
