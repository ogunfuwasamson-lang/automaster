import "server-only";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { logEvent } from "@/lib/events";
import { notify, resolve } from "@/lib/notify";
import { bachs, type CheckoutSession } from "@/lib/bachs";
import { LEGACY_PACK_SIZE, PACK_PRICE, PRO_MONTHLY, pricingFor, type Pricing } from "@/lib/geo-pricing";
import { CREDITS, applicationsFor } from "@/lib/credit-prices";
import { chargeRequest, grant, lowCreditNotice, settleApplication, walletState } from "@/lib/wallet";
import { planOf } from "@/lib/plans";
import { submissionAmounts } from "@/lib/fx";

// who pays what, and recording it when they do. everything is paid in credits from the wallet (lib/wallet, prices
// in lib/credit-prices); the agents check paymentNeeded() before pressing submit.


export interface BillingState {
  pricing: Pricing;
  pro: boolean; // a paid-up monthly plan
  planUntil: string | null;
  cancelled: boolean;
  customer: string | null;
  exempt: boolean; // nobody since the wallet (24 nov 2026): admin and team accounts pay credits too
  credits: number; // credits to use now (lib/wallet)
  held: number; // credits set aside for applications in progress
  expiring: { credits: number; at: string } | null; // the next credits to expire
  bonus: number; // the free submission accounts got from 14 to 24 nov, if unused
  bonusRequests: number; // free funding requests (study group reward, lib/referrals)
}

export async function billingState(userId: string): Promise<BillingState> {
  const db = admin();
  const { data, error } = await db.from("profiles").select("plan, plan_until, plan_cancelled_at, billing_country, bachs_customer, is_admin, submission_credits, bonus_submissions").eq("id", userId).maybeSingle();
  if (error || !data) return { pricing: pricingFor(null), pro: false, planUntil: null, cancelled: false, customer: null, exempt: false, credits: 0, held: 0, expiring: null, bonus: 0, bonusRequests: 0 };
  const wallet = await walletState(userId).catch(() => ({ balance: 0, held: 0, expiring: null }));
  // free funding requests arrive with migration 0033: read on their own, so billing works before it's applied
  const { data: req } = await db.from("profiles").select("bonus_requests").eq("id", userId).maybeSingle();
  return {
    pricing: pricingFor(data.billing_country, await submissionAmounts().catch(() => null)),
    pro: planOf(data.plan, data.plan_until).id === "pro",
    planUntil: data.plan_until,
    cancelled: !!data.plan_cancelled_at,
    customer: data.bachs_customer,
    exempt: false,
    credits: wallet.balance,
    held: wallet.held,
    expiring: wallet.expiring,
    bonus: data.bonus_submissions ?? 0,
    bonusRequests: Number((req as { bonus_requests?: number } | null)?.bonus_requests ?? 0),
  };
}

// "pack": buy a pack of submissions (africa). "submission"/"request" are the old one-off payments, still honoured
// for checkouts started before packs.
export type PaymentNeed = { kind: "pack" | "submission" | "pro" | "limit" | "request"; label: string; note: string; resumeAt?: string } | null;

// outgoing emails that ask a school for money: charged like a submission
export const FUNDING_PURPOSES = ["fee_waiver", "aid_reconsideration", "assistantship_inquiry", "scholarship_inquiry"];

// may this funding request go out without paying first? a free request (study group, before the wallet) or a credit
export async function requestPaymentNeeded(userId: string, messageId: string): Promise<PaymentNeed> {
  const db = admin();
  const { data: m, error } = await db.from("messages").select("id, purpose, paid_at").eq("id", messageId).eq("user_id", userId).maybeSingle();
  if (error || !m) return null; // before the ops migration: nothing is charged
  if (!FUNDING_PURPOSES.includes(m.purpose as string) || m.paid_at) return null;
  const b = await billingState(userId);
  if (b.exempt) return null;
  if (b.bonusRequests > 0 || b.credits >= CREDITS.request) return null;
  return outOfCredits(b, "to send this request");
}

// what to ask for when the wallet can't cover something
function outOfCredits(b: BillingState, what: string): NonNullable<PaymentNeed> {
  return b.pricing.model === "pack"
    ? { kind: "pack", label: b.pricing.label, note: `you're out of credits. Buy ${b.pricing.label} ${what}` }
    : { kind: "pro", label: b.pricing.label, note: `you're out of credits. Subscribe (${b.pricing.label}) ${what}` };
}

