import "server-only";
import { randomBytes } from "node:crypto";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { alert } from "@/lib/alerts";
import { notify } from "@/lib/notify";
import { decrypt, encrypt } from "@/lib/crypto";
import { SITE } from "@/lib/site";
import { CODE, TERMS, cleanCode, dayKey, earnings, monthKey, naira, type Month } from "@/lib/creator-terms";

// the creator partnership (lib/creator-terms has the rules; supabase/migrations/0035 the tables). a creator applies,
// the operator approves them, and from then on visits through their links are counted, accounts made through them
// are linked to them at first sign-in (lib/auth-landing), and those accounts qualify once they've uploaded a CV and
// finished the basic profile (setup and CV uploads call qualifyAccount; the dashboard sweeps too).

export type Creator = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  handles: Record<string, string>;
  audience: string | null;
  followers: string | null;
  status: "pending" | "active" | "paused" | "rejected";
  rate_ngn: number;
  note: string | null;
  created_at: string;
  approved_at: string | null;
};
export type Link = { id: string; code: string; label: string | null; created_at: string };
export type LinkStats = { link_id: string; visits: number; visits_since: number; signups: number; qualified: number; qualified_since: number };
export type Post = { id: string; url: string; platform: string; title: string | null; posted_on: string; status: "submitted" | "approved" | "rejected"; note: string | null; created_at: string };
export type Withdrawal = { id: string; amount_ngn: number; status: "pending" | "paid" | "rejected"; reference: string | null; note: string | null; requested_at: string; processed_at: string | null; bank: { bank_name?: string; account_name?: string; account_last4?: string } };
export type Bank = { bank_name: string; account_name: string; account_last4: string; updated_at: string };
export type Referral = { id: string; created_at: string; status: "pending" | "qualified" | "duplicate" | "rejected"; reason: string | null; qualified_at: string | null; earn_ngn: number; link_id: string | null; has_cv: boolean; has_profile: boolean; initial: string };

export const VISITOR_COOKIE = "iv_vid";
export const CREATOR_COOKIE = "iv_creator";
export const linkUrl = (code: string) => `${SITE.url}/c/${code}`;

const COLS = "id, user_id, name, phone, handles, audience, followers, status, rate_ngn, note, created_at, approved_at";

export async function creatorFor(userId: string): Promise<Creator | null> {
  const { data } = await admin().from("creators").select(COLS).eq("user_id", userId).maybeSingle();
  return (data as Creator | null) ?? null;
}

// whether the creator tables are there yet (supabase/migrations/0035): until they are, the studio says it opens soon
export async function creatorsReady(): Promise<boolean> {
  const { error } = await admin().from("creators").select("id", { head: true, count: "exact" }).limit(1);
  return !error;
}

export async function creatorById(id: string): Promise<Creator | null> {
  const { data } = await admin().from("creators").select(COLS).eq("id", id).maybeSingle();
  return (data as Creator | null) ?? null;
}

// ---- applying ----

export type Application = { name: string; phone: string; handles: Record<string, string>; audience: string; followers: string };

export async function applyAsCreator(userId: string, email: string, a: Application): Promise<Creator> {
  const db = admin();
  const { data, error } = await db
    .from("creators")
    .insert({ user_id: userId, name: a.name, phone: a.phone, handles: a.handles, audience: a.audience, followers: a.followers, rate_ngn: TERMS.rate, terms_accepted_at: new Date().toISOString() })
    .select(COLS)
    .single();
  if (error) throw new Error(/duplicate/.test(error.message) ? "You've already applied." : error.message);
  await logEvent({ userId, actor: "user", action: "creator.applied", context: { handles: a.handles } }).catch(() => {});
  await alert(`creator-applied:${userId}`, `New creator application: ${a.name}`, { email, handles: a.handles, followers: a.followers, audience: a.audience, review: "tryivyward.com/admin?view=creators" });
  return data as Creator;
}

// ---- links ----

export async function linksOf(creatorId: string): Promise<Link[]> {
  const { data } = await admin().from("creator_links").select("id, code, label, created_at").eq("creator_id", creatorId).order("created_at", { ascending: true });
  return (data ?? []) as Link[];
}

