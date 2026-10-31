import { admin } from "@/lib/supabase/admin";

// the operator's growth view: signups over time, where they came from, how far they get, and who's paying.
// counts only, from tables Ivyward already keeps.
export async function GrowthAdmin() {
  const db = admin();
  const day = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();
  const head = { count: "exact" as const, head: true };
  const [total, d1, d7, d30, sources, refJoined, withApp, submitted, payers, alertsOk, ambassadors] = await Promise.all([
    db.from("profiles").select("id", head),
    db.from("profiles").select("id", head).gte("created_at", day(1)),
    db.from("profiles").select("id", head).gte("created_at", day(7)),
    db.from("profiles").select("id", head).gte("created_at", day(30)),
    db.from("profiles").select("signup_source").gte("created_at", day(30)).not("signup_source", "is", null).limit(20000),
    db.from("profiles").select("id", head).not("referred_by", "is", null),
    db.from("applications").select("user_id").limit(50000),
    db.from("applications").select("id", head).in("status", ["submitted", "under_review", "interview", "waitlisted", "admitted", "accepted", "declined", "rejected"]),
    db.from("billing_events").select("user_id").limit(50000),
    db.from("alert_subscribers").select("id", head).not("confirmed_at", "is", null).is("unsubscribed_at", null),
    db.from("ambassador_applications").select("name, email, country, institution, audience, channels, created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  const bySource = new Map<string, number>();
  for (const r of sources.data ?? []) {
    const s = (r.signup_source ?? {}) as Record<string, string>;
    const key = s.ref ? "invite link" : s.utm_source ? `utm: ${s.utm_source}` : s.referrer ? s.referrer : `direct (${s.landing ?? "/"})`.slice(0, 50);
    bySource.set(key, (bySource.get(key) ?? 0) + 1);
  }
  const top = [...bySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  const usersWithApp = new Set((withApp.data ?? []).map((r) => r.user_id)).size;
  const paying = new Set((payers.data ?? []).map((r) => r.user_id)).size;
  const stats: [string, number | string][] = [
    ["Users", total.count ?? 0],
    ["New today", d1.count ?? 0],
    ["New, 7 days", d7.count ?? 0],
    ["New, 30 days", d30.count ?? 0],
    ["Have an application", usersWithApp],
    ["Applications submitted", submitted.count ?? 0],
    ["Paying users", paying],
    ["Joined by invite", refJoined.count ?? 0],
    ["Deadline-alert subscribers", alertsOk.error ? "n/a" : (alertsOk.count ?? 0)],
  ];
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-line bg-surface p-4">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{typeof v === "number" ? v.toLocaleString() : v}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm font-medium">Where signups came from (30 days)</p>
          <ul className="mt-2 divide-y divide-line text-sm">
            {top.length ? top.map(([k, v]) => (
              <li key={k} className="flex justify-between py-1.5">
                <span className="truncate">{k}</span>
                <span className="tabular-nums text-muted">{v}</span>
              </li>
            )) : <li className="py-1.5 text-muted">No tracked signups yet.</li>}
          </ul>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm font-medium">Ambassador applications</p>
          <ul className="mt-2 divide-y divide-line text-sm">
            {(ambassadors.data ?? []).length ? (ambassadors.data ?? []).map((a) => (
              <li key={a.email + a.created_at} className="py-2">
                <p className="font-medium">
                  {a.name} <span className="font-normal text-muted">{a.email}</span>
                </p>
                <p className="text-muted">{[a.country, a.institution].filter(Boolean).join(", ")}</p>
                {a.audience && <p className="mt-0.5">{a.audience}</p>}
                {a.channels && <p className="mt-0.5 break-all text-muted">{a.channels}</p>}
              </li>
            )) : <li className="py-1.5 text-muted">None yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
