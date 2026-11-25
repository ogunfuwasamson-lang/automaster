import { describe, expect, it } from "vitest";
import { lightTurn } from "@/lib/chat-routing";

const asked = [{ role: "agent" as const, content: "Which year did you finish your degree?" }];

describe("Ask Ivyward model routing", () => {
  it("sends a short answer to the AI's own question to the smaller model", () => {
    expect(lightTurn("2022", asked, "gaps")).toBe(true);
    expect(lightTurn(null, [], null)).toBe(true);
  });

  it("keeps questions, requests, long messages and stories on the larger model", () => {
    expect(lightTurn("what's the deadline for Toronto?", asked, "gaps")).toBe(false);
    expect(lightTurn("remind me on Friday", asked, "gaps")).toBe(false);
    expect(lightTurn("x".repeat(200), asked, "gaps")).toBe(false);
    expect(lightTurn("about 40 students", asked, "stories")).toBe(false);
    expect(lightTurn("ok", [{ role: "agent", content: "Your agents are on it." }], "gaps")).toBe(false);
  });
});
