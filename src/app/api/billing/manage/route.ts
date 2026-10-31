import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { cancelPro, portalUrl } from "@/lib/billing";

export const runtime = "nodejs";

const Body = z.object({ action: z.enum(["portal", "cancel"]) });

// the monthly plan: open Bachs's billing page (card, invoices), or stop renewing
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    if (parsed.data.action === "portal") {
      const url = await portalUrl(auth.user.id);
      return url ? NextResponse.json({ url }) : NextResponse.json({ error: "no billing account yet" }, { status: 404 });
    }
    await cancelPro(auth.user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "couldn't do that" }, { status: 502 });
  }
}
