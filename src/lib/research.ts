import "server-only";
import type { MessageParam, ContentBlock } from "@anthropic-ai/sdk/resources/messages/messages";
import { admin } from "@/lib/supabase/admin";
import { MODELS, llm, cachedSystem } from "@/lib/llm";
import { assertBudget } from "@/lib/budget";
import { lessonsFor } from "@/lib/lessons";
import { costOf, type Usage } from "@/lib/pricing";

// web research with claude's server-side search + fetch tools.
// returns free-text findings plus every url seen; a second structured call turns that into data.
// kept separate from runStructured so a research failure never corrupts structured output.


export interface ResearchResult {
  text: string;
  sources: string[];
  runId: string;
  searches: number;
}

export async function research(args: {
  userId: string;
  agent: string;
  jobId?: string;
  system: string;
  prompt: string;
  maxSearches?: number;
  maxFetches?: number;
  topic?: string | null;
}): Promise<ResearchResult> {
  await assertBudget(args.userId, args.agent);
  // what's been learned about researching for this agent (and this applicant)
  const learned = await lessonsFor({ agent: args.agent, task: "research", topic: args.topic ?? null, userId: args.userId });
  if (learned.text) args = { ...args, system: `${args.system}\n\n${learned.text}` };
  const db = admin();
  // research loops read a lot of web content: they run on the cheap tier
  const model = MODELS.cheap;
  const { data: run, error } = await db
    .from("agent_runs")
    .insert({
      user_id: args.userId,
      job_id: args.jobId ?? null,
      agent: args.agent,
      model,
      prompt_version: "research-v1",
      ...(learned.ids.length ? { lesson_ids: learned.ids } : {}),
      input: { system: args.system, prompt: args.prompt },
    })
    .select("id")
    .single();
  if (error) throw new Error(`agent_runs insert failed: ${error.message}`);

  const messages: MessageParam[] = [{ role: "user", content: args.prompt }];
  const content: ContentBlock[] = [];
  let inTok = 0;
  let outTok = 0;
  let searches = 0;
  let cost = 0;

  try {
    // the server runs the search loop; long turns come back as pause_turn and we continue them
    for (let round = 0; round < 4; round++) {
      const msg = await llm().messages.create({
        model,
        max_tokens: 8000,
        system: cachedSystem(args.system),
        messages,
        tools: [
          { type: "web_search_20250305", name: "web_search", max_uses: args.maxSearches ?? 8 },
          { type: "web_fetch_20250910", name: "web_fetch", max_uses: args.maxFetches ?? 6, max_content_tokens: 5000 },
        ],
      });
      inTok += msg.usage.input_tokens + (msg.usage.cache_read_input_tokens ?? 0) + (msg.usage.cache_creation_input_tokens ?? 0);
      outTok += msg.usage.output_tokens;
      searches += msg.usage.server_tool_use?.web_search_requests ?? 0;
      cost += costOf(model, msg.usage as Usage);
      content.push(...msg.content);
      if (msg.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: msg.content });
    }

    const sources = new Set<string>();
    const textParts: string[] = [];
    for (const b of content) {
      if (b.type === "text") {
        textParts.push(b.text);
        for (const c of b.citations ?? []) if ("url" in c && c.url) sources.add(c.url);
      } else if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
        for (const r of b.content) if (r.type === "web_search_result") sources.add(r.url);
      } else if (b.type === "web_fetch_tool_result") {
        const url = (b.content as { url?: string }).url;
        if (url) sources.add(url);
      }
    }
    let text = textParts.join("").trim();
    // the loop can end mid-research with nothing written: ask for the findings once, no tools, so the reading isn't wasted
    if (!text) {
      const msg = await llm().messages.create({
        model,
        max_tokens: 4000,
        system: cachedSystem(args.system),
        messages: [...messages, { role: "assistant", content: content.slice(-40) as MessageParam["content"] }, { role: "user", content: "stop searching. write up everything you found so far, with source urls." }],
      });
      inTok += msg.usage.input_tokens + (msg.usage.cache_read_input_tokens ?? 0) + (msg.usage.cache_creation_input_tokens ?? 0);
      outTok += msg.usage.output_tokens;
      cost += costOf(model, msg.usage as Usage);
      text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    }
    if (!text) throw new Error("research returned no findings");

    await db
      .from("agent_runs")
      .update({
        status: "done",
        output: { text: text.slice(0, 20000), sources: [...sources].slice(0, 50), searches },
        input_tokens: inTok,
        output_tokens: outTok,
        cost_usd: cost,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    return { text, sources: [...sources], runId: run.id as string, searches };
  } catch (e) {
    await db
      .from("agent_runs")
      .update({ status: "failed", error: String(e), input_tokens: inTok, output_tokens: outTok, cost_usd: cost, finished_at: new Date().toISOString() })
      .eq("id", run.id);
    throw e;
  }
}
