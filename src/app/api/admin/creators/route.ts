import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { payoutDetails, reviewPost, setCreatorStatus, setRate, setReferral, settleWithdrawal } from "@/lib/creators";

// the operator's creator actions (admin console, Creators): approve or pause a creator, change their rate, pay or
// reject a payout, review a video, and take a sign-up out of their count (or put it back)
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), id: z.uuid(), status: z.enum(["active", "paused", "rejected", "pending"]), note: z.string().trim().max(300).optional() }),
  z.object({ action: z.literal("rate"), id: z.uuid(), rate: z.number().int().min(0).max(100_000) }),
  z.object({ action: z.literal("paid"), id: z.uuid(), reference: z.string().trim().min(3).max(120) }),
  z.object({ action: z.literal("reject_payout"), id: z.uuid(), note: z.string().trim().min(3).max(300) }),
  z.object({ action: z.literal("account"), id: z.uuid() }),
  z.object({ action: z.literal("post"), id: z.uuid(), status: z.enum(["approved", "rejected", "submitted"]), note: z.string().trim().max(300).optional() }),
  z.object({ action: z.literal("referral"), id: z.uuid(), status: z.enum(["rejected", "pending"]), reason: z.string().trim().max(200).optional() }),
]);

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await admin().from("profiles").select("is_admin").eq("id", auth.user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "not found" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Fill in what's asked." }, { status: 400 });
  const b = parsed.data;
  const by = auth.user.id;
  switch (b.action) {
    case "status":
      await setCreatorStatus(b.id, b.status, b.note || null, by);
      break;
    case "rate":
      await setRate(b.id, b.rate);
      break;
    case "paid": {
      const err = await settleWithdrawal(b.id, "paid", b.reference, by);
      if (err) return NextResponse.json({ error: err }, { status: 409 });
      break;
    }
    case "reject_payout": {
      const err = await settleWithdrawal(b.id, "rejected", b.note, by);
      if (err) return NextResponse.json({ error: err }, { status: 409 });
      break;
    }
    case "account": {
      // the full payout details, shown to the operator only when they ask, to make the transfer
      const d = await payoutDetails(b.id);
      return d ? NextResponse.json(d) : NextResponse.json({ error: "Couldn't read the payout details." }, { status: 500 });
    }
    case "post":
      await reviewPost(b.id, b.status, b.note || null);
      break;
    case "referral":
      await setReferral(b.id, b.status, b.reason || null, by);
      break;
  }
  return NextResponse.json({ ok: true });
}
