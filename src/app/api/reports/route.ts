import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { runWeekly } from "@/lib/weekly";

export const runtime = "nodejs";
export const maxDuration = 120;

// make this week's report now (the first one, or after a busy few days). at most one a day.
export async function POST() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: last } = await admin().from("digests").select("id, created_at").eq("user_id", auth.user.id).eq("content->>kind", "weekly").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (last && Date.now() - Date.parse(last.created_at) < 20 * 3600_000) return NextResponse.json({ id: last.id, fresh: false });
  try {
    const r = await runWeekly(auth.user.id);
    return NextResponse.json({ id: r.id, fresh: true });
  } catch (e) {
    return NextResponse.json({ error: /budget:/.test(String(e)) ? "you've used this month's agent allowance" : "couldn't write the report just now" }, { status: 500 });
  }
}
