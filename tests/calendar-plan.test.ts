import { describe, expect, it } from "vitest";
import { deadlineEvent, desiredEvents, eventId, followupEvent, plan, safeThen, type DeadlineApp, type FollowupRow } from "@/lib/calendar-plan";

const BASE = "https://tryivyward.com";
const NOW = new Date("2026-11-15T12:00:00Z");
const app = (o: Partial<DeadlineApp> = {}): DeadlineApp => ({ id: "a1", status: "preparing", deadline: "2026-12-01", school: "University of Edinburgh", program: "MSc Data Science", ...o });
const fu = (o: Partial<FollowupRow> = {}): FollowupRow => ({ id: "f1", title: "Graduate admissions webinar", school: "Brandeis University", kind: "register_event", status: "done", event_start: "2026-11-20T17:00:00Z", event_end: "2026-11-20T18:00:00Z", deadline: null, url: "https://brandeis.zoom.us/w/1", why: "Attending unlocks the application fee waiver.", application_id: "a2", ...o });

describe("deadline events", () => {
  const e = deadlineEvent(app(), BASE);
  it("is an all-day event on the closing date that doesn't block the day", () => {
    expect(e.start).toEqual({ date: "2026-12-01" });
    expect(e.end).toEqual({ date: "2026-12-02" });
    expect(e.transparency).toBe("transparent");
    expect(e.summary).toBe("University of Edinburgh deadline: MSc Data Science");
  });
  it("reminds at 9am a week, two days and a day before", () => {
    expect(e.reminders.overrides.map((r) => r.minutes)).toEqual([9540, 2340, 900]);
    expect(e.reminders.useDefault).toBe(false);
  });
  it("opens the application in Ivyward, tagged as coming from the calendar", () => {
    expect(e.source.url).toBe(`${BASE}/applications/a1?utm_source=calendar&utm_medium=event`);
    expect(e.description).toContain(`Open in Ivyward: ${BASE}/applications/a1?utm_source=calendar`);
    expect(e.description).toContain("preparing your essays");
  });
  it("is marked as Ivyward's, with a stable id and hash", () => {
    expect(e.id).toBe(eventId("deadline:a1"));
    expect(e.id).toMatch(/^[a-v0-9]{5,1024}$/);
    expect(e.extendedProperties.private).toMatchObject({ ivyward: "1", ivk: "deadline" });
    expect(deadlineEvent(app(), BASE).extendedProperties.private.ivh).toBe(e.extendedProperties.private.ivh);
    expect(deadlineEvent(app({ status: "ready_for_review" }), BASE).extendedProperties.private.ivh).not.toBe(e.extendedProperties.private.ivh);
  });
  it("names a scholarship by itself", () => {
    expect(deadlineEvent(app({ scholarship: true, program: "Chevening Scholarship", school: "UK government" }), BASE).summary).toBe("Chevening Scholarship deadline");
  });
});

describe("school events", () => {
  it("puts a webinar on at its time, prefixed with the school, with the join link and the way back", () => {
    const e = followupEvent(fu(), BASE)!;
    expect(e.summary).toBe("Brandeis University: Graduate admissions webinar");
    expect(e.start).toEqual({ dateTime: "2026-11-20T17:00:00.000Z" });
    expect(e.end).toEqual({ dateTime: "2026-11-20T18:00:00.000Z" });
    expect(e.location).toBe("https://brandeis.zoom.us/w/1");
    expect(e.description).toContain("Link from the school: https://brandeis.zoom.us/w/1");
    expect(e.description).toContain(`Open in Ivyward: ${BASE}/applications/a2?utm_source=calendar`);
    expect(e.extendedProperties.private.ivk).toBe("event");
    // the id a follow-up's invite always had, so earlier invites are updated rather than doubled
    expect(e.id).toBe(eventId("f1"));
  });
  it("doesn't repeat a school already in the title", () => {
    expect(followupEvent(fu({ title: "Brandeis open day" }), BASE)!.summary).toBe("Brandeis open day");
  });
  it("makes a due date an all-day item", () => {
    const e = followupEvent(fu({ event_start: null, event_end: null, deadline: "2026-11-25", title: "Claim your fee waiver", school: "University of Rochester", application_id: null, status: "needs_you" }), BASE)!;
    expect(e.summary).toBe("Due: University of Rochester: Claim your fee waiver");
    expect(e.start).toEqual({ date: "2026-11-25" });
    expect(e.extendedProperties.private.ivk).toBe("due");
    expect(e.source.url).toBe(`${BASE}/dashboard?utm_source=calendar&utm_medium=event`);
  });
  it("skips one with neither a time nor a date", () => {
    expect(followupEvent(fu({ event_start: null, deadline: null }), BASE)).toBeNull();
  });
});

