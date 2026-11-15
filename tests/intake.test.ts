import { describe, expect, it } from "vitest";
import { applicationTerm, isTermAnswer, parseTerm, programIntakes, termLabel } from "@/lib/intake";
import { keyForLabel, otherPersonKey } from "@/lib/fillsheet";
import { resolve } from "@/lib/runner-map";
import { goingRound } from "@/lib/cloud-engine";
import type { FillSheet } from "@/lib/fillsheet";

// mcgill's in-person MMA, as research saved it on 8 nov 2026
const MCGILL = [
  { round: "First deadline", date: "2026-11-15", notes: "Confirmed on mcgill.ca/desautels MMA admissions (checked 2026-11-08): these dates are for the Summer 2027 in-person intake; choose the 2026-2027 application cycle in the portal." },
  { round: "Final deadline, international applicants", date: "2027-01-15", notes: "Rolling review. these dates are for the Summer 2027 in-person intake; choose the 2026-2027 application cycle in the portal." },
];
const MISSOURI = [
  { round: "Fall 2027 (F-1 applicants)", date: "2027-05-01", notes: "Rolling review." },
  { round: "Spring 2027 (general)", date: "2027-01-15", notes: "" },
  { round: "Summer 2027 (general)", date: "2027-06-01", notes: "Not applicable for F-1 applicants." },
];

describe("the term an application is for", () => {
  it("reads terms however they're written", () => {
    expect(termLabel(parseTerm("fall-2027")!)).toBe("Fall 2027");
    expect(termLabel(parseTerm("Automne 2027")!)).toBe("Fall 2027");
    expect(termLabel(parseTerm("Summer / Été 2027")!)).toBe("Summer 2027");
  });
  it("uses the programme's only intake over the applicant's preference (mcgill's summer MMA)", () => {
    expect(programIntakes(MCGILL).map(termLabel)).toEqual(["Summer 2027"]);
    const t = applicationTerm(MCGILL, "fall-2027");
    expect(t.fromProgram).toBe(true);
    expect(termLabel(t.term!)).toBe("Summer 2027");
  });
  it("keeps the applicant's term when the programme offers it (missouri state's fall intake)", () => {
    const t = applicationTerm(MISSOURI, "fall-2027");
    expect(t.fromProgram).toBe(false);
    expect(termLabel(t.term!)).toBe("Fall 2027");
  });
  it("keeps the applicant's term when the programme says nothing", () => {
    expect(termLabel(applicationTerm([{ round: "Round 1", date: "2027-01-10", notes: "" }], "fall-2027").term!)).toBe("Fall 2027");
  });
  it("keeps term answers to one application", () => {
    expect(isTermAnswer("Application Type", "Fall / Automne 2027")).toBe(true);
    expect(isTermAnswer("*Term Term", "fall 2027")).toBe(true);
    expect(isTermAnswer("Mother's maiden name", "Adeyemi")).toBe(false);
    expect(isTermAnswer("LAUTECH start year", "direct entry at 200 level")).toBe(false);
  });
});

describe("boxes about someone else", () => {
  it("gives parents, guardians and emergency contacts their own keys", () => {
    expect(keyForLabel("Biological or adoptive parents: First name")).toBe("parent1_first_name");
    expect(keyForLabel("Biological or adoptive parents: Last name (2)")).toBe("parent2_last_name");
    expect(keyForLabel("Mother's first name")).toBe("mother_first_name");
    expect(keyForLabel("Emergency contact: Phone")).toBe("emergency_contact_phone");
    expect(keyForLabel("I do not have a second parent")).toBe("no_second_parent");
    expect(otherPersonKey("Spouse: First name")).toBeNull();
  });
  it("never puts the applicant's own name or email in them, whoever picked the key", () => {
    const sheet = { fields: { first_name: "Samson", email: "a@b.com" }, essays: [], files: [] } as unknown as FillSheet;
    expect(resolve({ id: "x", label: "Biological or adoptive parents: First name", type: "text" } as never, "first_name", sheet)).toBeNull();
    expect(resolve({ id: "x", label: "Guardian: Email", type: "email" } as never, "email", sheet)).toBeNull();
    expect(resolve({ id: "x", label: "First name", type: "text" } as never, "first_name", sheet)).not.toBeNull();
  });
  it("still reads the applicant's own boxes as theirs", () => {
    expect(keyForLabel("First name")).toBe("first_name");
    expect(keyForLabel("Your first name")).toBe("first_name");
  });
});

