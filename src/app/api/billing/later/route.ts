import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";
import { billingState } from "@/lib/billing";

export const runtime = "nodejs";

// the applicant skipped the pack offer in onboarding: leave one quiet reminder they can come back to
export async function POST() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const uid = auth.user.id;
  const b = await billingState(uid);
  if (b.pricing.model !== "pack" || b.credits > 0) return NextResponse.json({ ok: true });
  await admin().from("profiles").update({ pack_offer_seen_at: new Date().toISOString() }).eq("id", uid);
  await notify({ userId: uid, key: "pack:offer", kind: "info", title: `Credits: ${b.pricing.label}`, body: "An application the agents prepare and submit uses 10 credits; checking a programme uses 1. Buy a pack when you're ready, or invite a friend: when they finish setup, you both get 10.", href: "/settings#plan", actionLabel: "Buy a pack" }).catch(() => null);
  return NextResponse.json({ ok: true });
}
