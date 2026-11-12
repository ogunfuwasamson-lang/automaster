import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { appUrl } from "@/lib/gmail";
import { bachsReady } from "@/lib/bachs";
import { checkout, paymentNeeded, requestPaymentNeeded } from "@/lib/billing";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

const Body = z.object({ kind: z.enum(["pack", "submission", "pro", "request"]), applicationId: z.uuid().optional(), messageId: z.uuid().optional(), back: z.string().max(20).optional(), from: z.string().max(40).optional() });

// start a Bachs checkout: one submission, or the monthly plan. returns the page to send the applicant to.
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!bachsReady()) return NextResponse.json({ error: "payments aren't switched on yet" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { kind, applicationId, messageId } = parsed.data;
  if (kind === "request") {
    if (!messageId) return NextResponse.json({ error: "which request?" }, { status: 400 });
    const need = await requestPaymentNeeded(auth.user.id, messageId);
    if (!need) return NextResponse.json({ error: "nothing to pay for this one" }, { status: 400 });
    if (need.kind !== "request" && need.kind !== "pack") return NextResponse.json({ error: "this one needs the monthly plan" }, { status: 400 });
  }
  if (kind === "submission") {
    if (!applicationId) return NextResponse.json({ error: "which application?" }, { status: 400 });
    const need = await paymentNeeded(auth.user.id, applicationId);
    if (!need) return NextResponse.json({ error: "nothing to pay for this one" }, { status: 400 });
    if (need.kind !== "submission" && need.kind !== "pack") return NextResponse.json({ error: need.kind === "pro" ? "this one needs the monthly plan" : "this one goes in on the 1st" }, { status: 400 });
  }
  // which ask they tapped (the dashboard card's angle), so the operator console can see what works
  if (parsed.data.from) await logEvent({ userId: auth.user.id, actor: "user", action: "nudge.clicked", context: { angle: parsed.data.from, kind } }).catch(() => {});
  const Back = z.enum(["onboarding", "settings"]).optional().safeParse(parsed.data.back).data;
  const back = messageId ? `${appUrl()}/messages?m=${messageId}` : applicationId ? `${appUrl()}/applications/${applicationId}` : Back === "onboarding" ? `${appUrl()}/onboarding?step=6` : `${appUrl()}/settings#plan`;
  try {
    const url = await checkout(auth.user.id, auth.user.email ?? "", kind, back, kind === "request" ? undefined : applicationId, kind === "request" ? messageId : undefined);
    return NextResponse.json({ url });
  } catch (e) {
    console.error("checkout failed", e);
    return NextResponse.json({ error: "couldn't open the payment page. Try again in a minute." }, { status: 502 });
  }
}
