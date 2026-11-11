import { resolve } from "@/lib/notify";
import { NextResponse, after, type NextRequest } from "next/server";
import { afterSubmitted } from "@/agents/runner";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent, recordOutcome } from "@/lib/events";
import { enqueue } from "@/lib/queue";
import { drain } from "@/lib/jobs";
import { canTransition, type AppStatus } from "@/lib/app-state";
import { ATTESTATION } from "@/lib/attest";
import { queueRunner } from "@/agents/runner";

export const runtime = "nodejs";
export const maxDuration = 300;

// the applicant's own milestones. none of these are agent actions:
// approving the packet is their attestation; submitting happens on the school's portal; decisions come from the school.
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve_packet"), attest: z.literal(true) }),
  z.object({ action: z.literal("mark_submitted") }),
  z.object({
    action: z.literal("record_decision"),
    decision: z.enum(["interview", "admitted", "waitlisted", "rejected"]),
    aid_amount_usd: z.number().nonnegative().max(1_000_000).optional(),
    aid_note: z.string().max(1000).optional(),
    accept_by: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
]);

const NON_ESSAY = new Set(["strategy", "video_or_interview", "fee_plan", "funding_plan"]);

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { id } = await ctx.params;
  const uid = auth.user.id;
  const db = admin();
  const { data: app } = await db
    .from("applications")
    .select("id, status, program_id, artifacts(id, kind, title, current_version, artifact_versions(version, user_approved_at, content))")
    .eq("id", id)
    .eq("user_id", uid)
    .maybeSingle();
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });
  const status = app.status as AppStatus;
  const b = parsed.data;
  const move = async (to: AppStatus, extra: Record<string, unknown> = {}) => {
    const { error } = await db.from("applications").update({ status: to, ...extra }).eq("id", id);
    if (error) throw new Error(error.message);
  };

  try {
    if (b.action === "approve_packet") {
      if (!["preparing", "ready_for_review"].includes(status)) return NextResponse.json({ error: `can't approve a packet that is ${status}` }, { status: 400 });
      type Art = { id: string; kind: string; title: string; current_version: number; artifact_versions: { version: number; user_approved_at: string | null; content: string }[] };
      const essays = ((app.artifacts ?? []) as unknown as Art[]).filter((a) => !NON_ESSAY.has(a.kind));
      if (!essays.length) return NextResponse.json({ error: "no essays yet" }, { status: 400 });
      const pending = essays.filter((a) => !a.artifact_versions.find((v) => v.version === a.current_version)?.user_approved_at);
      if (pending.length) return NextResponse.json({ error: `approve these first: ${pending.map((p) => p.title).join(", ")}` }, { status: 400 });
      const snapshot = {
        approved_at: new Date().toISOString(),
        pieces: essays.map((a) => {
          const v = a.artifact_versions.find((x) => x.version === a.current_version)!;
          return { artifact_id: a.id, title: a.title, version: a.current_version, words: (v.content.match(/\S+/g) ?? []).length };
        }),
      };
      if (status === "preparing") await move("ready_for_review");
      // the attestation is the applicant's signature; with it the runner can take the packet to the portal
      const { data: grant } = await db.from("grants").select("mode").eq("user_id", uid).eq("capability", "submit").maybeSingle();
      await move("packet_approved", {
        packet_approved_at: snapshot.approved_at,
        packet_snapshot: { ...snapshot, attestation: ATTESTATION },
        attested_at: snapshot.approved_at,
        attestation: ATTESTATION,
        runner_status: "idle",
        runner_note: null,
      });
      // signed: the cloud runner takes it from here (finds the portal, creates the account, fills, submits)
      if (grant?.mode === "auto") {
        await queueRunner(uid, id);
        after(() => fetch(`${req.nextUrl.origin}/api/runner/work`, { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }, signal: AbortSignal.timeout(8000) }).then(() => undefined, () => undefined));
      }
      await resolve(uid, new RegExp(`^review(-due)?:${id}`)).catch(() => {});
      // nothing else waiting on them: the weekly "still waiting" reminder is answered too
      const { count: waiting } = await admin().from("applications").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("status", "ready_for_review").neq("id", id);
      if (!waiting) await resolve(uid, /^review-waiting:/).catch(() => {});
      await logEvent({ userId: uid, actor: "user", action: "packet.approved", applicationId: id, programId: app.program_id, context: snapshot });
      return NextResponse.json({ ok: true });
    }

    if (b.action === "mark_submitted") {
      if (status !== "packet_approved") return NextResponse.json({ error: "approve the packet first" }, { status: 400 });
      await move("submitted");
      await logEvent({ userId: uid, actor: "user", action: "application.submitted", applicationId: id, programId: app.program_id, channel: "portal" });
      await recordOutcome({ userId: uid, applicationId: id, kind: "proxy", label: "submitted", source: "user" });
      await afterSubmitted(uid, id, { byAgents: false }).catch(() => null);
      return NextResponse.json({ ok: true });
    }

    // record_decision
    const to: AppStatus = b.decision;
    if (!canTransition(status, to)) {
      if (status === "submitted" && canTransition("under_review", to)) await move("under_review");
      else return NextResponse.json({ error: `can't record ${to} on an application that is ${status}` }, { status: 400 });
    }
    const aid = b.decision === "admitted" ? { amount_usd: b.aid_amount_usd ?? 0, note: b.aid_note ?? "", accept_by: b.accept_by ?? null } : null;
    await move(to, {
      decision: b.decision,
      decision_at: new Date().toISOString(),
      ...(aid ? { aid_offered: aid } : {}),
    });
    await logEvent({ userId: uid, actor: "user", action: `decision.${b.decision}`, applicationId: id, programId: app.program_id, context: aid ?? {} });
    await recordOutcome({
      userId: uid,
      applicationId: id,
      kind: b.decision === "interview" ? "proxy" : "final",
      label: b.decision,
      value: aid?.amount_usd,
      source: "user",
    });
    if (b.decision === "admitted") {
      await enqueue({ userId: uid, agent: "closer", task: "funding_plan", payload: { applicationId: id } });
      after(() => drain("inline-closer", 1).catch(() => {}));
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
