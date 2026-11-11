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
