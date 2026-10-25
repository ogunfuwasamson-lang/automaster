import { NextResponse, after, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { startScholarship } from "@/lib/scholarships";
import { drain } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 300;

// "apply for this": turn a matched scholarship into an application the agents prepare
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const r = await startScholarship(auth.user.id, id, "user");
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  after(() => drain("inline-scholarship", 1).catch(() => {}));
  return NextResponse.json(r);
}
