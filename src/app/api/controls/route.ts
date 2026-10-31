import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { USER_SETTABLE } from "@/lib/dial";
import { queueRunner } from "@/agents/runner";
import { enqueue } from "@/lib/queue";
import { drain } from "@/lib/jobs";
import { requeueAfterPause, sweepOrphans } from "@/lib/requeue";
import { after } from "next/server";

// the applicant's own controls: stop button, autonomy dial, fee envelope, digest
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("pause"), scope: z.enum(["all", "school"]).default("all"), school_id: z.string().uuid().optional() }),
  z.object({ action: z.literal("resume"), ripcord_id: z.string().uuid().optional() }),
  z.object({ action: z.literal("set_grant"), capability: z.string(), mode: z.enum(["auto", "auto_undo", "approve", "deny"]) }),
  z.object({ action: z.literal("set_fee_envelope"), usd: z.number().int().min(0).max(5000) }),
  z.object({ action: z.literal("set_digest"), enabled: z.boolean() }),
  z.object({ action: z.literal("retry_runner") }),
  z.object({ action: z.literal("check_inbox") }),
]);

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const uid = auth.user.id;
  const db = admin();
  const b = parsed.data;

  if (b.action === "pause") {
    if (b.scope === "school" && !b.school_id) return NextResponse.json({ error: "which school?" }, { status: 400 });
    await db.from("ripcords").insert({ user_id: uid, scope_kind: b.scope, scope_value: b.scope === "school" ? b.school_id : null });
    // stop queued agent work now, not just new actions
    if (b.scope === "all") {
      await db.from("jobs").update({ status: "cancelled" }).eq("user_id", uid).eq("status", "queued").neq("task", "digest");
      await db.from("messages").update({ status: "draft", send_after: null, last_error: "held: you paused agents" }).eq("user_id", uid).eq("status", "scheduled").is("approved_by_user_at", null);
    }
    await logEvent({ userId: uid, actor: "user", action: "controls.paused", schoolId: b.school_id ?? null, context: { scope: b.scope } });
    return NextResponse.json({ ok: true });
  }

  if (b.action === "resume") {
    let q = db.from("ripcords").update({ active: false, released_at: new Date().toISOString() }).eq("user_id", uid).eq("active", true).select("created_at, scope_kind");
    if (b.ripcord_id) q = q.eq("id", b.ripcord_id);
    const { data: released } = await q;
    // put back what the pause cancelled: other agents' jobs, and portal runs left marked ready with no job
    const since = (released ?? []).filter((r) => r.scope_kind === "all").map((r) => r.created_at as string).sort()[0];
    if (since) await requeueAfterPause(uid, new Date(Date.parse(since) - 2 * 86_400_000).toISOString()).catch(() => 0);
    await sweepOrphans().catch(() => 0);
    await logEvent({ userId: uid, actor: "user", action: "controls.resumed", context: { ripcord: b.ripcord_id ?? "all" } });
    return NextResponse.json({ ok: true });
  }

  if (b.action === "set_grant") {
    const allowed = USER_SETTABLE[b.capability];
    if (!allowed) return NextResponse.json({ error: "that one always needs you" }, { status: 400 });
    if (!allowed.includes(b.mode)) return NextResponse.json({ error: "not an option for this" }, { status: 400 });
    const { error } = await db.from("grants").update({ mode: b.mode, updated_at: new Date().toISOString() }).eq("user_id", uid).eq("capability", b.capability);
    if (error) return NextResponse.json({ error: "couldn't save" }, { status: 400 });
    await logEvent({ userId: uid, actor: "user", action: "controls.dial_changed", capability: b.capability, context: { mode: b.mode } });
    return NextResponse.json({ ok: true });
  }

  if (b.action === "set_fee_envelope") {
    const cents = b.usd * 100;
    await db.from("profiles").update({ fee_envelope_cents: cents }).eq("id", uid);
    await db.from("grants").update({ ceiling_cents: cents }).eq("user_id", uid).eq("capability", "spend.app_fee");
    await logEvent({ userId: uid, actor: "user", action: "controls.fee_envelope", context: { usd: b.usd } });
    return NextResponse.json({ ok: true });
  }

  if (b.action === "check_inbox") {
    await enqueue({ userId: uid, agent: "system", task: "inbox", idempotencyKey: `inbox:${uid}:now:${Math.floor(Date.now() / 60_000)}` });
    after(() => drain("inline-inbox", 1).catch(() => {}));
    return NextResponse.json({ ok: true });
  }

  if (b.action === "retry_runner") {
    const { data: stuck } = await db.from("applications").select("id").eq("user_id", uid).eq("status", "packet_approved").in("runner_status", ["needs_you", "failed"]);
    for (const a of stuck ?? []) await queueRunner(uid, a.id);
    after(() => fetch(`${req.nextUrl.origin}/api/runner/work`, { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }, signal: AbortSignal.timeout(8000) }).then(() => undefined, () => undefined));
    return NextResponse.json({ ok: true, queued: stuck?.length ?? 0 });
  }

  await db.from("profiles").update({ digest_enabled: b.enabled }).eq("id", uid);
  return NextResponse.json({ ok: true });
}
