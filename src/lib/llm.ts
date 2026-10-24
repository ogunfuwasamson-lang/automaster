import "server-only";
import Anthropic from "@anthropic-ai/sdk";
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
  prompt: string;
  schema: S;
  maxTokens?: number;
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
      input: { system: args.system, prompt: args.prompt },
    })
    .select("id")
    .single();
  if (error) throw new Error(`agent_runs insert failed: ${error.message}`);

  try {
    const msg = await llm().messages.parse({
      model,
      max_tokens: args.maxTokens ?? 8000,
      system: args.system,
      messages: [{ role: "user", content: args.prompt }],
      output_config: { format: zodOutputFormat(args.schema) },
    });
    const output = msg.parsed_output;
    if (output == null) throw new Error(`model returned no parseable output (stop_reason=${msg.stop_reason})`);
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
