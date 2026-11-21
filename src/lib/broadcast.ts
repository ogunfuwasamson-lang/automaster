import "server-only";
import { admin } from "@/lib/supabase/admin";
import { teamIds } from "@/lib/team";
import { keyedHash } from "@/lib/crypto";
import { emailHtml } from "@/lib/email-layout";
import { SITE } from "@/lib/site";
import { notify } from "@/lib/notify";
import { logEvent } from "@/lib/events";
import { personalise, toBlocks, toText, type Broadcast } from "@/lib/broadcast-format";

// the operator emailing many applicants at once: who's in each group, the opt-out list, and sending through
// resend's batch endpoint (100 a call). nothing is sent without an explicit "send" from an admin; team and test
// accounts only get it when the group is "team", deactivated accounts and people who opted out never do.

export const AUDIENCES = [
  { key: "all", label: "Everyone", hint: "every applicant account" },
  { key: "listed", label: "Have programmes on their list", hint: "shortlisted or further, not yet submitted" },
  { key: "started", label: "Signed up, no programmes yet", hint: "nothing on their list beyond candidates" },
  { key: "signed", label: "Signed at least one application", hint: "approved packets, submitting or submitted" },
  { key: "new", label: "Joined in the last 7 days", hint: "new accounts" },
  { key: "quiet", label: "Not signed in for 14 days", hint: "to bring back" },
  { key: "country", label: "From one country", hint: "by billing country" },
  { key: "team", label: "Team and test accounts", hint: "to try a send first" },
] as const;
export type Audience = (typeof AUDIENCES)[number]["key"];

const OFF_KEY = "email_news_off";
const LISTED = ["shortlisted", "preparing", "ready_for_review", "packet_approved"];
const SIGNED = ["packet_approved", "submitted", "under_review", "interview", "admitted", "waitlisted", "accepted", "rejected"];

export type Recipient = { id: string; email: string; first: string | null };

