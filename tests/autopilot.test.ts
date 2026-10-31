import { describe, it, expect } from "vitest";
import { emptyProfile, type Profile } from "@/lib/profile";
import { buildSheet, keyForLabel, NEVER_FILL, CERTIFY } from "@/lib/fillsheet";
import { mapByRules, bestOption, resolve, keyMenu } from "@/lib/runner-map";
import { buildMime, isEmail } from "@/lib/mime";
import { textPdf, wrap, toAscii } from "@/lib/pdf";
import { buildDigest, describe as describeEvent, localHour } from "@/lib/activity";
import { decrypt, encrypt, sha256, newToken } from "@/lib/crypto";
import { USER_SETTABLE } from "@/lib/dial";

function profile(): Profile {
  const p = emptyProfile();
  p.identity = { full_name: "Ada Chiamaka Obi", citizenship: "Nigeria", country_of_residence: "Nigeria", city: "Lagos" };
  p.education = [
    { institution: "University of Lagos", degree: "B.Sc", field: "Economics", country: "Nigeria", start: "2012-09", end: "2016-07", grade: "Second Class Upper", gpa: 4.2, gpa_scale: 5, },
  ];
  p.work = [
    { company: "Old Co", role: "Analyst", start: "2017-01", end: "2020-06", location: "Lagos", highlights: ["built models"] },
    { company: "Finecore", role: "Head of Growth", start: "2026-02", end: null, location: "Lagos", highlights: ["launched product"] },
  ];
  p.tests = [{ name: "IELTS", status: "taken", score: "8.0", date: "2025-03" }];
  p.goals.target_term = "fall-2027";
  return p;
}

const sheet = (attested = true) =>
  buildSheet({
    applicationId: "app1",
    school: "Test U",
    program: "MS Finance",
    degree: "MS",
    portalUrl: "https://apply.test.edu",
    attested,
    accountEmail: "ada@example.com",
    profile: profile(),
    details: { phone: "+2348000000000", date_of_birth: "1994-05-17", country: "Nigeria", address_line1: "1 Marina", city: "Lagos" },
    recommenders: [{ name: "Grace Hopper", email: "grace@x.com", title: "Director", organization: "Old Co", relationship: "manager", phone: null }],
    essays: [{ artifact_id: "e1", title: "Statement of purpose", prompt: "Why this program?", kind: "sop", text: "My statement." }],
    documents: [{ id: "d1", kind: "cv", filename: "cv.pdf" }],
  });

describe("fill sheet", () => {
  it("splits names, orders work current-first, derives dates", () => {
    const s = sheet();
    expect(s.fields.first_name).toBe("Ada");
    expect(s.fields.middle_name).toBe("Chiamaka");
    expect(s.fields.last_name).toBe("Obi");
    expect(s.fields.work1_employer).toBe("Finecore");
    expect(s.fields.work1_current).toBe("yes");
    expect(s.fields.work2_employer).toBe("Old Co");
    expect(s.fields.dob_month).toBe("05");
    expect(s.fields.entry_season).toBe("Fall");
    expect(s.fields.entry_year).toBe("2027");
    expect(s.fields.ielts_score).toBe("8.0");
    expect(s.fields.applying_as).toBe("myself");
    expect(s.fields.study_mode).toBe("Full-time");
    expect(s.fields.entry_start).toBe("September 2027");
    expect(s.fields.rec1_email).toBe("grace@x.com");
  });
  it("answers application type from the level", () => {
    expect(keyForLabel("Application Type")).toBe("application_type");
    expect(keyForLabel("Type of applicant")).toBe("application_type");
    expect(sheet().fields.application_type).toBe("Graduate");
  });
  it("uses details confirmed in conversation when the form details are blank", () => {
    const p = profile();
    p.confirmed_facts = [
      { topic: "Country of birth", value: "Nigeria" },
      { topic: "Gender", value: "Male" },
    ];
    const s = buildSheet({
      applicationId: "app1", school: "Test U", program: "MS", degree: "MS", portalUrl: "https://apply.test.edu", attested: true, accountEmail: "a@x.com",
      profile: p, details: { date_of_birth: "1994-05-17" }, recommenders: [], essays: [], documents: [],
    });
    expect(s.fields.country_of_birth).toBe("Nigeria");
    expect(s.fields.gender).toBe("Male");
  });
  it("lists what portals will ask for that's missing", () => {
    const s = sheet();
    expect(s.missing).toContain("transcript (upload it on documents)");
    expect(s.missing.some((m) => m.startsWith("CV"))).toBe(false);
  });
  it("serves essays as files and never includes id numbers", () => {
    const s = sheet();
    expect(s.files.map((f) => f.key)).toEqual(["cv", "essay:e1"]);
    expect(JSON.stringify(s)).not.toMatch(/passport/i);
  });
});