const suffix = () => randomBytes(3).toString("hex").slice(0, 4);

// a new link: the code they asked for, or one made from their name and the label. returns the link or what's wrong.
export async function createLink(c: Creator, label: string | null, wanted: string | null): Promise<Link | { error: string }> {
  const db = admin();
  const { count } = await db.from("creator_links").select("id", { count: "exact", head: true }).eq("creator_id", c.id);
  if ((count ?? 0) >= TERMS.maxLinks) return { error: `You can have up to ${TERMS.maxLinks} links.` };
  const first = cleanCode(c.name.split(/\s+/)[0] ?? "") || "ivy";
  const tries = wanted ? [cleanCode(wanted)] : [cleanCode(`${first}-${label ?? ""}`), `${first}-${suffix()}`, `${first}-${suffix()}`, `${first}-${suffix()}`];
  for (const code of tries) {
    if (!CODE.test(code)) {
      if (wanted) return { error: "Use 3 to 24 letters, numbers or hyphens." };
      continue;
    }
    const { data, error } = await db.from("creator_links").insert({ creator_id: c.id, code, label }).select("id, code, label, created_at").single();
    if (!error) {
      await logEvent({ userId: c.user_id, actor: "user", action: "creator.link_created", context: { code, label } }).catch(() => {});
      return data as Link;
    }
    if (!/duplicate|unique/i.test(error.message)) return { error: "Couldn't make the link. Try again." };
    if (wanted) return { error: `${code} is taken. Try another.` };
  }
  return { error: "Couldn't make the link. Try again." };
}

export async function renameLink(creatorId: string, linkId: string, label: string | null) {
  await admin().from("creator_links").update({ label }).eq("id", linkId).eq("creator_id", creatorId);
}

// a visit through a link: counted once per visitor per day, only while the creator is active
export async function recordVisit(code: string, visitor: string, viewerId: string | null): Promise<boolean> {
  const db = admin();
  const { data: link } = await db.from("creator_links").select("id, creators!inner(user_id, status)").eq("code", code).maybeSingle();
  if (!link) return false;
  const c = link.creators as unknown as { user_id: string; status: string };
  if (c.status !== "active" || c.user_id === viewerId) return true;
  await db.from("creator_clicks").upsert({ link_id: link.id, visitor, day: dayKey(new Date()) }, { onConflict: "link_id,visitor,day", ignoreDuplicates: true });
  return true;
}

// first sign-in through a creator's link: the new account is theirs. only fresh accounts, never the creator's own,
// and a second account from the same device is marked a duplicate (it doesn't count).
export async function attributeSignup(userId: string, createdAt: string | undefined, code: string | undefined, visitor: string | undefined) {
  if (!code || !CODE.test(code)) return;
  if (!createdAt || Date.now() - new Date(createdAt).getTime() > 3 * 86400_000) return;
  const db = admin();
  const { data: link } = await db.from("creator_links").select("id, creator_id, creators!inner(user_id, status)").eq("code", code).maybeSingle();
  if (!link) return;
  const c = link.creators as unknown as { user_id: string; status: string };
  if (c.status !== "active" || c.user_id === userId) return;
  let status: "pending" | "duplicate" = "pending";
  let reason: string | null = null;
  if (visitor) {
    const { count } = await db.from("creator_referrals").select("id", { count: "exact", head: true }).eq("creator_id", link.creator_id).eq("visitor", visitor).neq("user_id", userId);
    if (count) {
      status = "duplicate";
      reason = "Same device as an earlier sign-up";
    }
  }
  const { error } = await db.from("creator_referrals").insert({ user_id: userId, creator_id: link.creator_id, link_id: link.id, visitor: visitor ?? null, status, reason });
  if (error) return; // already linked to a creator
  await logEvent({ userId, actor: "system", action: "creator.signup", context: { creator: link.creator_id, code, status } }).catch(() => {});
  if (status === "pending") await qualifyAccount(userId);
}

