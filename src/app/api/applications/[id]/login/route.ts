import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

// the applicant reveals the portal login the agents created for them
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = admin();
  const { data } = await db.from("portal_accounts").select("id, portal_host, login_email, password_enc").eq("user_id", auth.user.id).eq("application_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return NextResponse.json({ error: "no portal account yet" }, { status: 404 });
  await db.from("portal_accounts").update({ revealed_at: new Date().toISOString() }).eq("id", data.id);
  await logEvent({ userId: auth.user.id, actor: "user", action: "runner.login_revealed", applicationId: id, context: { host: data.portal_host } });
  return NextResponse.json({ host: data.portal_host, email: data.login_email, password: decrypt(data.password_enc) });
}
