import { requireUser } from "@/lib/supabase/server";
import Link from "next/link";
import { PingButton } from "./ping-button";
import { StopButton, CancelEmail, RetryRunner } from "./controls";
import { Decisions, type Decision } from "@/components/decisions";
import { userPlan } from "@/lib/budget";
import { describe, actorLabel } from "@/lib/activity";
import type { Digest } from "@/lib/activity";

export const dynamic = "force-dynamic";

const STAGES: [string, string[]][] = [
  ["researching", ["researching"]],
  ["shortlisted", ["shortlisted"]],
  ["preparing", ["preparing", "ready_for_review"]],
  ["approved", ["packet_approved"]],
  ["submitted", ["submitted", "under_review", "interview", "waitlisted"]],
  ["admitted", ["admitted"]],
];

const h2 = "mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500";
const list = "divide-y divide-neutral-200 rounded-md border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800";

export default async function Dashboard() {
  const auth = await requireUser();
  if (!auth) return null;
  const { sb, user } = auth;

  const today = new Date().toISOString().slice(0, 10);
  const { plan } = await userPlan(user.id);
  const [
    { data: approvals },
    { data: events },
    { data: due },
    { data: drafts },
    { data: blocked },
    { count: parked },
    { data: cords },
    { data: apps },
    { data: outgoing },
    { data: runner },
    { data: digest },
  ] = await Promise.all([
    sb.from("approvals").select("id, title, kind, summary, payload").eq("status", "pending").order("urgency", { ascending: false }),
    sb.from("events").select("id, actor, action, created_at, context").not("action", "like", "guard.%").order("created_at", { ascending: false }).limit(25),
    sb
      .from("applications")
      .select("id, target_deadline, status, programs(name, schools(name))")
      .in("status", ["shortlisted", "preparing", "ready_for_review", "packet_approved"])
      .gte("target_deadline", today)
      .order("target_deadline")
      .limit(6),
    sb.from("events").select("id, application_id, context, created_at").eq("action", "artifact.ready_for_user").order("created_at", { ascending: false }).limit(5),
    sb.from("jobs").select("id").eq("status", "queued").ilike("last_error", "%credit balance%").limit(1),
    sb.from("jobs").select("id", { count: "exact", head: true }).eq("status", "queued").ilike("last_error", "budget:%"),
    sb.from("ripcords").select("id, scope_kind, scope_value").eq("active", true),
    sb.from("applications").select("status"),
    sb.from("messages").select("id, subject, to_email, send_after, threads(application_id)").eq("status", "scheduled").order("send_after"),
    sb.from("applications").select("id, runner_status, runner_note, programs(name, schools(name))").in("runner_status", ["needs_you", "running", "ready", "failed"]),
    sb.from("digests").select("content, created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const pausedAll = (cords ?? []).some((c) => c.scope_kind === "all");
  const counts = STAGES.map(([label, sts]) => [label, (apps ?? []).filter((a) => sts.includes(a.status)).length] as const);
  const dg = digest?.content as Digest | undefined;

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">dashboard</h1>
          <p className="text-sm text-neutral-500">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <PingButton />
          <StopButton paused={pausedAll} />
        </div>
      </header>

      {pausedAll && (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          agents are paused. nothing runs, sends or submits until you resume. your own approved emails still go out.
        </p>
      )}

      {parked ? (
        <p className="rounded-md border border-amber-300 bg-amber-50/60 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          you&apos;ve reached this month&apos;s limit for some agent work. {parked} task{parked > 1 ? "s" : ""} will pick up again on the 1st.
          {plan.id === "free" ? <> <Link href="/pricing" className="underline">upgrade</Link> to continue now.</> : null}
        </p>
      ) : null}

      {blocked?.length ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          agents are briefly paused on our side. your queued work is saved and resumes automatically.
        </p>
      ) : null}

      <section className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {counts.map(([label, n]) => (
          <Link key={label} href={label === "researching" || label === "shortlisted" ? "/shortlist" : "/applications"} className="rounded-md border border-neutral-200 px-3 py-2 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600">
            <p className="text-xl font-semibold tabular-nums">{n}</p>
            <p className="text-xs text-neutral-500">{label}</p>
          </Link>
        ))}
      </section>

      <section>
        <h2 className={h2}>your queue</h2>
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

      {runner?.length ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className={h2.replace("mb-3 ", "")}>submissions</h2>
            <RetryRunner count={runner.filter((r) => r.runner_status === "needs_you" || r.runner_status === "failed").length} />
          </div>
          <ul className={list}>
            {runner.map((r) => {
              const p = r.programs as unknown as { name: string; schools: { name: string } };
              const tone = r.runner_status === "needs_you" || r.runner_status === "failed" ? "text-amber-700 dark:text-amber-400" : "text-neutral-500";
              return (
                <li key={r.id}>
                  <Link href={`/applications/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <span className="min-w-0 truncate">{p.schools.name} <span className="text-neutral-500">· {p.name}</span></span>
                    <span className={`shrink-0 text-xs ${tone}`}>{r.runner_status.replace("_", " ")}{r.runner_note ? `: ${r.runner_note}` : ""}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {outgoing?.length ? (
        <section>
          <h2 className={h2}>emails about to send</h2>
          <ul className={list}>
            {outgoing.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="min-w-0 truncate">{m.subject} <span className="text-neutral-500">· {m.to_email}</span></span>
                <CancelEmail id={m.id} sendAfter={m.send_after} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {drafts?.length ? (
        <section>
          <h2 className={h2}>drafts ready for you</h2>
          <ul className={list}>
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
        <h2 className={h2}>next deadlines</h2>
        {due?.length ? (
          <ul className={list}>
            {due.map((a) => {
              const p = a.programs as unknown as { name: string; schools: { name: string } };
              const days = Math.round((Date.parse(a.target_deadline + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000);
              return (
                <li key={a.id}>
                  <Link href={a.status === "shortlisted" ? "/shortlist" : `/applications/${a.id}`} className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <span className="min-w-0 truncate">{p.schools.name} <span className="text-neutral-500">· {p.name} · {a.status.replace(/_/g, " ")}</span></span>
                    <span className={days <= 14 ? "font-medium text-red-600" : days <= 45 ? "text-amber-600" : ""}>{days}d</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">
            no upcoming deadlines. <Link href="/shortlist" className="underline">build a shortlist</Link>.
          </p>
        )}
      </section>

      {dg && !dg.empty ? (
        <section>
          <h2 className={h2}>this morning&apos;s digest</h2>
          <div className="space-y-2 rounded-md border border-neutral-200 p-4 text-sm dark:border-neutral-800">
            <p className="font-medium">{dg.headline}</p>
            {dg.done.length ? <p className="text-neutral-600 dark:text-neutral-400">done: {dg.done.join(" · ")}</p> : null}
            {dg.coming_up.length ? <p className="text-neutral-600 dark:text-neutral-400">coming up: {dg.coming_up.slice(0, 4).join(" · ")}</p> : null}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className={h2.replace("mb-3 ", "")}>activity</h2>
          <Link href="/settings" className="text-xs text-neutral-500 underline">autonomy dial and settings</Link>
        </div>
        {events?.length ? (
          <ul className="space-y-1.5 text-sm">
            {events.map((e) => {
              const text = describe(e);
              if (!text) return null;
              return (
                <li key={e.id} className="flex gap-3">
                  <span className="w-32 shrink-0 text-xs leading-5 text-neutral-500">{new Date(e.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="w-20 shrink-0 text-xs leading-5 text-neutral-500">{actorLabel(e.actor)}</span>
                  <span>{text}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">no activity yet.</p>
        )}
      </section>
    </main>
  );
}
