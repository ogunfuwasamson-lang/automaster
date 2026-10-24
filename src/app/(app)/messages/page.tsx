import { Mail } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { gmailConfigured } from "@/lib/gmail";
import { PageHeader, Empty } from "@/components/ui/page";
import { ButtonLink } from "@/components/ui/button";
import { MessagesApp, type InboxMsg, type InboxThread } from "./inbox";

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

export default async function Messages({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const auth = await requireUser();
  if (!auth) return null;
  const { t } = await searchParams;
  // the inbox migration adds sender, summary and read state; until it runs, read without them
  const rich = await auth.sb.from("threads").select(THREAD(RICH)).order("created_at", { ascending: false }).limit(300);
  const res = rich.error ? await auth.sb.from("threads").select(THREAD(BASE)).order("created_at", { ascending: false }).limit(300) : rich;
  const { data: acct } = await admin().from("mail_accounts").select("email, status").eq("user_id", auth.user.id).maybeSingle();
  const canSend = gmailConfigured() && acct?.status === "active";

  const threads: InboxThread[] = ((res.data ?? []) as unknown as Row[])
    .map((th) => ({
      id: th.id,
      subject: th.subject,
      applicationId: th.application_id,
      school: th.applications?.programs?.schools?.name ?? th.contacts?.email?.split("@")[1] ?? "School",
      contactEmail: th.contacts?.email ?? null,
      messages: (th.messages ?? [])
        .filter((m) => m.status !== "cancelled")
        .map(
          (m): InboxMsg => ({
            id: m.id!,
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

  return (
    <div>
      <PageHeader
        title="Messages"
        description={`Every email your agents sent and every reply from your schools, in one place.${acct?.email && canSend ? ` Everything goes out from ${acct.email}.` : ""}`}
        actions={!canSend ? <ButtonLink href="/settings" variant="accent"><Mail className="size-4" aria-hidden /> Connect Gmail</ButtonLink> : undefined}
      />
      {threads.length ? (
        <MessagesApp threads={threads} initialId={t && threads.some((x) => x.id === t) ? t : null} canSend={canSend} email={acct?.email ?? null} />
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
