import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages/messages";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type * as z from "zod/v4";
import { admin } from "@/lib/supabase/admin";

export const MODELS = {
  // heavy reasoning: strategy, essays, red team
  deep: process.env.AGENT_MODEL_DEEP ?? "claude-opus-5-5",
  // everyday agent work: extraction, recon, follow-ups
  fast: process.env.AGENT_MODEL_FAST ?? "claude-sonnet-5-5",
} as const;

let client: Anthropic | null = null;
function llm() {
  if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY
  return client;
}

interface RunArgs<S extends z.ZodType> {
  userId: string;
  agent: string;
  jobId?: string;
  tier?: keyof typeof MODELS;
  promptVersion?: string;
  system: string;
  prompt: string | ContentBlockParam[];
  schema: S;
  maxTokens?: number;
  // thinking eats into max_tokens; off by default so structured output gets the full budget
  think?: boolean;
}

// one structured call, logged to agent_runs. returns parsed output + run id for event linking.
export async function runStructured<S extends z.ZodType>(args: RunArgs<S>): Promise<{ output: z.infer<S>; runId: string }> {
  const db = admin();
  const model = MODELS[args.tier ?? "fast"];
  const { data: run, error } = await db
    .from("agent_runs")
    .insert({
      user_id: args.userId,
      job_id: args.jobId ?? null,
      agent: args.agent,
      model,
      prompt_version: args.promptVersion ?? "v1",
      // never store file bytes in the run log, just a marker
      input: {
        system: args.system,
        prompt:
          typeof args.prompt === "string"
            ? args.prompt
            : args.prompt.map((b) => (b.type === "text" ? b : { type: b.type, omitted: true })),
      },
    })
    .select("id")
    .single();
  if (error) throw new Error(`agent_runs insert failed: ${error.message}`);

  try {
    // stream so long outputs never hit http timeouts; parse ourselves so failures say why
    const msg = await llm()
      .messages.stream({
        model,
        max_tokens: (args.maxTokens ?? 8000) + (args.think ? 16000 : 0),
        system: args.system,
        messages: [{ role: "user", content: args.prompt }],
        thinking: args.think ? { type: "adaptive" } : { type: "disabled" },
        output_config: { format: zodOutputFormat(args.schema) },
      })
      .finalMessage();
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    if (msg.stop_reason !== "end_turn") {
      throw new Error(`model stopped early (stop_reason=${msg.stop_reason}, ${msg.usage.output_tokens} output tokens)`);
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (pe) {
      throw new Error(`unparseable output (${String(pe)}); tail: ${text.slice(-200)}`);
    }
    const checked = args.schema.safeParse(json);
    if (!checked.success) throw new Error(`output failed schema: ${checked.error.message.slice(0, 500)}`);
    const output = checked.data;
    await db
      .from("agent_runs")
      .update({
        status: "done",
        output,
        input_tokens: msg.usage.input_tokens,
        output_tokens: msg.usage.output_tokens,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    return { output: output as z.infer<S>, runId: run.id as string };
  } catch (e) {
    await db
      .from("agent_runs")
      .update({ status: "failed", error: String(e), finished_at: new Date().toISOString() })
      .eq("id", run.id);
    throw e;
  }
}
