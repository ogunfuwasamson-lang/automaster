import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { deleteAccount } from "@/lib/delete-account";

// the applicant deletes their own account for good (lib/delete-account.ts says what that removes)
export async function DELETE(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { confirm?: string };
  if ((body.confirm ?? "").trim().toLowerCase() !== "delete my account") return NextResponse.json({ error: "type the confirmation first" }, { status: 400 });
  const uid = auth.user.id;

  const done = await deleteAccount(uid);
  if (!done.ok) return NextResponse.json({ error: `couldn't delete the account: ${done.error}` }, { status: 500 });

  const res = NextResponse.json({ ok: true });
  for (const c of req.cookies.getAll()) if (c.name.startsWith("sb-")) res.cookies.set(c.name, "", { path: "/", maxAge: 0 });
  return res;
}
