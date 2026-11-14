import { describe, expect, it } from "vitest";
import { journey, todaysTask, type TodayInput } from "@/lib/today";
import { parseGoal } from "@/lib/goal-parse";

const base: TodayInput = { apps: [], hasCv: false, hasTranscript: false, basicsMissing: 3, gmail: false, story: { open: 12 }, nextChapter: { id: "home", title: "Where you're from", open: 13 } };

describe("today's task", () => {
  it("asks for the CV first", () => {
    expect(todaysTask(base)?.id).toBe("cv");
  });
  it("puts an application waiting for a signature above everything, nearest deadline first", () => {
    const t = todaysTask({ ...base, apps: [{ id: "a", school: "UCL", status: "ready_for_review", deadline: "2027-02-01" }, { id: "b", school: "University of Toronto, Rotman", status: "ready_for_review", deadline: "2027-01-05" }] });
    expect(t?.id).toBe("sign:b");
    expect(t?.title).toBe("Read and sign your University of Toronto application");
  });
  it("then the basics, the transcript, a story while essays are written, gmail, then a quick chapter", () => {
    expect(todaysTask({ ...base, hasCv: true })?.id).toBe("basics");
    expect(todaysTask({ ...base, hasCv: true, basicsMissing: 0 })?.id).toBe("transcript");
    const writing = { ...base, hasCv: true, basicsMissing: 0, hasTranscript: true, apps: [{ id: "a", school: "UCL", status: "preparing", deadline: null }] };
    expect(todaysTask(writing)?.id).toBe("story");
    expect(todaysTask({ ...writing, story: { open: 0 } })?.id).toBe("gmail");
    const t = todaysTask({ ...writing, story: { open: 0 }, gmail: true });
    expect(t?.id).toBe("chapter:home");
    expect(t?.title).toBe("Answer 5 quick questions: where you're from");
    expect(todaysTask({ ...writing, story: { open: 0 }, gmail: true, nextChapter: null })).toBeNull();
  });
  it("counts the path to a first submission", () => {
    expect(journey(base)).toMatchObject({ done: 0, next: "Shortlist" });
    const j = journey({ ...base, hasCv: true, basicsMissing: 0, apps: [{ id: "a", school: "UCL", status: "packet_approved", deadline: null }] });
    expect(j.done).toBe(5);
    expect(j.next).toBe("Transcript");
    expect(j.steps.find((s) => s.id === "signed")?.done).toBe(true);
    expect(j.steps.find((s) => s.id === "submitted")?.done).toBe(false);
  });
});

describe("the home page's goal box", () => {
  it("reads level, field and regions from plain words", () => {
    expect(parseGoal("a master's in finance, in Canada or the UK")).toEqual({ level: "masters", fields: ["Finance"], regions: ["canada", "uk"] });
    expect(parseGoal("PhD computer science Germany")).toEqual({ level: "phd", fields: ["Computer Science"], regions: ["europe"] });
    expect(parseGoal("fully funded MBA in the USA")).toMatchObject({ level: "masters", regions: ["us"] });
    expect(parseGoal("undergraduate engineering in Australia").level).toBe("undergraduate");
    expect(parseGoal("public health").fields).toEqual(["Public Health"]);
    expect(parseGoal("data science and AI in the UK")).toEqual({ level: null, fields: ["Data Science", "AI"], regions: ["uk"] });
  });
});
