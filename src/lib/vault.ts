import "server-only";
import { randomInt } from "node:crypto";
import { admin } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/crypto";
import { hostRoot } from "@/lib/verify-mail";

// portal logins the agents create for the applicant. their email, a generated password, encrypted at rest.

const SETS = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%*?-_"];

// 16 chars, at least one of each class: passes the usual portal rules; no look-alike characters
export function generatePassword(length = 16): string {
  const all = SETS.join("");
  const chars = SETS.map((s) => s[randomInt(s.length)]);
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export interface PortalLogin {
  id: string;
  login_email: string;
  password: string;
  status: string;
}

// the login for a portal. portals often move sign-in to another subdomain (apply.x.edu -> login.x.edu) or an
// identity host, so after the exact host we try this application's own login, then any login on the same site.
export async function getLogin(userId: string, host: string, applicationId?: string): Promise<PortalLogin | null> {
  const { data } = await admin().from("portal_accounts").select("id, application_id, portal_host, login_email, password_enc, status, created_at").eq("user_id", userId);
  const rows = data ?? [];
  const pick =
    rows.find((r) => r.portal_host === host) ??
    (applicationId ? rows.filter((r) => r.application_id === applicationId).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] : undefined) ??
    rows.find((r) => hostRoot(r.portal_host) === hostRoot(host));
  return pick ? { id: pick.id, login_email: pick.login_email, password: decrypt(pick.password_enc), status: pick.status } : null;
}

export async function createLogin(userId: string, applicationId: string, host: string, email: string): Promise<PortalLogin> {
  const existing = await getLogin(userId, host, applicationId);
  if (existing) return existing;
  const password = generatePassword();
  const { data, error } = await admin()
    .from("portal_accounts")
    .insert({ user_id: userId, application_id: applicationId, portal_host: host, login_email: email, password_enc: encrypt(password) })
    .select("id")
    .single();
  if (error) throw new Error(`vault: ${error.message}`);
  return { id: data.id as string, login_email: email, password, status: "created" };
}

export async function markLogin(id: string, status: "verified" | "failed") {
  await admin().from("portal_accounts").update({ status }).eq("id", id);
}

// a login the portal itself issued (emailed to the applicant): replaces whatever we had for that site
export async function saveIssuedLogin(userId: string, applicationId: string, host: string, username: string, password: string): Promise<PortalLogin> {
  const { data, error } = await admin()
    .from("portal_accounts")
    .upsert({ user_id: userId, application_id: applicationId, portal_host: host, login_email: username, password_enc: encrypt(password), status: "created" }, { onConflict: "user_id,portal_host" })
    .select("id")
    .single();
  if (error) throw new Error(`vault: ${error.message}`);
  return { id: data.id as string, login_email: username, password, status: "created" };
}
