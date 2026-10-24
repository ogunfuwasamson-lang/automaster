import "server-only";
import * as z from "zod/v4";
import type { Handler } from "./index";
import { admin } from "@/lib/supabase/admin";
import { runStructured } from "@/lib/llm";
import { WirePatch, WIRE_GUIDE, fromWire, loadProfile, rebuildProfile } from "@/lib/profile";
import { logEvent } from "@/lib/events";
import { enqueue } from "@/lib/queue";

// the curator keeps one clean, consistent profile out of many messy sources:
// several CV versions, old essays, the interview. it never decides a disputed fact itself;
// disagreements go to the user as one-tap choices.

const CurateOut = z.object({
  profile: WirePatch, // the complete cleaned profile, not a diff
  conflicts: z.array(
    z.object({
      topic: z.string(), // short and stable: "Trove enterprise campaign volume"
      options: z.array(z.string()), // each option exactly as a source states it
      context: z.string(), // where each option came from, one line
    }),
  ),
  changes: z.string(), // two or three plain lines on what was cleaned
});

const SYSTEM = `you are the curator agent on a US masters application platform. you turn a messy applicant profile into one clean, consistent record that essay writers and recruiters-of-schools can rely on.

the profile was assembled from several CV versions, old essays, letters, and an interview, so it has duplicates and contradictions.

output the COMPLETE cleaned profile (it replaces the old one), plus a list of conflicts.

merging rules:
- one work entry per actual job. the same employer under different names ("Trove Finance Ltd", "Trove Technology Ltd", "Trove Finance (Trove Technology Ltd)") is one employer; use the fullest official name. the same role phrased differently is one role. a genuine promotion is a separate entry.
- dates: keep explicit dates; if sources disagree on dates, that's a conflict. the interview is the newest source:
  when the applicant said in the interview that they left a job or started a new one, that wins over older CVs.
- order work most recent first.
- highlights: one bullet per distinct achievement, keep the most specific wording, max ~6 per role, strongest first.
- education: one entry per degree. merge GPA, class, dates, country into it. drop secondary school.
- stories: max 8, the strongest, no duplicates, each tied to one role.
- skills: max 25, deduped, no near-synonyms.
- notes: only things useful to an application (awards, certifications, ventures, constraints, preferences). one line each. drop transcript minutiae, certificate numbers, and anything that duplicates a structured field.
- keep every structured fact the profile has (goals, funding, english, preferences, recommenders, identity). never drop them.

conflicts:
- when sources give different numbers, names, dates, or titles for the SAME thing, and no confirmed fact settles it, list it as a conflict with each version as an option, and leave the disputed figure OUT of the cleaned highlight/story (keep the rest of the sentence).
- when a confirmed fact exists for a topic, use its value everywhere and don't list that conflict again.
- don't invent options, don't average, don't pick a side.
- topics must be short and stable so the same conflict isn't raised twice.

never invent facts. if it isn't in the profile, it isn't in the output.

${WIRE_GUIDE}`;

export const curator: Record<string, Handler> = {
  "curator.consolidate": async (job) => {
    const db = admin();
    // one cleanup per user at a time: if another is already running, this one stands down
    const { data: others } = await db
      .from("jobs")
      .select("id")
      .eq("user_id", job.user_id)
      .eq("agent", "curator")
      .eq("task", "consolidate")
      .eq("status", "running")
      .neq("id", job.id)
      .lt("locked_at", new Date().toISOString());
    if (others?.length) {
      await scheduleConsolidate(job.user_id, 180_000);
      return { skipped: "another cleanup is running; rescheduled" };
    }
    const [{ data: row, error }, { data: docs }, { data: pending }] = await Promise.all([
      db.from("profiles").select("profile, updated_at").eq("id", job.user_id).single(),
      db.from("documents").select("filename, extracted").eq("user_id", job.user_id).eq("status", "extracted"),
      db.from("approvals").select("payload").eq("user_id", job.user_id).eq("kind", "fact_confirm").eq("status", "pending"),
    ]);
    if (error || !row) throw new Error("profile not found");
    const current = loadProfile(row.profile);

    const issues = (docs ?? []).flatMap((d) =>
      ((d.extracted as { issues?: string[] } | null)?.issues ?? []).map((i) => `${d.filename}: ${i}`),
    );

    const { output, runId } = await runStructured({
      userId: job.user_id,
      agent: "curator",
      jobId: job.id,
      promptVersion: "curate-v1",
      system: SYSTEM,
      prompt: `current profile (messy):
${JSON.stringify(current)}

confirmed facts (authoritative, apply them):
${current.confirmed_facts.map((f) => `- ${f.topic}: ${f.value}`).join("\n") || "(none)"}

issues the extractor flagged per document:
${issues.map((i) => `- ${i}`).join("\n") || "(none)"}

clean it.`,
      schema: CurateOut,
      maxTokens: 16000,
    });

    const cleaned = rebuildProfile(fromWire(output.profile), current);

    // only write if nobody changed the profile while we were thinking; otherwise retry on fresh data
    const { data: upd, error: uerr } = await db
      .from("profiles")
      .update({ profile: cleaned })
      .eq("id", job.user_id)
      .eq("updated_at", row.updated_at)
      .select("id");
    if (uerr) throw new Error(uerr.message);
    if (!upd?.length) throw new Error("profile changed during cleanup; will retry");

    // raise new conflicts as one-tap choices, skipping ones already pending or settled
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const known = new Set([
      ...current.confirmed_facts.map((f) => norm(f.topic)),
      ...(pending ?? []).map((p) => norm(String((p.payload as { topic?: string }).topic ?? ""))),
    ]);
    const fresh = output.conflicts.filter((c) => c.options.length >= 2 && !known.has(norm(c.topic)));
    if (fresh.length) {
      const { error: aerr } = await db.from("approvals").insert(
        fresh.map((c) => ({
          user_id: job.user_id,
          kind: "fact_confirm",
          title: c.topic,
          summary: c.context,
          payload: { topic: c.topic, options: c.options },
          urgency: 5,
          created_by: "agent:curator",
        })),
      );
      if (aerr) throw new Error(aerr.message);
    }

    await logEvent({
      userId: job.user_id,
      actor: "agent:curator",
      action: "profile.consolidated",
      agentRunId: runId,
      reasoning: output.changes,
      // keep the pre-cleanup profile so nothing is ever unrecoverable
      context: { conflictsRaised: fresh.length, previous: current },
    });
    return { conflicts: fresh.length, work: cleaned.work.length };
  },
};

// debounce: several uploads or confirmations in a row produce one cleanup shortly after the last.
// if a cleanup is already queued, push it back instead of adding another.
export async function scheduleConsolidate(userId: string, delayMs = 120_000) {
  const runAt = new Date(Date.now() + delayMs).toISOString();
  const db = admin();
  const { data: queued } = await db
    .from("jobs")
    .update({ run_at: runAt })
    .eq("user_id", userId)
    .eq("agent", "curator")
    .eq("task", "consolidate")
    .eq("status", "queued")
    .select("id");
  if (queued?.length) return;
  // a cleanup already in flight will pick up the latest data on its retry; queue one follow-up at most
  const { data: running } = await db
    .from("jobs")
    .select("id")
    .eq("user_id", userId)
    .eq("agent", "curator")
    .eq("task", "consolidate")
    .eq("status", "running");
  if (running?.length) {
    await enqueue({ userId, agent: "curator", task: "consolidate", runAt: new Date(Date.now() + Math.max(delayMs, 180_000)) });
    return;
  }
  await enqueue({ userId, agent: "curator", task: "consolidate", runAt: new Date(runAt) });
}
