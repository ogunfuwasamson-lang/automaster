import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { gmailConfigured } from "@/lib/gmail";
import { Dial, FeeEnvelope, DigestToggle, MailCard, RunnerCard } from "./controls";
import type { GrantMode } from "@/lib/policy";

export const dynamic = "force-dynamic";

export default async function Settings({ searchParams }: { searchParams: Promise<{ mail?: string }> }) {
  const auth = await requireUser();
  if (!auth) return null;
  const uid = auth.user.id;
  const db = admin();
  const { mail } = await searchParams;
  const [{ data: grants }, { data: prof }, { data: acct }, { data: tokens }] = await Promise.all([
    auth.sb.from("grants").select("capability, mode, undo_seconds"),
    db.from("profiles").select("fee_envelope_cents, digest_enabled").eq("id", uid).single(),
    db.from("mail_accounts").select("email, status, last_error").eq("user_id", uid).maybeSingle(),
    db.from("runner_tokens").select("id, label, created_at, last_used_at").eq("user_id", uid).is("revoked_at", null).order("created_at", { ascending: false }),
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">settings</h1>
        <p className="text-sm text-neutral-500">how much the agents do on their own, and where they act for you.</p>
      </header>

      <MailCard available={gmailConfigured()} email={acct?.email ?? null} status={acct?.status ?? null} error={acct?.last_error ?? null} notice={mail ?? null} />
      <RunnerCard tokens={tokens ?? []} />

      <section className="space-y-3 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-sm font-medium">autonomy dial</h2>
        <Dial grants={(grants ?? []) as { capability: string; mode: GrantMode; undo_seconds: number }[]} />
      </section>

      <section className="space-y-3 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-sm font-medium">application fees</h2>
        <FeeEnvelope usd={Math.round((prof?.fee_envelope_cents ?? 0) / 100)} />
      </section>

      <section className="space-y-3 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-sm font-medium">digest</h2>
        <DigestToggle enabled={prof?.digest_enabled ?? true} />
      </section>
    </main>
  );
}
