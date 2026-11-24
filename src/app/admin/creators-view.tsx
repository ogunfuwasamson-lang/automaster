import { admin } from "@/lib/supabase/admin";
import { TERMS, dayKey, earnings, monthKey, naira } from "@/lib/creator-terms";
import { linkUrl, type Creator } from "@/lib/creators";
import { Empty, Kpis, Panel, Pill, Stat, Table } from "./views";
import { CreatorStatus, PayoutActions, PostReview, RateEditor, ReferralToggle } from "./creator-actions";
import type { Range } from "./range";

// the operator's view of the creator partnership (lib/creators): payouts to send (due within 24 hours), applications
// to review, every creator's numbers for the period, their videos, and the latest sign-ups to check for fraud

const td = "px-4 py-3 align-top";
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });
const hoursLeft = (iso: string) => Math.round((Date.parse(iso) + TERMS.payoutHours * 3600_000 - Date.now()) / 3600_000);

type Over = { creator_id: string; visits_since: number; signups_since: number; qualified_since: number; signups_all: number; qualified_all: number; paid: number; pending: number; posts_since: number; last_post: string | null };
type Ref = { id: string; creator_id: string; user_id: string | null; created_at: string; status: string; reason: string | null; qualified_at: string | null; earn_ngn: number; link_id: string | null; has_cv: boolean; has_profile: boolean; email: string | null };

