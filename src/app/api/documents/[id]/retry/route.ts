import { NextResponse, after, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { enqueue, drain } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = admin();
  const { data: doc } = await db.from("documents").select("id").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  await db.from("documents").update({ status: "uploaded" }).eq("id", id);
  await enqueue({ userId: auth.user.id, agent: "intake", task: "extract", payload: { documentId: id }, idempotencyKey: `extract:${id}:${Date.now()}` });
  after(() => drain("inline-retry", 1).catch(() => {}));
  return NextResponse.json({ ok: true });
}
