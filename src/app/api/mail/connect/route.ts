import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/supabase/server";
import { authUrl, gmailConfigured, appUrl, composioMail, composioConnectUrl } from "@/lib/gmail";

export const runtime = "nodejs";

const COOKIE = { httpOnly: true, secure: true, sameSite: "lax" as const, maxAge: 600, path: "/api/mail" };

// starts connecting gmail: through composio when it's set up, otherwise our own google consent screen
export async function GET(req: NextRequest) {
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
      return NextResponse.redirect(`${appUrl()}/settings?mail=error`);
    }
  } else {
    res = NextResponse.redirect(authUrl(state));
  }
  res.cookies.set("am_mail_state", state, COOKIE);
  // where to come back to: only our own pages
  const next = req.nextUrl.searchParams.get("next");
  if (next === "/onboarding") res.cookies.set("am_mail_next", next, COOKIE);
  return res;
}
