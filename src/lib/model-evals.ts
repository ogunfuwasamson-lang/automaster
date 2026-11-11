import "server-only";
import { decideFields } from "@/lib/runner";
import { runStructured } from "@/lib/llm";
import { profileBrief } from "@/lib/profile";
import { detailsBrief } from "@/lib/portal-fields";
import { acceptInferred, answerable, Inferred, INFER_SYSTEM, inferPrompt } from "@/lib/profile-answers";
import { QUESTIONS } from "@/evals/questions";
import { matches, scoreRules, valueOf } from "@/evals/score";
import { SAMPLE_DETAILS, sampleProfile, sampleSheet } from "@/evals/sample";
import type { PageField } from "@/lib/runner-map";

// the eval questions through the models, as a run would: what the rules leave goes to the decide pass, and what
// that leaves goes to the profile check before the applicant. scored per model so a prompt or model change can be
// compared before it ships. every call is a real, metered call on the operator's account.
export type ModelEval = { tier: "chat" | "expert"; at: string; total: number; correct: number; wrong: number; asked_ok: number; filled_should_ask: number; left: number; detail: { id: string; stage: string; got?: string; ok: boolean }[] };

export async function runModelEvals(userId: string, tier: "chat" | "expert"): Promise<ModelEval> {
  const sheet = sampleSheet();
  const detail: ModelEval["detail"] = [];
  const left = QUESTIONS.filter((q) => {
    const r = scoreRules(q, sheet);
    return r.verdict === "unresolved" || r.verdict === "asked_ok";
  });
  // every question the rules don't settle, in one decide call per portal kind (as one page would be)
  const byPortal = new Map<string, typeof left>();
  for (const q of left) byPortal.set(q.portal, [...(byPortal.get(q.portal) ?? []), q]);
  const stillOpen: typeof left = [];
  for (const [portal, qs] of byPortal) {
    const fields: PageField[] = qs.map((q) => ({ id: q.id, label: q.label, type: q.type, options: q.options, required: true }));
    const fills = await decideFields(userId, sheet, fields, { url: `https://${portal.replace(/\W+/g, "-")}.example/apply`, title: "Application", body: qs.map((q) => q.label).join(" ") }, undefined, { tier, strict: true });
    for (const q of qs) {
      const got = valueOf(fills.find((f) => f.id === q.id) as { action: string; value?: string; option?: string } | undefined);
      if (got === undefined) stillOpen.push(q);
      else detail.push({ id: q.id, stage: "decide", got, ok: "value" in q.expect ? matches(got, q.expect.value) : false });
    }
  }
  // what's left: the profile check (answers only what follows from the profile, quoting it)
  const askable = stillOpen.filter((q) => answerable(q.label, q.type));
  if (askable.length) {
    const brief = profileBrief(sampleProfile());
    const details = detailsBrief(SAMPLE_DETAILS, "all");
    const asked = askable.map((q) => ({ label: q.label, type: q.type, options: q.options }));
    const { output } = await runStructured({ userId, agent: "runner", tier: tier === "expert" ? "expert" : "cheap", promptVersion: "profile-answers-v1-eval", system: INFER_SYSTEM, prompt: inferPrompt(brief, details, "MSc Finance at Eval University, Canada", asked), schema: Inferred, maxTokens: 1500, lessons: false });
    const ok = acceptInferred(output, asked, `${brief}\n${details}\nMSc Finance at Eval University, Canada`);
    askable.forEach((q, i) => {
      const a = ok.get(i);
      if (a) detail.push({ id: q.id, stage: "profile", got: a.value, ok: "value" in q.expect ? matches(a.value, q.expect.value) : false });
    });
  }
  for (const q of left) if (!detail.some((d) => d.id === q.id)) detail.push({ id: q.id, stage: "asked", ok: "ask" in q.expect });
  const count = (f: (d: (typeof detail)[number], q: (typeof QUESTIONS)[number]) => boolean) => detail.filter((d) => f(d, QUESTIONS.find((q) => q.id === d.id)!)).length;
  return {
    tier,
    at: new Date().toISOString(),
    total: left.length,
    correct: count((d, q) => d.stage !== "asked" && "value" in q.expect && d.ok),
    wrong: count((d, q) => d.stage !== "asked" && "value" in q.expect && !d.ok),
    asked_ok: count((d, q) => d.stage === "asked" && "ask" in q.expect),
    filled_should_ask: count((d, q) => d.stage !== "asked" && "ask" in q.expect),
    left: count((d, q) => d.stage === "asked" && "value" in q.expect),
    detail,
  };
}
