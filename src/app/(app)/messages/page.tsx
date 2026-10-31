import { confirmReturn } from "@/lib/billing";
import { Mail } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { gmailConfigured } from "@/lib/gmail";
import { PageHeader, Empty } from "@/components/ui/page";
import { ButtonLink } from "@/components/ui/button";
import { MessagesApp, type InboxMsg, type InboxThread, type SchoolDetail } from "./inbox";
import { describe } from "@/lib/activity";
import { PasteEmail } from "./paste-email";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

const BASE = "id, direction, subject, body, status, to_email, purpose, send_after, sent_at, created_at, last_error";
const RICH = `${BASE}, summary, from_email, from_name, action_needed, due_date, read_at`;
const THREAD = (cols: string) => `id, subject, created_at, application_id, contacts(email), applications(programs(schools(name))), messages(${cols})`;

type Row = {
  id: string;
  subject: string | null;
  application_id: string | null;
  contacts: { email: string } | null;
  applications: { programs: { schools: { name: string } } } | null;
  messages: Partial<InboxMsg>[];
};

export default async function Messages({ searchParams }: { searchParams: Promise<{ t?: string; paid?: string }> }) {
  const auth = await requireUser();
  if (!auth) return null;
  const { t, paid } = await searchParams;
  // back from paying for a funding request: confirm it now, which also sends it
  if (paid) await confirmReturn(auth.user.id, paid).catch(() => null);
  // the inbox migration adds sender, summary and read state; until it runs, read without them
  const rich = await auth.sb.from("threads").select(THREAD(RICH)).order("created_at", { ascending: false }).limit(300);
  const res = rich.error ? await auth.sb.from("threads").select(THREAD(BASE)).order("created_at", { ascending: false }).limit(300) : rich;
  const { data: acct } = await admin().from("mail_accounts").select("email, status").eq("user_id", auth.user.id).maybeSingle();
  const canSend = gmailConfigured() && acct?.status === "active";

  const perThread = ((res.data ?? []) as unknown as Row[])
    .map((th) => ({
      id: th.id,
      subject: th.subject,
      applicationId: th.application_id,
      school: th.applications?.programs?.schools?.name ?? th.contacts?.email?.split("@")[1] ?? "School",
      contactEmail: th.contacts?.email ?? null,
      threadIds: [th.id],
      replyThreadId: th.id,
      messages: (th.messages ?? [])
        .filter((m) => m.status !== "cancelled")
        .map(
          (m): InboxMsg => ({
            id: m.id!,
            threadId: th.id,
            direction: m.direction!,
            subject: m.subject ?? null,
            body: m.body ?? "",
            summary: m.summary ?? null,
            status: m.status!,
            to_email: m.to_email ?? null,
            from_email: m.from_email ?? null,
            from_name: m.from_name ?? null,
            purpose: m.purpose ?? null,
            action_needed: m.action_needed ?? null,
            due_date: m.due_date ?? null,
            read_at: rich.error ? undefined : (m.read_at ?? null),
            send_after: m.send_after ?? null,
            sent_at: m.sent_at ?? null,
            created_at: m.created_at!,
            last_error: m.last_error ?? null,
          }),
        )
        .sort((a, b) => (a.sent_at ?? a.created_at).localeCompare(b.sent_at ?? b.created_at)),
    }))
    .filter((th) => th.messages.length);

  // one conversation per school: every thread with the same application (or the same school) reads as one,
  // newest topic on top for replies
  const bySchool = new Map<string, InboxThread>();
  for (const th of perThread) {
    const key = th.applicationId ?? th.school.toLowerCase();
    const cur = bySchool.get(key);
    if (!cur) {
      bySchool.set(key, { ...th });
      continue;
    }
    cur.threadIds.push(...th.threadIds);
    cur.messages = [...cur.messages, ...th.messages].sort((a, b) => (a.sent_at ?? a.created_at).localeCompare(b.sent_at ?? b.created_at));
    cur.contactEmail = cur.contactEmail ?? th.contactEmail;
  }
  const threads: InboxThread[] = [...bySchool.values()].map((g) => {
    const lastMsg = g.messages[g.messages.length - 1];
    return { ...g, id: g.threadIds[0], replyThreadId: lastMsg.threadId, subject: lastMsg.subject ?? g.subject };
  });
  const { data: appRows } = await auth.sb.from("applications").select("id, programs(schools(name))").not("status", "in", "(dropped,withdrawn)").limit(60);
  const schoolList = [...new Map((appRows ?? []).map((a) => [a.id, { id: a.id as string, name: (a.programs as unknown as { schools: { name: string } }).schools.name }])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const openId = t ? threads.find((x) => x.threadIds.includes(t))?.id ?? null : null;

  // the panel beside a conversation: where the application with that school stands, what the agents are doing
  // about its emails, and the timeline
  const appIds = [...new Set(threads.map((x) => x.applicationId).filter((x): x is string => !!x))];
  const details: Record<string, SchoolDetail> = {};
  if (appIds.length) {
    const db = admin();
    const [{ data: apps }, { data: logins }, ups, { data: evs }] = await Promise.all([
      auth.sb.from("applications").select("id, status, target_deadline, portal_url, runner_status, runner_note, programs(name, degree, app_fee_usd, fee_waiver)").in("id", appIds),
      db.from("portal_accounts").select("application_id").eq("user_id", auth.user.id).in("application_id", appIds),
      auth.sb.from("followups").select("application_id, title, kind, status, event_start").in("application_id", appIds).order("created_at", { ascending: false }).limit(60),
      auth.sb.from("events").select("application_id, actor, action, created_at, context").in("application_id", appIds).not("action", "like", "guard.%").order("created_at", { ascending: false }).limit(300),
    ]);
    for (const a of apps ?? []) {
      const p = a.programs as unknown as { name: string; degree: string | null; app_fee_usd: number | null; fee_waiver: string | null };
      details[a.id] = {
        program: p.name,
        status: a.status,
        runner: a.runner_status,
        runnerNote: a.runner_note,
        deadline: a.target_deadline,
        fee: p.app_fee_usd,
        waiver: p.fee_waiver,
        portalUrl: a.portal_url,
        hasLogin: (logins ?? []).some((l) => l.application_id === a.id),
        followups: ((ups.error ? [] : ups.data) ?? []).filter((f) => f.application_id === a.id).slice(0, 5).map((f) => ({ title: f.title, kind: f.kind, status: f.status, at: f.event_start })),
        timeline: (evs ?? [])
          .filter((e) => e.application_id === a.id)
          .map((e) => ({ at: e.created_at as string, text: describe(e) }))
          .filter((e): e is { at: string; text: string } => !!e.text)
          .slice(0, 8),
      };
    }
  }

  return (
    <div>
      <PageHeader
        title="Messages"
        description={acct?.email && canSend ? `Sent from ${acct.email}` : "Emails to and from your schools"}
        actions={
          <div className="flex flex-wrap gap-2">
            <PasteEmail schools={schoolList} />
            {!canSend ? <ButtonLink href="/settings" variant="accent"><Mail className="size-4" aria-hidden /> Connect Gmail</ButtonLink> : null}
          </div>
        }
      />
      {threads.length ? (
        <MessagesApp threads={threads} initialId={openId} canSend={canSend} email={acct?.email ?? null} details={details} />
      ) : (
        <Empty
          icon={<Mail className="size-5" />}
          title="No emails yet"
          body="When agents email a school for you (fee waivers, funding questions) or a school replies, the whole conversation shows up here."
        />
      )}
    </div>
  );
}
