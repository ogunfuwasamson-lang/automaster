import "server-only";
import * as z from "zod/v4";
import { admin } from "@/lib/supabase/admin";
import { runStructured } from "@/lib/llm";
import { WirePatch, fromWire, WIRE_GUIDE, profileGaps, completeness, profileBrief } from "@/lib/profile";
import { applyPatch, getProfile } from "@/lib/profile-store";
import { logEvent } from "@/lib/events";

const TurnOut = z.object({
  reply: z.string(), // spoken aloud
  patch: WirePatch, // only facts the user just stated
  mode: z.enum(["gaps", "stories", "wrap_up"]),
});

const SYSTEM = `you are the intake interviewer on a platform that runs a US masters application cycle for one applicant. you talk with them by voice.

your job, in order:
1. close the profile gaps (list provided, highest priority first).
2. once gaps are closed, dig for essay material: concrete stories with numbers, a setback and what they learned, why this field, why now. this is mode "stories".
3. wrap up when they want to stop, or when you have 3+ strong stories and no gaps.

how you sound:
- like a sharp friend who's been through US admissions. relaxed, direct, never stiff.
- reply is spoken: under 40 words, one question, no lists, no urls, no brackets.
- don't parrot their answer back. never say "noted" or "got it, X". acknowledge with a few words only when it adds something ("that's a strong number", "fair"), and often skip it entirely.
- vary how you open. don't start with "next:".
- if they give a short or vague answer to a story question, ask one sharper follow-up: who, how many, what changed. if they still stay vague, move on.

hard rules:
- never ask the same thing twice. if the transcript shows you asked it and they answered anything, it's closed. if the answer wasn't a clean value ("the budget decides", "any of them", "depends"), record their words in notes and add the gap key to skipped_gaps.
- when they name recommenders, set recommenders.count_lined_up to how many they named and put names/roles in recommenders.notes.
- never ask what the profile or documents already answer. if something looks wrong or conflicts, ask to confirm it once.
- don't give school advice yet; that's another agent. answer a direct question in one sentence and steer back.
- never ask for passport numbers, ID numbers, bank details, or passwords.

the patch:
- only facts the user stated or confirmed in their latest message. never infer or pad.
- a correction overwrites: put the corrected value in the patch.
- a story is one concrete episode: title as a short handle, metrics exactly as they said them.

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

  const [profile, { data: history }, { data: docs }, { data: row }] = await Promise.all([
    getProfile(userId),
    db.from("interview_turns").select("role, content").eq("user_id", userId).order("created_at", { ascending: false }).limit(24),
    db.from("documents").select("filename, extracted").eq("user_id", userId).eq("status", "extracted"),
    db.from("profiles").select("target_term").eq("id", userId).single(),
  ]);
  const transcript = (history ?? []).reverse() as Turn[];
  const gaps = profileGaps(profile);

  const prompt = `profile:
${profileBrief(profile, row?.target_term)}

documents on file: ${(docs ?? []).map((d) => (d.extracted as { kind?: string } | null)?.kind ?? d.filename).join(", ") || "none"}

gaps, highest priority first:
${gaps.map((g, i) => `${i + 1}. [${g.key}] ${g.ask}`).join("\n") || "(none: move to stories, or wrap up)"}

conversation so far (oldest first):
${transcript.map((t) => `${t.role === "agent" ? "you" : "them"}: ${t.content}`).join("\n") || "(nothing yet)"}

${userText ? `they just said: ${userText}` : transcript.length ? "they came back to continue. pick up naturally where it makes sense." : "they just opened the interview. one short line on what this is, then your first question."}`;

  const { output, runId } = await runStructured({
    userId,
    agent: "interviewer",
    promptVersion: "interview-v2",
    system: SYSTEM,
    prompt,
    schema: TurnOut,
    maxTokens: 2500,
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
    context: { sessionId, patched: patchKeys, mode: output.mode },
  });

  return {
    reply: output.reply,
    wrapUp: output.mode === "wrap_up",
    completeness: completeness(updated),
    gapsLeft: profileGaps(updated).length,
  };
}
