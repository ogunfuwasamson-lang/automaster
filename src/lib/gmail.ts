import "server-only";
import { admin } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/crypto";
import { buildMime, toBase64Url } from "@/lib/mime";

// gmail for the applicant: send approved emails as them, and read portal verification codes and school replies.
// two ways in, same api calls either way:
//   1. composio (COMPOSIO_API_KEY + COMPOSIO_GMAIL_AUTH_CONFIG): the applicant connects gmail through composio's
//      google app, which google has already verified, so anyone can connect. we call the gmail api through
//      composio's proxy; we never hold a google token. this is the default when it's configured.
//   2. our own google oauth app (GOOGLE_CLIENT_ID/SECRET): test users only until google verifies it.
// unless GMAIL_READ=0 the google app also asks for read access (gmail.readonly, a restricted scope).
export const GMAIL_READ = process.env.GMAIL_READ !== "0";
export const GMAIL_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/gmail.send", ...(GMAIL_READ ? ["https://www.googleapis.com/auth/gmail.readonly"] : [])];

export const composioMail = () => !!(process.env.COMPOSIO_API_KEY && process.env.COMPOSIO_GMAIL_AUTH_CONFIG);

export function gmailConfigured(): boolean {
  return composioMail() || !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.TOKEN_ENCRYPTION_KEY);
}

