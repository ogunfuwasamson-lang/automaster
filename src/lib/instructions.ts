import "server-only";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";

// what the applicant has told the agents about one application, in their own words ("skip the optional diversity
// section", "use my Lagos address, not the Abuja one"). kept as events: an append-only record of who said what,
// and when, that the navigator and the form-filler read on every run. a removed one is a later event.

export type Instruction = { id: string; text: string; at: string; via: string };

export const MAX_INSTRUCTIONS = 8;
export const cleanInstruction = (t: string) => t.replace(/\s+/g, " ").trim().slice(0, 300);

export async function instructions(applicationId: string): Promise<Instruction[]> {
  const { data } = await admin().from("events").select("id, action, context, created_at").eq("application_id", applicationId).in("action", ["runner.instruction", "runner.instruction_removed"]).order("created_at", { ascending: true }).limit(200);
  const live = new Map<string, Instruction>();
  for (const e of data ?? []) {
    const c = (e.context ?? {}) as { text?: string; of?: string; via?: string };
    if (e.action === "runner.instruction" && c.text) live.set(e.id as string, { id: e.id as string, text: c.text, at: e.created_at as string, via: c.via ?? "web" });
    if (e.action === "runner.instruction_removed" && c.of) live.delete(c.of);
  }
  return [...live.values()].slice(-MAX_INSTRUCTIONS);
}

export async function addInstruction(userId: string, applicationId: string, text: string, via: "web" | "chrome") {
  const t = cleanInstruction(text);
  if (t.length < 3) throw new Error("say a little more");
  if ((await instructions(applicationId)).length >= MAX_INSTRUCTIONS) throw new Error(`at most ${MAX_INSTRUCTIONS} instructions per application: remove one first`);
  await logEvent({ userId, actor: "user", action: "runner.instruction", applicationId, channel: via === "chrome" ? "portal" : "app", context: { text: t, via } });
}

export async function removeInstruction(userId: string, applicationId: string, id: string) {
  await logEvent({ userId, actor: "user", action: "runner.instruction_removed", applicationId, context: { of: id } });
}

// as the models see them: the applicant's own words, to follow unless they'd make the application wrong or untrue
export function instructionBlock(list: { text: string }[]) {
  if (!list.length) return "";
  return `the applicant's own instructions for this application (follow them, unless following one would put something untrue on the form, skip a required answer, pay, withdraw or submit without the signed packet; then don't, and say so in your note):\n${list.map((i) => `- ${i.text}`).join("\n")}\n`;
}
