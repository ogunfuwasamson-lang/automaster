import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { disconnect } from "@/lib/gmail";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await disconnect(auth.user.id);
  // anything still waiting to go out goes back to drafts
  await admin().from("messages").update({ status: "draft", send_after: null, last_error: "gmail disconnected" }).eq("user_id", auth.user.id).eq("status", "scheduled");
  await logEvent({ userId: auth.user.id, actor: "user", action: "mail.disconnected", channel: "email" });
  return NextResponse.json({ ok: true });
}
