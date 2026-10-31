import "server-only";
import { randomUUID } from "node:crypto";
import * as z from "zod/v4";
import { admin } from "@/lib/supabase/admin";
import { runStructured } from "@/lib/llm";
import { enqueue } from "@/lib/queue";
import { logEvent } from "@/lib/events";
import { notify } from "@/lib/notify";
import { sendInvite } from "@/lib/calendar";
import { htmlToText } from "@/lib/mail-text";

// the follow-up engine. a school's email often asks for something the agents can simply do: register for the
// webinar (which unlocks the fee waiver), claim the waiver through a form, fill a short form, book an interview
// slot. this reads each school email for those, opens the link and does it, puts events in the calendar, keeps
// reminding, and tells the applicant through Ivyward AI. works the same for every applicant.

export const FOLLOWUP_KINDS = ["register_event", "claim_fee_waiver", "fill_form", "upload_document", "book_interview", "event", "other"] as const;

const Found = z.object({
  actions: z.array(
    z.object({
      kind: z.enum(FOLLOWUP_KINDS),
      title: z.string(), // short: "Brandeis graduate admissions webinar"
      link: z.number(), // index into the link list, -1 when there's no link
      act_online: z.boolean(), // the agents can do it by opening the link and filling a form
      event_start: z.string(), // local date and time "YYYY-MM-DDTHH:MM", or ""
      timezone: z.string(), // IANA zone of event_start ("America/New_York"), or ""
      duration_minutes: z.number(),
      deadline: z.string(), // YYYY-MM-DD or ""
      why: z.string(), // one sentence on why it matters to the applicant
      unlocks: z.enum(["fee_waiver", "scholarship", "interview", "admission", "none"]),
    }),
  ),
});

const SYSTEM = `you read one email a university sent an applicant and list the concrete things in it the applicant should act on.
for each one:
- kind: register_event (a webinar, info session, open day or chat that needs registering), claim_fee_waiver (a form or link to request or claim an application fee waiver), fill_form (any other form to complete online), upload_document, book_interview (pick an interview slot), event (an event with a date that needs no registration), other.
- link: the number of the link that does it (from the numbered list), or -1.
- act_online: true when the agents can do it themselves by opening that link and filling in a standard form with the applicant's details (registration, rsvp, a waiver request form, a slot booking). false for anything needing the applicant's judgement or documents they must create, or payment.
- event_start + timezone: when the event happens, as written (convert "12pm ET" to 12:00 and America/New_York; "GMT" to Etc/GMT). "" if none.
- duration_minutes: as stated, else 60.
- deadline: the date by which to act, if stated.
- why: one sentence on why it matters for this applicant, especially what it unlocks (e.g. "attending unlocks the application fee waiver").
- unlocks: what acting gets them.
skip pure marketing with no action, unsubscribe/social links, and anything already done. an empty list is fine.`;

type Mail = { from: string; subject: string; text: string; html: string; at: number };

// numbered links from the email, with their text, for the model to point at
export function mailLinks(m: Pick<Mail, "html" | "text">): { text: string; url: string }[] {
  const out: { text: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const a of (m.html ?? "").matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = a[1].replace(/&amp;/g, "&").trim();
    const text = htmlToText(a[2]).replace(/\s+/g, " ").trim().slice(0, 100);
    if (!/^https?:/i.test(url) || seen.has(url) || /unsubscribe|preferences|facebook|twitter|instagram|linkedin|youtube|tiktok|x\.com\/|privacy/i.test(`${url} ${text}`)) continue;
    seen.add(url);
    out.push({ text: text || url.slice(0, 60), url });
  }
  for (const u of (m.text ?? "").matchAll(/https?:\/\/[^\s<>)"']+/g)) {
    const url = u[0].replace(/[.,;]+$/, "");
    if (seen.has(url) || /unsubscribe|facebook|twitter|instagram|linkedin|youtube/i.test(url)) continue;
    seen.add(url);
    out.push({ text: url.slice(0, 60), url });
  }
  return out.slice(0, 40);
}

// "2026-11-05T12:00" in America/New_York -> the UTC instant
export function zonedToUtc(local: string, tz: string): Date | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  if (!tz) return new Date(guess);
  try {
    // what the zone's wall clock reads at `guess`, and the difference from what we wanted
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
    const wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
    return new Date(guess - (wall - guess));
  } catch {
    return new Date(guess);
  }
}