describe("label matching", () => {
  it("maps common portal labels", () => {
    expect(keyForLabel("First Name *")).toBe("first_name");
    expect(keyForLabel("Family name")).toBe("last_name");
    expect(keyForLabel("Confirm email address")).toBe("email");
    expect(keyForLabel("Mobile phone")).toBe("phone");
    expect(keyForLabel("Date of Birth")).toBe("date_of_birth");
    expect(keyForLabel("Country of Citizenship")).toBe("citizenship");
    expect(keyForLabel("Recommender 1 Email")).toBe("rec1_email");
    expect(keyForLabel("Reference #2 name")).toBe("rec2_name");
    expect(keyForLabel("Postal code")).toBe("postal_code");
    expect(keyForLabel("favourite colour")).toBe(null);
  });
  it("never fills sensitive fields", () => {
    for (const l of ["Passport number", "National ID", "Card number", "CVV", "Password", "Social Security Number", "Signature"]) expect(NEVER_FILL.test(l)).toBe(true);
    expect(NEVER_FILL.test("Phone number")).toBe(false);
    expect(CERTIFY.test("I certify that the information provided is true and complete")).toBe(true);
  });
});

describe("runner mapping", () => {
  it("fills by rules, skips passwords, ticks certification only when attested", () => {
    const fields = [
      { id: "a", label: "First name", type: "text" },
      { id: "b", label: "Password", type: "password" },
      { id: "c", label: "Passport number", type: "text" },
      { id: "d", label: "Country of citizenship", type: "select", options: ["Select…", "Niger", "Nigeria", "Norway"] },
      { id: "e", label: "I certify this application is my own work", type: "checkbox" },
      { id: "f", label: "Upload your resume", type: "file" },
      { id: "g", label: "Statement of purpose", type: "textarea" },
      { id: "h", label: "Have you applied before?", type: "radio", options: ["Yes", "No"] },
    ];
    const { fills, unresolved } = mapByRules(fields, sheet(true));
    const by = Object.fromEntries(fills.map((f) => [f.id, f]));
    expect(by.a).toMatchObject({ action: "fill", value: "Ada" });
    expect(by.b.action).toBe("skip");
    expect(by.c.action).toBe("skip");
    expect(by.d).toMatchObject({ action: "choose", option: "Nigeria" });
    expect(by.e.action).toBe("check");
    expect(by.f).toMatchObject({ action: "upload", file: "cv" });
    expect(by.g).toMatchObject({ action: "fill", value: "My statement." });
    expect(unresolved.map((u) => u.id)).toEqual(["h"]);
    const notSigned = mapByRules([fields[4]], sheet(false)).fills[0];
    expect(notSigned.action).toBe("skip");
  });
  it("matches options sensibly", () => {
    expect(bestOption("Nigeria", ["Niger", "Nigeria (NG)", "Norway"])).toBe("Nigeria (NG)");
    expect(bestOption("05", ["January", "February", "March", "April", "May", "June"])).toBe("May");
    expect(bestOption("Fall", ["Spring 2027", "Fall 2027"])).toBe("Fall 2027");
    expect(bestOption("Atlantis", ["Nigeria", "Ghana"])).toBe(null);
  });
  it("model picks are keys only; values come from the sheet", () => {
    const s = sheet();
    expect(resolve({ id: "x", label: "Previous employer", type: "text" }, "work2_employer", s)).toMatchObject({ value: "Old Co" });
    expect(resolve({ id: "x", label: "anything", type: "text" }, "made_up_key", s)).toBe(null);
    expect(resolve({ id: "x", label: "y/n", type: "checkbox" }, "work1_current", s)).toBe(null);
    expect(keyMenu(s)).toContain("essay:e1");
  });
});

describe("email", () => {
  it("builds a clean mime message and blocks header injection", () => {
    const m = buildMime({ from: "ada@example.com", fromName: "Adá Obi", to: "admissions@test.edu", subject: "Fee waiver\r\nBcc: evil@x.com", body: "Hello\nthere" });
    expect(m).toContain("To: admissions@test.edu");
    expect(m).not.toMatch(/\r\nBcc:/);
    expect(m).toContain("=?UTF-8?B?");
    expect(() => buildMime({ from: "a@b.com", to: "not an email", subject: "s", body: "b" })).toThrow();
    expect(isEmail("gradadmissions@babson.edu")).toBe(true);
  });
});

describe("pdf", () => {
  it("writes a valid multi-page pdf from long text", () => {
    const body = Array(900).fill("word").join(" ");
    const pdf = textPdf("Statement", body).toString("latin1");
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.trim().endsWith("%%EOF")).toBe(true);
    expect((pdf.match(/\/Type \/Page /g) ?? []).length).toBeGreaterThan(1);
    expect(wrap("a ".repeat(200), 100, 11).length).toBeGreaterThan(5);
    expect(toAscii("“smart” — quotes ₦5")).toBe('"smart" -- quotes NGN 5');
  });
});

