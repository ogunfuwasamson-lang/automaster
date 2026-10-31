import "server-only";
import { lessonsFor, taskOf } from "@/lib/lessons";
import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlockParam, Message, TextBlockParam } from "@anthropic-ai/sdk/resources/messages/messages";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type * as z from "zod/v4";
import { admin } from "@/lib/supabase/admin";
import { assertBudget } from "@/lib/budget";
import { costOf } from "@/lib/pricing";

// model tiers, chosen for a $25/user/month budget:
// - write: essays, red team, strategy, profile cleanup. quality matters, volume is low.
// - chat:  the interviewer. conversational quality matters, calls are small.
// - cheap: web research loops and turning notes into structured data. this is where the tokens go,
//          so it runs on haiku (~20x cheaper than sonnet).
export const MODELS = {
  write: process.env.AGENT_MODEL_WRITE ?? "claude-sonnet-5-5",
  chat: process.env.AGENT_MODEL_CHAT ?? "claude-sonnet-5-5",
  cheap: process.env.AGENT_MODEL_CHEAP ?? "claude-haiku-5-5",
} as const;
export type Tier = keyof typeof MODELS;

let client: Anthropic | null = null;
export function llm() {
  if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY
  return client;
}

// system prompts are stable per agent: mark them cacheable so repeat calls pay ~5% for them
export function cachedSystem(text: string): TextBlockParam[] {
  return [{ type: "text", text, cache_control: { type: "ephemeral" } }];
}

export async function recordUsage(runId: string, model: string, msg: Pick<Message, "usage">, extra: Record<string, unknown> = {}) {
  await admin()
    .from("agent_runs")
    .update({
      input_tokens: msg.usage.input_tokens + (msg.usage.cache_read_input_tokens ?? 0) + (msg.usage.cache_creation_input_tokens ?? 0),
      output_tokens: msg.usage.output_tokens,
      cost_usd: costOf(model, msg.usage),
      ...extra,
    })
    .eq("id", runId);
}

interface RunArgs<S extends z.ZodType> {
  userId: string;
  agent: string;
  jobId?: string;
  tier?: Tier;
  promptVersion?: string;
  system: string;
  // stable context reused across calls (fact sheet, brief): sent first and cached
  cachePrefix?: string;
  prompt: string | ContentBlockParam[];
  schema: S;
  maxTokens?: number;
  // the portal host or school the call is about, so lessons about that place come along
  topic?: string | null;
  // false for the learning loop's own calls
  lessons?: boolean;
}

// one structured call: budget-checked, metered, logged to agent_runs.
export async function runStructured<S extends z.ZodType>(args: RunArgs<S>): Promise<{ output: z.infer<S>; runId: string }> {
  await assertBudget(args.userId, args.agent);
  const db = admin();
  const model = MODELS[args.tier ?? "write"];
  // what the agents have learned that applies to this call
  const learned = args.lessons === false ? { ids: [], text: "" } : await lessonsFor({ agent: args.agent, task: taskOf(args.promptVersion), topic: args.topic ?? null, userId: args.userId });
  if (learned.text) args = { ...args, system: `${args.system}\n\n${learned.text}` };
  const { data: run, error } = await db
    .from("agent_runs")
    .insert({
      user_id: args.userId,
      job_id: args.jobId ?? null,
      agent: args.agent,
      model,
      prompt_version: args.promptVersion ?? "v1",
      ...(learned.ids.length ? { lesson_ids: learned.ids } : {}),
      // never store file bytes in the run log, just a marker
      input: {
        system: args.system.slice(0, 4000),
        prompt:
          typeof args.prompt === "string"
            ? args.prompt.slice(0, 20000)
            : args.prompt.map((b) => (b.type === "text" ? { type: "text", text: b.text.slice(0, 20000) } : { type: b.type, omitted: true })),
      },
    })
    .select("id")
    .single();
  if (error) throw new Error(`agent_runs insert failed: ${error.message}`);

  const content: ContentBlockParam[] = [
    ...(args.cachePrefix ? [{ type: "text" as const, text: args.cachePrefix, cache_control: { type: "ephemeral" as const } }] : []),
    ...(typeof args.prompt === "string" ? [{ type: "text" as const, text: args.prompt }] : args.prompt),
  ];

  let msg: Message | null = null;
  try {
    // stream so long outputs never hit http timeouts; parse ourselves so failures say why.
    // an answer cut off by the token limit comes back as unparseable json: ask once more with room to finish.
    let limit = args.maxTokens ?? 8000;
    for (let attempt = 0; ; attempt++) {
      try {
        msg = await llm()
          .messages.stream({
            model,
            max_tokens: limit,
            system: cachedSystem(args.system),
            messages: [{ role: "user", content }],
            // sonnet/opus 5.5 think by default (and it eats max_tokens): turn it off. haiku doesn't take the setting.
            ...(model.includes("haiku") ? {} : { thinking: { type: "between_tools" as const } }),
            output_config: { format: zodOutputFormat(args.schema) },
          })
          .finalMessage();
        if (msg.stop_reason === "max_tokens" && attempt === 0) throw new Error("Failed to parse structured output: cut off");
        break;
      } catch (e) {
        if (attempt === 0 && /Failed to parse structured output|max_tokens/i.test(String(e))) {
          limit = Math.min(16_000, Math.max(limit * 3, 2000));
          continue;
        }
        throw e;
      }
    }
    if (!msg) throw new Error("no response from the model");
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
    await recordUsage(run.id, model, msg, { status: "done", output, finished_at: new Date().toISOString() });
    return { output: output as z.infer<S>, runId: run.id as string };
  } catch (e) {
    // a failed call that reached the model was still billed: meter it
    if (msg) await recordUsage(run.id, model, msg, {});
    await db.from("agent_runs").update({ status: "failed", error: String(e), finished_at: new Date().toISOString() }).eq("id", run.id);
    throw e;
  }
}
