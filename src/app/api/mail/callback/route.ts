import { resumeAfterMailConnected } from "@/lib/requeue";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { appUrl, connect, connectComposio, dropComposio } from "@/lib/gmail";
import { resolve } from "@/lib/notify";
import { logEvent } from "@/lib/events";
import { enqueue } from "@/lib/queue";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.redirect(`${appUrl()}/login`);
  const q = req.nextUrl.searchParams;
  const back = (r: string) => {
    const to = req.cookies.get("am_mail_next")?.value ?? "";
    const dest = to === "/onboarding" || /^\/applications\/[0-9a-f-]{36}$/.test(to) ? to : "/settings";
    const res = NextResponse.redirect(`${appUrl()}${dest}?mail=${encodeURIComponent(r)}`);
    res.cookies.delete({ name: "am_mail_state", path: "/api/mail" });
    res.cookies.delete({ name: "am_mail_next", path: "/api/mail" });
    res.cookies.delete({ name: "am_mail_ca", path: "/api/mail" });
    return res;
  };
  if (q.get("error") || /fail|error|denied/i.test(q.get("status") ?? "")) return back(q.get("error") === "access_denied" ? "declined" : "error");
  const state = req.cookies.get("am_mail_state")?.value;
  // composio sends the applicant back here; the connection id we started with is in our own cookie
  const ca = req.cookies.get("am_mail_ca")?.value;
  if (!state || state !== q.get("state") || (!ca && !q.get("code"))) return back("expired");
  try {
    const email = ca ? await connectComposio(auth.user.id, ca) : await connect(auth.user.id, q.get("code")!);
    await resolve(auth.user.id, "setup:gmail").catch(() => {});
    await logEvent({ userId: auth.user.id, actor: "user", action: "mail.connected", channel: "email", context: { email } });
    await resumeAfterMailConnected(auth.user.id).catch(() => 0);
    await enqueue({ userId: auth.user.id, agent: "system", task: "inbox", idempotencyKey: `inbox:${auth.user.id}:connect:${Date.now()}` });
    return back("connected");
  } catch (e) {
    console.error("gmail connect failed", e);
    const msg = e instanceof Error ? e.message : String(e);
    // kept for the operator view: the applicant only sees "try again"
    await logEvent({ userId: auth.user.id, actor: "system", action: "mail.connect_failed", channel: "email", context: { error: msg.slice(0, 500), via: ca ? "composio" : "google" } }).catch(() => {});
    // a half-made composio connection would be reused next time and fail the same way: start clean
    if (ca && !/belongs to someone else/.test(msg)) await dropComposio(ca);
    return back(/permission|offline|scope|insufficient/i.test(msg) ? "scope" : "error");
  }
}
