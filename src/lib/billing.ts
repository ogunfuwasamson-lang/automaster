import "server-only";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { logEvent } from "@/lib/events";
import { notify, resolve } from "@/lib/notify";
import { bachs, type CheckoutSession } from "@/lib/bachs";
import { FREE_APPLICATIONS, PRO_MONTHLY, SUBMISSION_PRICE, pricingFor, type Pricing } from "@/lib/geo-pricing";
import { planOf } from "@/lib/plans";

// who pays what, and recording it when they do. the agents check paymentNeeded() before pressing submit.

const SENT = ["submitted", "under_review", "interview", "waitlisted", "admitted", "accepted", "declined", "rejected"];

export interface BillingState {
  pricing: Pricing;
  pro: boolean; // a paid-up monthly plan
  planUntil: string | null;
  cancelled: boolean;
  customer: string | null;
  exempt: boolean; // staff accounts
}

export async function billingState(userId: string): Promise<BillingState> {
  const { data, error } = await admin().from("profiles").select("plan, plan_until, plan_cancelled_at, billing_country, bachs_customer, is_admin").eq("id", userId).maybeSingle();
  if (error || !data) return { pricing: pricingFor(null), pro: false, planUntil: null, cancelled: false, customer: null, exempt: false };
  return {
    pricing: pricingFor(data.billing_country),
    pro: planOf(data.plan, data.plan_until).id === "pro",
    planUntil: data.plan_until,
    cancelled: !!data.plan_cancelled_at,
    customer: data.bachs_customer,
    exempt: !!data.is_admin,
  };
}

export type PaymentNeed = { kind: "submission" | "pro"; label: string; note: string } | null;

// may this application be submitted without paying first?
export async function paymentNeeded(userId: string, applicationId: string): Promise<PaymentNeed> {
  const b = await billingState(userId);
  if (b.exempt || b.pro) return null;
  const db = admin();
  const { data: app, error } = await db.from("applications").select("id, paid_at").eq("id", applicationId).eq("user_id", userId).maybeSingle();
  if (error) return null; // before the billing migration: nothing is charged
  if (!app || app.paid_at) return null;
  if (b.pricing.model === "per_submission") return { kind: "submission", label: b.pricing.label, note: `ready to submit: pay ${b.pricing.label} to send it` };
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
    body: { name: "Ivyward Pro", description: "Unlimited university applications submitted by Ivyward's agents. Cancel any time.", price: { currency: "USD", amount: PRO_MONTHLY.amount }, billing_cycle: { interval: "month", frequency: 1 }, metadata: { plan: "pro" } },
    idempotencyKey: "ivyward-pro-product-v1",
  });
  await db.from("billing_settings").upsert({ key: "bachs_pro_product", value: p.id });
  return p.id;
}

// a Bachs checkout page for one submission or the monthly plan
export async function checkout(userId: string, email: string, kind: "submission" | "pro", returnUrl: string, applicationId?: string): Promise<string> {
  const b = await billingState(userId);
  const ref = `ivw_${kind}_${(applicationId ?? userId).slice(0, 8)}_${Date.now().toString(36)}`;
  const metadata = { user_id: userId, kind, ...(applicationId ? { application_id: applicationId } : {}) };
  const success = `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}paid=${ref}`;
  const body =
    kind === "submission"
      ? (() => {
          const currency = b.pricing.model === "per_submission" ? b.pricing.currency : "USD";
          const amount = SUBMISSION_PRICE[currency]?.amount ?? SUBMISSION_PRICE.USD.amount;
          return { pricing: { currency, amount }, billing_currency: currency, customer: { email }, success_url: success, cancel_url: returnUrl, reference: ref, metadata };
        })()
      : { product_cart: [{ product_id: await proProduct(), quantity: 1 }], billing_currency: "USD", customer: b.customer ? { customer_id: b.customer } : { email }, success_url: success, cancel_url: returnUrl, reference: ref, metadata };
  const s = await bachs<CheckoutSession>("/v1/checkout-sessions", { method: "POST", body, idempotencyKey: ref });
  // remembered so the return page can confirm the payment directly, without waiting for the webhook
  await admin().from("billing_settings").upsert({ key: `pending:${ref}`, value: s.checkout_id });
  return s.checkout_url;
}

// the applicant came back from checkout: confirm with Bachs and apply it now
export async function confirmReturn(userId: string, ref: string): Promise<{ applied: boolean; kind?: string }> {
  if (!/^ivw_(submission|pro)_[\w]+$/.test(ref)) return { applied: false };
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
  if (!userId || (meta.kind !== "submission" && meta.kind !== "pro")) return { applied: false };
  const db = admin();
  const reference = c.checkout_id ?? c.reference ?? "";
  if (!reference) return { applied: false };
  // the amount must be a real price, so an edited checkout can't buy a submission for less
  const amt = Number(c.amount ?? 0);
  if (meta.kind === "submission" && c.currency && SUBMISSION_PRICE[c.currency] && amt + 0.001 < Number(SUBMISSION_PRICE[c.currency].amount)) return { applied: false };
  const { error: dup } = await db.from("billing_events").insert({ reference, user_id: userId, kind: meta.kind, application_id: meta.application_id ?? null, amount: amt || null, currency: c.currency ?? null, raw: c as unknown as object });
  if (dup) return { applied: false, kind: meta.kind };
  const customer = typeof c.customer === "string" ? c.customer : (c.customer?.id ?? c.customer?.customer_id ?? null);

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
  await db.from("jobs").update({ run_at: new Date().toISOString() }).eq("user_id", userId).eq("status", "queued").like("last_error", "budget:%");
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
  await notify({
    userId,
    key: `pay:${applicationId}`,
    kind: "setup",
    urgent: true,
    title: need.kind === "submission" ? `${school} is ready to submit` : `${school} is ready: subscribe to submit`,
    body: need.kind === "submission" ? `The agents filled every page. Pay ${need.label} and they submit it straight away.` : `You've used your ${FREE_APPLICATIONS} free applications. ${need.label} covers this one and every other submission.`,
    href: `/applications/${applicationId}?pay=1`,
    actionLabel: need.kind === "submission" ? `Pay ${need.label}` : "Subscribe",
    email: true,
  });
}
