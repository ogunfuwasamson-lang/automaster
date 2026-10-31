import { describe, it, expect } from "vitest";
import { lessonText, pick, scrub, taskOf, type Lesson } from "@/lib/lessons";

const L = (o: Partial<Lesson>): Lesson => ({ id: Math.random().toString(36).slice(2), scope: "global", user_id: null, agent: "writer", task: null, topic: null, text: "avoid clichés", status: "active", ...o });

describe("lessons", () => {
  it("names the task from the prompt version", () => {
    expect(taskOf("nav-v1")).toBe("nav");
    expect(taskOf("program-parse-v2")).toBe("program-parse");
    expect(taskOf(undefined)).toBe(null);
  });
  it("takes personal details out of shared lessons", () => {
    expect(scrub("email admissions@x.edu or call +234 803 555 1234 first")).toBe("email [email] or call [number] first");
  });
  it("gives each call only its own agent's lessons, its applicant's, and its portal's", () => {
    const all = [
      L({ text: "general writer" }),
      L({ agent: "runner", text: "runner everywhere" }),
      L({ agent: "runner", topic: "apply.x.edu", text: "on x" }),
      L({ agent: "runner", topic: "apply.y.edu", text: "on y" }),
      L({ scope: "user", user_id: "u1", text: "u1 likes short sentences" }),
      L({ scope: "user", user_id: "u2", text: "u2 prefers formal" }),
      L({ agent: "runner", task: "see", text: "screenshots only" }),
    ];
    const w = pick(all, { agent: "writer", task: "draft", userId: "u1" });
    expect([...w.general, ...w.mine].map((l) => l.text)).toEqual(["general writer", "u1 likes short sentences"]);
    const r = pick(all, { agent: "runner", task: "nav", topic: "apply.x.edu", userId: "u1" });
    expect([...r.general, ...r.here].map((l) => l.text)).toEqual(["runner everywhere", "on x"]);
    expect(lessonText(r)).toContain("about this particular portal");
  });
});
