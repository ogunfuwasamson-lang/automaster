import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { publicUrls, submitIndexNow } from "@/lib/indexnow";

// staff: send every public page to IndexNow now (the worker also sends new and changed pages daily)
export async function GET() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await admin().from("profiles").select("is_admin").eq("id", auth.user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "not found" }, { status: 404 });
  const urls = publicUrls();
  const r = await submitIndexNow(urls).catch((e) => ({ ok: false, status: 0, count: 0, error: String(e) }));
  return NextResponse.json({ ...r, urls });
}
