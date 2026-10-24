import { requireUser } from "@/lib/supabase/server";
import Link from "next/link";
import { PingButton } from "./ping-button";
import { Decisions, type Decision } from "@/components/decisions";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const auth = await requireUser();
  if (!auth) return null;
  const { sb, user } = auth;

  const [{ data: grants }, { data: approvals }, { data: events }] = await Promise.all([
    sb.from("grants").select("capability, mode, undo_seconds, ceiling_cents").order("capability"),
    sb.from("approvals").select("id, title, kind, summary, payload").eq("status", "pending").order("urgency", { ascending: false }),
    sb.from("events").select("id, actor, action, created_at, context").order("created_at", { ascending: false }).limit(20),
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
