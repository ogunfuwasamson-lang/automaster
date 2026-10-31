import "server-only";
import { admin } from "@/lib/supabase/admin";
import { sendSystem, systemMailReady } from "@/lib/mailer";
import { emailHtml } from "@/lib/email-layout";
import { appUrl } from "@/lib/gmail";
import { addToCalendar } from "@/lib/gcal";

// calendar invites: straight onto a connected google calendar (gcal.ts), or else a standard .ics invitation emailed to the applicant. Gmail and Google Calendar put it straight
// on the calendar (and Outlook and Apple Calendar do the same), so nothing extra has to be connected.

export interface CalEvent {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  url?: string | null;
  description?: string | null;
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
// ics text: escape , ; \ and newlines, fold lines at 75 octets
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const fold = (line: string) => {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  out.push(rest);
  return out.join("\r\n");
};

export function ics(e: CalEvent, attendee: string): string {
  const from = (process.env.EMAIL_FROM || "Ivyward <hello@tryivyward.com>").match(/<([^>]+)>/)?.[1] ?? "hello@tryivyward.com";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ivyward//Agents//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${e.uid}@tryivyward.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SUMMARY:${esc(e.title)}`,
    ...(e.description || e.url ? [`DESCRIPTION:${esc([e.description, e.url].filter(Boolean).join("\n\n"))}`] : []),
    ...(e.url ? [`URL:${e.url}`, `LOCATION:${esc(e.url)}`] : []),
    `ORGANIZER;CN=Ivyward:mailto:${from}`,
    `ATTENDEE;CN=${esc(attendee)};RSVP=TRUE;PARTSTAT=NEEDS-ACTION;ROLE=REQ-PARTICIPANT:mailto:${attendee}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(e.title)}`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(e.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

// email the invite to the applicant's sign-in address. returns false when email isn't set up.
export async function sendInvite(userId: string, e: CalEvent, why?: string | null): Promise<boolean> {
  // a connected google calendar takes it directly; no email needed
  if (await addToCalendar(userId, e).catch(() => false)) return true;
  if (!systemMailReady()) return false;
  const { data } = await admin().auth.admin.getUserById(userId);
  const to = data.user?.email;
  if (!to) return false;
  const when = e.start.toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" });
  const body = `${why ? `${why} ` : ""}It's on ${when}. Accept the invite to keep it in your calendar; Ivyward reminds you the day before and an hour before.`;
  await sendSystem({
    to,
    subject: `Added to your calendar: ${e.title}`,
    text: `${e.title}\n\n${body}\n\n${e.url ?? ""}`,
    html: emailHtml({ kicker: "Calendar", headline: e.title, blocks: [{ t: "p", text: body }, ...(e.url ? [{ t: "button" as const, label: "Open the event page", href: e.url }] : []), { t: "button", label: "See it in Ivyward", href: `${appUrl()}/dashboard`, secondary: true }], manageUrl: `${appUrl()}/settings` }),
    attachments: [{ filename: "invite.ics", content: Buffer.from(ics(e, to)).toString("base64"), content_type: "text/calendar; method=REQUEST" }],
    tag: "calendar",
  });
  return true;
}
