import "server-only";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { buildDigest, digestText, localHour, type Digest } from "@/lib/activity";
import { appUrl, mailAccount, sendAs } from "@/lib/gmail";

const DIGEST_HOUR = 7;

// called by the worker a few times an hour: queue one digest per user at 7am their time
export async function scheduleDigests(now = new Date()) {
  const db = admin();
  const { data } = await db.from("profiles").select("id, timezone, last_digest_at").eq("digest_enabled", true).limit(5000);
  let queued = 0;
  for (const p of data ?? []) {
    if (localHour(p.timezone, now) !== DIGEST_HOUR) continue;
    if (p.last_digest_at && now.getTime() - Date.parse(p.last_digest_at) < 20 * 3600_000) continue;
    await enqueue({ userId: p.id, agent: "system", task: "digest", idempotencyKey: `digest:${p.id}:${now.toISOString().slice(0, 10)}` });
    queued++;
  }
  return queued;
}

export async function makeDigest(userId: string, now = new Date()): Promise<{ digest: Digest; since: string; name: string | null }> {
  const db = admin();
  const { data: prof } = await db.from("profiles").select("full_name, profile, last_digest_at").eq("id", userId).single();
  const since = prof?.last_digest_at ?? new Date(now.getTime() - 86_400_000).toISOString();
  const name = (prof?.profile as { identity?: { full_name?: string } } | null)?.identity?.full_name || prof?.full_name || null;
  const [ev, ap, drafts, apps, mail, runner] = await Promise.all([
    db.from("events").select("actor, action, created_at").eq("user_id", userId).gte("created_at", since).order("created_at", { ascending: false }).limit(500),
    db.from("approvals").select("title").eq("user_id", userId).eq("status", "pending").limit(20),
    db.from("events").select("context").eq("user_id", userId).eq("action", "artifact.ready_for_user").gte("created_at", since).limit(10),
    db.from("applications").select("status, target_deadline, programs(name, schools(name))").eq("user_id", userId).not("target_deadline", "is", null).in("status", ["shortlisted", "preparing", "ready_for_review", "packet_approved"]).order("target_deadline").limit(20),
    db.from("messages").select("subject, to_email, send_after").eq("user_id", userId).eq("status", "scheduled").limit(10),
    db.from("applications").select("runner_note, programs(schools(name))").eq("user_id", userId).eq("runner_status", "needs_you").limit(10),
  ]);
  const digest = buildDigest({
    name,
    since,
    today: now.toISOString().slice(0, 10),
    events: ev.data ?? [],
    pendingApprovals: ap.data ?? [],
    draftsReady: (drafts.data ?? []).map((d) => ({ title: String((d.context as { title?: string })?.title ?? "an essay") })),
    deadlines: (apps.data ?? []).map((a) => {
      const p = a.programs as unknown as { name: string; schools: { name: string } };
      return { school: p.schools.name, program: p.name, date: a.target_deadline as string, status: a.status as string };
    }),
    scheduledEmails: (mail.data ?? []).map((m) => ({ subject: m.subject ?? "", to: m.to_email, send_after: m.send_after })),
    runnerNeedsYou: (runner.data ?? []).map((r) => ({ school: (r.programs as unknown as { schools: { name: string } }).schools.name, note: r.runner_note })),
  });
  return { digest, since, name };
}

// the system.digest job: build, store, email it to the applicant themselves if gmail is connected
export async function runDigest(userId: string) {
  const db = admin();
  const now = new Date();
  const { digest, since, name } = await makeDigest(userId, now);
  let via: string | null = null;
  if (!digest.empty) {
    const acct = await mailAccount(userId);
    if (acct?.status === "active") {
      try {
        await sendAs(userId, { to: acct.email, subject: `Ivyward: ${digest.headline}`, body: digestText(digest, appUrl(), name), fromName: "Ivyward" });
        via = "gmail";
      } catch {
        via = null;
      }
    }
  }
  await db.from("digests").insert({ user_id: userId, period_start: since, period_end: now.toISOString(), content: digest, sent_via: via });
  await db.from("profiles").update({ last_digest_at: now.toISOString() }).eq("id", userId);
  return { headline: digest.headline, via };
}