async function optedOut(): Promise<Set<string>> {
  const { data } = await admin().from("billing_settings").select("value").eq("key", OFF_KEY).maybeSingle();
  try {
    return new Set(JSON.parse(data?.value ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export async function setOptOut(userId: string, off: boolean) {
  const db = admin();
  const cur = await optedOut();
  if (off) cur.add(userId);
  else cur.delete(userId);
  await db.from("billing_settings").upsert({ key: OFF_KEY, value: JSON.stringify([...cur]) });
}

export const isOptedOut = async (userId: string) => (await optedOut()).has(userId);

// the signed link in every news email that turns them off, no sign-in needed
export const unsubscribeUrl = (userId: string) => `${SITE.url}/api/email/news?u=${userId}&t=${keyedHash(`news:${userId}`).slice(0, 24)}`;
export const validUnsubscribe = (userId: string, t: string) => keyedHash(`news:${userId}`).slice(0, 24) === t;

type Who = { id: string; email: string | null; full_name: string | null; billing_country: string | null; created_at: string; identity: { full_name?: string } | null; first: string | null; preferred: string | null };
// what they like to be called: the preferred name, else the first name on their papers, else their full name's first
const firstOf = (p: Who) => {
  const n = (p.preferred || p.first || (p.identity?.full_name || p.full_name || "").trim().split(/\s+/)[0] || "").trim();
  return n ? n[0].toUpperCase() + n.slice(1) : null;
};

async function lastSignIns(): Promise<{ last: Map<string, string>; banned: Set<string> }> {
  const last = new Map<string, string>();
  const banned = new Set<string>();
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin().auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) {
      if (u.last_sign_in_at) last.set(u.id, u.last_sign_in_at);
      const until = (u as { banned_until?: string | null }).banned_until;
      if (until && Date.parse(until) > Date.now()) banned.add(u.id);
    }
    if (data.users.length < 1000) break;
  }
  return { last, banned };
}

export async function recipients(aud: Audience, country?: string): Promise<Recipient[]> {
  const db = admin();
  const [{ data: people }, team, off, { last, banned }] = await Promise.all([
    db.from("profiles").select("id, email, full_name, billing_country, created_at, identity:profile->identity, first:portal_details->>legal_first_name, preferred:portal_details->>preferred_name").limit(20000),
    teamIds(),
    optedOut(),
    lastSignIns(),
  ]);
  let list = ((people ?? []) as Who[]).filter((p) => p.email && /@/.test(p.email) && !banned.has(p.id) && !off.has(p.id) && (aud === "team" ? team.has(p.id) : !team.has(p.id)));
  if (aud === "listed" || aud === "started" || aud === "signed") {
    const { data: apps } = await db.from("applications").select("user_id, status").in("user_id", list.map((p) => p.id)).neq("status", "dropped").limit(50000);
    const by = new Map<string, Set<string>>();
    for (const a of apps ?? []) (by.get(a.user_id as string) ?? by.set(a.user_id as string, new Set()).get(a.user_id as string)!).add(a.status as string);
    const has = (id: string, ss: string[]) => ss.some((s) => by.get(id)?.has(s));
    if (aud === "listed") list = list.filter((p) => has(p.id, LISTED));
    if (aud === "signed") list = list.filter((p) => has(p.id, SIGNED));
    if (aud === "started") list = list.filter((p) => !has(p.id, [...LISTED, ...SIGNED]));
  }
  if (aud === "new") list = list.filter((p) => Date.now() - Date.parse(p.created_at) < 7 * 86_400_000);
  if (aud === "quiet") list = list.filter((p) => Date.now() - Date.parse(last.get(p.id) ?? p.created_at) > 14 * 86_400_000);
  if (aud === "country") {
    const c = (country ?? "").trim().toLowerCase();
    list = c ? list.filter((p) => (p.billing_country ?? "").toLowerCase() === c) : [];
  }
  return list.map((p) => ({ id: p.id, email: p.email!, first: firstOf(p) }));
}

export function render(b: Broadcast, r: Pick<Recipient, "id" | "first">) {
  const unsub = unsubscribeUrl(r.id);
  const headline = personalise(b.headline, r.first);
  return {
    subject: personalise(b.subject, r.first),
    html: emailHtml({ preheader: b.preheader ? personalise(b.preheader, r.first) : undefined, kicker: "News from Ivyward", headline, blocks: toBlocks(personalise(b.body, r.first), SITE.url), manageUrl: `${SITE.url}/settings`, unsubscribeUrl: unsub }),
    text: toText(b, r.first, SITE.url, unsub),
    unsub,
  };
}

const FROM = () => process.env.EMAIL_FROM || "Ivyward <hello@tryivyward.com>";

// resend's batch endpoint: up to 100 emails a call, each its own message (nobody sees anyone else's address)
async function sendBatch(b: Broadcast, rs: Recipient[]): Promise<{ sent: string[]; failed: string[] }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY isn't set");
  const body = rs.map((r) => {
    const m = render(b, r);
    return {
      from: FROM(),
      to: [r.email],
      subject: m.subject,
      html: m.html,
      text: m.text,
      ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
      headers: { "List-Unsubscribe": `<${m.unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      tags: [{ name: "kind", value: "news" }],
    };
  });
  const res = await fetch("https://api.resend.com/emails/batch", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(60_000) });
  const json = (await res.json().catch(() => ({}))) as { data?: { id?: string }[]; message?: string };
  if (!res.ok) {
    console.error("resend batch failed", res.status, json.message);
    return { sent: [], failed: rs.map((r) => r.id) };
  }
  const ok = json.data ?? [];
  return { sent: rs.filter((_, i) => ok[i]?.id).map((r) => r.id), failed: rs.filter((_, i) => !ok[i]?.id).map((r) => r.id) };
}

export async function sendBroadcast(b: Broadcast, rs: Recipient[], o: { by: string; audience: string; bell: boolean }): Promise<{ sent: number; failed: number }> {
  let sent: string[] = [];
  let failed: string[] = [];
  for (let i = 0; i < rs.length; i += 100) {
    const r = await sendBatch(b, rs.slice(i, i + 100));
    sent = sent.concat(r.sent);
    failed = failed.concat(r.failed);
    if (i + 100 < rs.length) await new Promise((ok) => setTimeout(ok, 600));
  }
  // the same news in their Ivyward bell, if asked (no second email)
  if (o.bell) {
    const key = `news:${Date.now().toString(36)}`;
    for (const r of rs) await notify({ userId: r.id, key, kind: "info", title: personalise(b.subject, r.first), body: personalise(b.preheader || b.headline, r.first), href: "/dashboard", actionLabel: "Open Ivyward" }).catch(() => {});
  }
  await logEvent({ userId: o.by, actor: "staff", action: "broadcast.sent", context: { subject: b.subject, audience: o.audience, sent: sent.length, failed: failed.length, bell: o.bell } }).catch(() => {});
  return { sent: sent.length, failed: failed.length };
}

// a test copy to the operator only, marked as a test
export async function sendTest(b: Broadcast, to: Recipient): Promise<boolean> {
  const r = await sendBatch({ ...b, subject: `[Test] ${b.subject}` }, [to]);
  return r.sent.length === 1;
}

export async function history(limit = 20) {
  const { data } = await admin().from("events").select("created_at, context").eq("action", "broadcast.sent").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []).map((e) => ({ at: e.created_at as string, ...(e.context as { subject: string; audience: string; sent: number; failed: number }) }));
}
