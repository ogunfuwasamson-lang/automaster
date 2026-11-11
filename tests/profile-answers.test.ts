import { describe, expect, it } from "vitest";
import { acceptInferred, answerable } from "@/lib/profile-answers";

const profile = "name: Ada Okafor | citizenship: Nigeria | lives: Lagos, Nigeria\neducation: BSc Economics @ University of Lagos 2021 4.5/5\nDate of birth: 1998-03-14";

describe("answering a form's question from the profile instead of asking again", () => {
  const qs = [
    { label: "Are you an international applicant?", options: ["Select", "Yes", "No"] },
    { label: "Country of citizenship", options: [] },
    { label: "Have you ever been convicted of a criminal offence?", options: ["Yes", "No"] },
    { label: "How did you hear about us?", options: ["Friend", "Web search"] },
    { label: "Most recent institution attended" },
  ];
  it("keeps an answer that is certain, quotes the profile and matches an option exactly", () => {
    const ok = acceptInferred({ answers: [{ n: 1, answer: "yes", basis: "citizenship: Nigeria | lives: Lagos, Nigeria", certain: true }, { n: 5, answer: "University of Lagos", basis: "BSc Economics @ University of Lagos 2021", certain: true }] }, qs, profile);
    expect(ok.get(0)).toEqual({ value: "Yes", basis: "citizenship: Nigeria | lives: Lagos, Nigeria" });
    expect(ok.get(4)?.value).toBe("University of Lagos");
  });
  it("drops guesses, answers with no basis in the profile, and options that aren't on the form", () => {
    const ok = acceptInferred(
      {
        answers: [
          { n: 1, answer: "Yes", basis: "citizenship: Nigeria", certain: false },
          { n: 2, answer: "Ghana", basis: "the applicant was born in Accra and holds a Ghanaian passport", certain: true },
          { n: 1, answer: "Probably", basis: "citizenship: Nigeria", certain: true },
          { n: 9, answer: "x", basis: "citizenship: Nigeria", certain: true },
        ],
      },
      qs,
      profile,
    );
    expect(ok.size).toBe(0);
  });
  it("never answers declarations, protected characteristics or how-did-you-hear, even when the model is sure", () => {
    const ok = acceptInferred({ answers: [{ n: 3, answer: "No", basis: "name: Ada Okafor", certain: true }, { n: 4, answer: "Web search", basis: "name: Ada Okafor", certain: true }] }, qs, profile);
    expect(ok.size).toBe(0);
    for (const l of ["Do you have a disability?", "Ethnicity", "Gender", "Have you previously applied to McGill?", "Are you using an agent?", "I agree to the terms", "Has a visa ever been refused?", "Religion", "Sex"]) expect(answerable(l)).toBe(false);
    for (const l of ["Country of birth", "Are you an international student?", "Do you require a study permit?", "Highest qualification", "Graduation year"]) expect(answerable(l)).toBe(true);
    expect(answerable("Upload transcript", "file")).toBe(false);
  });
});
