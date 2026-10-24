import { NextResponse, after, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { updateProfile } from "@/lib/profile-store";
import { confirmFact } from "@/lib/profile";
import { scheduleConsolidate } from "@/agents/curator";
import { drain } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  decision: z.enum(["approve", "reject"]),
  choice: z.string().trim().min(1).max(400).optional(),
});

// the one-tap queue. every decision is the user's own and is logged.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { id } = await ctx.params;
  const uid = auth.user.id;
  const db = admin();

  const { data: a } = await db
    .from("approvals")
    .select("id, kind, payload, status")
    .eq("id", id)
    .eq("user_id", uid)
    .maybeSingle();
  if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (a.status !== "pending") return NextResponse.json({ error: "already decided" }, { status: 409 });

  const { decision, choice } = parsed.data;

  if (a.kind === "fact_confirm" && decision === "approve") {
    if (!choice) return NextResponse.json({ error: "pick a value" }, { status: 400 });
    const topic = String((a.payload as { topic?: string }).topic ?? "");
    await updateProfile(uid, (p) => confirmFact(p, topic, choice));
    await scheduleConsolidate(uid, 5_000);
    after(() => new Promise((r) => setTimeout(r, 6_000)).then(() => drain("inline-confirm", 1)).catch(() => {}));
  }

  const { data: upd } = await db
    .from("approvals")
    .update({ status: decision === "approve" ? "approved" : "rejected", decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (!upd?.length) return NextResponse.json({ error: "already decided" }, { status: 409 });

  await logEvent({
    userId: uid,
    actor: "user",
    action: `approval.${decision}d`,
    context: { approvalId: id, kind: a.kind, choice: choice ?? null },
  });
  return NextResponse.json({ ok: true });
}
