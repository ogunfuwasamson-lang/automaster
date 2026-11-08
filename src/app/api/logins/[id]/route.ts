import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { securityAnswers } from "@/lib/vault";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

// reveal one saved portal login. the password never appears in a page's html; it comes only from this call.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = admin();
  const { data } = await db.from("portal_accounts").select("id, application_id, portal_host, login_email, password_enc").eq("user_id", auth.user.id).eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  await db.from("portal_accounts").update({ revealed_at: new Date().toISOString() }).eq("id", data.id);
  await logEvent({ userId: auth.user.id, actor: "user", action: "runner.login_revealed", applicationId: data.application_id, context: { host: data.portal_host } });
  return NextResponse.json({ host: data.portal_host, email: data.login_email, password: decrypt(data.password_enc), answers: securityAnswers(data.portal_host, data.login_email) });
}
