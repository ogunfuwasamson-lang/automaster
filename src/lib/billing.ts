import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { PRO_PRICE, SEASON_PRICE, type Currency } from "@/lib/plans";

// payments through paystack (works for a business in nigeria, which stripe doesn't serve):
//   pro: a monthly subscription, in naira (₦4,500) for nigerian cards or US dollars ($15) for everyone else.
//   season pass: one payment of $199 for six months.
// the paystack secret key lives in PAYSTACK_SECRET_KEY. the two monthly plans are created in paystack on first use.

const PS = "https://api.paystack.co";
export const billingReady = () => !!process.env.PAYSTACK_SECRET_KEY;

async function ps<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${PS}${path}`, {
    method: init?.method ?? "GET",
    headers: { authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "content-type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || json.status === false) throw new Error(`paystack ${path.split("?")[0]}: ${json.message ?? res.status}`);
  return json.data as T;
}

// the monthly pro plan for a currency: remembered after the first lookup, created in paystack if it doesn't exist
async function proPlanCode(currency: Currency): Promise<string> {
  const key = `paystack_pro_${currency}`;
  const env = process.env[`PAYSTACK_PLAN_${currency}`];
  if (env) return env;
  const db = admin();
  const { data: saved } = await db.from("billing_settings").select("value").eq("key", key).maybeSingle();
  if (saved?.value) return saved.value;
  const name = `Ivyward Pro (${currency})`;
  const list = await ps<{ name: string; plan_code: string; currency: string; interval: string; amount: number }[]>(`/plan?perPage=100`);
  let plan = list.find((p) => p.name === name && p.currency === currency && p.interval === "monthly" && p.amount === PRO_PRICE[currency]);
  if (!plan) plan = await ps<{ plan_code: string } & typeof list[number]>("/plan", { method: "POST", body: { name, interval: "monthly", amount: PRO_PRICE[currency], currency, description: "Ivyward Pro: more agent work every month. Cancel any time." } });
  await db.from("billing_settings").upsert({ key, value: plan.plan_code });
  return plan.plan_code;
}

// a paystack checkout page for this applicant. returns the address to send them to.
export async function checkout(userId: string, email: string, kind: "pro" | "season", currency: Currency, returnUrl: string): Promise<string> {
  const reference = `ivw_${kind}_${userId.slice(0, 8)}_${Date.now().toString(36)}`;
  const body =
    kind === "pro"
      ? { email, amount: PRO_PRICE[currency], currency, plan: await proPlanCode(currency), callback_url: returnUrl, reference, metadata: { user_id: userId, kind, currency } }
      : { email, amount: SEASON_PRICE.USD, currency: "USD", callback_url: returnUrl, reference, metadata: { user_id: userId, kind, currency: "USD" } };
  const r = await ps<{ authorization_url: string }>("/transaction/initialize", { method: "POST", body });
  return r.authorization_url;
}

// paystack signs every webhook with HMAC-SHA512 of the raw body, keyed with the secret key
export function validSignature(raw: string, signature: string | null): boolean {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const want = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(raw).digest("hex");
  const a = Buffer.from(want);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Charge = {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  paid_at?: string;
  metadata?: { user_id?: string; kind?: string; currency?: string } | string | null;
  plan?: { plan_code?: string } | string | null;
  customer?: { customer_code?: string; email?: string };
};

const addMonths = (d: Date, n: number) => {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + n);
  return x;
};

// a successful payment: first purchase, or a monthly renewal. idempotent per paystack reference.
export async function applyCharge(c: Charge): Promise<{ applied: boolean; userId?: string; kind?: string }> {
  if (c.status !== "success") return { applied: false };
  const db = admin();
  const meta = typeof c.metadata === "object" && c.metadata ? c.metadata : {};
  const planCode = typeof c.plan === "object" && c.plan ? c.plan.plan_code : typeof c.plan === "string" ? c.plan : null;
  // renewals carry the plan and customer, not our metadata: find the applicant by their paystack customer
  let userId = meta.user_id ?? null;
  if (!userId && c.customer?.customer_code) {
    const { data } = await db.from("profiles").select("id").eq("paystack_customer", c.customer.customer_code).maybeSingle();
    userId = (data?.id as string) ?? null;
  }
  if (!userId) return { applied: false };
  const kind = meta.kind === "season" ? "season" : meta.kind === "pro" || planCode ? "pro" : null;
  if (!kind) return { applied: false };
  // the amount must match a real price, so a tampered checkout can't buy a plan for less
  const okAmount = kind === "season" ? c.currency === "USD" && c.amount >= SEASON_PRICE.USD : (c.currency === "USD" && c.amount >= PRO_PRICE.USD) || (c.currency === "NGN" && c.amount >= PRO_PRICE.NGN);
  if (!okAmount) return { applied: false };

  const { error: dup } = await db.from("billing_events").insert({ reference: c.reference, user_id: userId, kind: meta.kind ? kind : "renewal", amount: c.amount, currency: c.currency, raw: c as unknown as object });
  if (dup) return { applied: false, userId, kind }; // already applied (webhook and return check both arrive)

  const { data: prof } = await db.from("profiles").select("plan, plan_until").eq("id", userId).maybeSingle();
  const now = new Date(c.paid_at ?? Date.now());
  // stack on top of time already paid for, so paying early never loses days
  const from = prof?.plan_until && Date.parse(prof.plan_until) > now.getTime() && prof.plan === kind ? new Date(prof.plan_until) : now;
  // a few days' grace on monthly renewals, in case a renewal charge is retried
  const until = kind === "season" ? addMonths(from, 6) : new Date(addMonths(from, 1).getTime() + 3 * 86_400_000);
  await db
    .from("profiles")
    .update({ plan: kind, plan_until: until.toISOString(), billing_currency: c.currency, plan_cancelled_at: null, ...(c.customer?.customer_code ? { paystack_customer: c.customer.customer_code } : {}) })
    .eq("id", userId);
  // work that was waiting for next month's allowance can go now
  await db.from("jobs").update({ run_at: new Date().toISOString() }).eq("user_id", userId).eq("status", "queued").like("last_error", "budget:%");
  await logEvent({ userId, actor: "user", action: kind === "season" ? "billing.season_paid" : "billing.pro_paid", context: { currency: c.currency, until: until.toISOString() } });
  return { applied: true, userId, kind };
}

// confirm a payment directly with paystack (when the applicant comes back from checkout)
export async function verify(reference: string) {
  return applyCharge(await ps<Charge>(`/transaction/verify/${encodeURIComponent(reference)}`));
}

export async function rememberSubscription(s: { subscription_code?: string; email_token?: string; customer?: { customer_code?: string } }) {
  if (!s.customer?.customer_code || !s.subscription_code) return;
  await admin().from("profiles").update({ paystack_subscription: s.subscription_code, paystack_email_token: s.email_token ?? null }).eq("paystack_customer", s.customer.customer_code);
}

// stop renewing. the plan runs to the end of the month already paid for.
export async function cancel(userId: string) {
  const db = admin();
  const { data } = await db.from("profiles").select("paystack_subscription, paystack_email_token").eq("id", userId).maybeSingle();
  if (!data?.paystack_subscription) throw new Error("no subscription to cancel");
  let token = data.paystack_email_token as string | null;
  if (!token) token = (await ps<{ email_token: string }>(`/subscription/${data.paystack_subscription}`)).email_token;
  await ps("/subscription/disable", { method: "POST", body: { code: data.paystack_subscription, token } });
  await db.from("profiles").update({ plan_cancelled_at: new Date().toISOString() }).eq("id", userId);
  await logEvent({ userId, actor: "user", action: "billing.cancelled" });
}

export async function markCancelled(s: { subscription_code?: string }) {
  if (!s.subscription_code) return;
  await admin().from("profiles").update({ plan_cancelled_at: new Date().toISOString() }).eq("paystack_subscription", s.subscription_code).is("plan_cancelled_at", null);
}
