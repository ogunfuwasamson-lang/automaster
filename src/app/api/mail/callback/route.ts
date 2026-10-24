import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { appUrl, connect } from "@/lib/gmail";
import { logEvent } from "@/lib/events";
import { enqueue } from "@/lib/queue";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.redirect(`${appUrl()}/login`);
  const q = req.nextUrl.searchParams;
  const back = (r: string) => {
    const res = NextResponse.redirect(`${appUrl()}/settings?mail=${encodeURIComponent(r)}`);
    res.cookies.delete({ name: "am_mail_state", path: "/api/mail" });
    return res;
  };
  if (q.get("error")) return back(q.get("error") === "access_denied" ? "declined" : "error");
  const state = req.cookies.get("am_mail_state")?.value;
  if (!state || state !== q.get("state") || !q.get("code")) return back("expired");
  try {
    const email = await connect(auth.user.id, q.get("code")!);
    await logEvent({ userId: auth.user.id, actor: "user", action: "mail.connected", channel: "email", context: { email } });
    await enqueue({ userId: auth.user.id, agent: "system", task: "inbox", idempotencyKey: `inbox:${auth.user.id}:connect:${Date.now()}` });
    return back("connected");
  } catch (e) {
    console.error("gmail connect failed", e);
    return back(e instanceof Error && /permission|offline/.test(e.message) ? "scope" : "error");
  }
}