// an account made through a creator's link may qualify now (it just uploaded a CV or finished setup)
export async function qualifyAccount(userId: string): Promise<boolean> {
  const { data } = await admin().rpc("creator_qualify", { cid: null, uid: userId });
  const n = Number(data ?? 0);
  if (n) await logEvent({ userId, actor: "system", action: "creator.qualified", context: {} }).catch(() => {});
  return n > 0;
}

export async function sweepCreator(creatorId: string): Promise<number> {
  const { data } = await admin().rpc("creator_qualify", { cid: creatorId, uid: null });
  return Number(data ?? 0);
}

// ---- the dashboard ----

export type Funnel = { visits: number; signups: number; with_cv: number; with_profile: number; qualified: number; duplicates: number };
export type Day = { day: string; visits: number; signups: number; qualified: number };

export type Money = { months: Month[]; earned: number; pendingBonus: number; paid: number; pending: number; available: number; thisMonth: Month };

export async function moneyOf(creatorId: string, now = new Date()): Promise<Money> {
  const db = admin();
  const [{ data: rows }, { data: ws }] = await Promise.all([
    db.rpc("creator_months", { cid: creatorId }),
    db.from("creator_withdrawals").select("amount_ngn, status").eq("creator_id", creatorId).in("status", ["pending", "paid"]),
  ]);
  const e = earnings(((rows ?? []) as { month: string; qualified: number; base: number }[]).map((r) => ({ month: r.month, qualified: Number(r.qualified), base: Number(r.base) })), now);
  const paid = (ws ?? []).filter((w) => w.status === "paid").reduce((a, w) => a + Number(w.amount_ngn), 0);
  const pending = (ws ?? []).filter((w) => w.status === "pending").reduce((a, w) => a + Number(w.amount_ngn), 0);
  const cur = monthKey(now);
  const thisMonth = e.months.find((m) => m.key === cur) ?? { key: cur, qualified: 0, base: 0, bonus: 0, closed: false };
  return { ...e, paid, pending, available: Math.max(0, e.earned - paid - pending), thisMonth };
}

export async function overviewOf(c: Creator, now = new Date()) {
  const db = admin();
  await sweepCreator(c.id).catch(() => 0);
  const month = monthKey(now);
  const since = `${month}-01`;
  const from30 = dayKey(new Date(now.getTime() - 29 * 86400_000));
  const [links, { data: ls }, { data: f }, { data: days }, money, { data: posts }] = await Promise.all([
    linksOf(c.id),
    db.rpc("creator_link_stats", { cid: c.id, since }),
    db.rpc("creator_funnel", { cid: c.id, since }),
    db.rpc("creator_daily", { cid: c.id, since: from30 }),
    moneyOf(c.id, now),
    db.from("creator_posts").select("id, url, platform, title, posted_on, status, note, created_at").eq("creator_id", c.id).gte("posted_on", since).order("posted_on", { ascending: false }),
  ]);
  const stats = new Map(((ls ?? []) as LinkStats[]).map((s) => [s.link_id, s]));
  const fr = ((f ?? []) as Omit<Funnel, "visits">[])[0] ?? { signups: 0, with_cv: 0, with_profile: 0, qualified: 0, duplicates: 0 };
  const visits = [...stats.values()].reduce((a, s) => a + Number(s.visits_since), 0);
  return {
    month,
    links: links.map((l) => ({ ...l, url: linkUrl(l.code), stats: stats.get(l.id) ?? { link_id: l.id, visits: 0, visits_since: 0, signups: 0, qualified: 0, qualified_since: 0 } })),
    funnel: { visits, ...fr } as Funnel,
    days: ((days ?? []) as Day[]).map((d) => ({ day: String(d.day), visits: Number(d.visits), signups: Number(d.signups), qualified: Number(d.qualified) })),
    money,
    posts: (posts ?? []) as Post[],
  };
}

export async function referralsOf(creatorId: string, limit = 300): Promise<Referral[]> {
  await sweepCreator(creatorId).catch(() => 0);
  const { data } = await admin().rpc("creator_referral_list", { cid: creatorId, lim: limit, reveal: false });
  return (data ?? []) as Referral[];
}