// ---- composio ----
const CX = "https://backend.composio.dev/api/v3.1";
async function cx<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${CX}${path}`, {
    method: init?.method ?? "GET",
    headers: { "x-api-key": process.env.COMPOSIO_API_KEY!, "content-type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(30_000),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } | string; message?: string };
  if (!res.ok) {
    const e = json.error;
    throw new Error(`composio ${path.split("?")[0]}: ${res.status} ${typeof e === "string" ? e : (e?.message ?? json.message ?? "")}`.trim());
  }
  return json;
}
type CxAccount = { id: string; status: string; user_id?: string; auth_config?: { id?: string } };

// a composio connect link for this applicant. if they already have an active gmail connection there (say they
// disconnected here but composio kept it), reuse it instead of asking google again.
export async function composioConnectUrl(userId: string, callbackUrl: string): Promise<{ url: string; accountId: string } | { accountId: string; ready: true }> {
  const cfg = process.env.COMPOSIO_GMAIL_AUTH_CONFIG!;
  const existing = await cx<{ items?: CxAccount[] }>(`/connected_accounts?user_ids=${encodeURIComponent(userId)}&auth_config_ids=${encodeURIComponent(cfg)}&statuses=ACTIVE&limit=5`);
  const live = existing.items?.find((a) => a.status === "ACTIVE");
  if (live) return { accountId: live.id, ready: true };
  const link = await cx<{ redirect_url: string; connected_account_id: string }>("/connected_accounts/link", { method: "POST", body: { auth_config_id: cfg, user_id: userId, callback_url: callbackUrl } });
  return { url: link.redirect_url, accountId: link.connected_account_id };
}

export async function connectComposio(userId: string, accountId: string) {
  const a = await cx<CxAccount>(`/connected_accounts/${encodeURIComponent(accountId)}`);
  if (a.user_id && a.user_id !== userId) throw new Error("that gmail connection belongs to someone else");
  if (a.status !== "ACTIVE") throw new Error(`gmail connection isn't active (${a.status.toLowerCase()})`);
  const prof = await proxy(userId, accountId, "https://gmail.googleapis.com/gmail/v1/users/me/profile", "GET");
  const email = (prof.data as { emailAddress?: string } | undefined)?.emailAddress;
  if (prof.status >= 300 || !email) throw new Error("couldn't read your gmail address");
  const { error } = await admin().from("mail_accounts").upsert({
    user_id: userId,
    provider: "composio",
    email,
    refresh_token_enc: accountId, // composio's connection id, not a google token: useless without our api key
    scopes: "https://mail.google.com/ gmail.send gmail.readonly",
    status: "active",
    last_error: null,
    connected_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return email;
}

// user_id is required alongside the connection: composio checks the connection belongs to that user
async function proxy(userId: string, accountId: string, url: string, method: "GET" | "POST", body?: unknown): Promise<{ status: number; data: unknown }> {
  const r = await cx<{ status: number; data?: unknown }>("/tools/execute/proxy", { method: "POST", body: { connected_account_id: accountId, user_id: userId, endpoint: url, method, ...(body === undefined ? {} : { body }) } });
  return { status: r.status, data: r.data };
}

export function appUrl(): string {
  return (process.env.APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/$/, "");
}

const redirectUri = () => `${appUrl()}/api/mail/callback`;

export function authUrl(state: string): string {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GMAIL_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function tokenCall(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...body }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, string>;
  if (!res.ok) throw new Error(`google token: ${json.error ?? res.status} ${json.error_description ?? ""}`.trim());
  return json;
}

export async function connect(userId: string, code: string) {
  const t = await tokenCall({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
  if (!t.refresh_token) throw new Error("google didn't return offline access; remove Ivyward from your google account permissions and connect again");
  if (!(t.scope ?? "").includes("gmail.send")) throw new Error("gmail send permission wasn't granted. tick the box on google's consent screen.");
  const claims = JSON.parse(Buffer.from((t.id_token ?? "..").split(".")[1] ?? "", "base64url").toString() || "{}") as { email?: string };
  if (!claims.email) throw new Error("couldn't read your gmail address");
  const { error } = await admin().from("mail_accounts").upsert({
    user_id: userId,
    provider: "gmail",
    email: claims.email,
    refresh_token_enc: encrypt(t.refresh_token),
    scopes: t.scope,
    status: "active",
    last_error: null,
    connected_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return claims.email;
}

export async function mailAccount(userId: string) {
  const { data } = await admin().from("mail_accounts").select("provider, email, status, last_error, refresh_token_enc").eq("user_id", userId).maybeSingle();
  return data as { provider: string; email: string; status: string; last_error: string | null; refresh_token_enc: string } | null;
}

export async function disconnect(userId: string) {
  const acct = await mailAccount(userId);
  if (acct?.provider === "composio") {
    // remove the connection at composio, which revokes its google access
    await cx(`/connected_accounts/${encodeURIComponent(acct.refresh_token_enc)}`, { method: "DELETE" }).catch(() => {});
  } else if (acct) {
    // best effort: revoke at google too
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decrypt(acct.refresh_token_enc))}`, { method: "POST" }).catch(() => {});
  }
  await admin().from("mail_accounts").delete().eq("user_id", userId);
}

export class MailAuthError extends Error {}

async function revoked(userId: string): Promise<never> {
  await admin().from("mail_accounts").update({ status: "revoked", last_error: "access was revoked; reconnect gmail" }).eq("user_id", userId);
  throw new MailAuthError("gmail access was revoked; reconnect it");
}

// one gmail api call for this applicant, whichever way they connected. returns the parsed json body.
type Gm = { acct: NonNullable<Awaited<ReturnType<typeof mailAccount>>>; call: (url: string, method?: "GET" | "POST", body?: unknown) => Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> };
async function gmail(userId: string): Promise<Gm> {
  const acct = await mailAccount(userId);
  if (!acct || acct.status !== "active") throw new MailAuthError("gmail not connected");
  if (acct.provider === "composio") {
    return {
      acct,
      call: async (url, method = "GET", body) => {
        let r: { status: number; data: unknown };
        try {
          r = await proxy(userId, acct.refresh_token_enc, url, method, body);
        } catch (e) {
          // the connection was removed or expired at composio
          if (/ 4(01|03|04|10|22) /.test(e instanceof Error ? e.message : "")) await revoked(userId);
          throw e;
        }
        if (r.status === 401) await revoked(userId);
        return { ok: r.status < 300, status: r.status, json: (r.data ?? {}) as Record<string, unknown> };
      },
    };
  }
  let access: string;
  try {
    access = (await tokenCall({ refresh_token: decrypt(acct.refresh_token_enc), grant_type: "refresh_token" })).access_token as string;
  } catch (e) {
    if (/invalid_grant/.test(e instanceof Error ? e.message : String(e))) await revoked(userId);
    throw e;
  }
  return {
    acct,
    call: async (url, method = "GET", body) => {
      const res = await fetch(url, { method, headers: { authorization: `Bearer ${access}`, ...(body === undefined ? {} : { "content-type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { ok: res.ok, status: res.status, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
    },
  };
}

export async function canReadMail(userId: string): Promise<boolean> {
  const { data } = await admin().from("mail_accounts").select("scopes, status").eq("user_id", userId).maybeSingle();
  return data?.status === "active" && (data.scopes ?? "").includes("gmail.readonly");
}

// recent messages matching a gmail search, as plain text. used only to find portal verification codes/links.
// known: ids already handled, skipped before downloading (the inbox is checked every few minutes)
export async function recentMail(userId: string, q: string, max = 5, known?: (ids: string[]) => Promise<Set<string>>): Promise<{ id: string; threadId: string | null; from: string; subject: string; text: string; html: string; at: number }[]> {
  const g = await gmail(userId);
  const list = (await g.call(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&q=${encodeURIComponent(q)}`)).json as { messages?: { id: string; threadId?: string }[] };
  const out = [];
  const listed = list.messages ?? [];
  const skip = known && listed.length ? await known(listed.map((m) => m.id)) : new Set<string>();
  for (const m of listed) {
    if (skip.has(m.id)) continue;
    out.push(await fetchMail(g, m.id, m.threadId ?? null));
  }
  return out;
}

export type FetchedMail = { id: string; threadId: string | null; from: string; subject: string; text: string; html: string; at: number };

// one message, decoded. long text parts come as separate attachments in gmail's api: fetch those too, so a
// long email is never cut down to nothing.
async function fetchMail(g: Gm, id: string, threadId: string | null): Promise<FetchedMail> {
  const msg = (await g.call(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`)).json as GmailMsg & { threadId?: string };
  const header = (n: string) => msg.payload?.headers?.find((x) => x.name.toLowerCase() === n)?.value ?? "";
  const parts: GmailPart[] = [];
  const walk = (p?: GmailPart) => {
    if (!p) return;
    parts.push(p);
    p.parts?.forEach(walk);
  };
  walk(msg.payload);
  const dec = async (t: string) => {
    const chunks: string[] = [];
    for (const p of parts.filter((x) => x.mimeType === t)) {
      let data = p.body?.data;
      if (!data && p.body?.attachmentId) {
        const att = (await g.call(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/attachments/${p.body.attachmentId}`).catch(() => ({ json: {} }))).json as { data?: string };
        data = att.data;
      }
      if (data) chunks.push(Buffer.from(data, "base64url").toString("utf8"));
    }
    return chunks.join("\n");
  };
  return { id, threadId: threadId ?? msg.threadId ?? null, from: header("from"), subject: header("subject"), text: await dec("text/plain"), html: await dec("text/html"), at: Number(msg.internalDate ?? 0) };
}

// a single message by id (used to fill in emails stored before full bodies were kept)
export async function getMail(userId: string, id: string): Promise<FetchedMail | null> {
  const g = await gmail(userId);
  try {
    return await fetchMail(g, id, null);
  } catch {
    return null;
  }
}
type GmailPart = { mimeType?: string; body?: { data?: string; attachmentId?: string }; parts?: GmailPart[]; headers?: { name: string; value: string }[] };
type GmailMsg = { internalDate?: string; payload?: GmailPart };

export async function sendAs(userId: string, m: { to: string; subject: string; body: string; fromName?: string | null; threadId?: string | null }) {
  const { acct, call } = await gmail(userId);
  const raw = toBase64Url(buildMime({ from: acct.email, fromName: m.fromName, to: m.to, subject: m.subject, body: m.body }));
  const res = await call("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", "POST", m.threadId ? { raw, threadId: m.threadId } : { raw });
  const json = res.json as { id?: string; threadId?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(`gmail send: ${json.error?.message ?? res.status}`);
  return { id: json.id!, threadId: json.threadId!, from: acct.email };
}
