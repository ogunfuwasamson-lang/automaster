import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

// the applicant removes a document they uploaded: the file leaves storage and stops being attached to portals.
// facts already read from it into the profile stay (they're the applicant's to edit there).
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = admin();
  const { data: doc } = await db.from("documents").select("id, filename, kind, storage_path").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (doc.storage_path) await db.storage.from("documents").remove([doc.storage_path]);
  const { error } = await db.from("documents").delete().eq("id", id).eq("user_id", auth.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  // any queued reading of this file is pointless now
  await db.from("jobs").update({ status: "cancelled" }).eq("user_id", auth.user.id).eq("agent", "intake").eq("status", "queued").contains("payload", { documentId: id });
  await logEvent({ userId: auth.user.id, actor: "user", action: "document.deleted", context: { documentId: id, kind: doc.kind, filename: doc.filename } });
  return NextResponse.json({ ok: true });
}