// may this application be submitted without paying first? covered when its credits were set aside, the wallet
// has enough, or the account still has the free submission from before the wallet. nothing is spent here.
export async function paymentNeeded(userId: string, applicationId: string): Promise<PaymentNeed> {
  const db = admin();
  const { data: app, error } = await db.from("applications").select("id, paid_at").eq("id", applicationId).eq("user_id", userId).maybeSingle();
  if (error || !app || app.paid_at) return null;
  const b = await billingState(userId);
  if (b.exempt) return null;
  const { data: held } = await db.from("credit_uses").select("status").eq("user_id", userId).eq("kind", "application").eq("ref", applicationId).in("status", ["held", "spent"]).maybeSingle();
  if (held || b.credits >= CREDITS.application || b.bonus > 0) return null;
  return outOfCredits(b, "and the agents submit it straight away");
}

// the submit gate: may the agents press submit on this application now? this is where its credits are spent (what
// was set aside for it, or charged now), once per application, atomically, so two runners can't both spend them.
// the free submission from before the wallet pays when there are no credits. returns what's still needed, or null.
export async function settleBeforeSubmit(userId: string, applicationId: string): Promise<PaymentNeed> {
  const db = admin();
  const { data: app } = await db.from("applications").select("paid_at").eq("id", applicationId).eq("user_id", userId).maybeSingle();
  if (!app) return null;
  if (app.paid_at) return null;
  const r = await settleApplication(userId, applicationId);
  if (r === "ok" || r === "already") {
    await db.from("applications").update({ paid_at: new Date().toISOString() }).eq("id", applicationId).is("paid_at", null);
    await lowCreditNotice(userId).catch(() => {});
    return null;
  }
  const { data: got } = await db.rpc("reserve_submission", { uid: userId, app: applicationId });
  if (got === "bonus" || got === "credit" || got === "already") return null;
  return outOfCredits(await billingState(userId), "and the agents submit it straight away");
}

// a funding request is about to be sent: a free request (study group, before the wallet) first, then a credit,
// once per message
export async function settleBeforeRequest(userId: string, messageId: string): Promise<PaymentNeed> {
  const need = await requestPaymentNeeded(userId, messageId);
  const b = await billingState(userId);
  if (b.exempt) return null;
  const db = admin();
  const { data: m } = await db.from("messages").select("purpose, paid_at").eq("id", messageId).eq("user_id", userId).maybeSingle();
  if (!m || !FUNDING_PURPOSES.includes(m.purpose as string) || m.paid_at) return null;
  if (b.bonusRequests > 0) {
    const { data: got } = await db.rpc("reserve_request", { uid: userId, msg: messageId });
    if (got === "bonus" || got === "already") return null;
  }
  const r = await chargeRequest(userId, messageId);
  if (r === "ok" || r === "already") {
    await db.from("messages").update({ paid_at: new Date().toISOString() }).eq("id", messageId).is("paid_at", null);
    return null;
  }
  return need ?? outOfCredits(b, "to send this request");
}

// after a submission that went in without passing the submit gate: charge it the same way
export async function spendBonusIfUsed(userId: string, applicationId: string) {
  await settleBeforeSubmit(userId, applicationId);
}

// the monthly product, made in Bachs once
async function proProduct(): Promise<string> {
  if (process.env.BACHS_PRO_PRODUCT) return process.env.BACHS_PRO_PRODUCT;
  const db = admin();
  const { data } = await db.from("billing_settings").select("value").eq("key", "bachs_pro_product").maybeSingle();
  if (data?.value) return data.value;
  const p = await bachs<{ id: string }>("/v1/products", {
    method: "POST",
    body: { name: "Ivyward Pro", description: "160 credits a month for Ivyward's agents: an application uses 10. Cancel any time.", price: { currency: "USD", amount: PRO_MONTHLY.amount }, billing_cycle: { interval: "month", frequency: 1 }, metadata: { plan: "pro" } },
    idempotencyKey: "ivyward-pro-product-v1",
  });
  await db.from("billing_settings").upsert({ key: "bachs_pro_product", value: p.id });
  return p.id;
}

