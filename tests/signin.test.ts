import { describe, expect, it } from "vitest";
import { emailTypo } from "@/lib/email-typo";

describe("email typo hint", () => {
  it("catches near misses of the common providers", () => {
    expect(emailTypo("ada@agmail.com")).toBe("ada@gmail.com");
    expect(emailTypo("ada@gmial.com")).toBe("ada@gmail.com");
    expect(emailTypo("ada@gmail.con")).toBe("ada@gmail.com");
    expect(emailTypo("ada@yaho.com")).toBe("ada@yahoo.com");
    expect(emailTypo("Ada@Hotmial.com")).toBe("ada@hotmail.com");
  });
  it("leaves correct, university and company addresses alone", () => {
    for (const ok of ["ada@gmail.com", "ada@unilag.edu.ng", "ada@ox.ac.uk", "ada@company.io", "ada@mail.com", "ada@gmx.com", "ada@me.com", "not an email", ""]) expect(emailTypo(ok)).toBeNull();
  });
});

import { nextFrom } from "@/lib/auth-landing";
describe("where a sign-in link lands", () => {
  const o = "https://tryivyward.com";
  const q = (s: string) => new URLSearchParams(s);
  it("keeps the page the person was heading for", () => {
    expect(nextFrom(q("next=/applications/1"), o)).toBe("/applications/1");
    expect(nextFrom(q(`redirect_to=${encodeURIComponent("https://tryivyward.com/auth/callback?next=/shortlist")}`), o)).toBe("/shortlist");
    expect(nextFrom(q(`redirect_to=${encodeURIComponent("https://tryivyward.com/auth/callback")}`), o)).toBeNull();
  });
  it("never takes a destination from another site", () => {
    expect(nextFrom(q(`redirect_to=${encodeURIComponent("https://evil.io/auth/callback?next=/x")}`), o)).toBeNull();
    expect(nextFrom(q("redirect_to=nonsense"), o)).toBeNull();
  });
});
