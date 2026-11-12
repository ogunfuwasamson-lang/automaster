import "server-only";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { logEvent } from "@/lib/events";
import { notify, resolve } from "@/lib/notify";
import { bachs, type CheckoutSession } from "@/lib/bachs";
import { FREE_APPLICATIONS, PACK_PRICE, PACK_SIZE, PRO_MONTHLY, PRO_MONTHLY_SUBMISSIONS, pricingFor, type Pricing } from "@/lib/geo-pricing";
import { planOf } from "@/lib/plans";
import { submissionAmounts } from "@/lib/fx";

// who pays what, and recording it when they do. the agents check paymentNeeded() before pressing submit.

const SENT = ["submitted", "under_review", "interview", "waitlisted", "admitted", "accepted", "declined", "rejected"];

export interface BillingState {
  pricing: Pricing;
  pro: boolean; // a paid-up monthly plan
  planUntil: string | null;
  cancelled: boolean;
  customer: string | null;
  exempt: boolean; // staff accounts
  credits: number; // submissions left from packs (africa)
  bonus: number; // free submissions earned by inviting friends
}

export async function billingState(userId: string): Promise<BillingState> {
  const { data, error } = await admin().from("profiles").select("plan, plan_until, plan_cancelled_at, billing_country, bachs_customer, is_admin, submission_credits, bonus_submissions").eq("id", userId).maybeSingle();
  if (error || !data) return { pricing: pricingFor(null), pro: false, planUntil: null, cancelled: false, customer: null, exempt: false, credits: 0, bonus: 0 };
  return {
    pricing: pricingFor(data.billing_country, await submissionAmounts().catch(() => null)),
    pro: planOf(data.plan, data.plan_until).id === "pro",
    planUntil: data.plan_until,
    cancelled: !!data.plan_cancelled_at,
    customer: data.bachs_customer,
    exempt: !!data.is_admin,
    credits: data.submission_credits ?? 0,
    bonus: data.bonus_submissions ?? 0,
  };
}

// "pack": buy a pack of submissions (africa). "submission"/"request" are the old one-off payments, still honoured
// for checkouts started before packs.
export type PaymentNeed = { kind: "pack" | "submission" | "pro" | "limit" | "request"; label: string; note: string; resumeAt?: string } | null;

// outgoing emails that ask a school for money: charged like a submission
export const FUNDING_PURPOSES = ["fee_waiver", "aid_reconsideration", "assistantship_inquiry", "scholarship_inquiry"];

