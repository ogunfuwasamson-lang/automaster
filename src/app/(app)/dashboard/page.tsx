import { requireUser } from "@/lib/supabase/server";
import Link from "next/link";
import { PingButton } from "./ping-button";
import { Decisions, type Decision } from "@/components/decisions";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const auth = await requireUser();
  if (!auth) return null;
  const { sb, user } = auth;

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: grants }, { data: approvals }, { data: events }, { data: due }] = await Promise.all([
    sb.from("grants").select("capability, mode, undo_seconds, ceiling_cents").order("capability"),
    sb.from("approvals").select("id, title, kind, summary, payload").eq("status", "pending").order("urgency", { ascending: false }),
    sb.from("events").select("id, actor, action, created_at, context").order("created_at", { ascending: false }).limit(20),
    sb
      .from("applications")
      .select("id, target_deadline, tier, programs(name, schools(name))")
      .eq("status", "shortlisted")
      .gte("target_deadline", today)
      .order("target_deadline")
      .limit(5),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">dashboard</h1>
          <p className="text-sm text-neutral-500">{user.email}</p>
        </div>
        <PingButton />
      </header>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">your queue</h2>
        {approvals?.length ? (
          <>
            <Decisions items={(approvals as Decision[]).slice(0, 3)} />
            {approvals.length > 3 && (
              <Link href="/profile" className="mt-2 inline-block text-sm text-neutral-500 underline">
                {approvals.length - 3} more on your profile
              </Link>
            )}
          </>
        ) : (
          <p className="text-sm text-neutral-500">nothing needs you right now.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">next deadlines</h2>
        {due?.length ? (
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
            {due.map((a) => {
              const p = a.programs as unknown as { name: string; schools: { name: string } };
              const days = Math.round((Date.parse(a.target_deadline + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000);
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="min-w-0 truncate">{p.schools.name} <span className="text-neutral-500">· {p.name}</span></span>
                  <span className={days <= 14 ? "font-medium text-red-600" : days <= 45 ? "text-amber-600" : ""}>{days}d</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">
            no shortlist yet. <Link href="/shortlist" className="underline">build one</Link>.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">autonomy dial</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {grants?.map((g) => (
                <tr key={g.capability} className="border-b border-neutral-200 dark:border-neutral-800">
                  <td className="py-2 font-mono text-xs">{g.capability}</td>
                  <td className="py-2">{g.mode}{g.undo_seconds ? ` · ${g.undo_seconds / 60}m undo` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">activity</h2>
        {events?.length ? (
          <ul className="space-y-1 font-mono text-xs">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="text-neutral-500">{new Date(e.created_at).toLocaleString()}</span>
                <span>{e.actor}</span>
                <span className="text-neutral-500">{e.action}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">no activity yet.</p>
        )}
      </section>
    </main>
  );
}
