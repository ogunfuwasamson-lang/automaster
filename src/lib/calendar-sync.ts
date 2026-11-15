import "server-only";
import { admin } from "@/lib/supabase/admin";
import { appUrl, cx, proxy, type CxAccount } from "@/lib/gmail";
import { calendarAccount, gcalReady } from "@/lib/gcal";
import { notify } from "@/lib/notify";
import { logEvent } from "@/lib/events";
import { ACTIVE, desiredEvents, plan, removedByUs, type DeadlineApp, type Existing, type FollowupRow, type GEvent } from "@/lib/calendar-plan";

// keeps a connected google calendar in step with ivyward: every application deadline on the applicant's list, and
// every webinar, open day, interview and due date their schools emailed about, each with reminders and a link back
// to the application. runs right after connecting, then about once an hour (the worker); it reads one page of
// ivyward's own events and changes only what differs. no ai, so it runs even while agent work is paused.

const EVENTS = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
type Prog = { name: string; degree: string | null; schools: { name: string } | null };

export async function loadDates(userId: string, now = new Date()): Promise<{ apps: DeadlineApp[]; followups: FollowupRow[] }> {
  const db = admin();
  const day = now.toISOString().slice(0, 10);
  const [a, f] = await Promise.all([
    db.from("applications").select("id, status, target_deadline, programs(name, degree, schools(name))").eq("user_id", userId).in("status", [...ACTIVE]).gte("target_deadline", day).limit(200),
    db
      .from("followups")
      .select("id, title, school, kind, status, event_start, event_end, deadline, url, why, application_id")
      .eq("user_id", userId)
      .or(`event_start.gte.${new Date(now.getTime() - 3_600_000).toISOString()},deadline.gte.${day}`)
      .limit(100),
  ]);
  const apps: DeadlineApp[] = (a.data ?? []).map((r) => {
    const p = r.programs as unknown as Prog | null;
    const scholarship = p?.degree === "Scholarship";
    return { id: r.id as string, status: r.status as string, deadline: r.target_deadline as string, school: p?.schools?.name ?? "Your school", program: p?.name ?? "application", scholarship };
  });
  return { apps, followups: (f.error ? [] : (f.data ?? [])) as FollowupRow[] };
}

// how many dates would go on the calendar: for the connect prompts and the "connected" notice
export async function datesCount(userId: string): Promise<number> {
  const { apps, followups } = await loadDates(userId);
  return desiredEvents(apps, followups, appUrl()).length;
}

class Gone extends Error {}

// is the composio connection itself still there? (a 404 here means it was removed; any other failure isn't proof)
const alive = (acct: string) =>
  cx<CxAccount>(`/connected_accounts/${encodeURIComponent(acct)}`).then(
    (a) => a.status === "ACTIVE",
    (e) => !/ 404\b/.test(e instanceof Error ? e.message : ""),
  );

