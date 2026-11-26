import { describe, it, expect } from "vitest";
import * as F from "@/lib/whatsapp-flow";

const ctx = (a: F.Answers = {}, usBlocked: string | null = null): F.Ctx => ({ first: F.firstOf(a.name), phone: "2348012345678", answers: a, usBlocked });
const full: F.Answers = { name: "Ada Obi", level: "masters", fields: ["data science"], passport: "Nigeria", regions: ["uk"], funding: "partial", term: "fall-2027", cv: true };

describe("signing up on WhatsApp", () => {
  it("finds the email and the code in what they type", () => {
    expect(F.emailIn("my email is Ada.Obi@Gmail.com.")).toBe("ada.obi@gmail.com");
    expect(F.emailIn("hello")).toBeNull();
    expect(F.codeOf(" 482 913 ")).toBe("482913");
    expect(F.codeOf("48291")).toBeNull();
    expect(F.codeOf("my code 482913")).toBeNull();
  });
  it("keeps the invite code from the site's button", () => {
    expect(F.refIn("Hi Ivyward (ref: ADA12)")).toBe("ada12");
    expect(F.refIn("Hi Ivyward")).toBeNull();
  });
  it("greets with the terms and privacy links, and no price", () => {
    expect(F.GREETING).toContain("tryivyward.com/terms");
    expect(F.GREETING).toContain("tryivyward.com/privacy");
    expect(F.GREETING).not.toMatch(/[$₦£€]\s?\d/);
  });
});

describe("the setup questions", () => {
  it("asks only what isn't answered yet, in order", () => {
    expect(F.nextStep({})).toBe("name");
    expect(F.nextStep({ name: "Ada" })).toBe("level");
    expect(F.nextStep({ ...full, funding: undefined })).toBe("funding");
    expect(F.nextStep(full)).toBe("done");
  });
  it("reads taps and typed answers alike", () => {
    expect(F.parse("level", { text: "Master's", reply: "lvl:masters" }, ctx({ name: "Ada" }))).toMatchObject({ ok: true, set: { level: "masters" }, next: "fields" });
    expect(F.parse("level", { text: "I want to do a PhD", reply: null }, ctx({ name: "Ada" }))).toMatchObject({ ok: true, set: { level: "phd" } });
    expect(F.parse("level", { text: "not sure", reply: null }, ctx()).ok).toBe(false);
    expect(F.parse("funding", { text: "i'll pay myself", reply: null }, ctx(full))).toMatchObject({ ok: true, set: { funding: "self" } });
    expect(F.parse("start", { text: "September 2028", reply: null }, ctx(full))).toMatchObject({ ok: true, set: { term: "fall-2028" } });
  });
  it("splits the fields they type", () => {
    expect(F.fieldsIn("Data science, economics and public policy")).toEqual(["data science", "economics", "public policy"]);
    expect(F.fieldsIn("!!")).toEqual([]);
  });
  it("cleans up names", () => {
    expect(F.nameIn("my name is ada obi")).toBe("Ada Obi");
    expect(F.nameIn("Chukwuemeka O'Neil-Adebayo")).toBe("Chukwuemeka O'Neil-Adebayo");
    expect(F.nameIn("12345")).toBeNull();
  });
  it("offers the passport their number suggests, and another", () => {
    const q = F.question("passport", ctx({ name: "Ada" }));
    expect(q.kind).toBe("buttons");
    if (q.kind === "buttons") expect(q.buttons.map((b) => b.id)).toEqual(["pp:Nigeria", "pp:other"]);
    expect(F.parse("passport", { text: "Another country", reply: "pp:other" }, ctx())).toMatchObject({ ok: true, next: "passport_other" });
    expect(F.parse("passport_other", { text: "ghanaian", reply: null }, ctx())).toMatchObject({ ok: true, set: { passport: "Ghana" } });
    expect(F.countryFromPhone("447700900123")?.name).toBe("United Kingdom");
    expect(F.countryFromPhone("2348012345678")?.zone).toBe("Africa/Lagos");
    expect(F.countryFromPhone("15551234567")).toBeNull(); // the US and Canada share +1
  });
  it("adds regions one at a time, and leaves the US out under the visa suspension", () => {
    const note = "New US student visas for nationals of the Gambia have been suspended since 1 January 2026.";
    const q = F.question("regions", ctx({}, note));
    expect(q.kind).toBe("list");
    if (q.kind === "list") {
      expect(q.rows.some((r) => r.id === "rg:us")).toBe(false);
      expect(q.rows.every((r) => r.title.length <= 24)).toBe(true);
      expect(q.body).toContain(note);
    }
    expect(F.parse("regions", { text: "USA", reply: null }, ctx({}, note)).ok).toBe(false);
    const one = F.parse("regions", { text: "United Kingdom", reply: "rg:uk" }, ctx({ ...full, regions: undefined }));
    expect(one).toMatchObject({ ok: true, set: { regions: ["uk"] }, next: "regions_more" });
    expect(F.parse("regions_more", { text: "Canada", reply: null }, ctx({ ...full, regions: ["uk"] }))).toMatchObject({ ok: true, set: { regions: ["uk", "canada"] } });
    expect(F.parse("regions_more", { text: "That's all", reply: "rg:done" }, ctx(full))).toMatchObject({ ok: true, next: "done" });
  });
  it("lets them skip the CV", () => {
    expect(F.parse("cv", { text: "Skip for now", reply: "cv:skip" }, ctx({ ...full, cv: undefined }))).toMatchObject({ ok: true, set: { cv: true }, next: "done" });
    expect(F.parse("cv", { text: "what's a CV?", reply: null }, ctx()).ok).toBe(false);
  });
  it("keeps every button and row inside WhatsApp's limits", () => {
    for (const s of ["level", "passport", "regions_more", "funding", "start", "cv"] as F.Step[]) {
      const q = F.question(s, ctx(full));
      if (q.kind === "buttons") {
        expect(q.buttons.length).toBeLessThanOrEqual(3);
        for (const b of q.buttons) expect(b.title.length).toBeLessThanOrEqual(20);
      }
    }
  });
});

