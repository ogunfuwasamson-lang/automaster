import { describe, it, expect } from "vitest";
import { bareLink, briefText, fresh, labelKey, sharedPurpose, trusted, who, type Fact } from "@/lib/school-memory";

const day = 86_400_000;
const fact = (o: Partial<Fact>): Fact => ({ kind: "portal", key: "apply.x.edu:signup_blocked", value: {}, confirmations: 2, failures: 0, contributors: ["a", "b"], last_seen: new Date().toISOString(), ...o });

describe("shared school memory", () => {
  it("needs two separate applicants before a portal fact is acted on", () => {
    expect(trusted(fact({ contributors: ["a"], confirmations: 3 }))).toBe(false);
    expect(trusted(fact({}))).toBe(true);
    expect(trusted(fact({ failures: 2 }))).toBe(false);
  });
  it("lets facts expire: apply links and prompts after a cycle, contacts later", () => {
    const old = new Date(Date.now() - 320 * day).toISOString();
    expect(fresh({ kind: "apply_url", last_seen: old })).toBe(false);
    expect(fresh({ kind: "prompt", last_seen: old })).toBe(false);
    expect(fresh({ kind: "contact", last_seen: old })).toBe(true);
  });
  it("hashes applicants, so no one is identifiable from a fact", () => {
    expect(who("user-1")).toMatch(/^[0-9a-f]{16}$/);
    expect(who("user-1")).not.toContain("user");
    expect(who("user-1")).not.toBe(who("user-2"));
  });
  it("keeps tracking ids out of shared links", () => {
    expect(bareLink("https://www.apply.rochester.edu/register/feewaiver?x=1&email=a@b.com#t")).toBe("apply.rochester.edu/register/feewaiver");
    expect(bareLink("https://grad.school.edu/r/9f8e7d6c5b4a3210ffee/waiver")).toBe("grad.school.edu/r/waiver");
  });
  it("normalises form labels", () => {
    expect(labelKey("Country of Citizenship *")).toBe("country of citizenship");
    expect(labelKey("Phone (required)")).toBe("phone");
  });
  it("shares only school offices, never referees or professors", () => {
    expect(sharedPurpose("fee_waiver")).toBe(true);
    expect(sharedPurpose("aid_reconsideration")).toBe(true);
    expect(sharedPurpose("reference_request")).toBe(false);
    expect(sharedPurpose("supervisor_intro")).toBe(false);
  });
  it("writes a short brief for the outreach agent", () => {
    const t = briefText(
      [
        fact({ kind: "contact", key: "gradadmit@x.edu", value: { office: "admissions", sent: 4, replies: 3, reply_hours: 30 }, contributors: ["a", "b"] }),
        fact({ kind: "contact", key: "old@x.edu", value: { bounced: true } }),
        fact({ kind: "waiver", key: "email:gradadmit@x.edu", value: { how: "emailing gradadmit@x.edu to ask", granted: 2 } }),
        fact({}),
      ],
      null,
    );
    expect(t).toContain("gradadmit@x.edu (admissions) replied to 3 of 4 emails, usually within 30 hours");
    expect(t).toContain("old@x.edu bounced");
    expect(t).toContain("granted 2 times");
    expect(t).toContain("blocked automated sign-ups");
  });
});
