import { describe, expect, it } from "vitest";
import { docChecklist, docCount, englishLetterEmail, inSentence, requirementsFromBrief, type AppNeeds, type HeldDocs } from "@/lib/doc-checklist";
import { guessKind } from "@/lib/doc-kinds";
import { todaysTask } from "@/lib/today";

const needs: AppNeeds = { level: "masters", award: false, testPolicy: "not_required", englishRoute: null, references: 2, refsRequested: 0, requirements: [] };
const none: HeldDocs = { kinds: {}, englishTest: false, admissionsTest: false, referees: 0 };

describe("documents an application needs", () => {
  it("lists the usual set for a master's, passport optional and not counted", () => {
    const rows = docChecklist(needs, none);
    expect(rows.map((r) => r.id)).toEqual(["cv", "transcript", "degree", "english", "references", "passport"]);
    expect(rows.find((r) => r.id === "passport")?.state).toBe("optional");
    expect(docCount(rows)).toMatchObject({ done: 0, total: 5 });
  });

  it("adds the GRE when the programme requires it, and what the plan found", () => {
    const rows = docChecklist({ ...needs, testPolicy: "required", requirements: ["Two-page research proposal", "Bank statement showing funds for one year"] }, none);
    expect(rows.map((r) => r.id)).toEqual(expect.arrayContaining(["admissions_test", "financial", "portfolio"]));
    expect(rows.find((r) => r.id === "portfolio")?.label).toBe("Research proposal or writing sample");
  });

  it("ticks off what's on file, and counts referees the agents have asked", () => {
    const held: HeldDocs = { kinds: { cv: 1, transcript: 1, degree_certificate: 1 }, englishTest: true, admissionsTest: false, referees: 2 };
    let rows = docChecklist(needs, held);
    expect(rows.find((r) => r.id === "references")?.state).toBe("agents"); // on file, not asked yet
    expect(docCount(rows)).toMatchObject({ done: 5, total: 5, missing: [] });
    rows = docChecklist({ ...needs, refsRequested: 2 }, held);
    expect(rows.find((r) => r.id === "references")).toMatchObject({ state: "done", detail: "Your agents have asked 2 referees." });
  });

  it("offers a way through for what they don't have yet", () => {
    const rows = docChecklist({ ...needs, englishRoute: "waiver", references: null }, none);
    expect(rows.find((r) => r.id === "english")).toMatchObject({ label: "English-medium letter", kind: "english_letter", alt: { letter: "english" } });
    expect(rows.find((r) => r.id === "transcript")?.alt?.label).toMatch(/statement of results/);
    expect(rows.find((r) => r.id === "references")?.detail).toMatch(/Usually 2/);
    expect(docChecklist({ ...needs, level: "undergraduate" }, none).find((r) => r.id === "degree")?.label).toBe("School-leaving certificate");
  });

  it("writes the english-letter email from their own degree", () => {
    const e = englishLetterEmail({ name: "Ada Obi", degree: "B.Sc.", field: "Economics", institution: "University of Lagos", year: "2022" });
    expect(e.body).toContain("B.Sc. in Economics from University of Lagos in 2022");
    expect(e.body.trim().endsWith("Ada Obi")).toBe(true);
  });

  it("reads requirements out of an older brief", () => {
    const brief = "## tone\ncalm\n\n## other requirements\n- CV, two pages max\n- Writing sample\n\n## sources\n- https://x";
    expect(requirementsFromBrief(brief)).toEqual(["CV, two pages max", "Writing sample"]);
    expect(requirementsFromBrief(null)).toEqual([]);
  });

  it("names a missing document in today's task, with the school", () => {
    const t = todaysTask({ apps: [], hasCv: true, hasTranscript: false, basicsMissing: 1, gmail: true, story: null, nextChapter: null, appDoc: { appId: "a1", school: "University College London (UCL)", deadline: "2027-01-15", label: "Degree certificate", missing: 3 } });
    expect(t).toMatchObject({ id: "doc:a1", title: "Add your degree certificate for University College London", href: "/applications/a1#documents" });
    expect(t?.why).toContain("2 more");
    expect(inSentence("CV")).toBe("CV");
    expect(inSentence("IELTS, TOEFL or Duolingo result")).toBe("IELTS, TOEFL or Duolingo result");
  });

  it("guesses a file's kind from its name", () => {
    expect(guessKind("MOI letter.pdf", 1)).toBe("english_letter");
    expect(guessKind("IMG_2041.jpg", 1)).toBe("other");
    expect(guessKind("My CV 2026.pdf", 0)).toBe("cv");
  });
});
