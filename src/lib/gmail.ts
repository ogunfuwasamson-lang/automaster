import "server-only";
import { admin } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/crypto";
import { buildMime, toBase64Url } from "@/lib/mime";

// send-only gmail access. scope gmail.send lets us send as the applicant and nothing else:
// we can't read, search or delete their mail.
// unless GMAIL_READ=0 we also ask for read access, so agents can pick up portal verification codes and
// school emails. gmail.readonly is a restricted scope: fine for test users, needs google's security review to launch.
export const GMAIL_READ = process.env.GMAIL_READ !== "0";
export const GMAIL_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/gmail.send", ...(GMAIL_READ ? ["https://www.googleapis.com/auth/gmail.readonly"] : [])];

export function gmailConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.TOKEN_ENCRYPTION_KEY);
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
  if (!t.refresh_token) throw new Error("google didn't return offline access; remove automaster from your google account permissions and connect again");
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
  const { data } = await admin().from("mail_accounts").select("email, status, last_error, refresh_token_enc").eq("user_id", userId).maybeSingle();
  return data as { email: string; status: string; last_error: string | null; refresh_token_enc: string } | null;
}

export async function disconnect(userId: string) {
  const acct = await mailAccount(userId);
  if (acct) {
    // best effort: revoke at google too
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decrypt(acct.refresh_token_enc))}`, { method: "POST" }).catch(() => {});
  }
  await admin().from("mail_accounts").delete().eq("user_id", userId);
}

export class MailAuthError extends Error {}

async function accessToken(userId: string) {
  const acct = await mailAccount(userId);
  if (!acct || acct.status !== "active") throw new MailAuthError("gmail not connected");
  try {
    return { acct, access: (await tokenCall({ refresh_token: decrypt(acct.refresh_token_enc), grant_type: "refresh_token" })).access_token as string };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/invalid_grant/.test(msg)) {
      await admin().from("mail_accounts").update({ status: "revoked", last_error: "access was revoked; reconnect gmail" }).eq("user_id", userId);
      throw new MailAuthError("gmail access was revoked; reconnect it");
    }
    throw e;
  }
}

export async function canReadMail(userId: string): Promise<boolean> {
  const { data } = await admin().from("mail_accounts").select("scopes, status").eq("user_id", userId).maybeSingle();
  return data?.status === "active" && (data.scopes ?? "").includes("gmail.readonly");
}

// recent messages matching a gmail search, as plain text. used only to find portal verification codes/links.
// known: ids already handled, skipped before downloading (the inbox is checked every few minutes)
export async function recentMail(userId: string, q: string, max = 5, known?: (ids: string[]) => Promise<Set<string>>): Promise<{ id: string; threadId: string | null; from: string; subject: string; text: string; html: string; at: number }[]> {
  const { access } = await accessToken(userId);
  const h = { authorization: `Bearer ${access}` };
  const list = (await (await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&q=${encodeURIComponent(q)}`, { headers: h })).json()) as { messages?: { id: string; threadId?: string }[] };
  const out = [];
  const listed = list.messages ?? [];
  const skip = known && listed.length ? await known(listed.map((m) => m.id)) : new Set<string>();
  for (const m of listed) {
    if (skip.has(m.id)) continue;
    const msg = (await (await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`, { headers: h })).json()) as GmailMsg;
    const header = (n: string) => msg.payload?.headers?.find((x) => x.name.toLowerCase() === n)?.value ?? "";
    const parts: { mimeType?: string; body?: { data?: string } }[] = [];
    const walk = (p?: GmailPart) => {
      if (!p) return;
      parts.push(p);
      p.parts?.forEach(walk);
    };
    walk(msg.payload);
    const dec = (t: string) => parts.filter((p) => p.mimeType === t && p.body?.data).map((p) => Buffer.from(p.body!.data!, "base64url").toString("utf8")).join("\n");
    out.push({ id: m.id, threadId: m.threadId ?? null, from: header("from"), subject: header("subject"), text: dec("text/plain"), html: dec("text/html"), at: Number(msg.internalDate ?? 0) });
  }
  return out;
}
type GmailPart = { mimeType?: string; body?: { data?: string }; parts?: GmailPart[]; headers?: { name: string; value: string }[] };
type GmailMsg = { internalDate?: string; payload?: GmailPart };

export async function sendAs(userId: string, m: { to: string; subject: string; body: string; fromName?: string | null; threadId?: string | null }) {
  const { acct, access } = await accessToken(userId);
  const raw = toBase64Url(buildMime({ from: acct.email, fromName: m.fromName, to: m.to, subject: m.subject, body: m.body }));
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { authorization: `Bearer ${access}`, "content-type": "application/json" },
    body: JSON.stringify(m.threadId ? { raw, threadId: m.threadId } : { raw }),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; threadId?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(`gmail send: ${json.error?.message ?? res.status}`);
  return { id: json.id!, threadId: json.threadId!, from: acct.email };
}
