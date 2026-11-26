import { NextResponse, after, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { drain } from "@/lib/jobs";
import { startPreparing } from "@/lib/prepare";

export const runtime = "nodejs";
export const maxDuration = 300;

// start (or re-run) the strategist for one application: requirements, positioning, then drafts
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const out = await startPreparing(auth.user.id, id);
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });
  after(() => drain("inline-prepare", 1).catch(() => {}));
  return NextResponse.json({ ok: true });
}
