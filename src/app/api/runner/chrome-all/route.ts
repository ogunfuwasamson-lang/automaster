import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

// every application stopped by a portal that refuses cloud browsers goes to the applicant's chrome
export async function POST() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = admin();
  const { data } = await db.from("applications").select("id, runner_state, runner_note").eq("user_id", auth.user.id).eq("status", "packet_approved").in("runner_status", ["needs_you", "failed"]);
  const ids: string[] = [];
  for (const a of data ?? []) {
    const st = (a.runner_state ?? {}) as Record<string, unknown>;
    if (!isBlocked(st.reason as string | undefined, a.runner_note)) continue;
    await db
      .from("applications")
      .update({ runner_mode: "extension", runner_status: "ready", runner_note: "queued for your Chrome", runner_state: { ...st, reason: null, rechecks: 0, samePageCount: 0, resume_at: null }, runner_session_id: null, runner_live_url: null, runner_updated_at: new Date().toISOString() })
      .eq("id", a.id);
    await db.from("jobs").update({ status: "cancelled", last_error: "moved to the applicant's chrome" }).eq("user_id", auth.user.id).eq("agent", "runner").eq("status", "queued").contains("payload", { applicationId: a.id });
    ids.push(a.id);
  }
  if (ids.length) await logEvent({ userId: auth.user.id, actor: "user", action: "runner.moved_to_chrome", context: { count: ids.length } });
  return NextResponse.json({ ids });
}

function isBlocked(reason: string | undefined, note: string | null) {
  return reason === "captcha" || reason === "blocked" || reason === "account" || /blocks? (automated|cloud)|bot check/i.test(note ?? "");
}