// a Bachs checkout page for one submission or the monthly plan
export async function checkout(userId: string, email: string, kind: "pack" | "submission" | "pro" | "request", returnUrl: string, applicationId?: string, messageId?: string): Promise<string> {
  const b = await billingState(userId);
  // in pack countries every payment is a pack; the application or request it was bought from goes in straight after
  if (b.pricing.model === "pack" && kind !== "pro") kind = "pack";
  if (kind === "pack" && b.pricing.model !== "pack") throw new Error("packs are for applicants in Africa");
  const ref = `ivw_${kind}_${(messageId ?? applicationId ?? userId).slice(0, 8)}_${Date.now().toString(36)}`;
  const metadata = { user_id: userId, kind, ...(applicationId ? { application_id: applicationId } : {}), ...(messageId ? { message_id: messageId } : {}) };
  // the reference goes in the query, before any #section: after the # the browser keeps it and the page never sees it
  const [path, hash] = returnUrl.split("#");
  const success = `${path}${path.includes("?") ? "&" : "?"}paid=${ref}${hash ? `#${hash}` : ""}`;
  const body =
    kind !== "pro"
      ? (() => {
          const currency = b.pricing.model === "pack" ? b.pricing.currency : "USD";
          const amount = b.pricing.model === "pack" ? b.pricing.amount : PACK_PRICE.USD.amount;
          return { pricing: { currency, amount }, billing_currency: currency, customer: { email }, success_url: success, cancel_url: returnUrl, reference: ref, metadata: { ...metadata, credits: String(CREDITS.pack) } };
        })()
      : { product_cart: [{ product_id: await proProduct(), quantity: 1 }], billing_currency: "USD", customer: b.customer ? { customer_id: b.customer } : { email }, success_url: success, cancel_url: returnUrl, reference: ref, metadata };
  const s = await bachs<CheckoutSession>("/v1/checkout-sessions", { method: "POST", body, idempotencyKey: ref });
  // remembered so the return page can confirm the payment directly, without waiting for the webhook
  await admin().from("billing_settings").upsert({ key: `pending:${ref}`, value: s.checkout_id });
  return s.checkout_url;
}

// the applicant came back from checkout: confirm with Bachs and apply it now
export async function confirmReturn(userId: string, ref: string): Promise<{ applied: boolean; kind?: string }> {
  if (!/^ivw_(pack|submission|pro|request)_[\w]+$/.test(ref)) return { applied: false };
  const db = admin();
  const { data } = await db.from("billing_settings").select("value").eq("key", `pending:${ref}`).maybeSingle();
  if (!data?.value) return { applied: false };
  const s = await bachs<Checkout>(`/v1/checkout-sessions/${encodeURIComponent(data.value)}`);
  if (s.metadata?.user_id !== userId) return { applied: false };
  const r = await applyCheckout({ ...s, checkout_id: s.checkout_id ?? data.value });
  if (r.applied || s.status === "completed") await db.from("billing_settings").delete().eq("key", `pending:${ref}`);
  return r;
}

type Checkout = {
  checkout_id?: string;
  status?: string;
  payment_status?: string;
  amount?: string | number;
  currency?: string;
  reference?: string | null;
  metadata?: Record<string, string> | null;
  customer?: { id?: string; customer_id?: string } | string | null;
  subscription?: { id?: string; subscription_id?: string; current_period_end?: string } | string | null;
};

const addMonths = (d: Date, n: number) => {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + n);
  return x;
};

