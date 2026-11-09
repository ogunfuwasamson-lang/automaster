// questions a first-time international applicant answers "No" to (mcgill's identification numbers page)
import { describe, it, expect } from "vitest";
import { keyForLabel } from "@/lib/fillsheet";
import { isCodeBox } from "@/lib/cloud-engine";

describe("school id and quebec permanent code questions", () => {
  it("maps them to their own answers", () => {
    expect(keyForLabel("Do you have a McGill ID number? / Avez-vous un numéro d'identification de McGill?")).toBe("has_school_id");
    expect(keyForLabel("Do you have a Quebec Permanent Code? / Avez-vous un code permanent du Québec?")).toBe("has_quebec_code");
    expect(keyForLabel("Do you have a student ID number from this university?")).toBe("has_school_id");
  });
  it("doesn't take other id questions", () => {
    expect(keyForLabel("National ID number")).not.toBe("has_school_id");
    expect(keyForLabel("Passport number")).not.toBe("has_school_id");
  });
  it("a yes/no question about a code is not a box for an emailed code", () => {
    expect(isCodeBox({ type: "radio", label: "Do you have a Quebec Permanent Code?" })).toBe(false);
    expect(isCodeBox({ type: "text", label: "Quebec Permanent Code" })).toBe(false);
    expect(isCodeBox({ type: "text", label: "Postal code" })).toBe(false);
    expect(isCodeBox({ type: "text", label: "Verification code" })).toBe(true);
    expect(isCodeBox({ type: "text", label: "Enter the PIN we emailed you" })).toBe(true);
  });
});