export async function findFollowups(userId: string, mail: Mail, ctx: { applicationId: string | null; school: string | null; messageId: string | null }, jobId?: string): Promise<number> {
  const links = mailLinks(mail);
  const body = mail.html ? htmlToText(mail.html) : mail.text;
  const { output } = await runStructured({
    userId,
    agent: "inbox",
    jobId,
    promptVersion: "followups-v1",
    tier: "cheap",
    system: SYSTEM,
    prompt: `today: ${new Date().toISOString().slice(0, 10)}\nschool: ${ctx.school ?? "unknown"}\nfrom: ${mail.from}\nsubject: ${mail.subject}\n\n${body.slice(0, 6000)}\n\nlinks:\n${links.map((l, i) => `[${i}] ${l.text} -> ${l.url.slice(0, 160)}`).join("\n") || "(none)"}`,
    schema: Found,
    maxTokens: 1200,
  });
  let n = 0;
  for (const a of output.actions.slice(0, 5)) {
    const url = a.link >= 0 && a.link < links.length ? links[a.link].url : null;
    const start = a.event_start ? zonedToUtc(a.event_start, a.timezone) : null;
    const ok = await createFollowup(userId, {
      kind: a.kind,
      title: a.title.slice(0, 200),
      url,
      act: a.act_online && !!url && a.kind !== "event" && a.kind !== "upload_document",
      start: start && start.getTime() > Date.now() - 3600_000 ? start : null,
      minutes: Math.min(Math.max(a.duration_minutes || 60, 15), 480),
      deadline: /^\d{4}-\d{2}-\d{2}$/.test(a.deadline) ? a.deadline : null,
      why: a.why.slice(0, 300),
      unlocks: a.unlocks === "none" ? "" : a.unlocks,
      school: ctx.school,
      applicationId: ctx.applicationId,
      messageId: ctx.messageId,
    }).catch(() => false);
    if (ok) n++;
  }
  return n;
}

export interface NewFollowup {
  kind: (typeof FOLLOWUP_KINDS)[number];
  title: string;
  url: string | null;
  act: boolean;
  start: Date | null;
  minutes: number;
  deadline: string | null;
  why: string;
  unlocks: string;
  school: string | null;
  applicationId: string | null;
  messageId: string | null;
}

