import "server-only";
import * as z from "zod/v4";
import type { Handler } from "./index";
import { runStructured } from "@/lib/llm";
import { logEvent } from "@/lib/events";
import { runDigest } from "@/lib/digest";
import { checkInbox } from "@/lib/inbox";
import { remind, say } from "@/lib/followups";
import { notify } from "@/lib/notify";
import { runWeekly } from "@/lib/weekly";

// smoke test for the whole loop: queue -> worker -> claude -> agent_runs -> events.
const PingOut = z.object({ status: z.literal("ok"), note: z.string() });

export const system: Record<string, Handler> = {
  "system.ping": async (job) => {
    const { output, runId } = await runStructured({
      userId: job.user_id,
      agent: "system",
      jobId: job.id,
      system: "you are a health check. reply with status ok and a five word note.",
      prompt: "ping",
      tier: "cheap",
      schema: PingOut,
      maxTokens: 200,
    });
    await logEvent({ userId: job.user_id, actor: "agent:system", action: "system.pinged", agentRunId: runId, context: output });
    return output;
  },
  // the morning digest: deterministic, no model call
  "system.digest": async (job) => runDigest(job.user_id),
  // school emails: read, classify, queue what needs the applicant
  "system.inbox": async (job) => checkInbox(job.user_id, job.id),
  // the monday report from Ivyward AI
  "system.weekly": async (job) => runWeekly(job.user_id),
  // a reminder Ivyward AI set (an event tomorrow, in an hour, a deadline in two days)
  "system.remind": async (job) => {
    const p = job.payload as { followupId?: string; when?: string; title?: string; body?: string; href?: string };
    if (p.followupId) return remind(job.user_id, p.followupId, p.when ?? "day");
    if (p.title) {
      await notify({ userId: job.user_id, key: `remind:${job.id}`, kind: "reminder", urgent: true, title: p.title, body: p.body, href: p.href ?? "/dashboard", actionLabel: "Open", email: true });
      await say(job.user_id, `Reminder: ${p.title}${p.body ? `. ${p.body}` : ""}`);
    }
    return { reminded: true };
  },
};
