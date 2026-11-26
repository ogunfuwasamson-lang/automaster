import { describe, it, expect } from "vitest";
import { admitQuery, regionOfCountry, sameName, sameSchool, verdict } from "@/lib/admission-rules";

const offer = { is_offer: true, conditional: false, school: "University of Toronto", applicant_name: "Samson Ogunfuwa", same_school: true };

describe("admission letters", () => {
  it("matches the applicant's name in any order, with or without a middle name", () => {
    expect(sameName("OGUNFUWA Samson", "Samson Ogunfuwa")).toBe(true);
    expect(sameName("Mr. Samson A. Ogunfuwa", "Samson Adeyemi Ogunfuwa")).toBe(true);
    expect(sameName("Chiamaka Obi", "Samson Ogunfuwa")).toBe(false);
    expect(sameName("Samson", "Samson Ogunfuwa")).toBeNull();
    expect(sameName("", "Samson Ogunfuwa")).toBeNull();
  });

  it("tells one school from a similarly named one", () => {
    expect(sameSchool("University of Toronto, School of Graduate Studies", "University of Toronto")).toBe(true);
    expect(sameSchool("Toronto Metropolitan University", "University of Toronto")).toBe(false);
    expect(sameSchool("Université de Montréal", "Universite de Montreal")).toBe(true);
    expect(sameSchool("McGill University", "University of Toronto")).toBe(false);
  });

  it("confirms an offer only with the right school and the applicant's name", () => {
    expect(verdict(offer, { profileName: "Samson Ogunfuwa", source: "letter", checkSchool: true }).ok).toBe(true);
    expect(verdict({ ...offer, is_offer: false }, { profileName: "Samson Ogunfuwa", source: "letter", checkSchool: true }).ok).toBe(false);
    expect(verdict({ ...offer, same_school: false, school: "McGill University" }, { profileName: null, source: "letter", checkSchool: true }).why).toMatch(/McGill/);
    expect(verdict({ ...offer, applicant_name: "Chiamaka Obi" }, { profileName: "Samson Ogunfuwa", source: "letter", checkSchool: true }).ok).toBe(false);
    // the email was in their own inbox: the name isn't checked
    expect(verdict({ ...offer, applicant_name: "" }, { profileName: "Samson Ogunfuwa", source: "mail", checkSchool: true }).ok).toBe(true);
    expect(verdict({ ...offer, conditional: true }, { profileName: null, source: "letter", checkSchool: false }).why).toBe("conditional offer");
  });

  it("searches the inbox by the school's domains and name", () => {
    const q = admitQuery(["utoronto.ca"], "University of Toronto");
    expect(q).toContain("from:utoronto.ca");
    expect(q).toContain('"University of Toronto"');
    expect(q).toContain("newer_than:2y");
  });

  it("places a letter's country in a destination region", () => {
    expect(regionOfCountry("United Kingdom")).toBe("uk");
    expect(regionOfCountry("Germany")).toBe("europe");
    expect(regionOfCountry("Atlantis")).toBeNull();
  });
});
