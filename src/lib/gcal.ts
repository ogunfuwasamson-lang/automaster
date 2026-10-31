import "server-only";
import { admin } from "@/lib/supabase/admin";
import { cx, proxy, type CxAccount } from "@/lib/gmail";
import type { CalEvent } from "@/lib/calendar";

// a direct google calendar connection, through composio like gmail. when it's there, events go straight onto the
// applicant's calendar; otherwise calendar.ts emails an .ics invite instead.

export const gcalReady = () => !!(process.env.COMPOSIO_API_KEY && process.env.COMPOSIO_CALENDAR_AUTH_CONFIG);
const EVENTS = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export async function calendarConnectUrl(userId: string, callbackUrl: string): Promise<{ url: string; accountId: string } | { accountId: string; ready: true }> {
  const cfg = process.env.COMPOSIO_CALENDAR_AUTH_CONFIG!;
  const existing = await cx<{ items?: CxAccount[] }>(`/connected_accounts?user_ids=${encodeURIComponent(userId)}&auth_config_ids=${encodeURIComponent(cfg)}&statuses=ACTIVE&limit=5`);
  const live = existing.items?.find((a) => a.status === "ACTIVE");
  if (live) return { accountId: live.id, ready: true };
  const link = await cx<{ redirect_url: string; connected_account_id: string }>("/connected_accounts/link", { method: "POST", body: { auth_config_id: cfg, user_id: userId, callback_url: callbackUrl } });
  return { url: link.redirect_url, accountId: link.connected_account_id };
}

export async function connectCalendar(userId: string, accountId: string): Promise<string | null> {
  const a = await cx<CxAccount>(`/connected_accounts/${encodeURIComponent(accountId)}`);
  if (a.user_id && a.user_id !== userId) throw new Error("that calendar connection belongs to someone else");
  if (a.status !== "ACTIVE") throw new Error(`calendar connection isn't active (${a.status.toLowerCase()})`);
  const cal = await proxy(userId, accountId, "https://www.googleapis.com/calendar/v3/calendars/primary", "GET");
  if (cal.status >= 300) throw new Error("couldn't open your calendar");
  const { error } = await admin().from("profiles").update({ calendar_account: accountId }).eq("id", userId);
  if (error) throw new Error(error.message);
  return (cal.data as { id?: string } | undefined)?.id ?? null;
}

export async function calendarAccount(userId: string): Promise<string | null> {
  if (!gcalReady()) return null;
  const { data, error } = await admin().from("profiles").select("calendar_account").eq("id", userId).maybeSingle();
  return error ? null : (data?.calendar_account ?? null);
}

export async function disconnectCalendar(userId: string) {
  const acct = await calendarAccount(userId).catch(() => null);
  if (acct) await cx(`/connected_accounts/${encodeURIComponent(acct)}`, { method: "DELETE" }).catch(() => {});
  await admin().from("profiles").update({ calendar_account: null }).eq("id", userId);
}

// google event ids: lowercase base32hex (a-v, 0-9), 5-1024 chars. derived from our uid so a second add updates nothing twice
export const eventId = (uid: string) => ("iv" + Buffer.from(uid).toString("hex")).slice(0, 1000);

export function eventBody(e: CalEvent) {
  return {
    id: eventId(e.uid),
    summary: e.title,
    description: [e.description, e.url].filter(Boolean).join("\n\n") || undefined,
    location: e.url ?? undefined,
    start: { dateTime: e.start.toISOString() },
    end: { dateTime: e.end.toISOString() },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 60 }, { method: "email", minutes: 1440 }] },
    source: e.url ? { title: "Ivyward", url: e.url } : undefined,
  };
}

// put it straight on their google calendar. true when it's there (or already was).
export async function addToCalendar(userId: string, e: CalEvent): Promise<boolean> {
  const acct = await calendarAccount(userId);
  if (!acct) return false;
  try {
    const r = await proxy(userId, acct, EVENTS, "POST", eventBody(e));
    if (r.status < 300 || r.status === 409) return true; // 409: the same event was added before
    if (r.status === 401 || r.status === 403) await admin().from("profiles").update({ calendar_account: null }).eq("id", userId);
    return false;
  } catch {
    return false;
  }
}
