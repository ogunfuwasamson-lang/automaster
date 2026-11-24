import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { creatorFor, saveBank } from "@/lib/creators";
import { NUBAN } from "@/lib/creator-terms";

const Body = z.object({ bank_name: z.string().trim().min(2).max(80), account_name: z.string().trim().min(3).max(120), account_number: z.string().trim().regex(NUBAN) });

// where payouts go. the account number is stored encrypted; the dashboard only ever shows its last four digits.
export async function PUT(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const creator = await creatorFor(auth.user.id);
  if (!creator || (creator.status !== "active" && creator.status !== "paused")) return NextResponse.json({ error: "Your creator account isn't active." }, { status: 403 });
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Pick your bank, enter the 10-digit account number and the name on the account." }, { status: 400 });
  try {
    await saveBank(creator, b.data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't save it." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, last4: b.data.account_number.slice(-4) });
}
