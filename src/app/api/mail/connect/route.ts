import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/supabase/server";
import { authUrl, gmailConfigured, appUrl } from "@/lib/gmail";

export const runtime = "nodejs";

// starts google's consent flow for send-only gmail access
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.redirect(`${appUrl()}/login`);
  if (!gmailConfigured()) return NextResponse.redirect(`${appUrl()}/settings?mail=unavailable`);
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authUrl(state));
  res.cookies.set("am_mail_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/mail" });
  // where to come back to: only our own pages
  const next = req.nextUrl.searchParams.get("next");
  if (next === "/onboarding") res.cookies.set("am_mail_next", next, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/mail" });
  return res;
}