// record one follow-up and set everything in motion: the browser job, the calendar invite, the reminders, the
// notice, and a line from Ivyward AI in the chat
export async function createFollowup(userId: string, f: NewFollowup): Promise<boolean> {
  const db = admin();
  const { data: row, error } = await db
    .from("followups")
    .insert({
      user_id: userId,
      application_id: f.applicationId,
      message_id: f.messageId,
      kind: f.kind,
      title: f.title,
      url: f.url,
      school: f.school,
      why: f.why,
      unlocks: f.unlocks,
      event_start: f.start?.toISOString() ?? null,
      event_end: f.start ? new Date(f.start.getTime() + f.minutes * 60_000).toISOString() : null,
      deadline: f.deadline,
      status: f.act ? "queued" : "done",
      result_note: f.act ? null : f.start ? "in your calendar" : null,
    })
    .select("id")
    .single();
  if (error || !row) return false; // already recorded (same link and time), or the table isn't there yet
  const id = row.id as string;

  // the calendar and the reminders
  let calendar = false;
  if (f.start && f.start.getTime() > Date.now()) {
    calendar = await sendInvite(userId, { uid: id, title: f.school && !f.title.toLowerCase().includes(f.school.toLowerCase().split(" ")[0]) ? `${f.school}: ${f.title}` : f.title, start: f.start, end: new Date(f.start.getTime() + f.minutes * 60_000), url: f.url, description: f.why }, f.why).catch(() => false);
    if (calendar) await db.from("followups").update({ calendar_sent_at: new Date().toISOString() }).eq("id", id);
    for (const [when, ms] of [["day", 24 * 3600_000], ["hour", 3600_000]] as const) {
      const at = f.start.getTime() - ms;
      if (at > Date.now() + 5 * 60_000) await enqueue({ userId, agent: "system", task: "remind", payload: { followupId: id, when }, runAt: new Date(at), idempotencyKey: `remind:${id}:${when}` });
    }
  }
  if (f.deadline && !f.start) {
    const at = Date.parse(`${f.deadline}T09:00:00Z`) - 2 * 86_400_000;
    if (at > Date.now()) await enqueue({ userId, agent: "system", task: "remind", payload: { followupId: id, when: "deadline" }, runAt: new Date(at), idempotencyKey: `remind:${id}:deadline` });
  }

  // the doing: a browser job opens the link and completes the form
  if (f.act) await enqueue({ userId, agent: "runner", task: "followup", payload: { followupId: id }, idempotencyKey: `followup:${id}` });

  const school = f.school ?? "A school";
  const doing = f.act ? (f.kind === "register_event" ? "I'm registering you now" : f.kind === "claim_fee_waiver" ? "I'm filling in the waiver form for you now" : f.kind === "book_interview" ? "I'm booking a slot for you now" : "I'm completing it for you now") : "";
  const when = f.start ? f.start.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC" : null;
  const line = [
    `${school} sent: ${f.title}${when ? ` on ${when}` : f.deadline ? `, due ${f.deadline}` : ""}.`,
    f.why,
    doing ? `${doing}.` : "",
    calendar ? "It's in your calendar, and I'll remind you the day before and an hour before." : f.start ? "I'll remind you the day before and an hour before." : "",
    !f.act && !f.start && f.url ? "This one needs you: open the link from your Messages." : "",
  ]
    .filter(Boolean)
    .join(" ");
  await say(userId, line);
  await notify({
    userId,
    key: `followup:${id}`,
    kind: "followup",
    urgent: f.unlocks === "fee_waiver" || f.unlocks === "interview",
    title: `${school}: ${f.title}`.slice(0, 160),
    body: [f.why, doing ? `${doing}.` : "", calendar ? "Added to your calendar." : ""].filter(Boolean).join(" "),
    href: f.applicationId ? `/applications/${f.applicationId}` : "/messages",
    actionLabel: "See it",
  });
  await logEvent({ userId, actor: "agent:inbox", action: "followup.found", applicationId: f.applicationId, context: { kind: f.kind, title: f.title, act: f.act, start: f.start?.toISOString() ?? null, unlocks: f.unlocks } });
  return true;
}

// a message from Ivyward AI in the applicant's chat, without them having asked
export async function say(userId: string, content: string) {
  const db = admin();
  const { data: last } = await db.from("interview_turns").select("session_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  await db.from("interview_turns").insert({ user_id: userId, session_id: (last?.session_id as string) ?? randomUUID(), role: "agent", content: content.slice(0, 1500) });
}

// a reminder fires: notify, and email for the ones that matter
export async function remind(userId: string, followupId: string, when: string) {
  const { data: f } = await admin().from("followups").select("title, school, why, url, event_start, deadline, status, application_id").eq("id", followupId).eq("user_id", userId).maybeSingle();
  if (!f || f.status === "skipped") return { skipped: true };
  const school = f.school ? `${f.school}: ` : "";
  const title = when === "hour" ? `In an hour: ${school}${f.title}` : when === "day" ? `Tomorrow: ${school}${f.title}` : `Due in 2 days: ${school}${f.title}`;
  await notify({ userId, key: `remind:${followupId}:${when}`, kind: "reminder", urgent: true, title, body: f.why ?? undefined, href: f.url ?? (f.application_id ? `/applications/${f.application_id}` : "/dashboard"), actionLabel: f.url ? "Open it" : "See it", email: true });
  await say(userId, `${title}. ${f.why ?? ""}`.trim());
  return { reminded: when };
}
