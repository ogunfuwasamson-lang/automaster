import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { categoryOf, monthStartUTC, CATEGORY_SHARE, type Category } from "@/lib/pricing";
import { planOf } from "@/lib/plans";

export const dynamic = "force-dynamic";

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
  const paying = (users ?? []).filter((u) => u.plan !== "free");
  const revenue = paying.reduce((s, u) => s + (u.plan === "season" ? 199 / 6 : 49), 0);
  const $ = (n: number) => `$${n.toFixed(2)}`;
  const k = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">admin · this month</h1>
      <p className="text-sm">
        AI cost {$(total)} · users {users?.length ?? 0} ({paying.length} paying) · est. monthly revenue {$(revenue)} · margin after AI {$(revenue - total)}
      </p>

      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">per user</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-500">
              <th className="py-1 font-normal">user</th><th className="font-normal">plan</th><th className="font-normal">spent / budget</th>
              <th className="font-normal">research</th><th className="font-normal">writing</th><th className="font-normal">core</th><th className="font-normal">calls</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? [])
              .map((u) => ({ u, r: perUser.get(u.id) ?? { cost: 0, cat: { research: 0, writing: 0, core: 0 }, calls: 0 } }))
              .sort((a, b) => b.r.cost - a.r.cost)
              .map(({ u, r }) => {
                const budget = u.monthly_budget_usd != null ? Number(u.monthly_budget_usd) : planOf(u.plan).aiBudgetUsd;
                return (
                  <tr key={u.id} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="py-1.5">{u.email}</td>
                    <td>{u.plan}</td>
                    <td className={r.cost / budget > 0.9 ? "text-red-600" : ""}>{$(r.cost)} / {$(budget)}</td>
                    {(["research", "writing", "core"] as const).map((c) => (
                      <td key={c}>{$(r.cat[c])} <span className="text-neutral-400">/ {$(budget * CATEGORY_SHARE[c])}</span></td>
                    ))}
                    <td>{r.calls}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">per agent</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-500"><th className="py-1 font-normal">agent · model</th><th className="font-normal">calls</th><th className="font-normal">tokens in / out</th><th className="font-normal">cost</th><th className="font-normal">per call</th></tr>
          </thead>
          <tbody>
            {[...perAgent.entries()].sort((a, b) => b[1].cost - a[1].cost).map(([key, a]) => (
              <tr key={key} className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="py-1.5 font-mono text-xs">{key}</td><td>{a.calls}</td><td>{k(a.inTok)} / {k(a.outTok)}</td><td>{$(a.cost)}</td><td>{$(a.cost / Math.max(1, a.calls))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">runner: last page seen</h2>
        <div className="space-y-3">
          {(runner ?? []).map((a) => {
            const st = (a.runner_state ?? {}) as { last_url?: string; steps?: number; missing?: string[]; debug?: { title?: string; fields?: string[]; values?: string[]; buttons?: string[]; errors?: string[]; captcha?: boolean; body?: string } };
            const d = st.debug;
            return (
              <details key={a.id} className="rounded-md border border-neutral-200 p-3 text-xs dark:border-neutral-800">
                <summary className="cursor-pointer">
                  <span className="font-medium">{(a.programs as unknown as { schools: { name: string } }).schools.name}</span> · {a.runner_status} · {a.runner_note}
                </summary>
                <div className="mt-2 space-y-1 font-mono">
                  <p>portal: {a.portal_url}</p>
                  <p>last: {st.last_url} · steps {st.steps ?? 0} · missing {(st.missing ?? []).join(",") || "-"}</p>
                  {d ? (
                    <>
                      <p>title: {d.title} · captcha: {String(d.captcha)}</p>
                      <p>fields: {(d.fields ?? []).join(" | ")}</p>
                      <p>values: {(d.values ?? []).join(" | ")}</p>
                      <p>buttons: {(d.buttons ?? []).join(" | ")}</p>
                      <p>errors: {(d.errors ?? []).join(" | ") || "-"}</p>
                      <p className="whitespace-pre-wrap">body: {d.body}</p>
                    </>
                  ) : null}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500">recent failures</h2>
        <ul className="space-y-1 font-mono text-xs">
          {(failed ?? []).map((f, i) => <li key={i}>{new Date(f.started_at).toLocaleString()} · {f.agent} · {(f.error ?? "").slice(0, 200)}</li>)}
        </ul>
      </section>
    </main>
  );
}
