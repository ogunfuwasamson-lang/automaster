import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { verify } from "@/lib/billing";
import { appUrl } from "@/lib/gmail";

export const runtime = "nodejs";

// paystack sends the applicant back here after paying. confirm it straight away (the webhook may arrive later).
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  const reference = req.nextUrl.searchParams.get("reference") ?? req.nextUrl.searchParams.get("trxref");
  if (!auth) return NextResponse.redirect(`${appUrl()}/login`);
  if (!reference) return NextResponse.redirect(`${appUrl()}/settings?billing=cancelled#plan`);
  try {
    const r = await verify(reference);
    // applied now, or already applied by the webhook: either way it's paid
    const paid = r.applied || (r.userId === auth.user.id && !!r.kind);
    return NextResponse.redirect(`${appUrl()}/settings?billing=${paid ? "paid" : "pending"}#plan`);
  } catch (e) {
    console.error("paystack verify failed", e);
    return NextResponse.redirect(`${appUrl()}/settings?billing=pending#plan`);
  }
}
