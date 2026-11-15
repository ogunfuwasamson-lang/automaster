import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/supabase/server";
import { appUrl } from "@/lib/gmail";
import { calendarConnectUrl, gcalReady } from "@/lib/gcal";
import { safeThen } from "@/lib/calendar-plan";

export const runtime = "nodejs";

const COOKIE = { httpOnly: true, secure: true, sameSite: "lax" as const, maxAge: 600, path: "/api/calendar" };

// starts connecting google calendar through composio. ?then=/path brings them back where they started.
export async function GET(req: NextRequest) {
  const then = safeThen(req.nextUrl.searchParams.get("then"));
  const auth = await requireUser();
  if (!auth) return NextResponse.redirect(`${appUrl()}/login?next=${encodeURIComponent(`/api/calendar/connect?then=${encodeURIComponent(then)}`)}`);
  if (!gcalReady()) return NextResponse.redirect(`${appUrl()}${then.split("#")[0]}${then.includes("?") ? "&" : "?"}calendar=unavailable`);
  const state = randomBytes(16).toString("hex");
  const callback = `${appUrl()}/api/calendar/callback?state=${state}`;
  try {
    const c = await calendarConnectUrl(auth.user.id, callback);
    const res = NextResponse.redirect("ready" in c ? callback : c.url);
    res.cookies.set("am_cal_ca", c.accountId, COOKIE);
    res.cookies.set("am_cal_state", state, COOKIE);
    res.cookies.set("am_cal_then", then, COOKIE);
    return res;
  } catch (e) {
    console.error("calendar connect failed", e);
    return NextResponse.redirect(`${appUrl()}/settings?calendar=error`);
  }
}