describe("after setup", () => {
  it("knows the commands", () => {
    expect(F.commandOf("Status")).toBe("status");
    expect(F.commandOf("my shortlist")).toBe("shortlist");
    expect(F.commandOf("login")).toBe("link");
    expect(F.commandOf("hi!")).toBe("help");
    expect(F.commandOf("what is the status of my UCL application?")).toBeNull();
  });
  it("lists the shortlist with short titles", () => {
    const apps = Array.from({ length: 12 }, (_, i) => ({ id: `a${i}`, school: "The London School of Economics and Political Science (LSE), London", program: "MSc Data Science and Business Analytics for the Modern Economy", deadline: "2027-01-15", status: "shortlisted" }));
    const out = F.shortlistOut(apps, 14);
    expect(out.kind).toBe("list");
    if (out.kind === "list") {
      expect(out.rows).toHaveLength(10);
      expect(out.rows[0].id).toBe("app:a0");
      expect(out.rows.every((r) => r.title.length <= 24 && (r.description ?? "").length <= 72)).toBe(true);
      expect(out.body).toContain("4 more");
    }
  });
  it("offers to start a shortlisted programme, not one already being prepared", () => {
    const a = { id: "x", school: "University of Toronto", program: "MEng", deadline: null, status: "shortlisted", degree: null, fee: 125, waiver: true, tuition: 40000, why: "Your grades clear the bar.", url: null };
    const out = F.appOut(a);
    expect(out.kind).toBe("buttons");
    if (out.kind === "buttons") expect(out.buttons[0]).toEqual({ id: "start:x", title: "Start this one" });
    expect(out.body).toContain("$125 (a waiver is possible)");
    const busy = F.appOut({ ...a, status: "preparing" });
    if (busy.kind === "buttons") expect(busy.buttons.map((b) => b.id)).toEqual(["shortlist"]);
  });
  it("turns a question with a few answers into buttons, more into a list, open ones into text", () => {
    const yes = F.askOut("Do you have an IELTS score?", { kind: "yes_no", options: [] }, (o) => F.answerId(o));
    expect(yes.kind).toBe("buttons");
    const many = F.askOut("Which intake?", { kind: "choice", options: ["September 2027 (main intake)", "January 2028", "May 2028", "September 2028"] }, (_o, i) => F.cardId("d:intake", i), F.cardId("d:intake", "skip"));
    expect(many.kind).toBe("list");
    if (many.kind === "list") {
      expect(many.rows.at(-1)?.id).toBe("card:skip:d:intake");
      expect(many.rows[0].description).toBe("September 2027 (main intake)");
    }
    expect(F.askOut("Tell me about a setback.", null, (o) => o).kind).toBe("text");
    expect(F.cardReply("card:2:5d4f0c0e-3c1a-4c5e-9a4e-0b7c2f6c1a11")).toEqual({ id: "5d4f0c0e-3c1a-4c5e-9a4e-0b7c2f6c1a11", option: 2 });
    expect(F.cardReply("card:skip:s:budget")).toEqual({ id: "s:budget", option: "skip" });
    expect(F.cardReply("app:1")).toBeNull();
  });
  it("sums up where things stand, what needs them first", () => {
    const t = F.statusText(
      [
        { school: "UCL", status: "preparing", deadline: "2027-01-10" },
        { school: "University of Toronto, St. George", status: "ready_for_review", deadline: "2027-01-05" },
        { school: "LSE", status: "shortlisted", deadline: null },
      ],
      { title: "Sign your Toronto application", href: "/applications/1" },
      "tryivyward.com",
    );
    expect(t.indexOf("University of Toronto")).toBeLessThan(t.indexOf("UCL"));
    expect(t).toContain("ready for you to sign");
    expect(t).toContain("1 more on your shortlist");
    expect(t).toContain("tryivyward.com/applications/1");
  });
  it("visa steps wait for an offer", () => {
    expect(F.visaText(null, false, "tryivyward.com")).toContain("offer letter");
    const v = F.visaText({ title: "Student visa", summary: "For UCL.", steps: [{ label: "Get your CAS", done: true }, { label: "Apply online", done: false, href: "https://www.gov.uk/student-visa" }], href: "/guides/uk-student-visa-after-admission" }, true, "tryivyward.com");
    expect(v).toContain("Apply online: https://www.gov.uk/student-visa");
    expect(v).toContain("tryivyward.com/guides/uk-student-visa-after-admission");
  });
  it("writes bold the WhatsApp way", () => {
    expect(F.waText("**Deadline** is near")).toBe("*Deadline* is near");
  });
});
