import { describe, expect, it } from "vitest";
import { ucasDeadline, withSystemDeadlines } from "@/lib/system-deadlines";
import { noTestEntry, screen, type ProgramFactsLite } from "@/lib/fit";
import { emptyProfile } from "@/lib/profile";

const uk = { school: "King's College London", program: "Nursing with Registration as an Adult Nurse", country: "United Kingdom", region: "uk", term: "fall-2027" };

describe("UCAS closing dates", () => {
  it("a UK bachelor's course for autumn 2027 closes on 13 january 2027", () => {
    expect(ucasDeadline(uk)).toMatchObject({ date: "2027-01-13", intake: "Fall 2027", round: "UCAS equal consideration date" });
  });
  it("medicine, dentistry, veterinary and Oxbridge close on 15 october the year before", () => {
    expect(ucasDeadline({ ...uk, program: "Medicine MBBS" })?.date).toBe("2026-10-15");
    expect(ucasDeadline({ ...uk, school: "University of Cambridge", program: "Natural Sciences" })?.date).toBe("2026-10-15");
    expect(ucasDeadline({ ...uk, program: "Biomedical Science BSc (Hons)" })?.date).toBe("2027-01-13");
  });
  it("not for pathway colleges, other countries, or an entry year without published dates", () => {
    expect(ucasDeadline({ ...uk, program: "BNurs Nursing via INTO Manchester foundation programme" })).toBeNull();
    expect(ucasDeadline({ ...uk, program: "Integrated route into nursing" })?.date).toBe("2027-01-13");
    expect(ucasDeadline({ ...uk, country: "Australia", region: "australia_nz" })).toBeNull();
    expect(ucasDeadline({ ...uk, term: "fall-2031" })).toBeNull();
    expect(ucasDeadline({ ...uk, term: "spring-2027" })).toBeNull();
  });
  it("only fills in when the course pages gave no date", () => {
    const own = [{ round: "direct", date: "2027-03-01", funding_priority: "unknown" as const, notes: "" }];
    expect(withSystemDeadlines(own, uk)).toEqual(own);
    expect(withSystemDeadlines([], uk)).toHaveLength(1);
  });
});

describe("screening undergraduate programmes", () => {
  const p = { ...emptyProfile(), goals: { ...emptyProfile().goals, study_level: "undergraduate" as const } };
  const base: ProgramFactsLite = { test_policy: "unknown", english_moi_waiver: "accepted", full_funding_realistic: "unknown", deadlines: [{ round: "UCAS equal consideration date", date: "2027-01-13", funding_priority: "unknown", notes: "" }] };
  it("no admissions test to confirm for UK, Irish, Australian and NZ bachelor's entry, except medicine and law", () => {
    expect(noTestEntry("undergraduate", { country: "United Kingdom" })).toBe(true);
    expect(noTestEntry("undergraduate", { country: "Ireland", region: "europe" })).toBe(true);
    expect(noTestEntry("undergraduate", { region: "australia_nz" })).toBe(true);
    expect(noTestEntry("undergraduate", { country: "United Kingdom", program_name: "Medicine MBChB" })).toBe(false);
    expect(noTestEntry("undergraduate", { country: "United States" })).toBe(false);
    expect(noTestEntry("masters", { country: "United Kingdom" })).toBe(false);
    expect(screen(p, { ...base, country: "United Kingdom", program_name: "Nursing" }, "2026-11-23").verdict).toBe("shortlisted");
    expect(screen(p, { ...base, country: "United States", program_name: "Nursing" }, "2026-11-23").verdict).toBe("researching");
  });
  it("rolling admission counts as a confirmed answer", () => {
    const rolling = { ...base, test_policy: "not_required" as const, deadlines: [{ round: "rolling admission", date: "", funding_priority: "unknown" as const, notes: "", intake: "Spring 2027" }] };
    expect(screen(p, rolling, "2026-11-23").verdict).toBe("shortlisted");
    expect(screen(p, { ...rolling, deadlines: [] }, "2026-11-23").reasons).toContain("deadlines not confirmed");
  });
});
