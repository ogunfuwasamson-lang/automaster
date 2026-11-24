import "server-only";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { notify } from "@/lib/notify";
import { CREDITS } from "@/lib/credit-prices";

// the credit wallet (lib/credit-prices has the price list; supabase/migrations/0034 the ledger). every charge is
// tied to one thing (an application, a check's job, a message), so a retry or a second runner can't charge twice.
// everyone pays, admin and team accounts included (founder's call, 24 nov 2026); staff top up from the console.

export type Kind = "application" | "check" | "request";
export type Source = "pack" | "pro" | "invite" | "group" | "grant" | "submission";
export type UseResult = "ok" | "already" | "none";

export async function balance(userId: string): Promise<number> {
  const { data, error } = await admin().rpc("credit_balance", { uid: userId });
  return error ? 0 : Number(data ?? 0);
}

// what the applicant sees: credits to use now, credits set aside for applications in progress, and the next batch
// that expires
export async function walletState(userId: string): Promise<{ balance: number; held: number; expiring: { credits: number; at: string } | null }> {
  const db = admin();
  const now = new Date().toISOString();
  const [bal, { data: held }, { data: soon }] = await Promise.all([
    balance(userId),
    db.from("credit_uses").select("amount").eq("user_id", userId).eq("status", "held"),
    db.from("credit_grants").select("remaining, expires_at").eq("user_id", userId).gt("remaining", 0).gt("expires_at", now).order("expires_at", { ascending: true }).limit(1),
  ]);
  const first = (soon ?? [])[0];
  return {
    balance: bal,
    held: (held ?? []).reduce((a, r) => a + Number(r.amount || 0), 0),
    expiring: first ? { credits: Number(first.remaining), at: first.expires_at as string } : null,
  };
}

// add credits once per reference. returns the new balance, or -1 if this reference was already granted. anything
// that was waiting for credits goes now.
export async function grant(userId: string, n: number, source: Source, expiresAt: Date | null, reference: string): Promise<number> {
  const { data, error } = await admin().rpc("grant_wallet", { uid: userId, n, src: source, expires: expiresAt?.toISOString() ?? null, ref: reference });
  if (error) throw new Error(`grant failed: ${error.message}`);
  const bal = Number(data);
  if (bal >= 0) {
    await logEvent({ userId, actor: "system", action: "credits.granted", context: { n, source, expires: expiresAt?.toISOString() ?? null, balance: bal } }).catch(() => {});
    const { releaseHeld } = await import("@/lib/credit");
    await releaseHeld(userId).catch(() => {});
  }
  return bal;
}

async function spend(userId: string, kind: Kind, ref: string, n: number, hold: boolean): Promise<UseResult> {
  const { data, error } = await admin().rpc("use_credits", { uid: userId, k: kind, r: ref, n, hold });
  if (error) {
    await logEvent({ userId, actor: "system", action: "credits.error", context: { kind, ref, error: error.message } }).catch(() => {});
    return "none";
  }
  const res = (data as UseResult) ?? "none";
  if (res === "ok") {
    const { forgetTier } = await import("@/lib/credit");
    forgetTier(userId);
  }
  return res;
}

// the agents are starting an application: set its credits aside. null = go ahead; otherwise what to tell the
// applicant
export async function holdApplication(userId: string, applicationId: string): Promise<string | null> {
  const r = await spend(userId, "application", applicationId, CREDITS.application, true);
  if (r !== "none") return null;
  const left = await balance(userId);
  return `starting an application uses ${CREDITS.application} credits and you have ${left}. Buy a pack, or invite a friend: when they finish setup you both get ${CREDITS.invite}. tryivyward.com/unlock`;
}

// the application went in: spend what was set aside, or charge it now if nothing was
export async function settleApplication(userId: string, applicationId: string): Promise<UseResult> {
  const { data, error } = await admin().rpc("settle_credits", { uid: userId, k: "application", r: applicationId });
  if (error) return "none";
  if (data === "ok" || data === "already") return data as UseResult;
  return spend(userId, "application", applicationId, CREDITS.application, false);
}

// the applicant submitted it themselves: the credits set aside for it are spent (nothing new is charged)
export async function settleHold(userId: string, applicationId: string): Promise<void> {
  await admin().rpc("settle_credits", { uid: userId, k: "application", r: applicationId });
}

// dropped (or deleted) before it went in: what was set aside comes back
export async function releaseApplication(userId: string, applicationId: string): Promise<number> {
  const { data, error } = await admin().rpc("release_credits", { uid: userId, k: "application", r: applicationId });
  if (error) return 0;
  const back = Number(data ?? 0);
  if (back > 0) await logEvent({ userId, actor: "system", action: "credits.released", applicationId, context: { back } }).catch(() => {});
  return back;
}

export const chargeCheck = (userId: string, jobId: string) => spend(userId, "check", jobId, CREDITS.check, false);
export const chargeRequest = (userId: string, messageId: string) => spend(userId, "request", messageId, CREDITS.request, false);

// one heads-up when an account can't start another application
export async function lowCreditNotice(userId: string) {
  const left = await balance(userId);
  if (left >= CREDITS.application) return;
  await notify({
    userId,
    key: "credits:low",
    kind: "info",
    title: left ? `${left} credit${left === 1 ? "" : "s"} left` : "Your credits are used",
    body: `An application uses ${CREDITS.application} credits. Buy a pack, or invite a friend: when they finish setup you both get ${CREDITS.invite}.`,
    href: "/unlock",
    actionLabel: "Get credits",
  }).catch(() => {});
}
