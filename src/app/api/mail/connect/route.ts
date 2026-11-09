import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/supabase/server";
import { authUrl, gmailConfigured, appUrl, composioMail, composioConnectUrl } from "@/lib/gmail";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

const COOKIE = { httpOnly: true, secure: true, sameSite: "lax" as const, maxAge: 600, path: "/api/mail" };

// starts connecting gmail: through composio when it's set up, otherwise our own google consent screen
// a prefetch or client-side router fetch (next's <Link>, a browser's speculative load) must not start a
// connection: each one made a new composio link and overwrote the cookies the real click depends on, so the
// applicant came back from google to a connection that wasn't theirs ("isn't active", "expired")
function speculative(req: NextRequest) {
  const h = req.headers;
  return h.has("next-router-prefetch") || h.has("rsc") || h.get("purpose") === "prefetch" || /prefetch|prerender/i.test(h.get("sec-purpose") ?? "") || h.get("x-middleware-prefetch") === "1";
}

export async function GET(req: NextRequest) {
  if (speculative(req)) return new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
  const auth = await requireUser();
  if (!auth) return NextResponse.redirect(`${appUrl()}/login`);
  if (!gmailConfigured()) return NextResponse.redirect(`${appUrl()}/settings?mail=unavailable`);
  const state = randomBytes(16).toString("hex");
  const callback = `${appUrl()}/api/mail/callback?state=${state}`;

  let res: NextResponse;
  if (composioMail()) {
    try {
      const c = await composioConnectUrl(auth.user.id, callback);
      // already connected at composio: skip google and finish straight away
      res = NextResponse.redirect("ready" in c ? callback : c.url);
      res.cookies.set("am_mail_ca", c.accountId, COOKIE);
    } catch (e) {
      console.error("composio connect failed", e);
      await logEvent({ userId: auth.user.id, actor: "system", action: "mail.connect_failed", channel: "email", context: { error: String((e as Error)?.message ?? e).slice(0, 500), via: "composio", stage: "start" } }).catch(() => {});
      return NextResponse.redirect(`${appUrl()}/settings?mail=error`);
    }
  } else {
    res = NextResponse.redirect(authUrl(state));
  }
  res.cookies.set("am_mail_state", state, COOKIE);
  res.headers.set("cache-control", "no-store");
  // where to come back to: only our own pages
  const next = req.nextUrl.searchParams.get("next") ?? "";
  if (next === "/onboarding" || /^\/applications\/[0-9a-f-]{36}$/.test(next)) res.cookies.set("am_mail_next", next, COOKIE);
  return res;
}
