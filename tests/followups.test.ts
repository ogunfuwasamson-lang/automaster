import { describe, it, expect } from "vitest";
import { mailLinks, zonedToUtc } from "@/lib/followups";
import { ics } from "@/lib/calendar";

describe("follow-ups from school emails", () => {
  it("lists the links people would click, without unsubscribe and social links", () => {
    const links = mailLinks({
      html: '<p>Join us!</p><a href="https://brandeis.zoom.us/webinar/register/WN_abc">Register for the webinar</a> <a href="https://www.facebook.com/brandeis">Facebook</a> <a href="https://x.brandeis.edu/unsubscribe?u=1">Unsubscribe</a> <a href="https://apply.rochester.edu/register/feewaiver?x=1&amp;y=2">Claim Your Fee Waiver</a>',
      text: "",
    });
    expect(links.map((l) => l.text)).toEqual(["Register for the webinar", "Claim Your Fee Waiver"]);
    expect(links[1].url).toBe("https://apply.rochester.edu/register/feewaiver?x=1&y=2");
  });
  it("turns a school's local time into UTC", () => {
    expect(zonedToUtc("2026-11-05T12:00", "America/New_York")?.toISOString()).toBe("2026-11-05T17:00:00.000Z");
    expect(zonedToUtc("2026-07-01T12:00", "America/New_York")?.toISOString()).toBe("2026-07-01T16:00:00.000Z");
    expect(zonedToUtc("2026-11-05T09:30", "Africa/Lagos")?.toISOString()).toBe("2026-11-05T08:30:00.000Z");
    expect(zonedToUtc("soon", "UTC")).toBe(null);
  });
  it("writes a calendar invite mail apps accept", () => {
    const t = ics({ uid: "f1", title: "Brandeis webinar, fee waiver", start: new Date("2026-11-05T17:00:00Z"), end: new Date("2026-11-05T18:00:00Z"), url: "https://brandeis.zoom.us/w/1" }, "ada@example.com");
    expect(t).toContain("METHOD:REQUEST");
    expect(t).toContain("DTSTART:20261105T170000Z");
    expect(t).toContain("SUMMARY:Brandeis webinar\\, fee waiver");
    expect(t).toContain("ATTENDEE;CN=ada@example.com");
    expect(t.split("\r\n").every((l) => l.length <= 75)).toBe(true);
  });
});

import { eventBody, eventId } from "@/lib/gcal";
describe("google calendar events", () => {
  it("uses an event id google accepts, the same every time", () => {
    const id = eventId("abc12345-webinar-1730000000");
    expect(id).toMatch(/^[a-v0-9]{5,1024}$/);
    expect(eventId("abc12345-webinar-1730000000")).toBe(id);
  });
  it("builds the event with reminders and the link", () => {
    const b = eventBody({ uid: "x1", title: "Brandeis webinar", start: new Date("2026-11-05T17:00:00Z"), end: new Date("2026-11-05T18:00:00Z"), url: "https://brandeis.zoom.us/w/1", description: "Registered for you" });
    expect(b.start.dateTime).toBe("2026-11-05T17:00:00.000Z");
    expect(b.description).toContain("https://brandeis.zoom.us/w/1");
    expect(b.reminders.overrides).toHaveLength(2);
  });
});
