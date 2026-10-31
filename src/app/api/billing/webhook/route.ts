import { NextResponse, type NextRequest } from "next/server";
import { applyCharge, markCancelled, rememberSubscription, validSignature } from "@/lib/billing";

export const runtime = "nodejs";

// paystack's webhook: payments, renewals, subscriptions starting and stopping. signed with our secret key.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-paystack-signature"))) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  const evt = JSON.parse(raw) as { event: string; data: Record<string, unknown> };
  try {
    if (evt.event === "charge.success") await applyCharge(evt.data as never);
    else if (evt.event === "subscription.create") await rememberSubscription(evt.data as never);
    else if (evt.event === "subscription.not_renew" || evt.event === "subscription.disable") await markCancelled(evt.data as never);
  } catch (e) {
    console.error("paystack webhook failed", evt.event, e);
    return NextResponse.json({ error: "failed" }, { status: 500 }); // paystack retries
  }
  return NextResponse.json({ ok: true });
}
