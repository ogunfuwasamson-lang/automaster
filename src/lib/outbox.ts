import "server-only";
import { admin } from "@/lib/supabase/admin";
import { guard } from "@/lib/guard";
import { logEvent, recordOutcome } from "@/lib/events";
import { MailAuthError, gmailConfigured, mailAccount, sendAs } from "@/lib/gmail";
import { isEmail } from "@/lib/mime";

// the outbox. a message goes draft -> scheduled (undo window) -> sent.
// user-approved sends get a short undo window; agent-initiated ones go through the dial (email.new_contact).

const USER_UNDO_SECONDS = 60;

type Result = { ok: true; sendAt: string } | { ok: false; reason: string; needsApproval?: boolean };

async function messageRow(userId: string, messageId: string) {
  const { data } = await admin()
    .from("messages")
    .select("id, user_id, thread_id, to_email, subject, body, status, purpose, approved_by_user_at, threads(application_id, applications(programs(school_id)))")
    .eq("id", messageId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  const t = data.threads as unknown as { application_id: string | null; applications: { programs: { school_id: string } } | null } | null;
  return { ...data, applicationId: t?.application_id ?? null, schoolId: t?.applications?.programs?.school_id ?? null };
}

async function rateCounts(userId: string, to: string) {
  const db = admin();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: day }, { count: contact }] = await Promise.all([
    db.from("messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("direction", "out").in("status", ["sent", "scheduled"]).gte("created_at", since),
    db.from("messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("direction", "out").in("status", ["sent", "scheduled"]).ilike("to_email", to),
  ]);
  return { per_day: day ?? 0, per_contact_total: contact ?? 0 };
}

export async function schedule(userId: string, messageId: string, by: "user" | "agent"): Promise<Result> {
  const m = await messageRow(userId, messageId);
  if (!m) return { ok: false, reason: "message not found" };
  if (m.status !== "draft" && m.status !== "failed") return { ok: false, reason: `message is ${m.status}` };
  const to = (m.to_email ?? "").trim();
  if (!isEmail(to)) return { ok: false, reason: "add the recipient's official email address first" };
  if (!gmailConfigured()) return { ok: false, reason: "email sending isn't set up on this server yet" };
  const acct = await mailAccount(userId);
  if (!acct || acct.status !== "active") return { ok: false, reason: "connect your gmail to send from here" };

  let undo = USER_UNDO_SECONDS;
  if (by === "agent") {
    const v = await guard(userId, "email.new_contact", { agent: "closer", schoolId: m.schoolId, rateCounts: await rateCounts(userId, to) });
    if (v.kind === "blocked") return { ok: false, reason: v.reason };
    if (v.kind === "needs_approval") return { ok: false, reason: v.reason, needsApproval: true };
    undo = v.kind === "allow_with_undo" ? v.undoSeconds : 0;
  }
  const sendAt = new Date(Date.now() + undo * 1000).toISOString();
  const { data, error } = await admin()
    .from("messages")
    .update({ status: "scheduled", send_after: sendAt, last_error: null, attempts: 0, approved_by_user_at: by === "user" ? new Date().toISOString() : null })
    .eq("id", messageId)
    .in("status", ["draft", "failed"])
    .select("id");
  if (error) return { ok: false, reason: error.message };
  if (!data?.length) return { ok: false, reason: "message changed; refresh" };
  await logEvent({ userId, actor: by === "user" ? "user" : "agent:closer", action: "email.scheduled", applicationId: m.applicationId, channel: "email", context: { messageId, to, sendAt, purpose: m.purpose } });
  return { ok: true, sendAt };
}

export async function cancel(userId: string, messageId: string) {
  const { data } = await admin()
    .from("messages")
    .update({ status: "draft", send_after: null })
    .eq("id", messageId)
    .eq("user_id", userId)
    .eq("status", "scheduled")
    .select("id");
  if (!data?.length) return false;
  await logEvent({ userId, actor: "user", action: "email.cancelled", channel: "email", context: { messageId } });
  return true;
}

// called by the worker every minute
export async function sendDue(limit = 20) {
  const db = admin();
  const now = new Date().toISOString();
  const { data: due } = await db.from("messages").select("id, user_id").eq("status", "scheduled").lte("send_after", now).order("send_after").limit(limit);
  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const d of due ?? []) {
    // lease: push send_after forward so a parallel worker skips it
    const { data: leased } = await db
      .from("messages")
      .update({ send_after: new Date(Date.now() + 5 * 60_000).toISOString() })
      .eq("id", d.id)
      .eq("status", "scheduled")
      .lte("send_after", now)
      .select("id, attempts")
      .maybeSingle();
    if (!leased) continue;
    results.push(await sendOne(d.user_id, d.id, (leased.attempts as number) + 1));
  }
  return results;
}

