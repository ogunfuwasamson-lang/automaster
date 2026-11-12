import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { deleteAccount, setDeactivated } from "@/lib/delete-account";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("deactivate"), userId: z.uuid() }),
  z.object({ action: z.literal("reactivate"), userId: z.uuid() }),
  // deleting is for good, so staff type the account's email to confirm it
  z.object({ action: z.literal("delete"), userId: z.uuid(), confirm: z.string().max(320) }),
]);

// staff: deactivate an account (no sign-in, agents stopped, nothing deleted), reactivate it, or delete it for good.
// never on your own account or another admin's.
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = admin();
  const { data: me } = await db.from("profiles").select("is_admin").eq("id", auth.user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "not found" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const b = parsed.data;
  if (b.userId === auth.user.id) return NextResponse.json({ error: "That's your own account. Use Settings to delete it." }, { status: 400 });
  const { data: target } = await db.from("profiles").select("email, is_admin").eq("id", b.userId).maybeSingle();
  if (!target) return NextResponse.json({ error: "No account with that id." }, { status: 404 });
  if (target.is_admin) return NextResponse.json({ error: "Admins can't be deactivated or deleted from here. Remove their admin role first." }, { status: 400 });

  try {
    if (b.action === "delete") {
      if (b.confirm.trim().toLowerCase() !== String(target.email ?? "").toLowerCase()) return NextResponse.json({ error: "Type the account's email exactly to confirm." }, { status: 400 });
      const done = await deleteAccount(b.userId);
      if (!done.ok) return NextResponse.json({ error: `Couldn't delete the account: ${done.error}` }, { status: 500 });
      // the account's own history went with it; the record of who deleted it stays on the staff account
      await logEvent({ userId: auth.user.id, actor: "user", action: "staff.deleted_account", context: { deleted_user_id: b.userId, email: target.email } }).catch(() => {});
      return NextResponse.json({ ok: true });
    }
    await setDeactivated(b.userId, b.action === "deactivate");
    await logEvent({ userId: b.userId, actor: "staff", action: b.action === "deactivate" ? "account.deactivated" : "account.reactivated", context: { by: auth.user.id } }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