describe("immigration status", () => {
  it("is asked as the document the applicant will study on", () => {
    expect(keyForLabel("As a non-Canadian citizen, you may require additional immigration documents to study at McGill. A Study Permit is typically required for programs longer than six months")).toBe("immigration_status");
    expect(keyForLabel("Study permit number")).not.toBe("immigration_status");
    expect(keyForLabel("Visa status")).toBe("immigration_status");
  });
});

describe("going round in circles", () => {
  it("spots a few pages coming back unchanged", () => {
    const ring = Array.from({ length: 4 }, () => ["family#1", "identity#1", "citizenship#1"]).flat();
    expect(goingRound(ring)).toEqual(["citizenship#1", "family#1", "identity#1"]);
  });
  it("leaves real progress alone", () => {
    expect(goingRound(["a#3", "b#2", "c#4", "d#1", "e#0", "f#2", "g#1", "h#0", "i#2", "j#1"])).toBeNull();
    // a hub visited between sections, each section once
    expect(goingRound(["hub#0", "a#2", "hub#0", "b#1", "hub#0", "c#3", "hub#0", "d#0", "hub#0", "e#1"])).toBeNull();
    // the same page over and over is the same-page guard's job
    expect(goingRound(Array(12).fill("a#1"))).toBeNull();
  });
});

import { targetDeadline } from "@/lib/fit";

describe("the deadline that applies", () => {
  const MSU = [
    { round: "Fall 2027 (F-1 applicants)", date: "2027-05-01", funding_priority: "unknown" as const, notes: "Rolling review." },
    { round: "Fall 2027 (general)", date: "2027-08-15", funding_priority: "unknown" as const, notes: "" },
    { round: "Spring 2027 (F-1 applicants)", date: "2026-10-01", funding_priority: "unknown" as const, notes: "Already passed." },
    { round: "Spring 2027 (general)", date: "2027-01-15", funding_priority: "unknown" as const, notes: "" },
    { round: "Summer 2027 (general)", date: "2027-06-01", funding_priority: "unknown" as const, notes: "Not applicable for F-1 applicants." },
  ];
  it("gives an F-1 applicant for fall the F-1 fall round, not the earliest date on the page", () => {
    expect(targetDeadline(MSU, "2026-11-15")?.date).toBe("2027-01-15"); // the old behaviour, without the applicant
    expect(targetDeadline(MSU, "2026-11-15", { term: "fall-2027", international: true })?.date).toBe("2027-05-01");
  });
  it("skips rounds closed to international applicants", () => {
    const MCG = [
      { round: "First deadline", date: "2026-11-15", funding_priority: "no" as const, notes: "these dates are for the Summer 2027 in-person intake" },
      { round: "Final deadline, international applicants", date: "2027-01-15", funding_priority: "no" as const, notes: "these dates are for the Summer 2027 in-person intake" },
      { round: "Final deadline, Canadian citizens and PRs", date: "2027-03-15", funding_priority: "no" as const, notes: "Not applicable to international applicants." },
    ];
    expect(targetDeadline(MCG, "2026-11-16", { term: "fall-2027", international: true })?.date).toBe("2027-01-15");
    expect(targetDeadline(MCG, "2027-01-16", { term: "fall-2027", international: true })).toBeNull();
  });
});

import { otherTerm, WRONG_PROGRAM } from "@/lib/cloud-engine";

describe("submitting for the wrong term", () => {
  const summer = parseTerm("Summer 2027");
  it("holds a review page that names another term", () => {
    expect(termLabel(otherTerm("Recruitment & Admissions · Graduate Studies (Fall / Automne 2027) · Submit application", summer)!)).toBe("Fall 2027");
    expect(WRONG_PROGRAM.test("held before submitting: this application on the portal is for Fall 2027, another term than the programme's Summer 2027 intake")).toBe(true);
  });
  it("lets the right term through, and pages that name no term", () => {
    expect(otherTerm("Graduate Studies (Summer / Été 2027) · Submit", summer)).toBeNull();
    expect(otherTerm("Review your application and submit", summer)).toBeNull();
    expect(otherTerm("Fall 2027 · Summer 2027", summer)).toBeNull();
  });
});
