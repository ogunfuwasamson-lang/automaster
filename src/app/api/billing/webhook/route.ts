import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhook } from "@/lib/bachs";
import { applyCheckout, applyInvoice, subscriptionEnded } from "@/lib/billing";

export const runtime = "nodejs";

// Bachs tells us about payments here. signed with BACHS_WEBHOOK_SECRET; everything it changes is idempotent.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers)) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  const evt = JSON.parse(raw) as { type?: string; data?: Record<string, unknown> & { object?: Record<string, unknown> } };
  const data = (evt.data?.object ?? evt.data ?? {}) as Record<string, unknown>;
  try {
    if (evt.type === "checkout.completed") await applyCheckout(data);
    else if (evt.type === "invoice.paid") await applyInvoice(data);
    else if (evt.type === "customer.subscription.deleted" || evt.type === "customer.subscription.updated") await subscriptionEnded(data);
  } catch (e) {
    console.error("bachs webhook failed", evt.type, e);
    return NextResponse.json({ error: "retry" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
