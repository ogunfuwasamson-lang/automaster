import { NextResponse, after, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { appUrl } from "@/lib/gmail";
import { connectCalendar } from "@/lib/gcal";
import { datesCount, syncCalendar } from "@/lib/calendar-sync";
import { resolve } from "@/lib/notify";
import { logEvent } from "@/lib/events";
import { safeThen } from "@/lib/calendar-plan";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.redirect(`${appUrl()}/login`);
  const q = req.nextUrl.searchParams;
  const then = safeThen(req.cookies.get("am_cal_then")?.value);
  const [path, hash] = then.split("#");
  const back = (r: string, extra = "") => {
    const res = NextResponse.redirect(`${appUrl()}${path}${path.includes("?") ? "&" : "?"}calendar=${encodeURIComponent(r)}${extra}${hash ? `#${hash}` : ""}`);
    for (const name of ["am_cal_state", "am_cal_ca", "am_cal_then"]) res.cookies.delete({ name, path: "/api/calendar" });
    return res;
  };
  if (q.get("error") || /fail|error|denied/i.test(q.get("status") ?? "")) return back(q.get("error") === "access_denied" ? "declined" : "error");
  const state = req.cookies.get("am_cal_state")?.value;
  const ca = req.cookies.get("am_cal_ca")?.value;
  if (!state || state !== q.get("state") || !ca) return back("expired");
  const uid = auth.user.id;
  try {
    const cal = await connectCalendar(uid, ca);
    await logEvent({ userId: uid, actor: "user", action: "calendar.connected", context: { calendar: cal } });
    await resolve(uid, /^calendar:(connect|reconnect)$/).catch(() => {});
    const n = await datesCount(uid).catch(() => 0);
    // adding the dates takes a few seconds per event: do it after they're back on the page
    after(() => syncCalendar(uid).then(() => undefined, (e) => console.error("calendar first sync failed", e)));
    return back("connected", `&dates=${n}`);
  } catch (e) {
    console.error("calendar connect failed", e);
    return back("error");
  }
}
