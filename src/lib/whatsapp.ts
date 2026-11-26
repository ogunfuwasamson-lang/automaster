import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// WhatsApp Cloud API (Meta), for Ivyward's number +234 911 031 2103 in the Flolyt WhatsApp account. the access token,
// the app secret and the webhook verify token are set by the founder in Agent37's environment; nothing secret is in
// code. ids aren't secret: the number's id and the WhatsApp account's id are the defaults below.
const VERSION = () => process.env.WHATSAPP_API_VERSION || "v23.0";
const TOKEN = () => process.env.WHATSAPP_TOKEN;
export const PHONE_ID = () => process.env.WHATSAPP_PHONE_NUMBER_ID || "1451718214692077";
export const WABA_ID = () => process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "866695872708175";

export const whatsappReady = () => !!TOKEN();

async function graph<T = Record<string, unknown>>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const token = TOKEN();
  if (!token) throw new Error("WHATSAPP_TOKEN isn't set");
  const res = await fetch(`https://graph.facebook.com/${VERSION()}/${path}`, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: { authorization: `Bearer ${token}`, ...(init?.body ? { "content-type": "application/json" } : {}) },
    ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: number } };
  if (!res.ok || json.error) throw new Error(`whatsapp: ${json.error?.message ?? res.status}`);
  return json;
}

// a message from an approved template: body parameters in order, and the suffix of the link button if it has one
export async function sendTemplate(to: string, name: string, params: string[], buttonPath?: string | null): Promise<string> {
  const components: unknown[] = [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }];
  if (buttonPath) components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: buttonPath }] });
  const out = await graph<{ messages?: { id: string }[] }>(`${PHONE_ID()}/messages`, {
    body: { messaging_product: "whatsapp", to, type: "template", template: { name, language: { code: "en" }, components } },
  });
  return out.messages?.[0]?.id ?? "";
}

// a plain reply, only inside the 24 hours after their last message to us
export async function sendText(to: string, body: string, replyTo?: string): Promise<string> {
  const out = await graph<{ messages?: { id: string }[] }>(`${PHONE_ID()}/messages`, {
    body: { messaging_product: "whatsapp", to, type: "text", text: { body: body.slice(0, 4000), preview_url: false }, ...(replyTo ? { context: { message_id: replyTo } } : {}) },
  });
  return out.messages?.[0]?.id ?? "";
}

export const markRead = (messageId: string) => graph(`${PHONE_ID()}/messages`, { body: { messaging_product: "whatsapp", status: "read", message_id: messageId } }).catch(() => null);

// Meta signs each webhook call with the app secret
export function signatureOk(raw: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const want = Buffer.from(`sha256=${createHmac("sha256", secret).update(raw, "utf8").digest("hex")}`);
  const got = Buffer.from(header);
  return want.length === got.length && timingSafeEqual(want, got);
}

// the operator's setup steps (admin): register the number on the Cloud API with the PIN the founder types, subscribe
// the app to the account's webhooks, and read where things stand
export const registerNumber = (pin: string) => graph(`${PHONE_ID()}/register`, { body: { messaging_product: "whatsapp", pin } });
export const subscribeApp = () => graph(`${WABA_ID()}/subscribed_apps`, { method: "POST" });

export async function status() {
  const [number, templates] = await Promise.all([
    graph<{ display_phone_number?: string; verified_name?: string; name_status?: string; code_verification_status?: string; quality_rating?: string; status?: string; platform_type?: string }>(
      `${PHONE_ID()}?fields=display_phone_number,verified_name,name_status,code_verification_status,quality_rating,status,platform_type`,
    ).catch((e) => ({ error: String(e) })),
    graph<{ data?: { name: string; status: string; category: string }[] }>(`${WABA_ID()}/message_templates?fields=name,status,category&limit=50`).catch((e) => ({ error: String(e) })),
  ]);
  return { number, templates: "data" in templates ? (templates.data ?? []) : templates };
}
