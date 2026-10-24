import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ContentBlock } from "@anthropic-ai/sdk/resources/messages/messages";
import { admin } from "@/lib/supabase/admin";
import { MODELS } from "@/lib/llm";

// web research with claude's server-side search + fetch tools.
// returns free-text findings plus every url seen; a second structured call turns that into data.
// kept separate from runStructured so a research failure never corrupts structured output.

let client: Anthropic | null = null;
const llm = () => (client ??= new Anthropic());

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
}): Promise<ResearchResult> {
  const db = admin();
  const model = MODELS.fast;
  const { data: run, error } = await db
    .from("agent_runs")
    .insert({
      user_id: args.userId,
      job_id: args.jobId ?? null,
      agent: args.agent,
      model,
      prompt_version: "research-v1",
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

  try {
    // the server runs the search loop; long turns come back as pause_turn and we continue them
    for (let round = 0; round < 6; round++) {
      const msg = await llm().messages.create({
        model,
        max_tokens: 16000,
        system: args.system,
        messages,
        tools: [
          { type: "web_search_20250305", name: "web_search", max_uses: args.maxSearches ?? 8 },
          { type: "web_fetch_20250910", name: "web_fetch", max_uses: args.maxFetches ?? 6, max_content_tokens: 5000 },
        ],
      });
      inTok += msg.usage.input_tokens;
      outTok += msg.usage.output_tokens;
      searches += msg.usage.server_tool_use?.web_search_requests ?? 0;
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
    const text = textParts.join("").trim();
    if (!text) throw new Error("research returned no findings");

    await db
      .from("agent_runs")
      .update({
        status: "done",
        output: { text: text.slice(0, 20000), sources: [...sources].slice(0, 50), searches },
        input_tokens: inTok,
        output_tokens: outTok,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    return { text, sources: [...sources], runId: run.id as string, searches };
  } catch (e) {
    await db
      .from("agent_runs")
      .update({ status: "failed", error: String(e), finished_at: new Date().toISOString() })
      .eq("id", run.id);
    throw e;
  }
}
