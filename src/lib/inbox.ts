import "server-only";
import * as z from "zod/v4";
import { admin } from "@/lib/supabase/admin";
import { canReadMail, getMail, mailAccount, recentMail } from "@/lib/gmail";
import { hostRoot } from "@/lib/verify-mail";
import { normalizeUrl } from "@/lib/portal-url";
import { runStructured } from "@/lib/llm";
import { logEvent, recordOutcome } from "@/lib/events";
import { enqueue } from "@/lib/queue";
import { baseSubject, mailText, parseFrom } from "@/lib/mail-text";

// the inbox watcher: reads new emails from the applicant's schools, works out what each one means,
// and puts anything that needs the applicant in their queue. read-only on gmail: nothing is changed there.

export const KINDS = [
  "decision_admit",
  "decision_reject",
  "decision_waitlist",
  "interview_invite",
  "document_request",
  "action_required",
  "aid_offer",
  "fee_waiver_reply",
  "account_or_verification",
  "submission_receipt",
  "info_or_marketing",
] as const;

const Classified = z.object({
  kind: z.enum(KINDS),
  summary: z.string(),
  action_needed: z.string(),
  due_date: z.string(),
  aid_amount_usd: z.number(),
});

const SYSTEM = `you read one email an applicant received from a university and say what it means for their application.
kinds: decision_admit / decision_reject / decision_waitlist (a final or waitlist decision), interview_invite, document_request (they want a document, score, transcript, reference), action_required (anything else the applicant must do: deposit, form, deadline, payment), aid_offer (scholarship/assistantship/funding offered), fee_waiver_reply, account_or_verification (logins, codes, password resets), submission_receipt (application received/complete), info_or_marketing (newsletters, events, generic info).
summary: one plain sentence. action_needed: what the applicant must do, or "" if nothing. due_date: YYYY-MM-DD if the email gives a deadline, else "". aid_amount_usd: yearly amount in USD if an aid offer states one (convert roughly), else 0.
only decide "decision_*" when the email itself states the decision; "your decision is available in the portal" is action_required (log in to read it).`;

const ACT: Partial<Record<(typeof KINDS)[number], string>> = {
  decision_admit: "admitted",
  decision_reject: "rejected",
  decision_waitlist: "waitlisted",
  interview_invite: "interview",
};

// school email domains for this applicant: program pages, portals, portal logins, people we've written to
async function schoolDomains(userId: string) {
  const db = admin();
  const [{ data: apps }, { data: logins }, { data: contacts }] = await Promise.all([
    db.from("applications").select("id, portal_url, status, programs(url, schools(name))").eq("user_id", userId).not("status", "in", "(researching,dropped)"),
    db.from("portal_accounts").select("portal_host, application_id").eq("user_id", userId),
    db.from("contacts").select("email, school_id").eq("user_id", userId),
  ]);
  const byRoot = new Map<string, { applicationId: string | null; school: string | null }>();
  for (const a of apps ?? []) {
    const p = a.programs as unknown as { url: string | null; schools: { name: string } };
    for (const u of [a.portal_url, p.url]) {
      const n = normalizeUrl(u);
      if (n) byRoot.set(hostRoot(new URL(n).hostname), { applicationId: a.id, school: p.schools.name });
    }
  }
  for (const l of logins ?? []) if (!byRoot.has(hostRoot(l.portal_host))) byRoot.set(hostRoot(l.portal_host), { applicationId: l.application_id, school: null });
  for (const c of contacts ?? []) {
    const d = c.email.split("@")[1];
    if (d && !byRoot.has(hostRoot(d))) byRoot.set(hostRoot(d), { applicationId: null, school: null });
  }
  return byRoot;
}

// emails stored before full bodies were kept hold only the one-line summary: fetch the original from gmail,
// keep the summary as the summary, and fill in the email itself and its sender. a few per check.
export async function backfillBodies(userId: string, limit = 15): Promise<number> {
  const db = admin();
  const { data, error } = await db.from("messages").select("id, body, gmail_message_id").eq("user_id", userId).eq("direction", "in").is("summary", null).not("gmail_message_id", "is", null).order("created_at", { ascending: false }).limit(limit);
  if (error) return 0; // before the inbox migration there's nothing to fill
  let n = 0;
  for (const m of data ?? []) {
    const mail = await getMail(userId, m.gmail_message_id as string);
    const text = mail ? mailText(mail) : "";
    const sender = mail ? parseFrom(mail.from) : null;
    // nothing to fetch (deleted from gmail): mark it handled so it isn't retried every check
    await db.from("messages").update({ summary: m.body, ...(text ? { body: text } : {}), ...(sender ? { from_email: sender.email, from_name: sender.name } : {}) }).eq("id", m.id);
    n++;
  }
  return n;
}

