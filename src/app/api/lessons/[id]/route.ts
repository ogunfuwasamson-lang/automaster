import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";

// an applicant removes something Ivyward learned about them
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const { data } = await admin().from("lessons").update({ status: "retired", retired_reason: "removed by the applicant" }).eq("id", id).eq("scope", "user").eq("user_id", auth.user.id).select("id");
  return data?.length ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "not found" }, { status: 404 });
}