// ---- content ----

export async function postsOf(creatorId: string): Promise<Post[]> {
  const { data } = await admin().from("creator_posts").select("id, url, platform, title, posted_on, status, note, created_at").eq("creator_id", creatorId).order("posted_on", { ascending: false }).limit(200);
  return (data ?? []) as Post[];
}

export async function addPost(c: Creator, p: { url: string; platform: string; title: string | null; posted_on: string }): Promise<string | null> {
  const { error } = await admin().from("creator_posts").insert({ creator_id: c.id, ...p });
  if (error) return /duplicate|unique/i.test(error.message) ? "You've already added this video." : "Couldn't save it. Try again.";
  await logEvent({ userId: c.user_id, actor: "user", action: "creator.post_added", context: { platform: p.platform, url: p.url } }).catch(() => {});
  return null;
}

// a creator can take back a video the team hasn't reviewed yet
export async function removePost(creatorId: string, postId: string): Promise<boolean> {
  const { data } = await admin().from("creator_posts").delete().eq("id", postId).eq("creator_id", creatorId).eq("status", "submitted").select("id");
  return !!data?.length;
}

// ---- payouts ----

export async function bankOf(creatorId: string): Promise<Bank | null> {
  const { data } = await admin().from("creator_banks").select("bank_name, account_name, account_last4, updated_at").eq("creator_id", creatorId).maybeSingle();
  return (data as Bank | null) ?? null;
}

export async function saveBank(c: Creator, b: { bank_name: string; account_name: string; account_number: string }) {
  const { error } = await admin()
    .from("creator_banks")
    .upsert({ creator_id: c.id, bank_name: b.bank_name, account_name: b.account_name, account_number_enc: encrypt(b.account_number), account_last4: b.account_number.slice(-4), updated_at: new Date().toISOString() });
  if (error) throw new Error("Couldn't save your bank details. Try again.");
  await logEvent({ userId: c.user_id, actor: "user", action: "creator.bank_saved", context: { bank: b.bank_name, last4: b.account_number.slice(-4) } }).catch(() => {});
}

export async function withdrawalsOf(creatorId: string): Promise<Withdrawal[]> {
  const { data } = await admin().from("creator_withdrawals").select("id, amount_ngn, status, reference, note, requested_at, processed_at, bank").eq("creator_id", creatorId).order("requested_at", { ascending: false }).limit(100);
  return (data ?? []) as Withdrawal[];
}

export async function requestWithdrawal(c: Creator, email: string, amount: number): Promise<string | null> {
  if (c.status !== "active") return "Payouts are paused on your account. Message the Ivyward team.";
  if (!Number.isInteger(amount) || amount < TERMS.minWithdrawal) return `The smallest payout is ${naira(TERMS.minWithdrawal)}.`;
  const db = admin();
  const { data: bank } = await db.from("creator_banks").select("bank_name, account_name, account_last4, account_number_enc").eq("creator_id", c.id).maybeSingle();
  if (!bank) return "Add your bank details first.";
  const money = await moneyOf(c.id);
  const { data, error } = await db.rpc("creator_request_withdrawal", { cid: c.id, amt: amount, earned: money.earned, bank });
  if (error) return "Couldn't send the request. Try again.";
  if (data === "pending") return "You already have a payout on its way. You can ask for the next one once it's paid.";
  if (data === "too_much") return `You can withdraw up to ${naira(money.available)}.`;
  if (data !== "ok") return "Payouts are paused on your account. Message the Ivyward team.";
  await logEvent({ userId: c.user_id, actor: "user", action: "creator.withdrawal_requested", context: { amount } }).catch(() => {});
  await alert(`creator-withdrawal:${c.id}:${Date.now()}`, `Creator payout requested: ${naira(amount)} to ${c.name}`, {
    email,
    bank: `${bank.bank_name}, ${bank.account_name}, ending ${bank.account_last4}`,
    due: `within ${TERMS.payoutHours} hours`,
    pay: "tryivyward.com/admin?view=creators",
  });
  return null;
}

// ---- the operator ----