// may this funding request go out without paying first? pro covers them; the free allowance counts them with applications.
export async function requestPaymentNeeded(userId: string, messageId: string): Promise<PaymentNeed> {
  const db = admin();
  const { data: m, error } = await db.from("messages").select("id, purpose, paid_at").eq("id", messageId).eq("user_id", userId).maybeSingle();
  if (error || !m) return null; // before the ops migration: nothing is charged
  if (!FUNDING_PURPOSES.includes(m.purpose as string) || m.paid_at) return null;
  const b = await billingState(userId);
  if (b.exempt || b.pro) return null;
  if (b.pricing.model === "pack") return b.credits > 0 ? null : { kind: "pack", label: b.pricing.label, note: `your submissions are used. Buy ${b.pricing.label} to send this request` };
  const [{ count: apps }, { count: reqs }] = await Promise.all([
    db.from("applications").select("id", { count: "exact", head: true }).eq("user_id", userId).or(`status.in.(${SENT.join(",")}),paid_at.not.is.null`),
    db.from("messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("direction", "out").neq("id", messageId).in("purpose", FUNDING_PURPOSES).in("status", ["sent", "scheduled"]),
  ]);
  if ((apps ?? 0) + (reqs ?? 0) < FREE_APPLICATIONS) return null;
  return { kind: "pro", label: b.pricing.label, note: `your ${FREE_APPLICATIONS} free sends are used. Subscribe (${b.pricing.label}) to send this request` };
}

// may this application be submitted without paying first? a free submission earned through an invite covers one
// that would otherwise need paying for; it's spent when the application is actually submitted (spendBonusIfUsed).
export async function paymentNeeded(userId: string, applicationId: string): Promise<PaymentNeed> {
  const need = await needBeforeBonus(userId, applicationId);
  if (need && need.kind !== "limit" && need.kind !== "pack" && (await bonusLeft(userId)) > 0) return null;
  return need;
}

// the submit gate: may the agents press submit on this application now? in pack countries this is where a
// submission is used up (an invite bonus first, then a pack credit), once per application and atomically, so two
// runners can't both spend the last credit. returns what's still needed, or null to go ahead.
export async function settleBeforeSubmit(userId: string, applicationId: string): Promise<PaymentNeed> {
  const need = await paymentNeeded(userId, applicationId);
  const b = await billingState(userId);
  if (b.pricing.model !== "pack" || b.exempt) return need;
  const { data: got, error } = await admin().rpc("reserve_submission", { uid: userId, app: applicationId });
  if (error) return need; // before the packs migration: fall back to the plain check
  if (got === "none") return { kind: "pack", label: b.pricing.label, note: `ready to submit: your submissions are used. Buy ${b.pricing.label} and the agents submit it straight away` };
  if (got === "credit") await lastCreditNotice(userId, b.credits - 1, b.pricing);
  return null;
}

// a funding request is about to be sent: same as above for messages
export async function settleBeforeRequest(userId: string, messageId: string): Promise<PaymentNeed> {
  const need = await requestPaymentNeeded(userId, messageId);
  const b = await billingState(userId);
  if (b.pricing.model !== "pack" || b.exempt) return need;
  const { data: m } = await admin().from("messages").select("purpose, paid_at").eq("id", messageId).eq("user_id", userId).maybeSingle();
  if (!m || !FUNDING_PURPOSES.includes(m.purpose as string) || m.paid_at) return null;
  const { data: got, error } = await admin().rpc("reserve_request", { uid: userId, msg: messageId });
  if (error) return need;
  if (got === "none") return { kind: "pack", label: b.pricing.label, note: `your submissions are used. Buy ${b.pricing.label} to send this request` };
  if (got === "credit") await lastCreditNotice(userId, b.credits - 1, b.pricing);
  return null;
}

// one heads-up when the pack runs out, so the next application doesn't sit waiting
async function lastCreditNotice(userId: string, left: number, p: Pricing) {
  if (left > 0 || p.model !== "pack") return;
  await notify({ userId, key: "pack:empty", kind: "info", title: "That was the last submission in your pack", body: `Buy another pack (${p.label}) so your next application goes in as soon as it's ready.`, href: "/settings#plan", actionLabel: "Buy a pack" }).catch(() => null);
}

async function bonusLeft(userId: string): Promise<number> {
  const { data, error } = await admin().from("profiles").select("bonus_submissions").eq("id", userId).maybeSingle();
  return error ? 0 : (data?.bonus_submissions ?? 0);
}

// after a submission: if it went through on a free submission, use it up and mark the application paid
export async function spendBonusIfUsed(userId: string, applicationId: string) {
  // pack countries settle at the submit gate; this only catches a submission that went in without passing it
  if ((await billingState(userId)).pricing.model === "pack") {
    await admin().rpc("reserve_submission", { uid: userId, app: applicationId });
    return;
  }
  const need = await needBeforeBonus(userId, applicationId);
  if (!need || need.kind === "limit") return;
  const db = admin();
  const { data: ok } = await db.rpc("use_bonus_submission", { uid: userId });
  if (ok) await db.from("applications").update({ paid_at: new Date().toISOString() }).eq("id", applicationId).is("paid_at", null);
}

async function needBeforeBonus(userId: string, applicationId: string): Promise<PaymentNeed> {
  const b = await billingState(userId);
  if (b.exempt) return null;
  const db = admin();
  if (b.pro) {
    // pro covers PRO_MONTHLY_SUBMISSIONS submissions a calendar month; the next one waits for the 1st
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const { count, error } = await db.from("applications").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("id", applicationId).gte("submitted_at", start.toISOString());
    if (error || (count ?? 0) < PRO_MONTHLY_SUBMISSIONS) return null;
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 6));
    const day = next.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
    return { kind: "limit", label: b.pricing.label, resumeAt: next.toISOString(), note: `ready to submit: Pro covers ${PRO_MONTHLY_SUBMISSIONS} submissions a month and you've used them. The agents submit this one on ${day}` };
  }
  const { data: app, error } = await db.from("applications").select("id, paid_at").eq("id", applicationId).eq("user_id", userId).maybeSingle();
  if (error) return null; // before the billing migration: nothing is charged
  if (!app || app.paid_at) return null;
  if (b.pricing.model === "pack") return b.credits > 0 || b.bonus > 0 ? null : { kind: "pack", label: b.pricing.label, note: `ready to submit: buy ${b.pricing.label} and the agents submit it straight away` };
  // outside africa: the first few applications are free
  const { count } = await db.from("applications").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("id", applicationId).or(`status.in.(${SENT.join(",")}),paid_at.not.is.null`);
  if ((count ?? 0) < FREE_APPLICATIONS) return null;
  return { kind: "pro", label: b.pricing.label, note: `ready to submit: your ${FREE_APPLICATIONS} free applications are used. Subscribe (${b.pricing.label}) to submit this and every other one` };
}

