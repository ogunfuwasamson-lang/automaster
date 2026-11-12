import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { creditPolicy, saveCreditPolicy } from "@/lib/credit";

// staff: save the credit policy (limits, the asks to pay and their wording). the whole policy each time; parsing
// clamps odd values, and the answer is what was stored.
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await admin().from("profiles").select("is_admin").eq("id", auth.user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    const before = await creditPolicy(true);
    const policy = await saveCreditPolicy(body);
    await logEvent({ userId: auth.user.id, actor: "user", action: "staff.credit_policy", context: { before: { dailyLimitUsd: before.dailyLimitUsd, starterUsd: before.starterUsd, staffMonthlyUsd: before.staffMonthlyUsd }, after: { dailyLimitUsd: policy.dailyLimitUsd, starterUsd: policy.starterUsd, staffMonthlyUsd: policy.staffMonthlyUsd } } }).catch(() => {});
    return NextResponse.json({ policy });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
