import Link from "next/link";
import type { ReactNode } from "react";
import { admin } from "@/lib/supabase/admin";
import { categoryOf, monthStartUTC, CATEGORY_SHARE, type Category } from "@/lib/pricing";
import { planOf } from "@/lib/plans";
import { LessonsAdmin } from "@/components/learning/lessons-admin";
import { GrowthAdmin } from "@/components/growth/growth-admin";
import { MILESTONES, MILESTONE_ACTIONS, duration, journeys, summarize } from "@/lib/first-submission";

// the operator console's views. each loads its own data, so switching views stays quick.

const $ = (n: number) => `$${n.toFixed(2)}`;
const k = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));
const th = "px-4 py-2.5 text-left text-[12px] font-medium text-muted";
const td = "px-4 py-3 tabular-nums";

function ago(iso: string | null | undefined) {
  if (!iso) return "never";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
}

// ---- building blocks ----

function Section({ title, note, action, children }: { title: string; note?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[17px] font-semibold">{title}</h2>
          {note && <p className="mt-0.5 text-[13.5px] text-muted">{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface shadow-card ${className}`}>{children}</div>;
}

type Tone = "go" | "stop" | "signal" | undefined;
const toneText = (t: Tone) => (t === "go" ? "text-go" : t === "stop" ? "text-stop" : t === "signal" ? "text-signal" : "");

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: Tone }) {
  return (
    <Card className="p-4">
      <dt className="text-[12.5px] text-muted">{label}</dt>
      <dd className={`mt-1 font-serif text-[30px] leading-none tabular-nums ${toneText(tone)}`}>{value}</dd>
      {sub && <dd className="mt-1.5 text-[12.5px] text-muted">{sub}</dd>}
    </Card>
  );
}

function Pill({ tone, children }: { tone?: Tone; children: ReactNode }) {
  const cls = tone === "go" ? "border-go/30 text-go" : tone === "stop" ? "border-stop/30 text-stop" : tone === "signal" ? "border-signal/30 text-signal" : "border-line text-muted";
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[12px] ${cls}`}>{children}</span>;
}

function Table({ head, children, min = "40rem" }: { head: string[]; children: ReactNode; min?: string }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-[14px]" style={{ minWidth: min }}>
        <thead>
          <tr className="border-b border-line">
            {head.map((h) => (
              <th key={h} className={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </Card>
  );
}

function Bar({ share, tone }: { share: number; tone?: Tone }) {
  return (
    <span className="mt-1 block h-1 w-24 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
      <span className={`block h-full ${tone === "stop" ? "bg-stop" : "bg-foreground/70"}`} style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%` }} />
    </span>
  );
}

// ---- shared data ----

async function health() {
  const db = admin();
  const [{ data: pause }, { data: lastLock }, { count: queued }, { count: gmail }, { data: lastErr }] = await Promise.all([
    db.from("billing_settings").select("value").eq("key", "ai_paused_until").maybeSingle(),
    db.from("jobs").select("locked_at").not("locked_at", "is", null).order("locked_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("jobs").select("id", { count: "exact", head: true }).eq("status", "queued").lte("run_at", new Date().toISOString()),
    db.from("mail_accounts").select("user_id", { count: "exact", head: true }).eq("status", "active"),
    db.from("agent_runs").select("error, started_at").not("error", "is", null).order("started_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const pausedUntil = pause?.value ? Date.parse(pause.value) : 0;
  const credit = /credit balance is too low/i.test(lastErr?.error ?? "") && Date.now() - Date.parse(lastErr!.started_at) < 3 * 3_600_000;
  return { pausedUntil: pausedUntil > Date.now() ? pausedUntil : 0, credit, lastLock: lastLock?.locked_at as string | undefined, queued: queued ?? 0, gmail: gmail ?? 0 };
}

function HealthStrip({ h }: { h: Awaited<ReturnType<typeof health>> }) {
  const workerStale = !h.lastLock || Date.now() - Date.parse(h.lastLock) > 20 * 60_000;
  const items: [string, string, Tone][] = [
    [
      "AI provider",
      h.credit ? "Out of credit: top up at console.anthropic.com" : h.pausedUntil ? `Paused until ${new Date(h.pausedUntil).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : "Working",
      h.credit || h.pausedUntil ? "stop" : "go",
    ],
    ["Job worker", `Last job picked up ${ago(h.lastLock)}${h.queued ? `, ${h.queued} waiting` : ""}`, workerStale && h.queued ? "stop" : workerStale ? "signal" : "go"],
    ["Gmail connections", `${h.gmail} connected`, h.gmail ? undefined : "signal"],
  ];
  return (
    <Card className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {items.map(([label, value, tone]) => (
        <div key={label} className="flex items-start gap-3 px-4 py-3.5">
          <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${tone === "go" ? "bg-go" : tone === "stop" ? "bg-stop" : tone === "signal" ? "bg-signal" : "bg-neutral-400"}`} />
          <div className="min-w-0">
            <p className="text-[12.5px] text-muted">{label}</p>
            <p className={`text-[14px] ${toneText(tone === "go" ? undefined : tone)}`}>{value}</p>
          </div>
        </div>
      ))}
    </Card>
  );
}

const REASON: Record<string, string> = {
  stuck: "Stuck on a page",
  question: "Waiting on the applicant's answer",
  missing: "Missing profile detail or document",
  verification: "Waiting on a verification email",
  login: "Saved password rejected",
  account: "Couldn't create the portal account",
  blocked: "Portal blocked the agents",
  captcha: "Bot check",
  unpaid: "Waiting for the applicant to pay",
  payment: "At the payment page",
};

async function attention() {
  const { data } = await admin()
    .from("applications")
    .select("id, user_id, runner_status, runner_note, runner_state, runner_updated_at, programs(name, schools(name)), profiles(email)")
    .in("runner_status", ["needs_you", "failed"])
    .order("runner_updated_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((a) => {
    const st = (a.runner_state ?? {}) as { reason?: string };
    const p = a.programs as unknown as { name?: string; schools?: { name?: string } } | null;
    return {
      id: a.id as string,
      school: p?.schools?.name ?? "Unknown school",
      program: p?.name ?? "",
      email: (a.profiles as unknown as { email?: string } | null)?.email ?? "",
      status: a.runner_status as string,
      reason: a.runner_status === "failed" ? "failed" : (st.reason ?? "other"),
      note: (a.runner_note as string) ?? "",
      at: a.runner_updated_at as string,
    };
  });
}

// ---- views ----

export async function OverviewView({ since }: { since: string }) {
  const db = admin();
  const [h, waiting, { data: users }, { data: runs }, { data: pays }, { data: steps }, { count: submittedMonth }] = await Promise.all([
    health(),
    attention(),
    db.from("profiles").select("id, email, created_at"),
    db.from("agent_runs").select("cost_usd").gte("started_at", since).limit(50000),
    db.from("billing_events").select("user_id, kind, amount, currency").gte("created_at", since),
    db.from("events").select("user_id, action, created_at").in("action", MILESTONE_ACTIONS).order("created_at", { ascending: true }).limit(50000),
    db.from("events").select("id", { count: "exact", head: true }).eq("action", "runner.submitted").gte("created_at", since),
  ]);
  const funnel = summarize(journeys(users ?? [], steps ?? []));
  const cost = (runs ?? []).reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
  const revenue = (pays ?? []).reduce((s, p) => s + (p.currency === "USD" ? Number(p.amount) || 0 : p.kind === "submission" ? 1.9 : 0), 0);
  const paying = new Set((pays ?? []).map((p) => p.user_id)).size;
  const week = (users ?? []).filter((u) => Date.now() - Date.parse(u.created_at) < 7 * 86_400_000).length;
  const groups = new Map<string, typeof waiting>();
  for (const w of waiting) groups.set(w.reason, [...(groups.get(w.reason) ?? []), w]);
  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="space-y-10">
      <HealthStrip h={h} />
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Users" value={`${users?.length ?? 0}`} sub={`${week} new this week`} />
        <Stat label="Submitted by the agents" value={`${funnel.submitted}`} sub={`${submittedMonth ?? 0} this month`} tone={funnel.submitted ? "go" : undefined} />
        <Stat label="Sign-up to first submission" value={duration(funnel.medianToSubmitMs)} sub="median" />
        <Stat label="AI cost" value={$(cost)} sub={`${$(cost / Math.max(1, users?.length ?? 1))} per user`} />
        <Stat label="Revenue, est." value={$(revenue)} sub={`${paying} paying`} />
        <Stat label="Margin after AI" value={$(revenue - cost)} tone={revenue - cost < 0 ? "stop" : "go"} />
      </dl>

      <Section
        title="Needs attention"
        note={waiting.length ? `${waiting.length} application${waiting.length === 1 ? "" : "s"} stopped, grouped by why` : "Nothing is waiting."}
        action={
          <Link href="/admin?view=portals" className="text-[13.5px] text-muted underline decoration-current/30 underline-offset-4 hover:text-foreground">
            Portal details
          </Link>
        }
      >
        {ordered.length > 0 && (
          <div className="grid gap-3 lg:grid-cols-2">
            {ordered.map(([reason, list]) => (
              <Card key={reason}>
                <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                  <p className="text-[14.5px] font-medium">{reason === "failed" ? "Run failed" : (REASON[reason] ?? "Other")}</p>
                  <Pill tone={reason === "failed" || reason === "stuck" ? "stop" : "signal"}>{list.length}</Pill>
                </div>
                <ul className="divide-y divide-line">
                  {list.slice(0, 5).map((w) => (
                    <li key={w.id} className="px-4 py-2.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[14px]">{w.school}</span>
                        <span className="shrink-0 text-[12px] text-muted">{ago(w.at)}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[12.5px] text-muted">
                        {w.email} · {w.note}
                      </p>
                    </li>
                  ))}
                  {list.length > 5 && <li className="px-4 py-2 text-[12.5px] text-muted">and {list.length - 5} more</li>}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

export async function SubmissionsView() {
  const db = admin();
  const [{ data: users }, { data: steps }] = await Promise.all([
    db.from("profiles").select("id, email, created_at"),
    db.from("events").select("user_id, action, created_at").in("action", MILESTONE_ACTIONS).order("created_at", { ascending: true }).limit(50000),
  ]);
  const trips = journeys(users ?? [], steps ?? []).sort((a, b) => b.signedUp.localeCompare(a.signedUp));
  const funnel = summarize(trips);
  return (
    <div className="space-y-10">
      <Section title="Time to first submission" note="From sign-up to the first application the agents submitted, for every user since launch.">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Submitted" value={`${funnel.submitted} of ${funnel.users}`} tone={funnel.submitted ? "go" : undefined} />
          <Stat label="Median time" value={duration(funnel.medianToSubmitMs)} />
          <Stat label="Within 15 min" value={`${funnel.within15m}`} />
          <Stat label="Within 24 h / 7 d" value={`${funnel.within24h} / ${funnel.within7d}`} />
        </dl>
      </Section>
      <Section title="Where people stop" note="Each step's reach, and how long it takes.">
        <Table head={["Step", "Users who reached it", "Median from sign-up", "Median from the step before"]}>
          {funnel.steps.map((x) => (
            <tr key={x.key}>
              <td className="px-4 py-3">{x.label}</td>
              <td className={td}>
                {x.users}
                <Bar share={funnel.users ? x.users / funnel.users : 0} />
              </td>
              <td className={td}>{duration(x.medianFromSignupMs)}</td>
              <td className={td}>{duration(x.medianFromPreviousMs)}</td>
            </tr>
          ))}
        </Table>
      </Section>
      <Section title="Each user" note="Time from sign-up to each step.">
        <Table head={["User", "Signed up", ...MILESTONES.map((m) => m.label)]} min="58rem">
          {trips.map((j) => (
            <tr key={j.userId}>
              <td className="max-w-[14rem] truncate px-4 py-3">{j.email}</td>
              <td className={td}>{new Date(j.signedUp).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</td>
              {MILESTONES.map((m) => (
                <td key={m.key} className={`${td} ${m.key === "submitted" && j.at.submitted ? "font-medium text-go" : ""}`}>
                  {j.at[m.key] ? duration(Date.parse(j.at[m.key]!) - Date.parse(j.signedUp)) : <span className="text-muted">·</span>}
                </td>
              ))}
            </tr>
          ))}
        </Table>
      </Section>
    </div>
  );
}

export async function PortalsView() {
  const { data } = await admin()
    .from("applications")
    .select("id, runner_status, runner_note, portal_url, runner_state, runner_updated_at, status, programs(name, schools(name)), profiles(email)")
    .neq("runner_status", "idle")
    .order("runner_updated_at", { ascending: false })
    .limit(60);
  const tone = (s: string): Tone => (s === "submitted" ? "go" : s === "failed" ? "stop" : s === "needs_you" ? "signal" : undefined);
  const label: Record<string, string> = { submitted: "Submitted", failed: "Failed", needs_you: "Needs the applicant", running: "Running", ready: "Queued", paused: "Paused" };
  return (
    <Section title="Portal runs" note="Every application the agents have worked on, newest first. Open one for the last page they saw.">
      <div className="space-y-2">
        {(data ?? []).map((a) => {
          const st = (a.runner_state ?? {}) as {
            last_url?: string;
            reason?: string;
            steps?: number;
            totalSteps?: number;
            stuckRepeats?: number;
            navHistory?: string[];
            debug?: { title?: string; fields?: string[]; values?: string[]; buttons?: string[]; errors?: string[]; complaints?: string[]; unnamed?: string[]; captcha?: boolean; body?: string };
          };
          const d = st.debug;
          const p = a.programs as unknown as { name?: string; schools?: { name?: string } } | null;
          return (
            <details key={a.id} className="group rounded-2xl border border-line bg-surface shadow-card">
              <summary className="grid cursor-pointer list-none gap-x-4 gap-y-1 px-4 py-3 marker:hidden sm:grid-cols-[minmax(0,14rem)_9rem_minmax(0,1fr)_6rem] sm:items-center">
                <span className="min-w-0">
                  <span className="block truncate text-[14.5px] font-medium">{p?.schools?.name ?? "Unknown school"}</span>
                  <span className="block truncate text-[12px] text-muted">{(a.profiles as unknown as { email?: string } | null)?.email}</span>
                </span>
                <span>
                  <Pill tone={tone(a.runner_status)}>{label[a.runner_status] ?? a.runner_status}</Pill>
                </span>
                <span className="line-clamp-2 text-[13px] text-muted">{a.runner_note}</span>
                <span className="text-[12px] text-muted sm:text-right">{ago(a.runner_updated_at)}</span>
              </summary>
              <div className="space-y-3 border-t border-line px-4 py-3 text-[12.5px]">
                <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  <div className="truncate">
                    <dt className="inline text-muted">Last page: </dt>
                    <dd className="inline break-all">{st.last_url ?? "none"}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted">Reason: </dt>
                    <dd className="inline">{st.reason ? (REASON[st.reason] ?? st.reason) : "none"}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted">Steps: </dt>
                    <dd className="inline">
                      {st.steps ?? 0} this run, {st.totalSteps ?? 0} in all{st.stuckRepeats ? `, stuck ${st.stuckRepeats}× on this page` : ""}
                    </dd>
                  </div>
                  {d?.title && (
                    <div className="truncate">
                      <dt className="inline text-muted">Page title: </dt>
                      <dd className="inline">{d.title}</dd>
                    </div>
                  )}
                </dl>
                {(d?.complaints?.length || d?.errors?.length) && (
                  <p className="text-stop">What the page said: {[...(d?.errors ?? []), ...(d?.complaints ?? [])].join(" · ")}</p>
                )}
                {st.navHistory?.length ? (
                  <ol className="list-decimal space-y-0.5 pl-5 text-muted">
                    {st.navHistory.slice(-8).map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ol>
                ) : null}
                {d && (
                  <div className="space-y-1 rounded-xl bg-neutral-100 p-3 font-mono text-[11.5px] leading-relaxed dark:bg-neutral-900">
                    <p>fields: {(d.fields ?? []).join(" | ")}</p>
                    <p>values: {(d.values ?? []).join(" | ")}</p>
                    <p>buttons: {(d.buttons ?? []).join(" | ")}</p>
                    {d.unnamed?.length ? <p>buttons without text: {d.unnamed.join(" | ")}</p> : null}
                    <p>captcha: {String(d.captcha ?? false)}</p>
                    <p className="whitespace-pre-wrap">body: {d.body}</p>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </Section>
  );
}

export async function CostsView({ since }: { since: string }) {
  const db = admin();
  const [{ data: users }, { data: runs }] = await Promise.all([
    db.from("profiles").select("id, email, plan, monthly_budget_usd"),
    db.from("agent_runs").select("user_id, agent, model, cost_usd, input_tokens, output_tokens").gte("started_at", since).limit(50000),
  ]);
  type Row = { cost: number; cat: Record<Category, number>; calls: number };
  const perUser = new Map<string, Row>();
  const perAgent = new Map<string, { cost: number; calls: number; inTok: number; outTok: number }>();
  for (const r of runs ?? []) {
    const c = Number(r.cost_usd) || 0;
    const u = perUser.get(r.user_id) ?? { cost: 0, cat: { research: 0, writing: 0, core: 0 }, calls: 0 };
    u.cost += c;
    u.cat[categoryOf(r.agent)] += c;
    u.calls++;
    perUser.set(r.user_id, u);
    const key = `${r.agent} · ${r.model}`;
    const a = perAgent.get(key) ?? { cost: 0, calls: 0, inTok: 0, outTok: 0 };
    a.cost += c;
    a.calls++;
    a.inTok += r.input_tokens ?? 0;
    a.outTok += r.output_tokens ?? 0;
    perAgent.set(key, a);
  }
  const total = [...perUser.values()].reduce((s, u) => s + u.cost, 0);
  const agents = [...perAgent.entries()].sort((a, b) => b[1].cost - a[1].cost);
  const top = agents[0]?.[1].cost || 1;
  return (
    <div className="space-y-10">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="AI cost this month" value={$(total)} />
        <Stat label="Calls" value={k((runs ?? []).length)} />
        <Stat label="Per call" value={$(total / Math.max(1, (runs ?? []).length))} />
        <Stat label="Most expensive agent" value={agents[0]?.[0].split(" · ")[0] ?? "none"} sub={agents[0] ? $(agents[0][1].cost) : undefined} />
      </dl>
      <Section title="By agent and model">
        <Table head={["Agent", "Model", "Calls", "Tokens in / out", "Cost", "Per call"]}>
          {agents.map(([key, a]) => {
            const [agent, model] = key.split(" · ");
            return (
              <tr key={key}>
                <td className="px-4 py-3 font-medium">{agent}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-muted">{model}</td>
                <td className={td}>{a.calls}</td>
                <td className={td}>
                  {k(a.inTok)} / {k(a.outTok)}
                </td>
                <td className={td}>
                  {$(a.cost)}
                  <Bar share={a.cost / top} />
                </td>
                <td className={td}>{$(a.cost / Math.max(1, a.calls))}</td>
              </tr>
            );
          })}
        </Table>
      </Section>
      <Section title="By user" note="Spend against each user's monthly AI budget.">
        <Table head={["User", "Plan", "Spent of budget", "Research", "Writing", "Core", "Calls"]} min="48rem">
          {(users ?? [])
            .map((u) => ({ u, r: perUser.get(u.id) ?? { cost: 0, cat: { research: 0, writing: 0, core: 0 }, calls: 0 } }))
            .sort((a, b) => b.r.cost - a.r.cost)
            .map(({ u, r }) => {
              const budget = u.monthly_budget_usd != null ? Number(u.monthly_budget_usd) : planOf(u.plan).aiBudgetUsd;
              const share = budget ? r.cost / budget : 0;
              return (
                <tr key={u.id}>
                  <td className="max-w-[14rem] truncate px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3 capitalize">{u.plan}</td>
                  <td className={td}>
                    <span className={share > 0.9 ? "font-medium text-stop" : ""}>
                      {$(r.cost)} <span className="text-muted">of {$(budget)}</span>
                    </span>
                    <Bar share={share} tone={share > 0.9 ? "stop" : undefined} />
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
        </Table>
      </Section>
    </div>
  );
}

export function GrowthView() {
  return (
    <Section title="Growth" note="Where sign-ups come from, invites and ambassadors.">
      <GrowthAdmin />
    </Section>
  );
}

export async function LearningView() {
  return (
    <Section title="Learning" note="Lessons the agents learned from stuck runs and edits. Portal notes apply at once; general lessons wait for your approval.">
      <LessonsAdmin {...await lessonData()} />
    </Section>
  );
}

export async function SystemView({ since }: { since: string }) {
  const db = admin();
  const [h, { data: failed }, { data: queue }] = await Promise.all([
    health(),
    db.from("agent_runs").select("agent, error, started_at").eq("status", "failed").gte("started_at", since).order("started_at", { ascending: false }).limit(30),
    db.from("jobs").select("agent, task, status").in("status", ["queued", "running", "failed"]).limit(2000),
  ]);
  const byJob = new Map<string, Record<string, number>>();
  for (const j of queue ?? []) {
    const key = `${j.agent}.${j.task}`;
    const r = byJob.get(key) ?? {};
    r[j.status] = (r[j.status] ?? 0) + 1;
    byJob.set(key, r);
  }
  return (
    <div className="space-y-10">
      <HealthStrip h={h} />
      <Section title="Job queue" note="Jobs waiting, running or failed, by agent and task.">
        <Table head={["Job", "Waiting", "Running", "Failed"]} min="30rem">
          {[...byJob.entries()].length ? (
            [...byJob.entries()]
              .sort((a, b) => (b[1].queued ?? 0) - (a[1].queued ?? 0))
              .map(([key, r]) => (
                <tr key={key}>
                  <td className="px-4 py-3 font-mono text-[12.5px]">{key}</td>
                  <td className={td}>{r.queued ?? 0}</td>
                  <td className={td}>{r.running ?? 0}</td>
                  <td className={`${td} ${r.failed ? "text-stop" : ""}`}>{r.failed ?? 0}</td>
                </tr>
              ))
          ) : (
            <tr>
              <td className="px-4 py-3 text-muted" colSpan={4}>
                The queue is empty.
              </td>
            </tr>
          )}
        </Table>
      </Section>
      <Section title="Recent failures" note="This month, newest first.">
        <Card>
          <ul className="divide-y divide-line">
            {(failed ?? []).length ? (
              (failed ?? []).map((f, i) => (
                <li key={i} className="grid gap-1 px-4 py-2.5 text-[12.5px] sm:grid-cols-[9rem_7rem_minmax(0,1fr)]">
                  <span className="text-muted">{ago(f.started_at)}</span>
                  <span className="font-medium">{f.agent}</span>
                  <span className="break-words font-mono text-[11.5px]">{(f.error ?? "").slice(0, 300)}</span>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-[13.5px] text-muted">No failures this month.</li>
            )}
          </ul>
        </Card>
      </Section>
    </div>
  );
}

async function lessonData() {
  const db = admin();
  const empty = { proposed: [], active: [], retired: [], personal: { users: 0, lessons: 0 } };
  const { data, error } = await db.from("lessons").select("id, scope, user_id, agent, task, topic, text, status, evidence, created_at, retired_reason").order("created_at", { ascending: false }).limit(1000);
  if (error) return empty;
  const rows = data ?? [];
  const global = rows.filter((l) => l.scope === "global");
  const { data: runs } = await db.from("agent_runs").select("lesson_ids").not("lesson_ids", "is", null).gte("started_at", monthStartUTC()).limit(20000);
  const uses = new Map<string, number>();
  for (const r of runs ?? []) for (const id of (r.lesson_ids as string[]) ?? []) uses.set(id, (uses.get(id) ?? 0) + 1);
  const withUses = (xs: typeof rows) => xs.map((l) => ({ ...l, uses: uses.get(l.id) ?? 0 }));
  const personal = rows.filter((l) => l.scope === "user" && l.status === "active");
  return {
    proposed: withUses(global.filter((l) => l.status === "proposed")),
    active: withUses(global.filter((l) => l.status === "active")),
    retired: withUses(global.filter((l) => l.status === "retired").slice(0, 10)),
    personal: { users: new Set(personal.map((l) => l.user_id)).size, lessons: personal.length },
  };
}