export async function checkInbox(userId: string, jobId?: string) {
  if (!(await canReadMail(userId))) return { skipped: "gmail read not connected" };
  await backfillBodies(userId).catch(() => 0);
  const db = admin();
  const domains = await schoolDomains(userId);
  if (!domains.size) return { skipped: "no schools yet" };
  const acct = await mailAccount(userId);
  const roots = [...domains.keys()].slice(0, 40);
  const mails = await recentMail(userId, `newer_than:3d from:(${roots.join(" OR ")})`, 25, async (ids) => {
    const { data } = await db.from("messages").select("gmail_message_id").eq("user_id", userId).in("gmail_message_id", ids);
    return new Set((data ?? []).map((r) => r.gmail_message_id as string));
  });
  let added = 0;
  for (const m of mails) {
    const id = m.id;
    const { count } = await db.from("messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("gmail_message_id", id);
    if (count) continue;
    const fromDomain = (m.from.match(/@([^>\s]+)/)?.[1] ?? "").toLowerCase();
    const match = domains.get(hostRoot(fromDomain)) ?? { applicationId: null, school: null };

    const { output: c } = await runStructured({
      userId,
      agent: "inbox",
      jobId,
      promptVersion: "inbox-v1",
      tier: "cheap",
      system: SYSTEM,
      prompt: `from: ${m.from}\nsubject: ${m.subject}\n\n${mailText(m).slice(0, 5000)}`,
      schema: Classified,
      maxTokens: 400,
    });

    // keep it with the conversation it answers: the gmail thread first, then the same subject for this school,
    // else a new conversation
    const sender = parseFrom(m.from);
    const subject = m.subject.slice(0, 300);
    let threadId: string | null = null;
    if (m.threadId) {
      const { data: t } = await db.from("threads").select("id").eq("user_id", userId).eq("gmail_thread_id", m.threadId).limit(1).maybeSingle();
      threadId = t?.id ?? null;
    }
    if (!threadId && match.applicationId) {
      const { data: ts } = await db.from("threads").select("id, subject").eq("user_id", userId).eq("application_id", match.applicationId).order("created_at", { ascending: false }).limit(20);
      threadId = (ts ?? []).find((t) => t.subject && baseSubject(t.subject) === baseSubject(subject))?.id ?? null;
    }
    if (!threadId) {
      const { data: t } = await db.from("threads").insert({ user_id: userId, application_id: match.applicationId, subject, status: "open", gmail_thread_id: m.threadId }).select("id").single();
      threadId = t!.id as string;
    } else await db.from("threads").update({ status: "open" }).eq("id", threadId);

    const base = { user_id: userId, thread_id: threadId, direction: "in", subject, purpose: c.kind, status: "sent", sent_at: new Date(m.at || Date.now()).toISOString(), gmail_message_id: id, to_email: acct?.email ?? null };
    const full = { ...base, body: mailText(m) || c.summary, summary: c.summary, from_email: sender.email, from_name: sender.name, action_needed: c.action_needed || null, due_date: /^\d{4}-\d{2}-\d{2}$/.test(c.due_date) ? c.due_date : null };
    const { error: insErr } = await db.from("messages").insert(full);
    // before the inbox migration runs, the extra columns don't exist: keep the summary as the body
    if (insErr) await db.from("messages").insert({ ...base, body: c.summary });
    await logEvent({ userId, actor: "agent:inbox", action: `inbox.${c.kind}`, applicationId: match.applicationId, channel: "email", context: { subject: m.subject, summary: c.summary, from: fromDomain } });
    added++;

    // replies to emails the agents sent count as outcomes for the learning loop
    if (match.applicationId && ["fee_waiver_reply", "aid_offer"].includes(c.kind)) {
      await recordOutcome({ userId, applicationId: match.applicationId, kind: "proxy", label: `reply:${c.kind}`, source: "inbox" });
    }

    const link = acct?.email ? `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(acct.email)}#all/${id}` : null;
    const school = match.school ?? fromDomain;
    if (ACT[c.kind] && match.applicationId) {
      // a decision: one tap to record it (an admit then starts the funding agent)
      await db.from("approvals").insert({
        user_id: userId,
        kind: "record_decision",
        title: `${school}: ${c.kind === "decision_admit" ? "you were admitted" : c.kind === "decision_reject" ? "decision: not admitted" : c.kind === "decision_waitlist" ? "you're on the waitlist" : "interview invitation"}`,
        summary: `${c.summary}${c.action_needed ? ` · to do: ${c.action_needed}` : ""}${c.due_date ? ` · by ${c.due_date}` : ""}`,
        payload: { decision: ACT[c.kind], aid_amount_usd: c.aid_amount_usd || 0, link, due: c.due_date || null },
        application_id: match.applicationId,
        urgency: c.kind === "decision_admit" || c.kind === "interview_invite" ? 9 : 5,
        created_by: "agent:inbox",
      });
    } else if (["document_request", "action_required", "aid_offer", "fee_waiver_reply"].includes(c.kind) && (c.action_needed || c.kind === "aid_offer")) {
      await db.from("approvals").insert({
        user_id: userId,
        kind: "school_action",
        title: `${school}: ${c.action_needed || c.summary}`.slice(0, 200),
        summary: `${c.summary}${c.due_date ? ` · by ${c.due_date}` : ""}`,
        payload: { kind: c.kind, link, due: c.due_date || null },
        application_id: match.applicationId,
        urgency: c.due_date ? 8 : 6,
        created_by: "agent:inbox",
      });
    }
  }
  return { read: mails.length, added };
}

// called by the worker a few times an hour
export async function scheduleInbox(now = new Date()) {
  const { data } = await admin().from("mail_accounts").select("user_id, scopes").eq("status", "active");
  // one check per user per 5-minute slot
  const slot = `${now.toISOString().slice(0, 13)}:${Math.floor(now.getUTCMinutes() / 5)}`;
  let n = 0;
  for (const a of data ?? []) {
    if (!(a.scopes ?? "").includes("gmail.readonly")) continue;
    await enqueue({ userId: a.user_id, agent: "system", task: "inbox", idempotencyKey: `inbox:${a.user_id}:${slot}` });
    n++;
  }
  return n;
}