async function sendOne(userId: string, messageId: string, attempt: number) {
  const db = admin();
  const m = await messageRow(userId, messageId);
  if (!m) return { id: messageId, ok: false, error: "gone" };

  // a pulled ripcord holds agent-initiated mail (the user's own approved sends still go)
  const { data: cords } = await db.from("ripcords").select("scope_kind, scope_value").eq("user_id", userId).eq("active", true);
  const held = !m.approved_by_user_at && (cords ?? []).some((c) => c.scope_kind === "all" || (c.scope_kind === "capability" && c.scope_value?.startsWith("email")) || (c.scope_kind === "agent" && c.scope_value === "closer") || (c.scope_kind === "school" && c.scope_value === m.schoolId));
  if (held) {
    await db.from("messages").update({ status: "draft", send_after: null, last_error: "held: agents are paused" }).eq("id", messageId);
    return { id: messageId, ok: false, error: "held by ripcord" };
  }

  const { data: prof } = await db.from("profiles").select("full_name, profile").eq("id", userId).single();
  const fromName = (prof?.profile as { identity?: { full_name?: string } } | null)?.identity?.full_name || prof?.full_name || null;
  const { data: thread } = await db.from("threads").select("gmail_thread_id").eq("id", m.thread_id).single();
  try {
    const sent = await sendAs(userId, { to: m.to_email!, subject: m.subject ?? "", body: m.body, fromName, threadId: thread?.gmail_thread_id });
    await db.from("messages").update({ status: "sent", sent_at: new Date().toISOString(), gmail_message_id: sent.id, attempts: attempt, last_error: null }).eq("id", messageId);
    await db.from("threads").update({ status: "open", gmail_thread_id: sent.threadId }).eq("id", m.thread_id);
    await db.from("contacts").upsert(
      { user_id: userId, school_id: m.schoolId, email: m.to_email!.toLowerCase(), contact_class: m.purpose === "supervisor_intro" ? "faculty" : m.purpose === "fee_waiver" ? "admissions" : "aid_office", first_contacted_at: new Date().toISOString() },
      { onConflict: "user_id,email", ignoreDuplicates: true },
    );
    const eventId = await logEvent({ userId, actor: m.approved_by_user_at ? "user" : "agent:closer", action: "email.sent", applicationId: m.applicationId, channel: "email", context: { messageId, to: m.to_email, purpose: m.purpose, via: "gmail" } });
    await recordOutcome({ userId, eventId, applicationId: m.applicationId ?? undefined, kind: "proxy", label: "sent", source: "system" });
    return { id: messageId, ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const final = e instanceof MailAuthError || attempt >= 3;
    await db
      .from("messages")
      .update(final ? { status: e instanceof MailAuthError ? "draft" : "failed", send_after: null, attempts: attempt, last_error: msg } : { attempts: attempt, last_error: msg, send_after: new Date(Date.now() + attempt * 5 * 60_000).toISOString() })
      .eq("id", messageId);
    if (final) await logEvent({ userId, actor: "system", action: "email.failed", applicationId: m.applicationId, channel: "email", context: { messageId, error: msg } });
    return { id: messageId, ok: false, error: msg };
  }
}
