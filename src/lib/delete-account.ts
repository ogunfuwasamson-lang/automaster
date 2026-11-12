import "server-only";
import { admin } from "@/lib/supabase/admin";
import { disconnect } from "@/lib/gmail";
import { disconnectCalendar } from "@/lib/gcal";

// delete an account for good: stop the agents, revoke gmail and calendar, remove uploaded files, then delete the
// sign-in itself. every table hangs off it with on delete cascade, so the rest goes with it.
// used by the applicant's own "delete my account" and by staff in the operator console.
export async function deleteAccount(uid: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = admin();
  await db.from("jobs").update({ status: "cancelled", last_error: "account deleted" }).eq("user_id", uid).in("status", ["queued", "running"]);
  await disconnect(uid).catch(() => {});
  await disconnectCalendar(uid).catch(() => {});

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
  return error ? { ok: false, error: error.message } : { ok: true };
}

// deactivate: the person can't sign in and the agents stop, but nothing is deleted. reactivating undoes both.
// the pause is a ripcord marked as staff's, so reactivating releases only that one, never the user's own pauses.
export const STAFF_HOLD = "staff:deactivated";

export async function setDeactivated(uid: string, off: boolean) {
  const db = admin();
  const { error } = await db.auth.admin.updateUserById(uid, { ban_duration: off ? "876000h" : "none" });
  if (error) throw new Error(error.message);
  if (off) {
    await db.from("ripcords").insert({ user_id: uid, scope_kind: "all", scope_value: STAFF_HOLD });
    await db.from("jobs").update({ status: "cancelled", last_error: "account deactivated by staff" }).eq("user_id", uid).eq("status", "queued");
  } else {
    await db.from("ripcords").update({ active: false, released_at: new Date().toISOString() }).eq("user_id", uid).eq("scope_value", STAFF_HOLD).eq("active", true);
  }
}