// a completed checkout: one submission paid, or the monthly plan started. safe to apply twice.
export async function applyCheckout(c: Checkout): Promise<{ applied: boolean; kind?: string }> {
  if (c.status !== "completed" && c.payment_status !== "paid") return { applied: false };
  const meta = c.metadata ?? {};
  const userId = meta.user_id;
  if (!userId || !["pack", "submission", "pro", "request"].includes(meta.kind ?? "")) return { applied: false };
  const db = admin();
  const reference = c.checkout_id ?? c.reference ?? "";
  if (!reference) return { applied: false };
  // the amount must be a real price, so an edited checkout can't buy a submission for less
  const amt = Number(c.amount ?? 0);
  const amounts = await submissionAmounts().catch(() => ({}) as Record<string, string>);
  // a pack must be paid at (close to) the pack price; the old one-off submissions at a fifth of it (packs were 5)
  const packFloor = c.currency ? Number(amounts[c.currency] ?? PACK_PRICE[c.currency]?.amount ?? 0) * 0.9 : 0; // 10% slack for a refresh mid-checkout
  const floor = meta.kind === "pack" ? packFloor : packFloor / LEGACY_PACK_SIZE;
  if (meta.kind !== "pro" && (!c.currency || amt + 0.001 < floor)) return { applied: false };
  const { error: dup } = await db.from("billing_events").insert({ reference, user_id: userId, kind: meta.kind, application_id: meta.application_id ?? null, ...(meta.message_id ? { message_id: meta.message_id } : {}), amount: amt || null, currency: c.currency ?? null, raw: c as unknown as object });
  if (dup) return { applied: false, kind: meta.kind };
  const customer = typeof c.customer === "string" ? c.customer : (c.customer?.id ?? c.customer?.customer_id ?? null);
  // a paying account: anything held for credit goes now, and the reminders to pay stop
  const { releaseHeld } = await import("@/lib/credit");
  await releaseHeld(userId).catch(() => {});
  await resolve(userId, /^paynudge:/).catch(() => {});
  // they've paid: the "buy a pack" and "get your first application done" cards are done with
  await resolve(userId, "pack:offer").catch(() => {});
  // the free tier: paying unlocks the agents (lib/free-tier). after the credits land, so the tier reads as paid
  const unlock = async () => {
    const { unlockAgents } = await import("@/lib/free-tier");
    await unlockAgents(userId, "paid").catch(() => false);
  };

  if (meta.kind === "pack") {
    // a pack's credits last PACK_DAYS from payment (lib/credit-prices)
    const bal = await grant(userId, CREDITS.pack, "pack", new Date(Date.now() + CREDITS.packDays * 86_400_000), reference);
    if (customer) await db.from("profiles").update({ bachs_customer: customer }).eq("id", userId);
    await logEvent({ userId, actor: "user", action: "billing.pack_paid", applicationId: meta.application_id ?? undefined, context: { amount: amt, currency: c.currency, credits: CREDITS.pack, balance: bal } });
    await unlock();
    await resolve(userId, "pack:empty");
    await resolve(userId, "credits:low");
    // whatever was waiting on payment goes now: the one it was bought from first, then the rest
    if (meta.message_id) {
      await resolve(userId, `payreq:${meta.message_id}`);
      const { schedule } = await import("@/lib/outbox");
      await schedule(userId, meta.message_id, "user").catch(() => null);
    }
    const { data: waiting } = await db.from("applications").select("id").eq("user_id", userId).eq("status", "packet_approved").is("paid_at", null).eq("runner_status", "needs_you");
    const ids = [...new Set([meta.application_id, ...(waiting ?? []).map((a) => a.id as string)].filter(Boolean))] as string[];
    for (const id of ids.slice(0, applicationsFor(CREDITS.pack))) await resumeAfterPayment(userId, id);
    return { applied: true, kind: "pack" };
  }

  if (meta.kind === "request" && meta.message_id) {
    await db.from("messages").update({ paid_at: new Date().toISOString() }).eq("id", meta.message_id).eq("user_id", userId);
    if (customer) await db.from("profiles").update({ bachs_customer: customer }).eq("id", userId);
    await logEvent({ userId, actor: "user", action: "billing.request_paid", context: { messageId: meta.message_id, amount: amt, currency: c.currency } });
    await unlock();
    await resolve(userId, `payreq:${meta.message_id}`);
    // they paid from the send button: send it now (with the usual undo window)
    const { schedule } = await import("@/lib/outbox");
    await schedule(userId, meta.message_id, "user").catch(() => null);
    return { applied: true, kind: "request" };
  }

  if (meta.kind === "submission" && meta.application_id) {
    // an old one-off submission checkout: it pays for that application
    await db.from("applications").update({ paid_at: new Date().toISOString() }).eq("id", meta.application_id).eq("user_id", userId);
    if (customer) await db.from("profiles").update({ bachs_customer: customer }).eq("id", userId);
    await logEvent({ userId, actor: "user", action: "billing.submission_paid", applicationId: meta.application_id, context: { amount: amt, currency: c.currency } });
    await unlock();
    await resumeAfterPayment(userId, meta.application_id);
    return { applied: true, kind: "submission" };
  }
  const sub = typeof c.subscription === "string" ? c.subscription : (c.subscription?.id ?? c.subscription?.subscription_id ?? null);
  const until = c.subscription && typeof c.subscription === "object" && c.subscription.current_period_end ? new Date(c.subscription.current_period_end) : addMonths(new Date(), 1);
  await db
    .from("profiles")
    .update({ plan: "pro", plan_until: new Date(until.getTime() + 3 * 86_400_000).toISOString(), plan_cancelled_at: null, ...(customer ? { bachs_customer: customer } : {}), ...(sub ? { bachs_subscription: sub } : {}) })
    .eq("id", userId);
  // Pro's credits for the paid month, lasting until it ends
  await grant(userId, CREDITS.pro, "pro", new Date(until.getTime() + 3 * 86_400_000), reference).catch(() => -1);
  await resolve(userId, "credits:low");
  await logEvent({ userId, actor: "user", action: "billing.pro_started", context: { amount: amt, credits: CREDITS.pro } });
  await unlock();
  // everything that was waiting on payment can go
  const { data: waiting } = await db.from("applications").select("id").eq("user_id", userId).eq("runner_status", "needs_you").ilike("runner_note", "%subscribe%");
  for (const a of waiting ?? []) await resumeAfterPayment(userId, a.id);
  await db.from("jobs").update({ run_at: new Date().toISOString() }).eq("user_id", userId).eq("status", "queued").or('last_error.like."budget:%",last_error.like."hold:%"');
  return { applied: true, kind: "pro" };
}

