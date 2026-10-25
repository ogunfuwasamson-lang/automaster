import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { categoryOf, monthStartUTC, CATEGORY_SHARE, type Category } from "@/lib/pricing";
import { planOf } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const metadata = { title: "Operator" };

// operator-only view of AI cost per user. regular users get a 404.
export default async function Admin() {
  const auth = await requireUser();
  if (!auth) notFound();
  const db = admin();
  const { data: me } = await db.from("profiles").select("is_admin").eq("id", auth.user.id).single();
  if (!me?.is_admin) notFound();

  const since = monthStartUTC();
  const [{ data: users }, { data: runs }, { data: failed }, { data: runner }] = await Promise.all([
    db.from("profiles").select("id, email, plan, monthly_budget_usd, created_at"),
    db.from("agent_runs").select("user_id, agent, model, cost_usd, input_tokens, output_tokens").gte("started_at", since).limit(50000),
    db.from("agent_runs").select("agent, error, started_at").eq("status", "failed").gte("started_at", since).order("started_at", { ascending: false }).limit(15),
    db.from("applications").select("id, runner_status, runner_note, portal_url, runner_state, runner_updated_at, programs(schools(name))").neq("runner_status", "idle").order("runner_updated_at", { ascending: false }).limit(40),
  ]);

  type Row = { cost: number; cat: Record<Category, number>; calls: number };
  const perUser = new Map<string, Row>();
  const perAgent = new Map<string, { cost: number; calls: number; inTok: number; outTok: number; model: string }>();
  for (const r of runs ?? []) {
    const c = Number(r.cost_usd) || 0;
    const u = perUser.get(r.user_id) ?? { cost: 0, cat: { research: 0, writing: 0, core: 0 }, calls: 0 };
    u.cost += c;
    u.cat[categoryOf(r.agent)] += c;
    u.calls++;
    perUser.set(r.user_id, u);
    const key = `${r.agent} · ${r.model}`;
    const a = perAgent.get(key) ?? { cost: 0, calls: 0, inTok: 0, outTok: 0, model: r.model };
    a.cost += c;
    a.calls++;
    a.inTok += r.input_tokens ?? 0;
    a.outTok += r.output_tokens ?? 0;
    perAgent.set(key, a);
  }
  const total = [...perUser.values()].reduce((s, u) => s + u.cost, 0);
  // pro is free: only season passes pay ($199 per six months, counted monthly)
  const paying = (users ?? []).filter((u) => u.plan === "season");
  const revenue = paying.length * (199 / 6);
  const $ = (n: number) => `$${n.toFixed(2)}`;
  const k = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));

  const agents = [...perAgent.entries()].sort((a, b) => b[1].cost - a[1].cost);
  const topAgent = agents[0]?.[1].cost || 1;
  const th = "py-2 pr-4 text-left text-xs font-medium text-muted";
  const td = "py-2.5 pr-4 tabular";

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">Back to the app</Link>
          <h1 className="mt-2 font-display text-5xl font-bold leading-none tracking-tight">Operator</h1>
          <p className="mt-2 text-sm text-muted">This month, since {new Date(since).toLocaleDateString(undefined, { day: "numeric", month: "long" })}. Only admins see this page.</p>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(
          [
            ["AI cost", $(total)],
            ["Users", `${users?.length ?? 0}`, `${paying.length} paying`],
            ["Revenue, est.", $(revenue)],
            ["Margin after AI", $(revenue - total), revenue - total < 0 ? "stop" : "go"],
          ] as [string, string, string?][]
        ).map(([label, value, extra]) => (
          <div key={label} className="rounded-3xl border border-line bg-surface shadow-card p-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className={`mt-1 font-display text-3xl font-bold tabular ${extra === "stop" ? "text-stop" : extra === "go" ? "text-go" : ""}`}>{value}</dd>
            {extra && extra !== "stop" && extra !== "go" ? <dd className="text-xs text-muted">{extra}</dd> : null}
          </div>
        ))}
      </dl>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Per user</h2>
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-card px-4">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className={th}>User</th>
                <th className={th}>Plan</th>
                <th className={th}>Spent of budget</th>
                <th className={th}>Research</th>
                <th className={th}>Writing</th>
                <th className={th}>Core</th>
                <th className={th}>Calls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(users ?? [])
                .map((u) => ({ u, r: perUser.get(u.id) ?? { cost: 0, cat: { research: 0, writing: 0, core: 0 }, calls: 0 } }))
                .sort((a, b) => b.r.cost - a.r.cost)
                .map(({ u, r }) => {
                  const budget = u.monthly_budget_usd != null ? Number(u.monthly_budget_usd) : planOf(u.plan).aiBudgetUsd;
                  const share = budget ? Math.min(1, r.cost / budget) : 0;
                  return (
                    <tr key={u.id}>
                      <td className="max-w-[14rem] truncate py-2.5 pr-4">{u.email}</td>
                      <td className="py-2.5 pr-4 capitalize">{u.plan}</td>
                      <td className={td}>
                        <span className={share > 0.9 ? "font-medium text-stop" : ""}>
                          {$(r.cost)} <span className="text-muted">of {$(budget)}</span>
                        </span>
                        <span className="mt-1 block h-1 w-24 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                          <span className={`block h-full ${share > 0.9 ? "bg-stop" : "bg-bar-gradient"}`} style={{ width: `${share * 100}%` }} />
                        </span>
                      </td>
                      {(["research", "writing", "core"] as const).map((c) => (
                        <td key={c} className={td}>
                          {$(r.cat[c])} <span className="text-muted">of {$(budget * CATEGORY_SHARE[c])}</span>
                        </td>
                      ))}
                      <td className={td}>{r.calls}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Per agent and model</h2>
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-card px-4">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className={th}>Agent and model</th>
                <th className={th}>Calls</th>
                <th className={th}>Tokens in and out</th>
                <th className={`${th} w-1/3`}>Cost</th>
                <th className={th}>Per call</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {agents.map(([key, a]) => (
                <tr key={key}>
                  <td className="py-2.5 pr-4 font-mono text-xs">{key.replace(" · ", "  ")}</td>
                  <td className={td}>{a.calls}</td>
                  <td className={td}>
                    {k(a.inTok)} <span className="text-muted">/</span> {k(a.outTok)}
                  </td>
                  <td className={td}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 rounded-full bg-bar-gradient" style={{ width: `${Math.max(2, (a.cost / topAgent) * 100)}%` }} />
                      {$(a.cost)}
                    </span>
                  </td>
                  <td className={td}>{$(a.cost / Math.max(1, a.calls))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Runner: last page seen</h2>
        <div className="space-y-2">
          {(runner ?? []).map((a) => {
            const st = (a.runner_state ?? {}) as { last_url?: string; steps?: number; missing?: string[]; debug?: { title?: string; fields?: string[]; values?: string[]; buttons?: string[]; errors?: string[]; captcha?: boolean; body?: string } };
            const d = st.debug;
            return (
              <details key={a.id} className="rounded-3xl border border-line bg-surface shadow-card text-sm">
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <span className="font-medium">{(a.programs as unknown as { schools: { name: string } }).schools.name}</span>
                  <span className="rounded-full border border-line px-2 text-xs">{a.runner_status}</span>
                  <span className="min-w-0 flex-1 truncate text-muted">{a.runner_note}</span>
                </summary>
                <div className="space-y-1 border-t border-line px-4 py-3 font-mono text-xs leading-relaxed">
                  <p>portal: {a.portal_url}</p>
                  <p>
                    last: {st.last_url}, steps {st.steps ?? 0}, missing {(st.missing ?? []).join(",") || "none"}
                  </p>
                  {d ? (
                    <>
                      <p>
                        title: {d.title}, captcha: {String(d.captcha)}
                      </p>
                      <p>fields: {(d.fields ?? []).join(" | ")}</p>
                      <p>values: {(d.values ?? []).join(" | ")}</p>
                      <p>buttons: {(d.buttons ?? []).join(" | ")}</p>
                      <p>errors: {(d.errors ?? []).join(" | ") || "none"}</p>
                      <p className="whitespace-pre-wrap">body: {d.body}</p>
                    </>
                  ) : null}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent failures</h2>
        <ul className="divide-y divide-line rounded-3xl border border-line bg-surface shadow-card font-mono text-xs">
          {(failed ?? []).length ? (
            (failed ?? []).map((f, i) => (
              <li key={i} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[11rem_7rem_minmax(0,1fr)]">
                <span className="text-muted">{new Date(f.started_at).toLocaleString()}</span>
                <span>{f.agent}</span>
                <span className="break-words">{(f.error ?? "").slice(0, 240)}</span>
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-muted">No failures this month.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
