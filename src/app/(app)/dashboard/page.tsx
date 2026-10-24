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
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [{ data: grants }, { data: approvals }, { data: events }, { data: due }, { data: drafts }, { data: runs }, { data: blocked }] = await Promise.all([
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
    sb.from("events").select("id, application_id, context, created_at").eq("action", "artifact.ready_for_user").order("created_at", { ascending: false }).limit(5),
    sb.from("agent_runs").select("agent, input_tokens, output_tokens").gte("started_at", weekAgo).limit(2000),
    sb.from("jobs").select("id").eq("status", "queued").ilike("last_error", "%credit balance%").limit(1),
  ]);
  const usage = new Map<string, { runs: number; inTok: number; outTok: number }>();
  for (const r of runs ?? []) {
    const u = usage.get(r.agent) ?? { runs: 0, inTok: 0, outTok: 0 };
    u.runs++;
    u.inTok += r.input_tokens ?? 0;
    u.outTok += r.output_tokens ?? 0;
    usage.set(r.agent, u);
  }
  const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">dashboard</h1>
          <p className="text-sm text-neutral-500">{user.email}</p>
        </div>
        <PingButton />
      </header>

      {blocked?.length ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          agents are paused: your Anthropic API credit balance is too low. top up at console.anthropic.com → billing. queued work resumes on its own within 30 minutes of topping up; nothing is lost.
        </p>
      ) : null}

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

      {drafts?.length ? (
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">drafts ready for you</h2>
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
            {drafts.map((d) => (
              <li key={d.id}>
                <Link href={`/applications/${d.application_id}`} className="block px-4 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                  {(d.context as { title?: string })?.title ?? "draft"}
                  <span className="text-neutral-500"> · {new Date(d.created_at).toLocaleString()}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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

      {usage.size > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">api usage, last 7 days</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500">
                <th className="py-1 font-normal">agent</th>
                <th className="py-1 font-normal">calls</th>
                <th className="py-1 font-normal">input tokens</th>
                <th className="py-1 font-normal">output tokens</th>
              </tr>
            </thead>
            <tbody>
              {[...usage.entries()].sort((a, b) => b[1].inTok - a[1].inTok).map(([agent, u]) => (
                <tr key={agent} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="py-1.5 font-mono text-xs">{agent}</td>
                  <td className="py-1.5">{u.runs}</td>
                  <td className="py-1.5">{fmt(u.inTok)}</td>
                  <td className="py-1.5">{fmt(u.outTok)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-xs text-neutral-500">web research (recon, strategist) is the heavy part: each program reads several official pages.</p>
        </section>
      )}

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