// a monthly renewal: push the paid-up date forward
export async function applyInvoice(inv: { id?: string; subscription?: string | { id?: string } | null; customer?: string | { id?: string } | null; amount_paid?: string | number; period_end?: string; lines?: unknown }) {
  const sub = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
  if (!sub || !inv.id) return { applied: false };
  const db = admin();
  const { data: prof } = await db.from("profiles").select("id, plan_until").eq("bachs_subscription", sub).maybeSingle();
  if (!prof) return { applied: false };
  const { error: dup } = await db.from("billing_events").insert({ reference: inv.id, user_id: prof.id, kind: "renewal", amount: Number(inv.amount_paid ?? 0) || null, currency: "USD", raw: inv as unknown as object });
  if (dup) return { applied: false };
  const from = prof.plan_until && Date.parse(prof.plan_until) > Date.now() ? new Date(prof.plan_until) : new Date();
  const until = inv.period_end ? new Date(Date.parse(inv.period_end) + 3 * 86_400_000) : addMonths(from, 1);
  await db.from("profiles").update({ plan: "pro", plan_until: until.toISOString(), plan_cancelled_at: null }).eq("id", prof.id);
  // the new month's credits, lasting until it ends
  await grant(prof.id, CREDITS.pro, "pro", until, inv.id).catch(() => -1);
  return { applied: true };
}

export async function subscriptionEnded(s: { id?: string; status?: string; cancel_at_period_end?: boolean }) {
  if (!s.id) return;
  if (s.status === "canceled" || s.cancel_at_period_end) await admin().from("profiles").update({ plan_cancelled_at: new Date().toISOString() }).eq("bachs_subscription", s.id).is("plan_cancelled_at", null);
}

// stop renewing; the plan runs to the end of the month already paid for
export async function cancelPro(userId: string) {
  const { data } = await admin().from("profiles").select("bachs_subscription").eq("id", userId).maybeSingle();
  if (!data?.bachs_subscription) throw new Error("no subscription to cancel");
  await bachs(`/v1/subscriptions/${data.bachs_subscription}`, { method: "DELETE", body: { cancel_at_period_end: true, reason: "Customer requested" } });
  await admin().from("profiles").update({ plan_cancelled_at: new Date().toISOString() }).eq("id", userId);
  await logEvent({ userId, actor: "user", action: "billing.cancelled" });
}

export async function portalUrl(userId: string): Promise<string | null> {
  const { data } = await admin().from("profiles").select("bachs_customer").eq("id", userId).maybeSingle();
  if (!data?.bachs_customer) return null;
  return (await bachs<{ url: string }>(`/v1/customers/${data.bachs_customer}/portal-sessions`, { method: "POST" })).url;
}

