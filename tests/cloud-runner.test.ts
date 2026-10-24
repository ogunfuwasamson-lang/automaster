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