async function call(userId: string, acct: string, url: string, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<{ status: number; data: unknown }> {
  try {
    const r = await proxy(userId, acct, url, method, body);
    if (r.status === 401) throw new Gone("calendar access was revoked");
    return r;
  } catch (e) {
    if (e instanceof Gone) throw e;
    // composio may pass google's refusal (409 already exists, 404/410 not there) back as its own error: read the
    // code, and only call the connection gone once composio confirms it is
    const code = Number((e instanceof Error ? e.message : "").match(/ (4\d\d)\b/)?.[1] ?? 0);
    if (code && code !== 429) {
      if (!(await alive(acct))) throw new Gone("calendar connection is gone");
      return { status: code, data: null };
    }
    throw e;
  }
}

async function existing(userId: string, acct: string, now: Date): Promise<Existing[]> {
  const out: Existing[] = [];
  let page: string | undefined;
  for (let i = 0; i < 4; i++) {
    const q = new URLSearchParams({ privateExtendedProperty: "ivyward=1", timeMin: new Date(now.getTime() - 86_400_000).toISOString(), maxResults: "250", singleEvents: "true", showDeleted: "true" });
    if (page) q.set("pageToken", page);
    const r = await call(userId, acct, `${EVENTS}?${q}`, "GET");
    if (r.status >= 300) throw new Error(`calendar list: ${r.status}`);
    const d = (r.data ?? {}) as { items?: Existing[]; nextPageToken?: string };
    out.push(...(d.items ?? []));
    page = d.nextPageToken;
    if (!page) break;
  }
  return out;
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

export type SyncResult = { added: number; updated: number; removed: number; kept: number; failed: number };

export async function syncCalendar(userId: string, now = new Date()): Promise<SyncResult | null> {
  const acct = await calendarAccount(userId);
  if (!acct) return null;
  const r: SyncResult = { added: 0, updated: 0, removed: 0, kept: 0, failed: 0 };
  try {
    const { apps, followups } = await loadDates(userId, now);
    const p = plan(desiredEvents(apps, followups, appUrl(), now), await existing(userId, acct, now), now);
    r.kept = p.same;
    const at = (id: string) => `${EVENTS}/${encodeURIComponent(id)}`;
    const put = async (e: GEvent) => (await call(userId, acct, at(e.id), "PUT", e)).status < 300;
    await pool(p.insert, 4, async (e) => {
      const res = await call(userId, acct, EVENTS, "POST", e);
      if (res.status < 300) return void r.added++;
      if (res.status !== 409) return void r.failed++;
      // 409: an event with this id is there already. one added before this sync existed is brought up to date;
      // one the applicant deleted stays deleted
      const cur = await call(userId, acct, at(e.id), "GET");
      const ev = (cur.data ?? {}) as Existing;
      if (cur.status < 300 && ev.status === "cancelled" && !removedByUs(ev)) return void r.kept++;
      if (await put(e)) r.added++;
      else r.failed++;
    });
    await pool(p.update, 4, async (e) => {
      if (await put(e)) r.updated++;
      else r.failed++;
    });
    await pool(p.remove, 4, async (id) => {
      // mark it as removed by ivyward first, so it can come back if the application returns to the list
      await call(userId, acct, at(id), "PATCH", { extendedProperties: { private: { ivgone: "1" } } }).catch(() => null);
      const res = await call(userId, acct, at(id), "DELETE");
      if (res.status < 300 || res.status === 404 || res.status === 410) r.removed++;
      else r.failed++;
    });
  } catch (e) {
    if (!(e instanceof Gone)) throw e;
    // google or composio says the connection is gone: stop trying, and ask them to connect again (no email)
    await admin().from("profiles").update({ calendar_account: null }).eq("id", userId);
    await notify({ userId, key: "calendar:reconnect", kind: "setup", title: "Reconnect Google Calendar", body: "Google stopped letting Ivyward add your deadlines and school events. Connect it again to keep the reminders coming.", href: "/api/calendar/connect?then=/dashboard", actionLabel: "Reconnect" }).catch(() => {});
    await logEvent({ userId, actor: "agent:system", action: "calendar.lost" }).catch(() => {});
    return null;
  }
  if (r.added || r.updated || r.removed) await logEvent({ userId, actor: "agent:system", action: "calendar.synced", context: { ...r } }).catch(() => {});
  return r;
}

// the worker's hourly pass: each connected applicant gets one slot in the hour (their id picks which 5-minute tick)
export async function syncDueCalendars(now = new Date()): Promise<number> {
  if (!gcalReady()) return 0;
  const slot = Math.floor(now.getTime() / 300_000) % 12;
  const { data } = await admin().from("profiles").select("id").not("calendar_account", "is", null).limit(5000);
  const due = (data ?? []).map((p) => p.id as string).filter((id) => parseInt(id.replace(/-/g, "").slice(0, 8), 16) % 12 === slot);
  let n = 0;
  await pool(due.slice(0, 60), 4, async (id) => {
    if (await syncCalendar(id, now).catch((e) => (console.error("calendar sync failed", id, e), null))) n++;
  });
  return n;
}

const localHour = (tz: string | null, now: Date) => {
  try {
    return Number(new Intl.DateTimeFormat("en-US", { timeZone: tz || "UTC", hour: "numeric", hourCycle: "h23" }).format(now));
  } catch {
    return now.getUTCHours();
  }
};

export const CONNECT_KEY = "calendar:connect";

export function connectNotice(n: number) {
  return {
    title: "Get a reminder before every deadline",
    body: `Connect Google Calendar and Ivyward adds your ${n === 1 ? "application deadline" : `${n} application deadlines`}, plus the webinars, open days and interviews your schools email you about, with reminders a week, two days and a day before. Each one opens straight to that application.`,
    href: "/api/calendar/connect?then=/dashboard",
    actionLabel: "Connect Google Calendar",
  };
}

// ask once: applicants with deadlines coming up and no calendar connected get one notice (on the dashboard, in the
// bell, and one email at 9am their time). never asked again once raised, even if they dismiss it or disconnect.
export async function askToConnect(now = new Date()): Promise<number> {
  if (!gcalReady()) return 0;
  const db = admin();
  const day = now.toISOString().slice(0, 10);
  const { data: rows } = await db.from("applications").select("user_id").in("status", [...ACTIVE]).gte("target_deadline", day).limit(5000);
  const counts = new Map<string, number>();
  for (const r of rows ?? []) counts.set(r.user_id as string, (counts.get(r.user_id as string) ?? 0) + 1);
  if (!counts.size) return 0;
  const ids = [...counts.keys()];
  const [{ data: people }, { data: asked }] = await Promise.all([
    db.from("profiles").select("id, timezone, calendar_account").in("id", ids),
    db.from("notifications").select("user_id").in("user_id", ids).in("dedupe_key", [CONNECT_KEY, "calendar:reconnect"]),
  ]);
  const done = new Set((asked ?? []).map((r) => r.user_id as string));
  let n = 0;
  for (const p of people ?? []) {
    if (p.calendar_account || done.has(p.id as string) || localHour(p.timezone as string | null, now) !== 9) continue;
    await notify({ userId: p.id as string, key: CONNECT_KEY, kind: "setup", email: true, ...connectNotice(counts.get(p.id as string) ?? 1) }).catch(() => {});
    if (++n >= 50) break;
  }
  return n;
}
