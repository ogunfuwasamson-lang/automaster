import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { billingReady, checkout } from "@/lib/billing";
import { appUrl } from "@/lib/gmail";

export const runtime = "nodejs";

const Body = z.object({ kind: z.enum(["pro", "season"]), currency: z.enum(["USD", "NGN"]).default("USD") });

// start paying: returns paystack's checkout page for the applicant to open
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  if (!billingReady()) return NextResponse.json({ error: "payments aren't switched on yet" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "choose a plan" }, { status: 400 });
  if (!auth.user.email) return NextResponse.json({ error: "your account needs an email address" }, { status: 400 });
  try {
    const url = await checkout(auth.user.id, auth.user.email, parsed.data.kind, parsed.data.currency, `${appUrl()}/api/billing/return`);
    return NextResponse.json({ url });
  } catch (e) {
    console.error("paystack checkout failed", e);
    return NextResponse.json({ error: "couldn't open the payment page. try again in a moment." }, { status: 502 });
  }
}