describe("digest and activity", () => {
  it("hides plumbing and words events plainly", () => {
    expect(describeEvent({ actor: "agent:x", action: "guard.allow", created_at: "" })).toBe(null);
    expect(describeEvent({ actor: "user", action: "packet.approved", created_at: "" })).toBe("you approved an application packet");
  });
  it("leads with urgent deadlines", () => {
    const g = buildDigest({
      name: "Ada",
      since: "",
      today: "2026-10-24",
      events: [{ actor: "agent:recon", action: "program.shortlisted", created_at: "" }, { actor: "agent:recon", action: "program.shortlisted", created_at: "" }],
      pendingApprovals: [],
      draftsReady: [],
      deadlines: [{ school: "Test U", program: "MS", date: "2026-10-28", status: "preparing" }],
      scheduledEmails: [],
      runnerNeedsYou: [],
    });
    expect(g.headline).toBe("1 deadline within a week");
    expect(g.done).toEqual(["shortlisted a program ×2"]);
    expect(localHour("Africa/Lagos", new Date("2026-10-24T06:00:00Z"))).toBe(7);
  });
});

describe("secrets", () => {
  it("round-trips encrypted tokens and hashes keys", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(64);
    const blob = encrypt("refresh-token");
    expect(blob).not.toContain("refresh-token");
    expect(decrypt(blob)).toBe("refresh-token");
    expect(newToken("amr")).toMatch(/^amr_[\w-]{32}$/);
    expect(sha256("x")).toHaveLength(64);
  });
  it("the dial never offers loosening the always-human capabilities", () => {
    expect(USER_SETTABLE.sign).toBeUndefined();
    expect(USER_SETTABLE.state_fact).toBeUndefined();
    expect(USER_SETTABLE["spend.deposit"]).toBeUndefined();
  });
});

describe("form details save", () => {
  it("keeps every field the form shows, country of birth included", async () => {
    const { DetailsSchema } = await import("@/lib/details-schema");
    const { PORTAL_DETAIL_FIELDS } = await import("@/lib/portal-fields");
    const input = Object.fromEntries(PORTAL_DETAIL_FIELDS.map((f) => [f.key, f.kind === "date" ? "1990-01-31" : "x"]));
    const out = DetailsSchema.parse(input) as Record<string, unknown>;
    for (const f of PORTAL_DETAIL_FIELDS) expect(out[f.key], f.key).toBeDefined();
    expect(out.country_of_birth).toBe("x");
  });
});

describe("email text", () => {
  it("keeps the whole email from html, without styles or quoted history", async () => {
    const { mailText } = await import("@/lib/mail-text");
    const html = `<html><head><style>.x{color:red}</style></head><body><p>Dear Samson,</p><p>Your application is complete.&nbsp;Please upload your transcript by <b>1 Nov</b>.</p><div>Best,<br>Admissions</div><p>On Tue, Oct 20, 2026 at 9:00 AM You wrote:</p><blockquote>earlier</blockquote></body></html>`;
    const t = mailText({ text: "", html });
    expect(t).toContain("Dear Samson,");
    expect(t).toContain("Please upload your transcript by 1 Nov.");
    expect(t).toContain("Admissions");
    expect(t).not.toContain("color:red");
    expect(t).not.toContain("earlier");
  });
});

describe("answers to portal questions", () => {
  const withAnswers = () => {
    const p = profile();
    p.confirmed_facts = [
      { topic: "Have you previously applied to this university?", value: "No" },
      { topic: "How did you hear about our program?", value: "Online search" },
      { topic: "I agree to receive text messages", value: "Yes" },
    ];
    return buildSheet({ applicationId: "a", school: "U", program: "MS", degree: "MS", portalUrl: null, attested: true, accountEmail: "a@x.com", profile: p, details: {}, recommenders: [], essays: [], documents: [] });
  };
  it("fills the same question on another portal, however it's punctuated", () => {
    const s = withAnswers();
    const fields = [
      { id: "q1", label: "Have you previously applied to this university? *", type: "radio", options: ["Yes", "No"], required: true },
      { id: "q2", label: "How did you hear about our program", type: "select", options: ["Friend", "Online search", "Fair"], required: true },
      { id: "q3", label: "I agree to receive text messages", type: "checkbox" },
    ];
    const { fills } = mapByRules(fields, s);
    expect(fills.find((f) => f.id === "q1")).toMatchObject({ action: "choose", option: "No" });
    expect(fills.find((f) => f.id === "q2")).toMatchObject({ action: "choose", option: "Online search" });
    expect(fills.find((f) => f.id === "q3")).toMatchObject({ action: "check" });
  });
  it("shows the model which question each answer is for", () => {
    expect(keyMenu(withAnswers())).toContain('answer:1: answers "How did you hear about our program?"');
  });
});
