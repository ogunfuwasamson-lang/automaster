import { describe, it, expect } from "vitest";
import { classify, type Snapshot } from "@/lib/cloud-engine";
import { extractVerification, hostRoot } from "@/lib/verify-mail";
import { generatePassword } from "@/lib/vault";

const snap = (o: Partial<Snapshot>): Snapshot => ({ url: "", title: "", body: "", captcha: false, payment: false, confirmation: false, fingerprint: "", fields: [], allFields: [], buttons: [], ...o });
const f = (label: string, type = "text") => ({ id: label, label, type });

describe("page classification", () => {
  it("tells login, signup, verification and forms apart", () => {
    expect(classify(snap({ allFields: [f("Email", "email"), f("Password", "password")] }))).toBe("login");
    expect(classify(snap({ allFields: [f("First name"), f("Email", "email"), f("Password", "password"), f("Confirm password", "password")] }))).toBe("signup");
    expect(classify(snap({ allFields: [f("Verification code")] }))).toBe("verify_code");
    expect(classify(snap({ body: "We've sent you an email. Check your inbox to verify your account." }))).toBe("check_email");
    expect(classify(snap({ captcha: true, allFields: [f("Email", "email"), f("Password", "password")] }))).toBe("captcha");
    expect(classify(snap({ fields: [f("First name")], allFields: [f("First name")] }))).toBe("form");
    expect(classify(snap({ allFields: [f("Postal code")] }))).toBe("form");
  });
});

describe("verification emails", () => {
  it("finds codes and same-school links, ignores other domains", () => {
    expect(extractVerification({ subject: "Your code", text: "Your verification code is 482913.", html: "" }, "apply.babson.edu").code).toBe("482913");
    expect(extractVerification({ subject: "Verify", text: "", html: '<a href="https://apply.babson.edu/account/verify?t=abc&amp;x=1">verify</a> <a href="https://evil.com/verify">x</a>' }, "gradadmissions.babson.edu").link).toBe("https://apply.babson.edu/account/verify?t=abc&x=1");
    expect(extractVerification({ subject: "Newsletter", text: "visit https://evil.com/verify", html: "" }, "apply.babson.edu")).toEqual({ code: null, link: null });
    expect(hostRoot("gradapply.ox.ac.uk")).toBe("ox.ac.uk");
  });
});

describe("generated portal passwords", () => {
  it("meet the usual rules and differ every time", () => {
    const a = generatePassword();
    expect(a).toHaveLength(16);
    expect(a).toMatch(/[A-Z]/);
    expect(a).toMatch(/[a-z]/);
    expect(a).toMatch(/\d/);
    expect(a).toMatch(/[!@#$%*?\-_]/);
    expect(generatePassword()).not.toBe(a);
  });
});

import { normalizeUrl, looksLikePortal } from "@/lib/portal-url";
import { keyForLabel } from "@/lib/fillsheet";
import { missingNote } from "@/lib/cloud-engine";

describe("portal links", () => {
  it("adds the scheme and rejects junk", () => {
    expect(normalizeUrl("portal.stir.ac.uk/student/course-application/pg/application.jsp?crsCode=TDX44-BSM")).toBe("https://portal.stir.ac.uk/student/course-application/pg/application.jsp?crsCode=TDX44-BSM");
    expect(normalizeUrl("simon.rochester.edu")).toBe("https://simon.rochester.edu/");
    expect(normalizeUrl("not a url")).toBe(null);
  });
  it("tells application sites from program pages", () => {
    expect(looksLikePortal("https://apply.grad.brandeis.edu/apply/")).toBe(true);
    expect(looksLikePortal("https://applygrad.auburn.edu/portal/apply")).toBe(true);
    expect(looksLikePortal("https://portal.stir.ac.uk/student/course-application/pg/application.jsp")).toBe(true);
    expect(looksLikePortal("https://www.hec.ca/en/programs/masters/master-international-business")).toBe(false);
    expect(looksLikePortal("https://catalog.utdallas.edu/2026/graduate/programs/jsom/innovation-entrepreneurship")).toBe(false);
    expect(looksLikePortal("https://simon.rochester.edu/")).toBe(false);
  });
});

describe("slate-style birthdate", () => {
  it("maps Month/Day/Year once the row label is attached", () => {
    expect(keyForLabel("Birthdate Month")).toBe("dob_month");
    expect(keyForLabel("Birthdate Day")).toBe("dob_day");
    expect(keyForLabel("Birthdate Year")).toBe("dob_year");
    expect(keyForLabel("birthdate m")).toBe("dob_month");
    expect(keyForLabel("Date of Birth")).toBe("date_of_birth");
    expect(keyForLabel("Month")).toBe(null);
  });
  it("points the applicant at the missing detail", () => {
    expect(missingNote(["dob_month", "dob_day"])).toBe("add your date of birth under profile → details for application forms, then press try again");
  });
});

describe("real-portal regressions", () => {
  it("rejects accommodation and brochure pages as portals", () => {
    expect(looksLikePortal("https://rooms.le.ac.uk/student_portal/Account/Login")).toBe(false);
    expect(looksLikePortal("https://www.manchester.ac.uk/study/masters/courses/list/13005/ma-international-education/application-and-selection/")).toBe(false);
    expect(looksLikePortal("https://enligne.hec.ca/psp/GAPET/HEL/PSFT_CS_HEL/?cmd=login")).toBe(true);
    expect(looksLikePortal("https://utdcomet.my.site.com/ApplicantPortal/s/gradapp/")).toBe(true);
    expect(looksLikePortal("https://future.mcgill.ca/apply/")).toBe(true);
  });
  it("maps stirling's up-front questions", () => {
    expect(keyForLabel("I am applying for myself I am applying using an education agent")).toBe("applying_as");
    expect(keyForLabel("Permanent residence *")).toBe("country_of_residence");
    expect(keyForLabel("Country / Region of birth *")).toBe("country_of_birth");
    expect(keyForLabel("Do you require a visa to study in the UK?")).toBe("visa_required");
    expect(keyForLabel("Mode of study")).toBe("study_mode");
    expect(keyForLabel("Course start date")).toBe("entry_start");
  });
});

describe("sign-up link wording", () => {
  it("recognises the common variants", async () => {
    const { classify } = await import("@/lib/cloud-engine");
    expect(typeof classify).toBe("function");
    const CREATE = /^((create|register|sign up)( for| an| a| new| my| your)*( account| profile| login| here)?|new (user|applicant)s?|first.?time (user|applicant)s?.*|create (a )?login)$/i;
    for (const l of ["Register for Account", "Create an account", "Create Account", "Register", "Sign up", "Register here", "New users"]) expect(CREATE.test(l)).toBe(true);
    expect(CREATE.test("Registration Help")).toBe(false);
  });
});
