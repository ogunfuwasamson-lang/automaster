import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { appUrl } from "@/lib/gmail";
import { connectCalendar } from "@/lib/gcal";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.redirect(`${appUrl()}/login`);
  const q = req.nextUrl.searchParams;
  const back = (r: string) => {
    const res = NextResponse.redirect(`${appUrl()}/settings?calendar=${encodeURIComponent(r)}`);
    res.cookies.delete({ name: "am_cal_state", path: "/api/calendar" });
    res.cookies.delete({ name: "am_cal_ca", path: "/api/calendar" });
    return res;
  };
  if (q.get("error") || /fail|error|denied/i.test(q.get("status") ?? "")) return back(q.get("error") === "access_denied" ? "declined" : "error");
  const state = req.cookies.get("am_cal_state")?.value;
  const ca = req.cookies.get("am_cal_ca")?.value;
  if (!state || state !== q.get("state") || !ca) return back("expired");
  try {
    const cal = await connectCalendar(auth.user.id, ca);
    await logEvent({ userId: auth.user.id, actor: "user", action: "calendar.connected", context: { calendar: cal } });
    return back("connected");
  } catch (e) {
    console.error("calendar connect failed", e);
    return back("error");
  }
}