// the agents were stopped at the submit button waiting for payment: start them again
async function resumeAfterPayment(userId: string, applicationId: string) {
  const db = admin();
  const { data: app } = await db.from("applications").select("status, runner_status, runner_mode, runner_state").eq("id", applicationId).maybeSingle();
  await resolve(userId, `pay:${applicationId}`);
  if (!app || app.status !== "packet_approved") return;
  if (!["needs_you", "failed", "idle"].includes(app.runner_status as string) && app.runner_status) return;
  // a fresh go after paying: the stop counters from before (two "stuck" stops on one page end a run before it starts)
  // are cleared. everything paused from the dashboard: it says it waits for that, not "submitting now"
  const { data: cords } = await db.from("ripcords").select("scope_kind").eq("user_id", userId).eq("active", true);
  const held = (cords ?? []).some((c) => c.scope_kind === "all" || c.scope_kind === "agent");
  await db
    .from("applications")
    .update({ runner_status: "ready", runner_note: held ? "paid: it submits when you resume the agents on your dashboard" : "paid: submitting now", runner_state: { ...((app.runner_state as object) ?? {}), samePageCount: 0, rechecks: 0, reason: null, stuckRepeats: 0, stopFingerprint: null, hangs: 0 }, runner_updated_at: new Date().toISOString() })
    .eq("id", applicationId);
  if (app.runner_mode !== "extension") await enqueue({ userId, agent: "runner", task: "run", payload: { applicationId } });
}

// tell the applicant once that an application is ready and waiting on payment
export async function askToPay(userId: string, applicationId: string, need: NonNullable<PaymentNeed>, school: string) {
  await notify({
    userId,
    key: `pay:${applicationId}`,
    kind: "setup",
    urgent: true,
    title: `${school} is ready to submit`,
    body:
      need.kind === "pack"
        ? `The agents filled every page. Submitting uses ${CREDITS.application} credits and yours are used: buy ${need.label} and they submit it straight away.`
        : need.kind === "submission"
          ? `The agents filled every page. Pay ${need.label} and they submit it straight away.`
          : `The agents filled every page. Submitting uses ${CREDITS.application} credits and yours are used: ${need.label} gives you ${CREDITS.pro} a month.`,
    href: `/applications/${applicationId}?pay=1`,
    actionLabel: need.kind === "pack" ? "Buy a pack" : need.kind === "submission" ? `Pay ${need.label}` : "Subscribe",
    email: true,
  });
}

// staff: what Bachs says about an account's checkouts that never completed (opened, abandoned, declined and why).
// the pending:<ref> rows are kept until a checkout completes, so they are exactly the attempts worth looking at.
export async function paymentAttempts(userId: string): Promise<{ mode: "live" | "sandbox" | "off"; attempts: { ref: string; kind: string; at: string | null; status: string; payment: string; amount: string; detail: string[] }[] }> {
  const key = process.env.BACHS_SECRET_KEY ?? "";
  const mode = !key ? "off" : key.startsWith("sk_live_") ? "live" : "sandbox";
  if (mode === "off") return { mode, attempts: [] };
  const { data } = await admin().from("billing_settings").select("key, value").like("key", "pending:ivw_%").limit(500);
  // the ref ends in base-36 milliseconds: newest first, at most 12 lookups
  const rows = (data ?? []).map((r) => ({ ref: r.key.slice(8), id: r.value as string, ms: parseInt(r.key.split("_").pop() ?? "0", 36) })).sort((a, b) => b.ms - a.ms).slice(0, 60);
  const out: { ref: string; kind: string; at: string | null; status: string; payment: string; amount: string; detail: string[] }[] = [];
  for (const r of rows) {
    if (out.length >= 12) break;
    const s = await bachs<Record<string, unknown>>(`/v1/checkout-sessions/${encodeURIComponent(r.id)}`).catch((e: Error) => ({ status: "lookup failed", error: e.message }) as Record<string, unknown>);
    const meta = (s.metadata ?? {}) as Record<string, string>;
    if (meta.user_id && meta.user_id !== userId) continue;
    if (!meta.user_id && !r.ref.includes(userId.slice(0, 8))) continue;
    // anything in the session that explains a failure, one level deep
    const detail: string[] = [];
    const look = (o: Record<string, unknown>, path: string) => {
      for (const [k, v] of Object.entries(o)) {
        if (v && typeof v === "object" && !Array.isArray(v) && path === "") look(v as Record<string, unknown>, k + ".");
        else if (/fail|error|declin|reason|message|method|channel|card_country|issuer|brand/i.test(k) && v != null && typeof v !== "object") detail.push(`${path}${k}: ${String(v).slice(0, 160)}`);
      }
    };
    look(s, "");
    out.push({ ref: r.ref, kind: r.ref.split("_")[1], at: r.ms ? new Date(r.ms).toISOString() : null, status: String(s.status ?? "?"), payment: String(s.payment_status ?? "?"), amount: `${s.amount ?? ""} ${s.currency ?? ""}`.trim(), detail });
  }
  return { mode, attempts: out };
}
