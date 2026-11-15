import { describe, expect, it } from "vitest";
import { lengthOf, shareFacts, shareText, shareUrl, type ShareProgram } from "@/lib/share-school";

const TODAY = "2026-11-15";
const delft: ShareProgram = {
  id: "11111111-2222-3333-4444-555555555555",
  name: "MSc Electrical Engineering",
  degree: "MSc",
  url: "https://www.tudelft.nl/msc-ee",
  duration_months: 24,
  tuition_usd: 25633,
  app_fee_usd: 110,
  test_policy: "not_required",
  ielts_min: "7.0",
  toefl_min: 100,
  fee_waiver: "Fee waiver: not found.",
  verified_at: "2026-11-11T18:19:06Z",
  deadlines: [
    { date: "2026-12-01", round: "Justus & Louise van Effen Excellence Scholarship deadline (complete MSc application before this date)", funding_priority: "yes", notes: "" },
    { date: "2027-01-15", round: "Non-EU/EFTA selective round", funding_priority: "unknown", notes: "" },
    { date: "2026-10-01", round: "Early round", funding_priority: "no", notes: "" },
  ],
  school: { name: "TU Delft", city: "Delft", country: "Netherlands" },
};

describe("share facts", () => {
  const f = shareFacts(delft, TODAY);
  it("takes the round an applicant from abroad should aim for, and the ones after it", () => {
    expect(f.deadline).toEqual({ date: "2026-12-01", when: "1 Dec 2026", note: "scholarship round" });
    expect(f.later).toEqual([{ when: "15 Jan 2027", round: "Non-EU/EFTA selective round" }]);
  });
  it("gives money rounded, length in years, English and test rules", () => {
    expect(f.tuition).toBe("about $25,600 a year");
    expect(f.fee).toBe("$110");
    expect(f.length).toBe("2 years");
    expect(f.place).toBe("Delft, Netherlands");
    expect(f.english).toBe("IELTS 7.0 or TOEFL 100");
    expect(f.tests).toBe("No GRE/GMAT needed");
  });
  it("leaves out research notes that aren't facts", () => {
    expect(f.waiver).toBeNull();
    expect(shareFacts({ ...delft, fee_waiver: "Waived for applicants from low-income countries" }, TODAY).waiver).toBe("Waived for applicants from low-income countries");
  });
  it("skips GRE/GMAT for undergraduate degrees and money it doesn't know", () => {
    const b = shareFacts({ ...delft, degree: "BSc", tuition_usd: null, app_fee_usd: null }, TODAY);
    expect(b.tests).toBeNull();
    expect(b.tuition).toBeNull();
    expect(b.fee).toBeNull();
    expect(shareFacts({ ...delft, app_fee_usd: 0 }, TODAY).fee).toBe("none");
  });
  it("names a scholarship by itself", () => {
    const s = shareFacts({ ...delft, degree: "Scholarship", name: "Chevening Scholarship", school: { name: "UK government", country: "United Kingdom" } }, TODAY);
    expect(s.title).toBe("Chevening Scholarship");
    expect(s.program).toBeNull();
    expect(s.tuition).toBeNull();
  });
  it("reads lengths plainly", () => {
    expect([lengthOf(12), lengthOf(18), lengthOf(24), lengthOf(null)]).toEqual(["1 year", "18 months", "2 years", null]);
  });
});

describe("the message", () => {
  const url = shareUrl("https://tryivyward.com", delft.id, "abc123");
  const text = shareText(shareFacts(delft, TODAY), url, { invite: true });
  it("links to the programme's public page with the invite code and where it came from", () => {
    expect(url).toBe(`https://tryivyward.com/s/${delft.id}?ref=abc123`);
    expect(shareUrl("https://tryivyward.com", delft.id, null)).not.toContain("ref=");
  });
  it("carries the programme's facts, the fees, the link and what Ivyward AI does", () => {
    expect(text).toContain("🎓 *TU Delft*");
    expect(text).toContain("MSc Electrical Engineering");
    expect(text).toContain("📍 Delft, Netherlands · 2 years");
    expect(text).toContain("🗓 Next deadline: 1 Dec 2026 (scholarship round)");
    expect(text).toContain("💵 Tuition about $25,600 a year · Application fee $110");
    expect(text).toContain("📝 IELTS 7.0 or TOEFL 100 · No GRE/GMAT needed");
    expect(text).toContain(`Full details and the official page: ${url}`);
    expect(text).toContain("Ivyward AI can run the whole application for you");
    expect(text).toContain("your first submission is free");
  });
  it("offers the free submission only with an invite code", () => {
    expect(shareText(shareFacts(delft, TODAY), url, { invite: false })).not.toContain("free");
  });
  it("never promises admission or names Ivyward's prices", () => {
    expect(text).not.toMatch(/guarantee|get you in|admitted|\bper month\b|\$\d+ ?\/ ?(mo|month)/i);
  });
});
