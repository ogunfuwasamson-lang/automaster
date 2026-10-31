import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { disconnect } from "@/lib/gmail";

// delete the account for good. order: stop the agents, revoke gmail, remove uploaded files, then delete the
// sign-in itself — every table hangs off it with on delete cascade, so the rest goes with it.
export async function DELETE(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { confirm?: string };
  if ((body.confirm ?? "").trim().toLowerCase() !== "delete my account") return NextResponse.json({ error: "type the confirmation first" }, { status: 400 });
  const uid = auth.user.id;
  const db = admin();

  await db.from("jobs").update({ status: "cancelled", last_error: "account deleted" }).eq("user_id", uid).in("status", ["queued", "running"]);
  await disconnect(uid).catch(() => {});

  // documents live under <user_id>/<document_id>/<file>; list two levels and remove everything
  const bucket = db.storage.from("documents");
  const { data: folders } = await bucket.list(uid, { limit: 1000 });
  const paths: string[] = [];
  for (const f of folders ?? []) {
    if (f.id) paths.push(`${uid}/${f.name}`); // a file directly in the folder
    else {
      const { data: files } = await bucket.list(`${uid}/${f.name}`, { limit: 1000 });
      for (const x of files ?? []) paths.push(`${uid}/${f.name}/${x.name}`);
    }
  }
  for (let i = 0; i < paths.length; i += 100) await bucket.remove(paths.slice(i, i + 100));

  const { error } = await db.auth.admin.deleteUser(uid);
  if (error) return NextResponse.json({ error: `couldn't delete the account: ${error.message}` }, { status: 500 });

  const res = NextResponse.json({ ok: true });
  for (const c of req.cookies.getAll()) if (c.name.startsWith("sb-")) res.cookies.set(c.name, "", { path: "/", maxAge: 0 });
  return res;
}
