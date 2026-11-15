// what belongs on an applicant's google calendar, and what to change there to get it right. pure: no db, no
// network. calendar-sync.ts gathers the rows and applies the plan through the connected calendar.
//
// every event ivyward manages carries private extended properties: ivyward=1, ivk (the kind) and ivh (a hash of
// what we wrote). the hash is the sync state, so nothing new is stored on our side; the kind keeps us to our own
// events: anything without ivk, or with a kind we don't manage here, is never changed or removed.
import { createHash } from "node:crypto";

// where the connect flow lands afterwards: a page of this app only (the dashboard, an application, settings)
export const safeThen = (t: string | null | undefined) => (t && /^\/(?!\/)[\w\-/?=&.%#]*$/.test(t) && !t.startsWith("/api/") ? t : "/settings");

export type ManagedKind = "deadline" | "event" | "due";
export const MANAGED: ManagedKind[] = ["deadline", "event", "due"];

// the applications whose closing date belongs on the calendar: on the applicant's list and not yet sent
export const ACTIVE = ["shortlisted", "preparing", "ready_for_review", "packet_approved"] as const;

export type DeadlineApp = { id: string; status: string; deadline: string; school: string; program: string; scholarship?: boolean };
export type FollowupRow = { id: string; title: string; school: string | null; kind: string; status: string; event_start: string | null; event_end: string | null; deadline: string | null; url: string | null; why: string | null; application_id: string | null };

type When = { date: string } | { dateTime: string };
export type GEvent = {
  id: string;
  summary: string;
  description: string;
  location?: string;
  start: When;
  end: When;
  transparency?: "transparent";
  status: "confirmed";
  reminders: { useDefault: false; overrides: { method: "popup" | "email"; minutes: number }[] };
  source: { title: string; url: string };
  extendedProperties: { private: { ivyward: "1"; ivk: ManagedKind; ivh: string } };
};
export type Existing = { id: string; status?: string; start?: { date?: string; dateTime?: string }; extendedProperties?: { private?: Record<string, string> } };
export type Plan = { insert: GEvent[]; update: GEvent[]; remove: string[]; same: number };

// google event ids: base32hex (a-v, 0-9), 5-1024 chars. derived from our uid, so the same item always lands on the
// same event (a second add updates it instead of adding a copy). the uid of a school email's event is the follow-up's
// id, as it always was, so events added before this sync existed are picked up rather than doubled.
export const eventId = (uid: string) => ("iv" + Buffer.from(uid).toString("hex")).slice(0, 1000);

// all-day reminders count back from midnight at the start of the day: 900 minutes is 9am the day before
const AT_9 = (daysBefore: number) => (daysBefore - 1) * 1440 + 900;
const DEADLINE_REMINDERS = [AT_9(7), AT_9(2), AT_9(1)].map((minutes) => ({ method: "popup" as const, minutes }));
const DUE_REMINDERS = [AT_9(2), AT_9(1)].map((minutes) => ({ method: "popup" as const, minutes }));
const EVENT_REMINDERS = [
  { method: "email" as const, minutes: 1440 },
  { method: "popup" as const, minutes: 60 },
];

const nextDay = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const back = (base: string, path: string) => `${base}${path}${path.includes("?") ? "&" : "?"}utm_source=calendar&utm_medium=event`;

// what's left on this application, in one line, for the event's notes
export function deadlineLine(status: string): string {
  switch (status) {
    case "shortlisted":
      return "On your Ivyward list. Start it and the agents draft the essays and fill in the form; you review and sign.";
    case "preparing":
      return "Ivyward is preparing your essays. You'll read and approve them before anything is sent.";
    case "ready_for_review":
      return "Your essays are ready. Read and approve them in Ivyward so the agents can submit in time.";
    case "packet_approved":
      return "You've signed off. Ivyward is filling in the portal; open the application to see if anything needs you.";
    default:
      return "Open the application in Ivyward to see where it stands.";
  }
}

function withHash(e: Omit<GEvent, "extendedProperties">, kind: ManagedKind): GEvent {
  const ivh = createHash("sha256")
    .update(JSON.stringify([e.summary, e.description, e.location ?? "", e.start, e.end, e.reminders.overrides, e.transparency ?? ""]))
    .digest("hex")
    .slice(0, 16);
  return { ...e, extendedProperties: { private: { ivyward: "1", ivk: kind, ivh } } };
}

export function deadlineEvent(a: DeadlineApp, base: string): GEvent {
  const url = back(base, `/applications/${a.id}`);
  const summary = a.scholarship ? `${a.program} deadline` : `${a.school} deadline: ${a.program}`;
  return withHash(
    {
      id: eventId(`deadline:${a.id}`),
      summary: summary.slice(0, 200),
      description: `${deadlineLine(a.status)}\n\nOpen in Ivyward: ${url}`,
      start: { date: a.deadline },
      end: { date: nextDay(a.deadline) },
      // a closing date isn't a meeting: it shouldn't mark the day as busy
      transparency: "transparent",
      status: "confirmed",
      reminders: { useDefault: false, overrides: DEADLINE_REMINDERS },
      source: { title: "Ivyward", url },
    },
    "deadline",
  );
}

// "Brandeis University: Graduate admissions webinar", unless the title already names the school
export function followupTitle(f: Pick<FollowupRow, "title" | "school">): string {
  const first = f.school?.toLowerCase().split(" ")[0];
  return f.school && first && !f.title.toLowerCase().includes(first) ? `${f.school}: ${f.title}` : f.title;
}

export function followupEvent(f: FollowupRow, base: string): GEvent | null {
  const url = back(base, f.application_id ? `/applications/${f.application_id}` : "/dashboard");
  const notes = [f.why, f.url ? `Link from the school: ${f.url}` : null, `Open in Ivyward: ${url}`].filter(Boolean).join("\n\n");
  if (f.event_start) {
    const start = new Date(f.event_start);
    const end = f.event_end ? new Date(f.event_end) : new Date(start.getTime() + 3_600_000);
    if (Number.isNaN(start.getTime())) return null;
    return withHash(
      {
        id: eventId(f.id),
        summary: followupTitle(f).slice(0, 200),
        description: notes,
        location: f.url ?? undefined,
        start: { dateTime: start.toISOString() },
        end: { dateTime: (end > start ? end : new Date(start.getTime() + 3_600_000)).toISOString() },
        status: "confirmed",
        reminders: { useDefault: false, overrides: EVENT_REMINDERS },
        source: { title: "Ivyward", url },
      },
      "event",
    );
  }
  if (f.deadline && /^\d{4}-\d{2}-\d{2}$/.test(f.deadline)) {
    return withHash(
      {
        id: eventId(f.id),
        summary: `Due: ${followupTitle(f)}`.slice(0, 200),
        description: notes,
        start: { date: f.deadline },
        end: { date: nextDay(f.deadline) },
        transparency: "transparent",
        status: "confirmed",
        reminders: { useDefault: false, overrides: DUE_REMINDERS },
        source: { title: "Ivyward", url },
      },
      "due",
    );
  }
  return null;
}

const today = (now: Date) => now.toISOString().slice(0, 10);
// how far ahead deadlines go on: a full application year
const HORIZON_DAYS = 400;

// everything that should be on the calendar right now
export function desiredEvents(apps: DeadlineApp[], followups: FollowupRow[], base: string, now = new Date()): GEvent[] {
  const from = today(now);
  const until = new Date(now.getTime() + HORIZON_DAYS * 86_400_000).toISOString().slice(0, 10);
  const out = new Map<string, GEvent>();
  for (const a of apps) {
    if (!(ACTIVE as readonly string[]).includes(a.status) || !/^\d{4}-\d{2}-\d{2}$/.test(a.deadline) || a.deadline < from || a.deadline > until) continue;
    const e = deadlineEvent(a, base);
    out.set(e.id, e);
  }
  for (const f of followups) {
    if (f.event_start) {
      // events: from an hour ago on (one happening now stays put)
      if (Date.parse(f.event_start) < now.getTime() - 3_600_000) continue;
    } else if (!f.deadline || f.deadline < from || f.status === "done") continue; // a due date only while it's still to do
    const e = followupEvent(f, base);
    if (e) out.set(e.id, e);
  }
  return [...out.values()];
}

// ivyward marks an event ivgone=1 just before deleting it, so a deleted event can be told apart from one the
// applicant deleted themselves (theirs are never put back)
export const removedByUs = (e: Existing) => e.extendedProperties?.private?.ivgone === "1";

const startMs = (e: Existing) => Date.parse(e.start?.dateTime ?? (e.start?.date ? `${e.start.date}T00:00:00Z` : ""));

// what to change on the calendar. only events we manage are ever removed, and only ones still to come: a past
// deadline stays as a record, and the applicant's own events are never touched.
export function plan(desired: GEvent[], existing: Existing[], now = new Date()): Plan {
  const have = new Map(existing.filter((e) => e.id).map((e) => [e.id, e]));
  const want = new Set(desired.map((e) => e.id));
  const p: Plan = { insert: [], update: [], remove: [], same: 0 };
  for (const e of desired) {
    const cur = have.get(e.id);
    if (!cur) p.insert.push(e);
    else if (cur.status === "cancelled") {
      // deleted: by ivyward (marked ivgone before it removed it, say when an application left the list and came
      // back), so it goes back on; by the applicant, so it stays deleted
      if (removedByUs(cur)) p.update.push(e);
      else p.same++;
    } else if (cur.extendedProperties?.private?.ivh !== e.extendedProperties.private.ivh) p.update.push(e);
    else p.same++;
  }
  for (const e of existing) {
    const kind = e.extendedProperties?.private?.ivk as ManagedKind | undefined;
    if (!e.id || want.has(e.id) || e.status === "cancelled" || e.extendedProperties?.private?.ivyward !== "1" || !kind || !MANAGED.includes(kind)) continue;
    // a deadline today is still to come; an all-day event's start is midnight, so compare dates for those
    const future = e.start?.date ? e.start.date >= today(now) : startMs(e) > now.getTime();
    if (future) p.remove.push(e.id);
  }
  return p;
}
