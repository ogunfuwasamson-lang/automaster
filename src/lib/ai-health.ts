import "server-only";
import { admin } from "@/lib/supabase/admin";

// a circuit breaker for the AI provider. when the account is out of credit (or the key is rejected), every call
// fails the same way, and retrying just burns attempts and floods the logs: on the first such failure, pause all
// AI work for a while, tell the operator once, and let queued jobs wait instead of failing.

const KEY = "ai_paused_until";
const TRIPPED = "ai_tripped_at"; // when an account error last paused AI work
const PROBED = "ai_probe_ok_at"; // when a test call last worked
const PAUSE_MS = 15 * 60_000;
let cache: { until: number; checked: number } | null = null;

export class AiUnavailable extends Error {
  constructor(until: number) {
    super(`AI is paused until ${new Date(until).toISOString()}: the provider account needs attention (credit or key)`);
    this.name = "AiUnavailable";
  }
}

// the AI can't be used right now (no credit, bad key, paused): work should wait, not treat it as "no answer"
export function isOutage(e: unknown): boolean {
  return (e as { name?: string })?.name === "AiUnavailable" || /AI is paused until/i.test(String((e as { message?: string })?.message ?? e)) || isAccountError(e);
}

// is this provider error one that every other call will hit too?
export function isAccountError(e: unknown) {
  const s = String((e as { message?: string })?.message ?? e);
  const status = (e as { status?: number })?.status;
  return /credit balance is too low|insufficient[_ ]credit|billing|invalid x-api-key|authentication_error|permission_error/i.test(s) || status === 401 || status === 403;
}

export async function aiPausedUntil(): Promise<number> {
  const now = Date.now();
  if (cache && now - cache.checked < 60_000) return cache.until;
  const { data } = await admin().from("billing_settings").select("value").eq("key", KEY).maybeSingle();
  const until = data?.value ? Date.parse(data.value) || 0 : 0;
  cache = { until, checked: now };
  return until;
}

// synchronous check for loops that can't await: true once a call in this process has tripped the breaker
export function aiPausedNow() {
  return !!cache && cache.until > Date.now();
}

export async function assertAiAvailable() {
  const until = await aiPausedUntil();
  if (until > Date.now()) throw new AiUnavailable(until);
}

// record the failure: pause, and tell the operator once per pause
export async function tripAi(e: unknown) {
  if (!isAccountError(e)) return;
  const until = Date.now() + PAUSE_MS;
  const before = await aiPausedUntil().catch(() => 0);
  cache = { until, checked: Date.now() };
  const db = admin();
  await db.from("billing_settings").upsert([
    { key: KEY, value: new Date(until).toISOString() },
    { key: TRIPPED, value: new Date().toISOString() },
  ]);
  if (before > Date.now() - PAUSE_MS) return; // already paused recently: don't notify again
  // how much the last top-up lasted, for the "running low" warning next time
  await import("@/lib/credit").then((m) => m.recordCreditCycle()).catch(() => {});
  // the operator only: an email and the admin console's health card. never a card in anyone's app (the admin
  // account is also an applicant's account, and it showed there, once an hour, with the provider's raw error)
  const raw = String((e as { message?: string })?.message ?? e);
  const credit = /credit balance is too low|insufficient.?credit|billing/i.test(raw);
  const { alert } = await import("@/lib/alerts");
  await alert("ai-paused", credit ? "AI credit has run out: every agent is paused" : "AI calls are paused: the provider account needs attention", {
    what_happened: credit ? "The Anthropic API refused a call because the credit balance is too low." : `The Anthropic API refused a call: ${raw.replace(/\s+/g, " ").slice(0, 200)}`,
    what_users_see: "Nothing alarming: queued work waits, and the app says agents are briefly paused on our side.",
    fix: credit ? "Top up in the Anthropic Console (Plans & Billing), or turn on auto-reload so it never reaches zero." : "Check the API key in the hosting settings.",
    resumes: "Automatically within 15 minutes of the fix.",
  }).catch(() => {});
}

// after an account error, the pause running out doesn't mean the credit came back. before any work starts (and
// before a browser opens a portal it then can't finish), one tiny call checks: a fraction of a cent, once per
// pause. without it, every expired pause restarted portal runs that filled forms and then failed (manchester: 60
// starts in a day, its sign-up sent again and again)
let probedOk = 0;
export async function ensureAiWorks(): Promise<void> {
  await assertAiAvailable();
  const db = admin();
  const { data } = await db.from("billing_settings").select("key, value").in("key", [TRIPPED, PROBED]);
  const at = (k: string) => Date.parse(data?.find((r) => r.key === k)?.value ?? "") || 0;
  const tripped = at(TRIPPED);
  if (!tripped || Math.max(at(PROBED), probedOk) > tripped) return;
  try {
    const { llm } = await import("@/lib/llm");
    await llm().messages.create({ model: process.env.AGENT_MODEL_CHEAP ?? "claude-haiku-5-5", max_tokens: 1, messages: [{ role: "user", content: "ok" }] });
  } catch (e) {
    if (isAccountError(e)) {
      await tripAi(e);
      throw new AiUnavailable(Date.now() + PAUSE_MS);
    }
    return; // overloaded, a network blip: not an account problem, let the work try
  }
  probedOk = Date.now();
  await db.from("billing_settings").upsert({ key: PROBED, value: new Date().toISOString() });
}
