import { NextResponse, after, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { drain } from "@/lib/jobs";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), content: z.string().trim().min(1).max(40000) }),
  z.object({ action: z.literal("revise"), notes: z.string().trim().max(4000).optional() }),
  z.object({ action: z.literal("approve"), version: z.number().int().positive() }),
]);

// the applicant's own moves on a draft: edit it, ask for a revision, or approve it as theirs
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { id } = await ctx.params;
  const uid = auth.user.id;
  const db = admin();
  const { data: art } = await db.from("artifacts").select("id, application_id, title, current_version").eq("id", id).eq("user_id", uid).maybeSingle();
  if (!art) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = parsed.data;

  if (b.action === "save") {
    const version = (art.current_version ?? 0) + 1;
    const { data: v, error } = await db
      .from("artifact_versions")
      .insert({ artifact_id: id, user_id: uid, version, content: b.content, author: "user", critique: { status: "ready", edited_by_user: true } })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await db.from("artifacts").update({ current_version: version }).eq("id", id);
    await logEvent({ userId: uid, actor: "user", action: "artifact.edited", applicationId: art.application_id, artifactVersionId: v.id as string, context: { title: art.title, version } });
    // their edit of an agent's draft teaches the writer how they want to sound (only for them)
    if (art.current_version) await enqueue({ userId: uid, agent: "learning", task: "edit", payload: { artifactId: id, from: art.current_version, to: version }, idempotencyKey: `edit:${id}:${version}`, runAt: new Date(Date.now() + 2 * 60_000) }).catch(() => {});
    return NextResponse.json({ ok: true, version });
  }

  if (b.action === "revise") {
    const { count } = await db
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .in("agent", ["writer", "redteam"])
      .in("status", ["queued", "running"])
      .contains("payload", { artifactId: id });
    if (count) return NextResponse.json({ error: "the writer is already on it" }, { status: 409 });
    await enqueue({ userId: uid, agent: "writer", task: "draft", payload: { artifactId: id, round: 1, userNotes: b.notes ?? "" } });
    if (b.notes && b.notes.trim().length >= 6) await enqueue({ userId: uid, agent: "learning", task: "notes", payload: { artifactId: id, notes: b.notes } }).catch(() => {});
    await logEvent({ userId: uid, actor: "user", action: "artifact.revision_requested", applicationId: art.application_id, context: { title: art.title, notes: b.notes ?? "" } });
    after(() => drain("inline-revise", 1).catch(() => {}));
    return NextResponse.json({ ok: true });
  }

  // approve: only the latest version, and the approval is the applicant's statement that it's theirs
  if (b.version !== art.current_version) return NextResponse.json({ error: "approve the latest version" }, { status: 409 });
  const { error } = await db
    .from("artifact_versions")
    .update({ user_approved_at: new Date().toISOString() })
    .eq("artifact_id", id)
    .eq("version", b.version);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await logEvent({ userId: uid, actor: "user", action: "artifact.approved", applicationId: art.application_id, context: { title: art.title, version: b.version } });
  return NextResponse.json({ ok: true });
}
