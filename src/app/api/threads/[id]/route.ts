import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { schedule } from "@/lib/outbox";
import { logEvent } from "@/lib/events";
import { runStructured } from "@/lib/llm";
import { loadProfile } from "@/lib/profile";
import { isEmail } from "@/lib/mime";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read") }),
  z.object({ action: z.literal("reply"), body: z.string().trim().min(1).max(8000), subject: z.string().trim().max(300).optional(), to: z.string().trim().max(200).optional(), send: z.boolean().optional() }),
  z.object({ action: z.literal("draft_ai"), intent: z.enum(["reply", "follow_up"]), notes: z.string().max(600).optional() }),
]);

const Draft = z.object({ subject: z.string(), body: z.string() });

const SYSTEM = `you draft one short email for a university applicant, written in their voice, to an admissions or funding office.
rules: plain, warm, professional. 60 to 180 words. no flattery, no exclamation marks, no invented facts: use only what the conversation and the applicant facts say. never promise anything on the applicant's behalf. sign with the applicant's name. subject: keep the conversation's subject with "Re: " for a reply; for a follow-up, the same subject.
a follow-up politely checks on an earlier email that got no answer, restating the request in one line.`;

type Msg = { direction: "in" | "out"; subject: string | null; body: string; status: string; to_email: string | null; from_email?: string | null; sent_at: string | null; created_at: string };

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { id } = await ctx.params;
  const uid = auth.user.id;
  const db = admin();
  const { data: th } = await db.from("threads").select("id, subject, application_id, contact_id, contacts(email), applications(programs(name, schools(name)))").eq("id", id).eq("user_id", uid).maybeSingle();
  if (!th) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = parsed.data;

  if (b.action === "read") {
    await db.from("messages").update({ read_at: new Date().toISOString() }).eq("thread_id", id).eq("direction", "in").is("read_at", null);
    return NextResponse.json({ ok: true });
  }

  // the conversation so far, oldest first
  const rich = await db.from("messages").select("direction, subject, body, status, to_email, from_email, sent_at, created_at").eq("thread_id", id).neq("status", "cancelled").order("created_at");
  // before the inbox migration the sender column doesn't exist yet
  const plain = rich.error ? await db.from("messages").select("direction, subject, body, status, to_email, sent_at, created_at").eq("thread_id", id).neq("status", "cancelled").order("created_at") : null;
  const list = ((rich.error ? plain?.data : rich.data) ?? []) as Msg[];
  const lastIn = [...list].reverse().find((m) => m.direction === "in");
  const lastOut = [...list].reverse().find((m) => m.direction === "out");
  const contact = (th.contacts as unknown as { email: string } | null)?.email ?? null;
  const to = lastIn?.from_email ?? contact ?? lastOut?.to_email ?? "";
  const subject = th.subject ?? lastIn?.subject ?? lastOut?.subject ?? "";

  if (b.action === "reply") {
    const recipient = (b.to || to).trim();
    if (b.send && !isEmail(recipient)) return NextResponse.json({ error: "add the school's email address first" }, { status: 400 });
    const subj = b.subject || (/^re:/i.test(subject) ? subject : `Re: ${subject}`);
    const { data: m, error: insErr } = await db
      .from("messages")
      .insert({ user_id: uid, thread_id: id, direction: "out", subject: subj, body: b.body, status: "draft", to_email: recipient || null, purpose: "reply" })
      .select("id")
      .single();
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
    await logEvent({ userId: uid, actor: "user", action: "email.reply_drafted", applicationId: th.application_id, channel: "email", context: { threadId: id } });
    if (b.send) {
      const r = await schedule(uid, m.id, "user");
      if (!r.ok) return NextResponse.json({ ok: true, id: m.id, sent: false, error: r.reason });
      return NextResponse.json({ ok: true, id: m.id, sent: true, sendAt: r.sendAt });
    }
    return NextResponse.json({ ok: true, id: m.id, sent: false });
  }

  // draft_ai: write the reply or follow-up, return it for the applicant to edit; nothing is saved or sent
  const { data: prof } = await db.from("profiles").select("profile").eq("id", uid).single();
  const p = loadProfile(prof?.profile);
  const prog = (th.applications as unknown as { programs: { name: string; schools: { name: string } } } | null)?.programs;
  const convo = list
    .slice(-6)
    .map((m) => `[${m.direction === "in" ? "school" : "applicant"}${m.status !== "sent" ? `, ${m.status}` : ""}] ${m.subject ?? ""}\n${m.body.slice(0, 2500)}`)
    .join("\n\n---\n\n");
  const { output } = await runStructured({
    userId: uid,
    agent: "closer",
    promptVersion: "msg-draft-v1",
    tier: "write",
    system: SYSTEM,
    prompt: `applicant: ${p.identity.full_name ?? "the applicant"}${p.identity.citizenship ? `, citizen of ${p.identity.citizenship}` : ""}
applying to: ${prog ? `${prog.name}, ${prog.schools.name}` : "this school"}${p.goals.target_term ? ` for ${p.goals.target_term}` : ""}
task: ${b.intent === "follow_up" ? "a polite follow-up to the applicant's last email, which has had no answer" : "a reply to the school's latest email"}${b.notes ? `\nthe applicant wants it to say: ${b.notes}` : ""}

conversation:
${convo || "(no messages yet)"}`,
    schema: Draft,
    maxTokens: 700,
  });
  return NextResponse.json({ subject: output.subject || (b.intent === "reply" && !/^re:/i.test(subject) ? `Re: ${subject}` : subject), body: output.body, to });
}
