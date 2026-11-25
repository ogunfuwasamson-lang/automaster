import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { cardState } from "@/lib/cards";

export const runtime = "nodejs";

// the next quick card for the chat panel (lib/cards): a school's waiting question, a match fact, or a form question
export async function GET() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await cardState(auth.user.id), { headers: { "cache-control": "no-store" } });
}
