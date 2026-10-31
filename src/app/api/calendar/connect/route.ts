import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/supabase/server";
import { appUrl } from "@/lib/gmail";
import { calendarConnectUrl, gcalReady } from "@/lib/gcal";

export const runtime = "nodejs";

const COOKIE = { httpOnly: true, secure: true, sameSite: "lax" as const, maxAge: 600, path: "/api/calendar" };

// starts connecting google calendar through composio
export async function GET() {
  const auth = await requireUser();
  if (!auth) return NextResponse.redirect(`${appUrl()}/login`);
  if (!gcalReady()) return NextResponse.redirect(`${appUrl()}/settings?calendar=unavailable`);
  const state = randomBytes(16).toString("hex");
  const callback = `${appUrl()}/api/calendar/callback?state=${state}`;
  try {
    const c = await calendarConnectUrl(auth.user.id, callback);
    const res = NextResponse.redirect("ready" in c ? callback : c.url);
    res.cookies.set("am_cal_ca", c.accountId, COOKIE);
    res.cookies.set("am_cal_state", state, COOKIE);
    return res;
  } catch (e) {
    console.error("calendar connect failed", e);
    return NextResponse.redirect(`${appUrl()}/settings?calendar=error`);
  }
}