// the monthly product, made in Bachs once
async function proProduct(): Promise<string> {
  if (process.env.BACHS_PRO_PRODUCT) return process.env.BACHS_PRO_PRODUCT;
  const db = admin();
  const { data } = await db.from("billing_settings").select("value").eq("key", "bachs_pro_product").maybeSingle();
  if (data?.value) return data.value;
  const p = await bachs<{ id: string }>("/v1/products", {
    method: "POST",
    body: { name: "Ivyward Pro", description: "Up to 10 university applications a month, submitted by Ivyward's agents. Cancel any time.", price: { currency: "USD", amount: PRO_MONTHLY.amount }, billing_cycle: { interval: "month", frequency: 1 }, metadata: { plan: "pro" } },
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
  const success = `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}paid=${ref}`;
  const body =
    kind !== "pro"
      ? (() => {
          const currency = b.pricing.model === "pack" ? b.pricing.currency : "USD";
          const amount = b.pricing.model === "pack" ? b.pricing.amount : PACK_PRICE.USD.amount;
          return { pricing: { currency, amount }, billing_currency: currency, customer: { email }, success_url: success, cancel_url: returnUrl, reference: ref, metadata: { ...metadata, credits: String(PACK_SIZE) } };
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
  // a pack must be paid at (close to) the pack price; the old one-off submissions at a fifth of it
  const packFloor = c.currency ? Number(amounts[c.currency] ?? PACK_PRICE[c.currency]?.amount ?? 0) * 0.9 : 0; // 10% slack for a refresh mid-checkout
  const floor = meta.kind === "pack" ? packFloor : packFloor / PACK_SIZE;
  if (meta.kind !== "pro" && (!c.currency || amt + 0.001 < floor)) return { applied: false };
  const { error: dup } = await db.from("billing_events").insert({ reference, user_id: userId, kind: meta.kind, application_id: meta.application_id ?? null, ...(meta.message_id ? { message_id: meta.message_id } : {}), amount: amt || null, currency: c.currency ?? null, raw: c as unknown as object });
  if (dup) return { applied: false, kind: meta.kind };
  const customer = typeof c.customer === "string" ? c.customer : (c.customer?.id ?? c.customer?.customer_id ?? null);
  // a paying account: anything held for credit goes now, and the reminders to pay stop
  const { releaseHeld } = await import("@/lib/credit");
  await releaseHeld(userId).catch(() => {});
  await resolve(userId, /^paynudge:/).catch(() => {});

  if (meta.kind === "pack") {
    const { data: bal } = await db.rpc("grant_credits", { uid: userId, n: PACK_SIZE, ref: reference });
    if (customer) await db.from("profiles").update({ bachs_customer: customer }).eq("id", userId);
    await logEvent({ userId, actor: "user", action: "billing.pack_paid", applicationId: meta.application_id ?? undefined, context: { amount: amt, currency: c.currency, credits: PACK_SIZE, balance: bal } });
    await resolve(userId, "pack:empty");
    // whatever was waiting on payment goes now: the one it was bought from first, then the rest
    if (meta.message_id) {
      await resolve(userId, `payreq:${meta.message_id}`);
      const { schedule } = await import("@/lib/outbox");
      await schedule(userId, meta.message_id, "user").catch(() => null);
    }
    const { data: waiting } = await db.from("applications").select("id").eq("user_id", userId).eq("status", "packet_approved").is("paid_at", null).eq("runner_status", "needs_you");
    const ids = [...new Set([meta.application_id, ...(waiting ?? []).map((a) => a.id as string)].filter(Boolean))] as string[];
    for (const id of ids.slice(0, PACK_SIZE)) await resumeAfterPayment(userId, id);
    return { applied: true, kind: "pack" };
  }

  if (meta.kind === "request" && meta.message_id) {
    await db.from("messages").update({ paid_at: new Date().toISOString() }).eq("id", meta.message_id).eq("user_id", userId);
    if (customer) await db.from("profiles").update({ bachs_customer: customer }).eq("id", userId);
    await logEvent({ userId, actor: "user", action: "billing.request_paid", context: { messageId: meta.message_id, amount: amt, currency: c.currency } });
    await resolve(userId, `payreq:${meta.message_id}`);
    // they paid from the send button: send it now (with the usual undo window)
    const { schedule } = await import("@/lib/outbox");
    await schedule(userId, meta.message_id, "user").catch(() => null);
    return { applied: true, kind: "request" };
  }

  if (meta.kind === "submission" && meta.application_id) {
    await db.from("applications").update({ paid_at: new Date().toISOString() }).eq("id", meta.application_id).eq("user_id", userId);
    if (customer) await db.from("profiles").update({ bachs_customer: customer }).eq("id", userId);
    await logEvent({ userId, actor: "user", action: "billing.submission_paid", applicationId: meta.application_id, context: { amount: amt, currency: c.currency } });
    await resumeAfterPayment(userId, meta.application_id);
    return { applied: true, kind: "submission" };
  }
  const sub = typeof c.subscription === "string" ? c.subscription : (c.subscription?.id ?? c.subscription?.subscription_id ?? null);
  const until = c.subscription && typeof c.subscription === "object" && c.subscription.current_period_end ? new Date(c.subscription.current_period_end) : addMonths(new Date(), 1);
  await db
    .from("profiles")
    .update({ plan: "pro", plan_until: new Date(until.getTime() + 3 * 86_400_000).toISOString(), plan_cancelled_at: null, ...(customer ? { bachs_customer: customer } : {}), ...(sub ? { bachs_subscription: sub } : {}) })
    .eq("id", userId);
  await logEvent({ userId, actor: "user", action: "billing.pro_started", context: { amount: amt } });
  // everything that was waiting on payment can go
  const { data: waiting } = await db.from("applications").select("id").eq("user_id", userId).eq("runner_status", "needs_you").ilike("runner_note", "%subscribe%");
  for (const a of waiting ?? []) await resumeAfterPayment(userId, a.id);
  await db.from("jobs").update({ run_at: new Date().toISOString() }).eq("user_id", userId).eq("status", "queued").or("last_error.like.budget:%,last_error.like.hold:%");
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
  await db.from("applications").update({ runner_status: "ready", runner_note: "paid: submitting now", runner_state: { ...((app.runner_state as object) ?? {}), samePageCount: 0, rechecks: 0, reason: null }, runner_updated_at: new Date().toISOString() }).eq("id", applicationId);
  if (app.runner_mode !== "extension") await enqueue({ userId, agent: "runner", task: "run", payload: { applicationId } });
}

// tell the applicant once that an application is ready and waiting on payment
export async function askToPay(userId: string, applicationId: string, need: NonNullable<PaymentNeed>, school: string) {
  if (need.kind === "limit") {
    await notify({ userId, key: `pay:${applicationId}`, kind: "info", title: `${school} is ready: it goes in on the 1st`, body: `Pro covers ${PRO_MONTHLY_SUBMISSIONS} submissions a month and this month's are used. The agents submit ${school} as soon as the new month starts. Check the deadline: if it's sooner, tell Ivyward AI.`, href: `/applications/${applicationId}`, actionLabel: "See it" });
    return;
  }
  await notify({
    userId,
    key: `pay:${applicationId}`,
    kind: "setup",
    urgent: true,
    title: need.kind === "pro" ? `${school} is ready: subscribe to submit` : `${school} is ready to submit`,
    body:
      need.kind === "pack"
        ? `The agents filled every page. Your submissions are used: buy ${need.label} and they submit it straight away.`
        : need.kind === "submission"
          ? `The agents filled every page. Pay ${need.label} and they submit it straight away.`
          : `You've used your ${FREE_APPLICATIONS} free applications. ${need.label} covers this one and every other submission.`,
    href: `/applications/${applicationId}?pay=1`,
    actionLabel: need.kind === "pack" ? "Buy a pack" : need.kind === "submission" ? `Pay ${need.label}` : "Subscribe",
    email: true,
  });
}
