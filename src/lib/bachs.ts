import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// the Bachs API (payments in naira, cedis, shillings, CFA francs and dollars). the secret key lives in
// BACHS_SECRET_KEY: sk_sandbox_... talks to the sandbox, sk_live_... to production. webhooks are signed with
// BACHS_WEBHOOK_SECRET (from the endpoint's page in the Bachs developer portal).

export const bachsReady = () => !!process.env.BACHS_SECRET_KEY;
const base = () => process.env.BACHS_API_BASE || (process.env.BACHS_SECRET_KEY?.startsWith("sk_live_") ? "https://api.bachs.io" : "https://sandbox-api.bachs.io");

export async function bachs<T>(path: string, init?: { method?: string; body?: unknown; idempotencyKey?: string }): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      authorization: `Bearer ${process.env.BACHS_SECRET_KEY}`,
      "content-type": "application/json",
      ...(init?.idempotencyKey ? { "idempotency-key": init.idempotencyKey } : {}),
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as T & { message?: string; error?: string | { message?: string } };
  if (!res.ok) {
    const err = typeof json.error === "object" ? json.error?.message : json.error;
    throw new Error(`bachs ${path.split("?")[0]}: ${json.message ?? err ?? res.status}`);
  }
  return json;
}

export interface CheckoutSession {
  checkout_id: string;
  checkout_url: string;
  status: string;
}

// Bachs signs every webhook: HMAC-SHA256 (hex) of "{timestamp}.{raw body}". the v2 header reads "t=...,v1=...";
// older deliveries carry X-Bachs-Signature with X-Bachs-Timestamp. deliveries older than 5 minutes are refused.
export function verifyWebhook(raw: string, headers: Headers, now = Date.now()): boolean {
  const secret = process.env.BACHS_WEBHOOK_SECRET;
  if (!secret) return false;
  const v2 = headers.get("x-bachs-signature-v2");
  let ts = headers.get("x-bachs-timestamp") ?? "";
  let sigs: string[] = [];
  if (v2) {
    for (const part of v2.split(",")) {
      const [k, v] = part.trim().split("=");
      if (k === "t") ts = v;
      if (k === "v1" && v) sigs.push(v);
    }
  }
  const v1 = headers.get("x-bachs-signature");
  if (v1) sigs.push(...v1.split(",").map((x) => x.trim().replace(/^v1=/, "")));
  sigs = sigs.filter(Boolean);
  if (!ts || !sigs.length || Math.abs(now / 1000 - Number(ts)) > 300) return false;
  const want = Buffer.from(createHmac("sha256", secret).update(`${ts}.${raw}`).digest("hex"));
  return sigs.some((s) => {
    const got = Buffer.from(s);
    return got.length === want.length && timingSafeEqual(got, want);
  });
}