describe("what goes on", () => {
  it("takes applications on the list with a date still to come, and nothing else", () => {
    const ids = desiredEvents(
      [
        app({ id: "keep" }),
        app({ id: "short", status: "shortlisted", deadline: "2027-01-15" }),
        app({ id: "today", deadline: "2026-11-15" }),
        app({ id: "past", deadline: "2026-11-14" }),
        app({ id: "sent", status: "submitted" }),
        app({ id: "dropped", status: "dropped" }),
        app({ id: "candidate", status: "researching" }),
        app({ id: "far", deadline: "2028-06-01" }),
      ],
      [],
      BASE,
      NOW,
    ).map((e) => e.id);
    expect(ids).toEqual([eventId("deadline:keep"), eventId("deadline:short"), eventId("deadline:today")]);
  });
  it("takes events still to come and due dates still to do", () => {
    const ids = desiredEvents(
      [],
      [
        fu({ id: "soon" }),
        fu({ id: "now", event_start: "2026-11-15T11:30:00Z", event_end: null }),
        fu({ id: "gone", event_start: "2026-11-15T10:00:00Z" }),
        fu({ id: "due", event_start: null, event_end: null, deadline: "2026-11-20", status: "needs_you" }),
        fu({ id: "did", event_start: null, event_end: null, deadline: "2026-11-20", status: "done" }),
        fu({ id: "late", event_start: null, event_end: null, deadline: "2026-11-01", status: "queued" }),
      ],
      BASE,
      NOW,
    ).map((e) => e.id);
    expect(ids).toEqual([eventId("soon"), eventId("now"), eventId("due")]);
  });
});

describe("the plan", () => {
  const a = deadlineEvent(app(), BASE);
  const b = deadlineEvent(app({ id: "a2", deadline: "2027-01-10" }), BASE);
  const mine = (id: string, ivk: string, start: { date?: string; dateTime?: string }, ivh = "x") => ({ id, start, extendedProperties: { private: { ivyward: "1", ivk, ivh } } });

  it("adds what's missing, updates what changed, keeps what matches", () => {
    const p = plan([a, b], [{ ...mine(a.id, "deadline", a.start as { date: string }, a.extendedProperties.private.ivh) }, mine(b.id, "deadline", { date: "2027-01-03" }, "old")], NOW);
    expect(p.insert).toEqual([]);
    expect(p.update.map((e) => e.id)).toEqual([b.id]);
    expect(p.same).toBe(1);
    expect(plan([a], [], NOW).insert.map((e) => e.id)).toEqual([a.id]);
  });
  it("leaves an event the applicant deleted, and brings back one Ivyward removed", () => {
    const theirs = plan([a], [{ ...mine(a.id, "deadline", { date: "2026-12-01" }, "old"), status: "cancelled" }], NOW);
    expect(theirs.update).toEqual([]);
    expect(theirs.insert).toEqual([]);
    const ours = { ...mine(b.id, "deadline", { date: "2027-01-10" }), status: "cancelled" };
    ours.extendedProperties.private = { ...ours.extendedProperties.private, ivgone: "1" } as typeof ours.extendedProperties.private;
    expect(plan([b], [ours], NOW).update.map((e) => e.id)).toEqual([b.id]);
  });
  it("removes Ivyward's own events that no longer apply, only ones still to come", () => {
    const p = plan(
      [],
      [
        mine("dropped", "deadline", { date: "2026-12-20" }),
        mine("today", "deadline", { date: "2026-11-15" }),
        mine("yesterday", "deadline", { date: "2026-11-14" }),
        mine("webinar", "event", { dateTime: "2026-11-30T15:00:00Z" }),
        mine("over", "event", { dateTime: "2026-11-15T09:00:00Z" }),
      ],
      NOW,
    );
    expect(p.remove).toEqual(["dropped", "today", "webinar"]);
  });
  it("never touches the applicant's own events or one-off ones it doesn't manage", () => {
    const p = plan(
      [],
      [
        { id: "theirs", start: { date: "2026-12-20" } },
        { id: "other-app", start: { date: "2026-12-20" }, extendedProperties: { private: { ivk: "deadline" } } },
        mine("assistant", "added", { dateTime: "2026-12-01T10:00:00Z" }),
      ],
      NOW,
    );
    expect(p.remove).toEqual([]);
  });
});

describe("where connecting lands", () => {
  it("keeps pages of this app and refuses anything else", () => {
    expect(safeThen("/dashboard")).toBe("/dashboard");
    expect(safeThen("/applications/a1#portal")).toBe("/applications/a1#portal");
    expect(safeThen("//evil.example")).toBe("/settings");
    expect(safeThen("https://evil.example")).toBe("/settings");
    expect(safeThen("/api/calendar/connect")).toBe("/settings");
    expect(safeThen("/x\\evil")).toBe("/settings");
    expect(safeThen(null)).toBe("/settings");
  });
});
