import type { TodayInput } from "@/lib/today";
import { inSentence } from "@/lib/doc-checklist";

// WhatsApp updates, the cheaper option (founder, 26 nov 2026): one message only when something needs the applicant
// and they haven't been on Ivyward lately; at most one a week, or every two days when a deadline is close. each kind
// of message is one of the utility templates approved in WhatsApp Manager (names below). pure, so it's tested.

export const IVYWARD_WHATSAPP = "2349110312103"; // Ivyward's number, for wa.me links
export const TEMPLATES = {
  sign: "application_ready_to_sign", // {{1}} first name, {{2}} school. no button
  doc: "application_document_needed", // {{1}}, {{2}} school, {{3}} the document; button: the application
  deadline: "application_deadline_reminder", // {{1}}, {{2}} school, {{3}} the date; button: the application
  admission: "admission_letter_needed", // {{1}}, {{2}} school; button: the application
} as const;

export type Nudge = { key: string; template: (typeof TEMPLATES)[keyof typeof TEMPLATES]; params: string[]; path: string | null; urgent: boolean };

const short = (school: string) => school.split(",")[0].replace(/\s*\([^)]*\)/g, "").trim();
// template parameters can't hold line breaks, tabs or long runs of spaces
export const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 200);
const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const daysTo = (iso: string, today: string) => Math.round((Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);

// the one thing worth a message, most pressing first: a close deadline on something waiting for them, an application
// to sign, a document a school needs, an admission to confirm
export function pickNudge(i: Pick<TodayInput, "apps" | "appDoc">, pendingAdmission: { id: string; school: string } | null, first: string, today: string): Nudge | null {
  const name = clean(first || "there");
  const waiting = i.apps.filter((a) => a.status === "ready_for_review" || a.id === i.appDoc?.appId);
  const close = waiting
    .filter((a) => a.deadline && daysTo(a.deadline, today) >= 0 && daysTo(a.deadline, today) <= 7)
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!))[0];
  if (close) {
    const left = daysTo(close.deadline!, today);
    const bucket = left <= 1 ? "1" : left <= 3 ? "3" : "7";
    return { key: `deadline:${close.id}:${bucket}`, template: TEMPLATES.deadline, params: [name, clean(short(close.school)), day(close.deadline!)], path: `applications/${close.id}`, urgent: left <= 3 };
  }
  const sign = i.apps.filter((a) => a.status === "ready_for_review").sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"))[0];
  if (sign) return { key: `sign:${sign.id}`, template: TEMPLATES.sign, params: [name, clean(short(sign.school))], path: null, urgent: false };
  if (i.appDoc) return { key: `doc:${i.appDoc.appId}:${i.appDoc.label}`, template: TEMPLATES.doc, params: [name, clean(short(i.appDoc.school)), clean(inSentence(i.appDoc.label))], path: `applications/${i.appDoc.appId}`, urgent: false };
  if (pendingAdmission) return { key: `admission:${pendingAdmission.id}`, template: TEMPLATES.admission, params: [name, clean(short(pendingAdmission.school))], path: `applications/${pendingAdmission.id}`, urgent: false };
  return null;
}

const DAY = 86_400_000;
export type Contact = { status: string; phone: string | null; last_sent_at: string | null; last_sent_key: string | null };

// whether to send it now: they turned WhatsApp on and linked their number; it isn't the item we last sent; a week
// since the last message (two days when the deadline is close); they haven't opened Ivyward in two days; and it's
// daytime where they are
export function shouldSend(c: Contact, n: Nudge, o: { lastActiveAt: string | null; now: Date; localHour: number }): { ok: boolean; why: string } {
  if (c.status !== "active" || !c.phone) return { ok: false, why: "not on" };
  if (c.last_sent_key === n.key) return { ok: false, why: "already sent this" };
  const gap = n.urgent ? 2 * DAY : 7 * DAY;
  if (c.last_sent_at && o.now.getTime() - Date.parse(c.last_sent_at) < gap) return { ok: false, why: "sent recently" };
  if (o.lastActiveAt && o.now.getTime() - Date.parse(o.lastActiveAt) < 2 * DAY) return { ok: false, why: "active on Ivyward" };
  if (o.localHour < 9 || o.localHour >= 20) return { ok: false, why: "night where they are" };
  return { ok: true, why: "" };
}

// linking: they send their code from their own WhatsApp, so the number is theirs and they asked for messages
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
export function newCode(rand: () => number = Math.random): string {
  return `IVY-${Array.from({ length: 5 }, () => ALPHABET[Math.floor(rand() * ALPHABET.length)]).join("")}`;
}
export const codeIn = (text: string): string | null => {
  const m = text.toUpperCase().match(/\bIVY[\s-]?([A-HJ-NP-Z2-9]{5})\b/);
  return m ? `IVY-${m[1]}` : null;
};
export const linkUrl = (code: string) => `https://wa.me/${IVYWARD_WHATSAPP}?text=${encodeURIComponent(`Hi Ivyward, my code is ${code}`)}`;
export const isStop = (t: string) => /^\s*(stop|unsubscribe|cancel|end|quit|stop all)\s*[.!]?\s*$/i.test(t);
export const isStart = (t: string) => /^\s*(start|unstop|resume)\s*[.!]?\s*$/i.test(t);
// shown in settings: the last digits only
export const masked = (phone: string) => `+${phone.slice(0, 3)} ••• ${phone.slice(-4)}`;