export async function payoutAccount(withdrawalId: string): Promise<string | null> {
  const { data } = await admin().from("creator_withdrawals").select("bank").eq("id", withdrawalId).maybeSingle();
  const enc = (data?.bank as { account_number_enc?: string } | null)?.account_number_enc;
  if (!enc) return null;
  try {
    return decrypt(enc);
  } catch {
    return null;
  }
}

export async function setCreatorStatus(id: string, status: Creator["status"], note: string | null, by: string) {
  const db = admin();
  const c = await creatorById(id);
  if (!c) throw new Error("No such creator");
  const patch: Record<string, unknown> = { status, note };
  if (status === "active" && !c.approved_at) patch.approved_at = new Date().toISOString();
  await db.from("creators").update(patch).eq("id", id);
  await logEvent({ userId: c.user_id, actor: "user", action: "staff.creator_status", context: { by, from: c.status, to: status, note } }).catch(() => {});
  if (status === "active" && c.status !== "active") {
    await notify({ userId: c.user_id, key: `creator:approved:${id}`, kind: "info", title: "You're in: Ivyward creator partnership", body: `Your creator account is approved. Make your link, post your first video, and earn ${naira(c.rate_ngn)} for every qualified sign-up.`, href: "/creator", actionLabel: "Open your creator dashboard", email: true }).catch(() => {});
  } else if (status === "rejected" && c.status === "pending") {
    await notify({ userId: c.user_id, key: `creator:rejected:${id}`, kind: "info", title: "Your creator application", body: note ? `We can't take your application forward right now: ${note}` : "We can't take your application forward right now. Thank you for applying.", href: "/creator", actionLabel: "See details", email: true }).catch(() => {});
  }
}

export async function settleWithdrawal(id: string, outcome: "paid" | "rejected", text: string | null, by: string): Promise<string | null> {
  const db = admin();
  const { data: w } = await db.from("creator_withdrawals").update({ status: outcome, ...(outcome === "paid" ? { reference: text } : { note: text }), processed_at: new Date().toISOString(), processed_by: by }).eq("id", id).eq("status", "pending").select("creator_id, amount_ngn").maybeSingle();
  if (!w) return "Already processed.";
  const c = await creatorById(w.creator_id as string);
  if (!c) return null;
  await logEvent({ userId: c.user_id, actor: "user", action: `staff.creator_withdrawal_${outcome}`, context: { by, amount: w.amount_ngn, text } }).catch(() => {});
  await notify({
    userId: c.user_id,
    key: `creator:payout:${id}`,
    kind: "info",
    title: outcome === "paid" ? `${naira(Number(w.amount_ngn))} is on its way to your bank` : "Your payout request wasn't paid",
    body: outcome === "paid" ? `We've sent your creator payout${text ? ` (reference ${text})` : ""}. It can take a few minutes to show in your account.` : `${text ? `${text} ` : ""}The amount is back in your balance, so you can request it again.`,
    href: "/creator/payouts",
    actionLabel: "See payouts",
    email: true,
  }).catch(() => {});
  return null;
}

export async function reviewPost(id: string, status: Post["status"], note: string | null) {
  await admin().from("creator_posts").update({ status, note }).eq("id", id);
}

// the operator marks a sign-up as not genuine (or puts it back): it stops counting, or counts again once it qualifies
export async function setReferral(id: string, status: "rejected" | "pending", reason: string | null, by: string) {
  const db = admin();
  const { data: r } = await db.from("creator_referrals").update({ status, reason: status === "rejected" ? reason : null, ...(status === "pending" ? { qualified_at: null, earn_ngn: 0 } : {}) }).eq("id", id).select("user_id, creator_id").maybeSingle();
  if (!r) return;
  if (r.user_id) await logEvent({ userId: r.user_id as string, actor: "user", action: `staff.creator_referral_${status}`, context: { by, creator: r.creator_id, reason } }).catch(() => {});
  if (status === "pending") await sweepCreator(r.creator_id as string);
}

export async function setRate(id: string, rate: number) {
  await admin().from("creators").update({ rate_ngn: rate }).eq("id", id);
}
