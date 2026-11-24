import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { serverClient } from "@/lib/supabase/server";
import { CODE, isBot } from "@/lib/creator-terms";
import { CREATOR_COOKIE, VISITOR_COOKIE, recordVisit } from "@/lib/creators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// a creator's link (lib/creators): count the visit, remember whose link it was for the sign-up, and land on the home
// page. link previews and crawlers aren't counted; the creator's own visits aren't either.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toLowerCase();
  const home = new URL("/", req.url);
  if (!CODE.test(code)) return NextResponse.redirect(home);
  const visitor = req.cookies.get(VISITOR_COOKIE)?.value ?? randomBytes(12).toString("base64url");
  let known = true;
  if (!isBot(req.headers.get("user-agent"))) {
    const viewer = await serverClient()
      .then((sb) => sb.auth.getUser())
      .then((r) => r.data.user?.id ?? null)
      .catch(() => null);
    known = await recordVisit(code, visitor, viewer).catch(() => true);
  }
  if (!known) return NextResponse.redirect(home);
  home.searchParams.set("utm_source", "creator");
  home.searchParams.set("utm_campaign", code);
  const res = NextResponse.redirect(home);
  // readable by the sign-in page, which carries them in the sign-in link (app/login): neither is a secret
  const opts = { path: "/", sameSite: "lax" as const, secure: true };
  res.cookies.set(VISITOR_COOKIE, visitor, { ...opts, maxAge: 365 * 86400 });
  res.cookies.set(CREATOR_COOKIE, code, { ...opts, maxAge: 30 * 86400 });
  res.headers.set("cache-control", "no-store");
  return res;
}
