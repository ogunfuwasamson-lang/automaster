import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { creatorFor, saveBank } from "@/lib/creators";
import { checkDetails } from "@/lib/payout-methods";

const Body = z.object({ currency: z.string().max(8), method: z.string().max(20), fields: z.record(z.string(), z.string().max(200)) });

// where payouts go, in the creator's currency: the details each currency's banks ask for (lib/payout-methods), stored
// encrypted. the dashboard only ever shows the bank or network and the last four digits.
export async function PUT(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const creator = await creatorFor(auth.user.id);
  if (!creator || (creator.status !== "active" && creator.status !== "paused")) return NextResponse.json({ error: "Your creator account isn't active." }, { status: 403 });
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Pick a currency and fill in the details." }, { status: 400 });
  const r = checkDetails(b.data.currency, b.data.method, b.data.fields);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  try {
    await saveBank(creator, r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't save it." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, label: r.label });
}
