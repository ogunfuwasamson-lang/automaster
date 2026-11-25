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
  return `starting an application uses ${CREDITS.application} credits and you have ${left}. Buy a pack, or invite a friend: when they finish setup you both get ${CREDITS.invite}. tryivyward.com/credits`;
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
    href: "/credits",
    actionLabel: "Get credits",
  }).catch(() => {});
}

// ---- the credits page: every credit in and out, newest first ----

export type HistoryItem = {
  at: string;
  dir: "in" | "out";
  amount: number;
  title: string;
  detail: string | null;
  // added: credits in (expires/expired say when they run out); held: set aside for an application in progress;
  // spent; returned: set aside, then given back when the application was dropped
  status: "added" | "held" | "spent" | "returned";
  expires?: string | null;
  left?: number;
  href?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Prog = { name: string; schools: { name: string } | null } | null;
const school = (p: Prog) => (p?.schools?.name ?? "").split(",")[0] || null;

export function grantTitle(source: string, reference: string | null): string {
  if (source === "pack") return "Bought a pack";
  if (source === "pro") return "Pro: this month's credits";
  if (source === "invite") return reference?.endsWith(":joined") ? "You joined through a friend's invite" : "A friend you invited finished setup";
  if (source === "group") return "Study group bonus";
  if (source === "converted") return "Carried over from your earlier pack";
  if (source === "grant") return reference?.startsWith("signup:") ? "Welcome credits" : "From the Ivyward team";
  return "Credits added";
}

export async function creditHistory(userId: string, limit = 150): Promise<HistoryItem[]> {
  const db = admin();
  const [{ data: grants }, { data: uses }] = await Promise.all([
    db.from("credit_grants").select("source, amount, remaining, expires_at, reference, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit),
    db.from("credit_uses").select("kind, ref, amount, status, created_at, settled_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit * 2),
  ]);
  const ids = (k: string) => [...new Set((uses ?? []).filter((u) => u.kind === k && UUID.test(u.ref as string)).map((u) => u.ref as string))];
  const [appIds, jobIds, msgIds] = [ids("application"), ids("check"), ids("request")];
  const [{ data: apps }, { data: jobs }, { data: msgs }] = await Promise.all([
    appIds.length ? db.from("applications").select("id, programs(name, schools(name))").in("id", appIds) : Promise.resolve({ data: [] }),
    jobIds.length ? db.from("jobs").select("id, task, payload").in("id", jobIds) : Promise.resolve({ data: [] }),
    msgIds.length ? db.from("messages").select("id, subject, purpose, threads(application_id, applications(programs(name, schools(name))))").in("id", msgIds) : Promise.resolve({ data: [] }),
  ]);
  const app = new Map((apps ?? []).map((a) => [a.id as string, a.programs as unknown as Prog]));
  const job = new Map((jobs ?? []).map((j) => [j.id as string, (j.payload ?? {}) as { school?: string; program?: string }]));
  const msg = new Map(
    (msgs ?? []).map((m) => {
      const t = m.threads as unknown as { application_id: string | null; applications: { programs: Prog } | null } | null;
      return [m.id as string, { subject: m.subject as string | null, purpose: m.purpose as string | null, appId: t?.application_id ?? null, prog: t?.applications?.programs ?? null }];
    }),
  );

  const out: HistoryItem[] = [];
  for (const g of grants ?? []) {
    out.push({ at: g.created_at as string, dir: "in", amount: Number(g.amount), title: grantTitle(g.source as string, g.reference as string | null), detail: null, status: "added", expires: (g.expires_at as string | null) ?? null, left: Number(g.remaining) });
  }
  const REQUEST: Record<string, string> = { fee_waiver: "Fee waiver request", aid_reconsideration: "Aid reconsideration request", assistantship_inquiry: "Assistantship enquiry", scholarship_inquiry: "Scholarship enquiry" };
  for (const u of uses ?? []) {
    const status = u.status === "held" ? "held" : u.status === "released" ? "returned" : "spent";
    const at = (status === "spent" && u.kind === "application" ? (u.settled_at ?? u.created_at) : u.created_at) as string;
    const n = Number(u.amount);
    if (u.kind === "application") {
      const p = app.get(u.ref as string) ?? null;
      // set aside and given back for an application that no longer exists: nothing changed, nothing to show
      if (!p && status === "returned") continue;
      out.push({ at, dir: "out", amount: n, title: p ? `Application: ${school(p) ?? p.name}` : "An application", detail: p?.name ?? null, status, href: UUID.test(u.ref as string) ? `/applications/${u.ref}` : undefined });
    } else if (u.kind === "check") {
      const p = job.get(u.ref as string);
      out.push({ at, dir: "out", amount: n, title: p?.school ? `Checked ${p.school.split(",")[0]}` : "Checked a programme", detail: p?.program ?? null, status });
    } else {
      const m = msg.get(u.ref as string);
      const where = m?.prog ? school(m.prog) : null;
      out.push({ at, dir: "out", amount: n, title: `${REQUEST[m?.purpose ?? ""] ?? "Funding request"}${where ? ` to ${where}` : ""}`, detail: m?.subject ?? null, status, href: m?.appId ? `/applications/${m.appId}` : `/messages?m=${u.ref}` });
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}
