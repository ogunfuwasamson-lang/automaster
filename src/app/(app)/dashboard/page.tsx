import { requireUser } from "@/lib/supabase/server";
import Link from "next/link";
import { PingButton } from "./ping-button";
import { Decisions, type Decision } from "@/components/decisions";
import { userPlan } from "@/lib/budget";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const auth = await requireUser();
  if (!auth) return null;
  const { sb, user } = auth;

  const today = new Date().toISOString().slice(0, 10);
  const { plan } = await userPlan(user.id);
  const [{ data: grants }, { data: approvals }, { data: events }, { data: due }, { data: drafts }, { data: blocked }, { count: parked }] = await Promise.all([
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
    sb.from("jobs").select("id").eq("status", "queued").ilike("last_error", "%credit balance%").limit(1),
    sb.from("jobs").select("id", { count: "exact", head: true }).eq("status", "queued").ilike("last_error", "budget:%"),
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
