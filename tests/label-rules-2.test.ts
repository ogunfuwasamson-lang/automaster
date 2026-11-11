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

import { checkFills } from "@/lib/cloud-engine";
describe("reading answers back before leaving a page", () => {
  const items = [
    { id: "a", label: "City", type: "text", value: "Lagos" },
    { id: "b", label: "Phone", type: "tel", value: "+234 803 123 4567" },
    { id: "c", label: "Statement", type: "textarea", value: "When I joined Paystack, 2,000 merchants used us." },
    { id: "d", label: "Employer", type: "text", value: "Paystack" },
    { id: "e", label: "Gone", type: "text", value: "x" },
  ];
  it("finds what the page dropped, cut short or changed, and ignores formatting", () => {
    const got = checkFills(items, new Map([["a", ""], ["b", "2348031234567"], ["c", "When I joined Paystack, 2,000"], ["d", "Flutterwave"]]));
    expect(got.map((x) => `${x.id}:${x.issue}`)).toEqual(["a:dropped", "c:cut", "d:changed"]);
  });
});

import { netError } from "@/lib/net-errors";
describe("what a portal's server said when it refused a save", () => {
  it("reads the common shapes", () => {
    expect(netError(422, '{"errors":[{"field":"phone","message":"Invalid format"}]}', "application/json")).toBe("phone: Invalid format");
    expect(netError(400, '{"message":"Date of birth must be in the past"}', "application/json")).toBe("Date of birth must be in the past");
    expect(netError(400, '{"postal_code":["is required for this country"]}', "application/json")).toBe("postal_code: is required for this country");
    expect(netError(409, "An account with this email already exists.", "text/plain")).toBe("An account with this email already exists.");
  });
  it("ignores what says nothing", () => {
    expect(netError(200, '{"message":"ok"}', "application/json")).toBeNull();
    expect(netError(500, "<html><body><h1>Internal Server Error</h1>...</body></html>", "text/html")).toBeNull();
    expect(netError(404, "not found", "text/plain")).toBeNull();
    expect(netError(400, '{"error":"Bad Request"}', "application/json")).toBeNull();
  });
});

import { groundCv } from "@/lib/cv-check";
describe("a tailored CV adds nothing the applicant didn't say", () => {
  const facts = "Growth Analyst at Paystack 2022-09 to now. Grew merchants from 2,000 to 11,000. BSc Economics, University of Lagos, 2018-2022, First Class. IELTS 7.5";
  it("drops a bullet with a made-up number and an organisation that isn't in the facts", () => {
    const { cv, dropped } = groundCv(
      {
        headline: "Economist with fintech growth experience",
        sections: [
          { title: "Experience", items: [{ title: "Growth Analyst", org: "Paystack", dates: "2022 to now", bullets: ["Grew merchants from 2,000 to 11,000", "Cut churn by 35%"] }, { title: "Intern", org: "Goldman Sachs", dates: "2021", bullets: ["Built models"] }] },
          { title: "Education", items: [{ title: "BSc Economics", org: "University of Lagos", dates: "2018 to 2022", bullets: ["First Class"] }] },
        ],
      },
      facts,
    );
    expect(cv.sections[0].items).toHaveLength(1);
    expect(cv.sections[0].items[0].bullets).toEqual(["Grew merchants from 2,000 to 11,000"]);
    expect(dropped).toEqual(["Intern at Goldman Sachs", "Cut churn by 35%"]);
    expect(cv.sections[1].items[0].org).toBe("University of Lagos");
  });
});
