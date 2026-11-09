import "server-only";
import { admin } from "@/lib/supabase/admin";

// accounts that belong to the team (staff, testers, our own test sign-ups): left out of the operator dashboard's
// numbers by default, so it shows what real applicants do. admins always count as team; others are marked from
// the dashboard. kept as a list in billing_settings, so no schema change is needed.
const KEY = "team_user_ids";

export async function teamIds(): Promise<Set<string>> {
  const db = admin();
  const [{ data: row }, { data: admins }] = await Promise.all([db.from("billing_settings").select("value").eq("key", KEY).maybeSingle(), db.from("profiles").select("id").eq("is_admin", true)]);
  let marked: string[] = [];
  try {
    marked = JSON.parse(row?.value ?? "[]");
  } catch {}
  return new Set([...marked, ...(admins ?? []).map((a) => a.id as string)]);
}

export async function setTeam(userId: string, team: boolean) {
  const db = admin();
  const { data: row } = await db.from("billing_settings").select("value").eq("key", KEY).maybeSingle();
  let marked: string[] = [];
  try {
    marked = JSON.parse(row?.value ?? "[]");
  } catch {}
  const next = team ? [...new Set([...marked, userId])] : marked.filter((x) => x !== userId);
  await db.from("billing_settings").upsert({ key: KEY, value: JSON.stringify(next) });
}
