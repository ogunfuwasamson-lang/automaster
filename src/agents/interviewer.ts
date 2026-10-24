import "server-only";
import * as z from "zod/v4";
import { admin } from "@/lib/supabase/admin";
import { runStructured } from "@/lib/llm";
import { WirePatch, fromWire, WIRE_GUIDE, profileGaps, completeness } from "@/lib/profile";
import { applyPatch, getProfile } from "@/lib/profile-store";
import { logEvent } from "@/lib/events";

const TurnOut = z.object({
  reply: z.string(), // what gets said back. spoken aloud, so short.
  patch: WirePatch, // only facts the user just stated
  wrap_up: z.boolean(), // true when the priority gaps are covered
});

const SYSTEM = `you are the intake interviewer on a platform that runs a US masters application cycle for one applicant.
your job: fill the gaps in their profile through a natural spoken conversation, so the other agents can build a shortlist, write essays, and hunt funding.

how you talk:
- your reply is read aloud. keep it under 45 words. one question per turn.
- plain, direct, a little warm. no flattery, no "great answer", no filler.
- briefly acknowledge what they said only when it helps the flow, then ask the next thing.
- if an answer is vague, follow up once for specifics. for stories, push for numbers: how many, how much, how fast, compared to what.
- never ask for something the profile or documents already answer. if something there looks wrong or conflicting, ask to confirm it.
- work through the gap list roughly in priority order, but follow the thread when they open up something useful for essays.
- if they ask you something, answer in a sentence and steer back. you are not the strategist; don't give school advice yet.
- never ask for passport numbers, ID numbers, bank details, or passwords.

the patch:
- only facts the user stated in their latest message, or confirmed in it. never infer or pad. leave everything else null or omitted.
- if they correct an earlier fact, put the corrected value in the patch.
- if they say they have no preference on locations, set preferences.locations to [].
- stories: one per concrete episode, title as a short handle, metrics exactly as they said them.

wrap_up: true only when the gap list is empty or the user says they want to stop. then say what you've got in one sentence and that they can come back anytime.

${WIRE_GUIDE}`;

export interface Turn {
  role: "agent" | "user";
  content: string;
}

export async function interviewTurn(userId: string, sessionId: string, userText: string | null, viaVoice: boolean) {
  const db = admin();

  if (userText) {
    await db.from("interview_turns").insert({ user_id: userId, session_id: sessionId, role: "user", content: userText, via_voice: viaVoice });
  }

  const [profile, { data: history }, { data: docs }] = await Promise.all([
    getProfile(userId),
    db.from("interview_turns").select("role, content").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
    db.from("documents").select("filename, extracted").eq("user_id", userId).eq("status", "extracted"),
  ]);
  const transcript = (history ?? []).reverse() as Turn[];
  const gaps = profileGaps(profile);

  const prompt = `profile so far:
${JSON.stringify(profile)}

documents on file:
${(docs ?? []).map((d) => `- ${d.filename}: ${(d.extracted as { summary?: string } | null)?.summary ?? ""}`).join("\n") || "(none yet)"}

gaps, highest priority first:
${gaps.map((g, i) => `${i + 1}. [${g.key}] ${g.ask}`).join("\n") || "(none: wrap up)"}

recent conversation (oldest first):
${transcript.map((t) => `${t.role === "agent" ? "you" : "applicant"}: ${t.content}`).join("\n") || "(this is the start. open with one line on what this is, then the first question.)"}

${userText ? `latest from applicant: ${userText}` : "the applicant just opened the interview. greet them and ask the first question."}`;

  const { output, runId } = await runStructured({
    userId,
    agent: "interviewer",
    promptVersion: "interview-v1",
    system: SYSTEM,
    prompt,
    schema: TurnOut,
    maxTokens: 3000,
  });

  let updated = profile;
  const patch = fromWire(output.patch);
  const patchKeys = Object.keys(patch);
  if (patchKeys.length) {
    updated = await applyPatch(userId, patch, { actor: "agent:interviewer", label: "interview", agentRunId: runId });
  }

  await db.from("interview_turns").insert({ user_id: userId, session_id: sessionId, role: "agent", content: output.reply });
  await logEvent({
    userId,
    actor: "agent:interviewer",
    action: "interview.turn",
    agentRunId: runId,
    channel: viaVoice ? "voice" : "text",
    context: { sessionId, patched: patchKeys, wrapUp: output.wrap_up },
  });

  return { reply: output.reply, wrapUp: output.wrap_up, completeness: completeness(updated), gapsLeft: profileGaps(updated).length };
}
