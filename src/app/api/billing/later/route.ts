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
  await notify({ userId: uid, key: "pack:offer", kind: "info", title: `Your submission pack: ${b.pricing.label}`, body: "Each application the agents prepare and submit uses one credit from a pack. Buy one when you're ready, or invite a friend: when they finish setup, you both get one free.", href: "/settings#plan", actionLabel: "Buy a pack" }).catch(() => null);
  return NextResponse.json({ ok: true });
}
