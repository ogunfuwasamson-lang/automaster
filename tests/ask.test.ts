import { describe, it, expect } from "vitest";
import { askKind, cleanOptions, toAsk } from "@/lib/ask";
import { matchOption } from "@/lib/portal-questions";

describe("questions with the right control", () => {
  it("picks buttons, search, yes/no, date or text", () => {
    expect(askKind("select", ["Select…", "English", "Français", "Other"])).toBe("choice");
    expect(askKind("select", Array.from({ length: 30 }, (_, i) => `Country ${i}`))).toBe("search");
    expect(askKind("radio", ["Yes", "No"])).toBe("yes_no");
    expect(askKind("checkbox", [])).toBe("yes_no");
    expect(askKind("date", [])).toBe("date");
    expect(askKind("text", [])).toBe("text");
  });
  it("drops placeholders and duplicates from the options", () => {
    expect(cleanOptions(["-- Select --", "English", "english", "", "Please choose", "Français"])).toEqual(["English", "Français"]);
  });
  it("gives yes/no buttons to a bare checkbox", () => {
    expect(toAsk({ id: "q", question: "Are you a veteran?", options: [], field_type: "checkbox", school: "X" }).options).toEqual(["Yes", "No"]);
  });
});

describe("reusing an earlier answer on the next school's form", () => {
  it("finds the option that says the same thing", () => {
    expect(matchOption("english", ["Select", "English", "Français", "Other"])).toBe("English");
    expect(matchOption("English", ["English (Anglais)", "French (Français)"])).toBe("English (Anglais)");
    expect(matchOption("Nigeria", ["Niger", "Nigeria", "Norway"])).toBe("Nigeria");
    expect(matchOption("Yoruba", ["English", "French"])).toBe(null);
  });
});

import { cleanLabel, stripMarkers } from "@/lib/labels";
describe("form labels", () => {
  it("strips required/optional markers but keeps the word inside a sentence", () => {
    expect(stripMarkers("McGill is required to report applicants' first language (required)")).toBe("McGill is required to report applicants' first language");
    expect(stripMarkers("Phone number - optional")).toBe("Phone number");
    expect(stripMarkers("Country of birth required *")).toBe("Country of birth");
    expect(cleanLabel("Required: Date of birth")).toBe("Date of birth");
  });
});

import { detailFor, detailsBrief, PORTAL_DETAIL_FIELDS } from "@/lib/portal-fields";
describe("profile details", () => {
  it("has a unique key for every field", () => {
    const keys = PORTAL_DETAIL_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBeGreaterThan(50);
  });
  it("files a portal answer under the matching detail", () => {
    expect(detailFor("Language spoken most frequently at your permanent address")).toBe("home_language");
    expect(detailFor("McGill is required to report applicants' first language")).toBe("first_language");
    expect(detailFor("Are you Hispanic or Latino?")).toBe("hispanic_latino");
    expect(detailFor("How did you hear about our program?")).toBe("how_heard");
    expect(detailFor("Upload your CV")).toBe(null);
  });
  it("keeps background and contact details out of what the essay writer sees", () => {
    const d = { hobbies: "chess, club level", religion: "Christian", phone: "+234 800", race_ethnicity: "Black or African" };
    expect(detailsBrief(d, "activities")).toBe("Hobbies: chess, club level");
    expect(detailsBrief(d, "eligibility")).toContain("Religion or faith: Christian");
    expect(detailsBrief(d, "eligibility")).not.toContain("+234");
  });
});

import { keyForLabel } from "@/lib/fillsheet";
import { bestOption, keyForOptions } from "@/lib/runner-map";
describe("words that mean the same thing on forms", () => {
  it("maps synonyms to the same profile field", () => {
    expect(keyForLabel("Sex *")).toBe("gender");
    expect(keyForLabel("Mobile number")).toBe("phone");
    expect(keyForLabel("Contact number")).toBe("phone");
    expect(keyForLabel("I have no mobile")).toBe(null);
    expect(keyForLabel("Forename(s)")).toBe("first_name");
    expect(keyForLabel("Family name")).toBe("last_name");
    expect(keyForLabel("Nationality")).toBe("citizenship");
    expect(keyForLabel("Country/Region")).toBe("country");
    expect(keyForLabel("Job title")).not.toBe("title");
    expect(keyForLabel("Title")).toBe("title");
    expect(keyForLabel("Is English your first language? *")).toBe("english_first_language");
    expect(keyForLabel("Mother tongue")).toBe("first_language");
    expect(keyForLabel("Country code")).toBe("phone_country_code");
    expect(keyForLabel("Emergency contact phone")).toBe("emergency_contact_phone");
  });
  it("recognises a field by its options when the label says nothing", () => {
    expect(keyForOptions(["Please select", "Male", "Female", "Prefer not to say"])).toBe("gender");
    expect(keyForOptions(["Mr", "Mrs", "Ms", "Dr"])).toBe("title");
  });
  it("matches values worded differently", () => {
    expect(bestOption("Male", ["M", "F"])).toBe("M");
    expect(bestOption("Prefer not to say", ["Male", "Female", "I prefer not to say"])).toBe("I prefer not to say");
    expect(bestOption("+234", ["United Kingdom (+44)", "Nigeria (+234)", "Niger (+227)"])).toBe("Nigeria (+234)");
  });
});

describe("labels polluted by a neighbour's options", () => {
  it("cuts month and number runs out of a question", () => {
    expect(cleanLabel("Start date * Month Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec")).toBe("Start date");
    expect(cleanLabel("End date * Not finished yet? Month Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov D")).toBe("End date * Not finished yet?");
    expect(cleanLabel("Date of birth Day 1 2 3 4 5 6 7 8 9 10")).toBe("Date of birth");
  });
});
