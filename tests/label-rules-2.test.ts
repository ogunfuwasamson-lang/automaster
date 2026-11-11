import { describe, expect, it } from "vitest";
import { keyForLabel } from "@/lib/fillsheet";

// each of these was put to an applicant in production although their profile already had the answer
describe("form questions the profile already answers", () => {
  it.each([
    ["*Term Term", "entry_term"],
    ["Term", "entry_term"],
    ["Intake *", "entry_term"],
    ["Language spoken most frequently at your permanent address", "home_language"],
    ["Are you currently living at a different address?", "mailing_differs"],
    ["*Is your permanent mailing address different from your current mailing address?", "mailing_differs"],
    ["Have you ever studied in the UK?", "studied_in_country_before"],
    ["Was this course taught in English?", "english_medium_education"],
    ["Do you hold an English language qualification?", "has_english_test"],
    ["*Birthdate Birthdate", "date_of_birth"],
    ["First language", "first_language"],
  ])("%s", (label, key) => expect(keyForLabel(label)).toBe(key));

  it("never answers a yes/no question with contact text", () => {
    for (const q of ["Is your address in Canada?", "Do you live in the city centre?", "Will your email change before enrolment?", "Has your phone number changed?"]) {
      expect(keyForLabel(q) ?? "").not.toMatch(/^(address_line1|city|email|phone)$/);
    }
    // plain labels still map
    expect(keyForLabel("Address line 1")).toBe("address_line1");
    expect(keyForLabel("City")).toBe("city");
    expect(keyForLabel("Email")).toBe("email");
    expect(keyForLabel("Mobile phone")).toBe("phone");
  });
});

import { asksForPassword } from "@/lib/cloud-engine";
describe("a handoff that asks the applicant for a password", () => {
  it("is recognised (these three reached applicants in production)", () => {
    for (const n of [
      "Please reply with the password you want for your new HEC Montreal account (the fill sheet has none), or your existing HEC User ID and password",
      "Please choose an eID password (at least 10 characters with three of upper case, lower case, number, special character), confirm you have no UCID",
      "Please choose your account password (at least 12 characters with upper case, lower case, a special character and a digit), confirm it, pick three security questions",
    ]) expect(asksForPassword(n)).toBe(true);
  });
  it("leaves ordinary handoffs alone", () => {
    for (const n of ["the portal is showing a bot check", "payment page: pay the fee", "The portal wants your disciplinary history", "sign in failed: the saved password was rejected"]) expect(asksForPassword(n)).toBe(false);
  });
});
