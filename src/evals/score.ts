// scoring the agents' pipeline on the eval questions, without a model: what the rules do on their own, and what
// would be handed to the model or the applicant
import { mapByRules, type PageField } from "@/lib/runner-map";
import { notForApplicant } from "@/lib/question-filter";
import type { FillSheet } from "@/lib/fillsheet";
import type { EvalQuestion } from "@/evals/questions";

export type Verdict = "correct" | "wrong" | "unresolved" | "asked_ok" | "filled_should_ask" | "hidden_ok" | "shown_should_hide";

export const valueOf = (fill: { action: string; value?: string; option?: string } | undefined) => (fill?.action === "fill" ? fill.value : fill?.action === "choose" ? fill.option : fill?.action === "check" ? "checked" : undefined);

export function matches(got: string | undefined, want: string | RegExp) {
  if (got === undefined) return false;
  return typeof want === "string" ? got.trim() === want : want.test(got);
}

export function scoreRules(q: EvalQuestion, sheet: FillSheet): { verdict: Verdict; got?: string } {
  if (notForApplicant(q.label, q.type)) return { verdict: "never" in q.expect ? "hidden_ok" : "shown_should_hide" };
  if ("never" in q.expect) return { verdict: "shown_should_hide" };
  const f: PageField = { id: q.id, label: q.label, type: q.type, options: q.options };
  const { fills } = mapByRules([f], sheet);
  const got = valueOf(fills[0] as { action: string; value?: string; option?: string } | undefined);
  if ("ask" in q.expect) return { verdict: got === undefined ? "asked_ok" : "filled_should_ask", got };
  if (got === undefined) return { verdict: "unresolved" };
  return { verdict: matches(got, q.expect.value) ? "correct" : "wrong", got };
}

export const PASS: Verdict[] = ["correct", "asked_ok", "hidden_ok"];
// worse than leaving it: a wrong answer on an application, a fact filled that only the applicant can give,
// or a made-up security answer put to them
export const HARMFUL: Verdict[] = ["wrong", "filled_should_ask", "shown_should_hide"];
