import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { activeCreator } from "@/lib/creator-auth";
import { requestWithdrawal } from "@/lib/creators";

const Body = z.object({ amount: z.number().int().positive().max(100_000_000) });

// ask for a payout: the team sends it by bank transfer within 24 hours (lib/creators)
export async function POST(req: NextRequest) {
  const me = await activeCreator();
  if (!me) return NextResponse.json({ error: "Your creator account isn't active." }, { status: 403 });
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Enter an amount in naira." }, { status: 400 });
  const err = await requestWithdrawal(me.creator, me.email, b.data.amount);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  return NextResponse.json({ ok: true });
}
