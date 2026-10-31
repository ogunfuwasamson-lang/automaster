import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { cancel } from "@/lib/billing";

export const runtime = "nodejs";

// stop pro renewing. it runs to the end of the month already paid for.
export async function POST() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  try {
    await cancel(auth.user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("paystack cancel failed", e);
    return NextResponse.json({ error: "couldn't cancel just now. try again, or email hello@tryivyward.com." }, { status: 502 });
  }
}
