import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent, recordOutcome } from "@/lib/events";
import { schedule, cancel } from "@/lib/outbox";

// outreach drafts: the applicant edits, then sends through their connected gmail (with a short undo),
// or sends from their own email client and tells us it went out.
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), subject: z.string().trim().min(1).max(300), body: z.string().trim().min(1).max(8000), to_email: z.string().trim().max(200) }),
  z.object({ action: z.literal("mark_sent") }),
  z.object({ action: z.literal("send") }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("discard") }),
  z.object({ action: z.literal("log_reply"), outcome: z.enum(["replied", "waived", "aid_increased", "declined", "no_reply"]) }),
]);

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { id } = await ctx.params;
  const uid = auth.user.id;
  const db = admin();
  const { data: m } = await db.from("messages").select("id, thread_id, purpose, status, threads(application_id)").eq("id", id).eq("user_id", uid).maybeSingle();
  if (!m) return NextResponse.json({ error: "not found" }, { status: 404 });
  const applicationId = (m.threads as unknown as { application_id: string | null } | null)?.application_id ?? null;
  const b = parsed.data;

  if (b.action === "save") {
    await db.from("messages").update({ subject: b.subject, body: b.body, to_email: b.to_email || null }).eq("id", id);
    await db.from("threads").update({ subject: b.subject }).eq("id", m.thread_id);
    return NextResponse.json({ ok: true });
  }
  if (b.action === "send") {
    const r = await schedule(uid, id, "user");
    return r.ok ? NextResponse.json({ ok: true, sendAt: r.sendAt }) : NextResponse.json({ error: r.reason }, { status: 400 });
  }
  if (b.action === "cancel") {
    return (await cancel(uid, id)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "too late: it already went out" }, { status: 409 });
  }
  if (b.action === "discard") {
    await db.from("messages").update({ status: "cancelled" }).eq("id", id);
    await db.from("threads").update({ status: "closed" }).eq("id", m.thread_id);
    return NextResponse.json({ ok: true });
  }
  if (b.action === "mark_sent") {
    await db.from("messages").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", id);
    await db.from("threads").update({ status: "open" }).eq("id", m.thread_id);
    const eventId = await logEvent({ userId: uid, actor: "user", action: "email.sent", applicationId, channel: "email", context: { purpose: m.purpose, messageId: id } });
    await recordOutcome({ userId: uid, eventId, applicationId: applicationId ?? undefined, kind: "proxy", label: "sent", source: "user" });
    return NextResponse.json({ ok: true });
  }
  // log_reply: outcome data for the learning loop
  await db.from("threads").update({ status: b.outcome === "no_reply" ? "stale" : "closed" }).eq("id", m.thread_id);
  await recordOutcome({ userId: uid, applicationId: applicationId ?? undefined, kind: b.outcome === "waived" || b.outcome === "aid_increased" ? "final" : "proxy", label: `${m.purpose}:${b.outcome}`, source: "user" });
  await logEvent({ userId: uid, actor: "user", action: "email.outcome", applicationId, context: { purpose: m.purpose, outcome: b.outcome } });
  return NextResponse.json({ ok: true });
}
