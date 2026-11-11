// the eval set: questions real portals asked, scored on the agents' rules with a sample applicant.
// two gates: nothing harmful (a wrong answer, a fact only the applicant can give, a security answer put to them),
// and no question the rules got right before may stop being right (the baseline only moves up).
import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/evals/questions";
import { HARMFUL, scoreRules } from "@/evals/score";
import { sampleSheet } from "@/evals/sample";
import baseline from "../evals/baseline.json";

describe("eval: portal questions, rules only", () => {
  const sheet = sampleSheet();
  const results = QUESTIONS.map((q) => ({ q, ...scoreRules(q, sheet) }));

  it("prints the scoreboard", () => {
    const by = (v: string) => results.filter((r) => r.verdict === v).length;
    console.log(`\neval (rules): ${QUESTIONS.length} questions | correct ${by("correct")} | asked rightly ${by("asked_ok")} | hidden rightly ${by("hidden_ok")} | left for the model ${by("unresolved")} | harmful ${results.filter((r) => HARMFUL.includes(r.verdict)).length}`);
    for (const r of results.filter((x) => x.verdict !== "correct" && x.verdict !== "asked_ok" && x.verdict !== "hidden_ok")) console.log(`  ${r.verdict.padEnd(18)} ${r.q.id}${r.got !== undefined ? ` -> ${JSON.stringify(r.got)}` : ""}`);
  });

  it.each(results.map((r) => [r.q.id, r] as const))("%s is not answered harmfully", (_id, r) => {
    expect(HARMFUL).not.toContain(r.verdict);
  });

  it("keeps every question the rules got right before", () => {
    const now = new Set(results.filter((r) => ["correct", "asked_ok", "hidden_ok"].includes(r.verdict)).map((r) => r.q.id));
    const lost = (baseline.rules_pass as string[]).filter((id) => !now.has(id));
    expect(lost).toEqual([]);
  });
});