export async function CreatorsView({ range: r }: { range: Range }) {
  const db = admin();
  const since = r.allTime ? "2000-01-01" : dayKey(r.from);
  await db.rpc("creator_qualify", { cid: null, uid: null });
  const [{ data: cs }, { data: over }, { data: months }, { data: ws }, { data: posts }, { data: links }] = await Promise.all([
    db.from("creators").select("id, user_id, name, phone, handles, audience, followers, status, rate_ngn, note, created_at, approved_at").order("created_at", { ascending: false }),
    db.rpc("creator_overview", { since }),
    db.rpc("creator_months", { cid: null }),
    db.from("creator_withdrawals").select("id, creator_id, amount_ngn, status, bank, reference, note, requested_at, processed_at").order("requested_at", { ascending: false }).limit(60),
    db.from("creator_posts").select("id, creator_id, url, platform, title, posted_on, status, note").order("created_at", { ascending: false }).limit(60),
    db.from("creator_links").select("creator_id, code").order("created_at", { ascending: true }),
  ]);
  const creators = (cs ?? []) as Creator[];
  const byId = new Map(creators.map((c) => [c.id, c]));
  const o = new Map(((over ?? []) as Over[]).map((x) => [x.creator_id, x]));
  const emails = new Map(
    await Promise.all(
      creators.slice(0, 200).map(async (c) => {
        try {
          const { data } = await db.auth.admin.getUserById(c.user_id);
          return [c.id, data?.user?.email ?? ""] as const;
        } catch {
          return [c.id, ""] as const;
        }
      }),
    ),
  );
  const mrows = (months ?? []) as { creator_id: string; month: string; qualified: number; base: number }[];
  const earned = new Map(creators.map((c) => [c.id, earnings(mrows.filter((m) => m.creator_id === c.id).map((m) => ({ month: m.month, qualified: Number(m.qualified), base: Number(m.base) })))]));
  const firstLink = new Map<string, string>();
  for (const l of links ?? []) if (!firstLink.has(l.creator_id as string)) firstLink.set(l.creator_id as string, l.code as string);
  const { data: refs } = await db.rpc("creator_referral_list", { cid: null, lim: 150, reveal: true });

  const pendingWs = (ws ?? []).filter((w) => w.status === "pending");
  const doneWs = (ws ?? []).filter((w) => w.status !== "pending").slice(0, 20);
  const apps = creators.filter((c) => c.status === "pending");
  const live = creators.filter((c) => c.status === "active" || c.status === "paused");
  const sum = (f: (x: Over) => number) => live.reduce((a, c) => a + (o.get(c.id) ? f(o.get(c.id)!) : 0), 0);
  const owed = live.reduce((a, c) => {
    const e = earned.get(c.id)!;
    const x = o.get(c.id);
    return a + Math.max(0, e.earned - (x?.paid ?? 0) - (x?.pending ?? 0));
  }, 0);
  const month = monthKey(new Date());
  const name = (id: string) => byId.get(id)?.name ?? "A creator";

  return (
    <div className="space-y-4">
      <Kpis>
        <Stat label="Active creators" value={String(creators.filter((c) => c.status === "active").length)} sub={`${apps.length} waiting for review`} tone={apps.length ? "signal" : undefined} />
        <Stat label={`Visits, ${r.label}`} value={sum((x) => x.visits_since).toLocaleString()} sub="One per person per link per day" />
        <Stat label={`Sign-ups, ${r.label}`} value={sum((x) => x.signups_since).toLocaleString()} />
        <Stat label={`Qualified, ${r.label}`} value={sum((x) => x.qualified_since).toLocaleString()} tone="go" sub={`${naira(sum((x) => x.qualified_since) * TERMS.rate)} at the standard rate`} />
        <Stat label="Payouts to send" value={naira(pendingWs.reduce((a, w) => a + Number(w.amount_ngn), 0))} tone={pendingWs.length ? "signal" : undefined} sub={`${pendingWs.length} request${pendingWs.length === 1 ? "" : "s"}, due within ${TERMS.payoutHours} h`} />
        <Stat label="Owed, not yet requested" value={naira(owed)} sub={`Paid so far: ${naira(sum((x) => x.paid))}`} />
      </Kpis>

      <Panel title={`Payouts to send (${pendingWs.length})`} note={`Transfer to the account shown, then mark it paid with the reference. Due ${TERMS.payoutHours} hours after the request.`}>
        <Table head={["Creator", "Amount", "Requested", "Bank", "Their numbers", "Send"]} min="62rem">
          {pendingWs.length ? (
            pendingWs.map((w) => {
              const b = (w.bank ?? {}) as { bank_name?: string; account_name?: string; account_last4?: string };
              const x = o.get(w.creator_id as string);
              const h = hoursLeft(w.requested_at as string);
              return (
                <tr key={w.id as string}>
                  <td className={td}>
                    <p className="font-medium">{name(w.creator_id as string)}</p>
                    <p className="text-[12px] text-muted">{emails.get(w.creator_id as string)}</p>
                  </td>
                  <td className={`${td} font-serif text-[18px] tabular-nums`}>{naira(Number(w.amount_ngn))}</td>
                  <td className={td}>
                    <p>{when(w.requested_at as string)}</p>
                    <Pill tone={h < 0 ? "stop" : h < 6 ? "signal" : undefined}>{h < 0 ? `${-h} h overdue` : `${h} h left`}</Pill>
                  </td>
                  <td className={td}>
                    <p>{b.bank_name}</p>
                    <p className="text-[12px] text-muted">
                      {b.account_name} · ending {b.account_last4}
                    </p>
                  </td>
                  <td className={`${td} text-[12.5px] text-muted`}>
                    {x ? `${x.qualified_all} qualified of ${x.signups_all} sign-ups. Paid before: ${naira(x.paid)}.` : ""}
                  </td>
                  <td className={td}>
                    <PayoutActions id={w.id as string} />
                  </td>
                </tr>
              );
            })
          ) : (
            <Empty cols={6}>No payouts waiting.</Empty>
          )}
        </Table>
      </Panel>

      {apps.length ? (
        <Panel title={`Applications (${apps.length})`} note="Approving emails them and lets them make their link.">
          <Table head={["Applied", "Creator", "Where they post", "Followers", "Their content", ""]} min="62rem">
            {apps.map((c) => (
              <tr key={c.id}>
                <td className={`${td} whitespace-nowrap text-muted`}>{when(c.created_at)}</td>
                <td className={td}>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-[12px] text-muted">{emails.get(c.id)}</p>
                  <p className="text-[12px] text-muted">{c.phone}</p>
                </td>
                <td className={`${td} text-[12.5px]`}>
                  {Object.entries(c.handles).map(([k, v]) => (
                    <p key={k}>
                      <span className="text-muted">{k}:</span> {v}
                    </p>
                  ))}
                </td>
                <td className={td}>{c.followers}</td>
                <td className={`${td} max-w-[22rem] text-[12.5px]`}>{c.audience}</td>
                <td className={td}>
                  <CreatorStatus id={c.id} status={c.status} />
                </td>
              </tr>
            ))}
          </Table>
        </Panel>
      ) : null}

      <Panel title={`Creators (${live.length})`} note={`Visits, sign-ups and qualified sign-ups in ${r.label}; money all time. Base pay counts when a sign-up qualifies, a month's bonus once it closes.`} scroll="lg">
        <Table head={["Creator", "Status", "Rate", "Visits", "Sign-ups", "Qualified", `This month (${month})`, "Earned", "Paid", "Owed", "Videos", ""]} min="78rem">
          {live.length ? (
            live.map((c) => {
              const x = o.get(c.id);
              const e = earned.get(c.id)!;
              const tm = e.months.find((m) => m.key === month);
              const owe = Math.max(0, e.earned - (x?.paid ?? 0) - (x?.pending ?? 0));
              const code = firstLink.get(c.id);
              return (
                <tr key={c.id}>
                  <td className={td}>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-[12px] text-muted">{emails.get(c.id)}</p>
                    {code ? (
                      <a href={linkUrl(code)} className="text-[12px] text-muted underline decoration-current/30 underline-offset-2" target="_blank" rel="noopener">
                        /c/{code}
                      </a>
                    ) : (
                      <p className="text-[12px] text-muted">No link yet</p>
                    )}
                  </td>
                  <td className={td}>
                    <Pill tone={c.status === "active" ? "go" : "signal"}>{c.status === "active" ? "Active" : "Paused"}</Pill>
                    {c.note ? <p className="mt-1 max-w-[10rem] text-[12px] text-muted">{c.note}</p> : null}
                  </td>
                  <td className={td}>
                    <RateEditor id={c.id} rate={c.rate_ngn} />
                  </td>
                  <td className={`${td} tabular-nums`}>{(x?.visits_since ?? 0).toLocaleString()}</td>
                  <td className={`${td} tabular-nums`}>{(x?.signups_since ?? 0).toLocaleString()}</td>
                  <td className={`${td} tabular-nums`}>{(x?.qualified_since ?? 0).toLocaleString()}</td>
                  <td className={`${td} tabular-nums`}>
                    {(tm?.qualified ?? 0).toLocaleString()} of {TERMS.target}
                    {tm?.bonus ? <p className="text-[12px] text-muted">+{naira(tm.bonus)} bonus at month end</p> : null}
                  </td>
                  <td className={`${td} tabular-nums`}>{naira(e.earned)}</td>
                  <td className={`${td} tabular-nums`}>{naira(x?.paid ?? 0)}</td>
                  <td className={`${td} tabular-nums`}>{naira(owe)}</td>
                  <td className={`${td} tabular-nums`}>
                    {x?.posts_since ?? 0}
                    <p className="text-[12px] text-muted">{x?.last_post ? `last ${x.last_post}` : "none yet"}</p>
                  </td>
                  <td className={td}>
                    <CreatorStatus id={c.id} status={c.status} />
                  </td>
                </tr>
              );
            })
          ) : (
            <Empty cols={12}>No approved creators yet. Applications come in at tryivyward.com/creator.</Empty>
          )}
        </Table>
      </Panel>

      <div className="grid gap-4 2xl:grid-cols-2">
        <Panel title="Videos" note="Newest first. Needs changes sends them your note." scroll="lg">
          <Table head={["Posted", "Creator", "Video", "Review"]} min="40rem">
            {(posts ?? []).length ? (
              (posts ?? []).map((p) => (
                <tr key={p.id as string}>
                  <td className={`${td} whitespace-nowrap text-muted`}>{p.posted_on as string}</td>
                  <td className={td}>{name(p.creator_id as string)}</td>
                  <td className={`${td} max-w-[16rem]`}>
                    <a href={p.url as string} target="_blank" rel="noopener noreferrer" className="block truncate font-medium hover:underline">
                      {(p.title as string | null) ?? `${p.platform} video`}
                    </a>
                    <p className="text-[12px] text-muted">{p.platform as string}</p>
                  </td>
                  <td className={td}>
                    <Pill tone={p.status === "approved" ? "go" : p.status === "rejected" ? "signal" : undefined}>{p.status === "approved" ? "Approved" : p.status === "rejected" ? "Needs changes" : "To review"}</Pill>
                    <div className="mt-1.5">
                      <PostReview id={p.id as string} status={p.status as string} />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <Empty cols={4}>No videos added yet.</Empty>
            )}
          </Table>
        </Panel>

        <Panel title="Latest sign-ups through creator links" note="Check for fake or repeat accounts before paying. Don't count takes one out of the creator's numbers." scroll="lg">
          <Table head={["Joined", "Creator", "Account", "Steps", "Status", ""]} min="46rem">
            {((refs ?? []) as Ref[]).length ? (
              ((refs ?? []) as Ref[]).map((x) => (
                <tr key={x.id}>
                  <td className={`${td} whitespace-nowrap text-muted`}>{when(x.created_at)}</td>
                  <td className={td}>{name(x.creator_id)}</td>
                  <td className={`${td} max-w-[12rem] truncate`}>{x.email ?? "Deleted account"}</td>
                  <td className={`${td} text-[12px] text-muted`}>
                    {x.has_cv ? "CV" : "no CV"} · {x.has_profile ? "profile" : "no profile"}
                  </td>
                  <td className={td}>
                    <Pill tone={x.status === "qualified" ? "go" : x.status === "pending" ? undefined : "signal"}>{x.status}</Pill>
                    {x.reason ? <p className="mt-1 max-w-[10rem] text-[12px] text-muted">{x.reason}</p> : null}
                  </td>
                  <td className={td}>
                    <ReferralToggle id={x.id} status={x.status} />
                  </td>
                </tr>
              ))
            ) : (
              <Empty cols={6}>No sign-ups through creator links yet.</Empty>
            )}
          </Table>
        </Panel>
      </div>

      {doneWs.length ? (
        <Panel title="Payouts sent and rejected" note="The latest 20." scroll="md">
          <Table head={["Processed", "Creator", "Amount", "Outcome", "Reference or reason"]} min="44rem">
            {doneWs.map((w) => (
              <tr key={w.id as string}>
                <td className={`${td} whitespace-nowrap text-muted`}>{w.processed_at ? when(w.processed_at as string) : "·"}</td>
                <td className={td}>{name(w.creator_id as string)}</td>
                <td className={`${td} tabular-nums`}>{naira(Number(w.amount_ngn))}</td>
                <td className={td}>
                  <Pill tone={w.status === "paid" ? "go" : "stop"}>{w.status === "paid" ? "Paid" : "Rejected"}</Pill>
                </td>
                <td className={`${td} text-muted`}>{(w.reference as string | null) ?? (w.note as string | null) ?? "·"}</td>
              </tr>
            ))}
          </Table>
        </Panel>
      ) : null}

      {creators.some((c) => c.status === "rejected") ? (
        <Panel title="Turned down" scroll="sm">
          <Table head={["Applied", "Creator", "Note", ""]} min="36rem">
            {creators
              .filter((c) => c.status === "rejected")
              .map((c) => (
                <tr key={c.id}>
                  <td className={`${td} text-muted`}>{when(c.created_at)}</td>
                  <td className={td}>
                    {c.name} <span className="text-[12px] text-muted">{emails.get(c.id)}</span>
                  </td>
                  <td className={`${td} text-muted`}>{c.note ?? "·"}</td>
                  <td className={td}>
                    <CreatorStatus id={c.id} status={c.status} />
                  </td>
                </tr>
              ))}
          </Table>
        </Panel>
      ) : null}
    </div>
  );
}
