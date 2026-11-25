import "server-only";
import { randomBytes } from "node:crypto";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { notify } from "@/lib/notify";
import { SITE } from "@/lib/site";
import { CREDITS } from "@/lib/credit-prices";
import { grant } from "@/lib/wallet";

// invite links (rules approved by the founder, 21 nov 2026; the credit wallet, 24 nov 2026):
//   - when a friend who signed up through your link finishes setup, you both get CREDITS.invite credits, enough for
//     one application, and they don't expire. credits switch the agents on (lib/credit-rules)
//   - GROUP_SIZE - 1 (4) friends who finish setup make a study group of 5: you and each of them get CREDITS.group
//     more (a funding request each)
// rewards wait for setup, not signup, so an empty account earns nothing; capped so it can't be farmed.
export const REFERRAL_CAP = 25;
export const GROUP_SIZE = 5;
export const GROUP_REQUESTS = CREDITS.group;
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function newCode() {
  const b = randomBytes(7);
  return [...b].map((x) => ALPHABET[x % ALPHABET.length]).join("");
}

export async function referralCode(userId: string): Promise<string | null> {
  const db = admin();
  const { data } = await db.from("profiles").select("referral_code").eq("id", userId).maybeSingle();
  if (data?.referral_code) return data.referral_code;
  for (let i = 0; i < 4; i++) {
    const code = newCode();
    const { error } = await db.from("profiles").update({ referral_code: code }).eq("id", userId).is("referral_code", null);
    if (!error) {
      const { data: again } = await db.from("profiles").select("referral_code").eq("id", userId).maybeSingle();
      return again?.referral_code ?? code;
    }
  }
  return null;
}

export const inviteUrl = (code: string) => `${SITE.url}/?ref=${code}`;

// bonus: credits earned through invites and study groups (lib/wallet); requests: free funding requests from a study
// group before the wallet, if unused
export async function referralStats(userId: string) {
  const db = admin();
  const [{ data: earned }, { count: joined }, { count: finished }, { data: req }] = await Promise.all([
    db.from("credit_grants").select("amount").eq("user_id", userId).in("source", ["invite", "group"]),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", userId),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", userId).not("referral_rewarded_at", "is", null),
    db.from("profiles").select("bonus_requests").eq("id", userId).maybeSingle(),
  ]);
  const bonus = (earned ?? []).reduce((a, g) => a + Number(g.amount || 0), 0);
  return { bonus, joined: joined ?? 0, finished: finished ?? 0, requests: Number((req as { bonus_requests?: number } | null)?.bonus_requests ?? 0) };
}

type Source = { ref?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string; landing?: string; referrer?: string; at?: string };

// first sign-in: remember where they came from, and link them to whoever invited them
export async function recordSignup(userId: string, createdAt: string | undefined, ref: string | undefined, src: Source | null) {
  const db = admin();
  const { data: me } = await db.from("profiles").select("signup_source, referred_by").eq("id", userId).maybeSingle();
  if (!me || me.signup_source) return; // already recorded (not a first sign-in)
  const fresh = createdAt ? Date.now() - new Date(createdAt).getTime() < 3 * 86400_000 : false;
  const patch: Record<string, unknown> = { signup_source: { ...(src ?? {}), ...(ref ? { ref } : {}) } };
  if (fresh && ref && !me.referred_by) {
    const { data: inviter } = await db.from("profiles").select("id").eq("referral_code", ref.toLowerCase()).maybeSingle();
    if (inviter && inviter.id !== userId) {
      patch.referred_by = inviter.id;
      await logEvent({ userId, actor: "system", action: "referral.joined", context: { inviter: inviter.id } }).catch(() => {});
    }
  }
  await db.from("profiles").update(patch).eq("id", userId);
  // every new account starts with a few credits of its own (founder's call, 25 nov 2026). once per account: the
  // reference is unique
  if (fresh) await welcomeCredits(userId).catch(() => {});
}

export async function welcomeCredits(userId: string) {
  const bal = await grant(userId, CREDITS.welcome, "grant", null, `signup:${userId}`);
  if (bal < 0) return;
  await notify({
    userId,
    key: "credits:welcome",
    kind: "info",
    title: `Welcome: ${CREDITS.welcome} free credits are yours`,
    body: `Use them to have the agents check ${CREDITS.welcome} programmes or scholarships against your record, or put them towards your first application, which uses ${CREDITS.application}. Invite a friend and you both get ${CREDITS.invite} more when they finish setup.`,
    href: "/credits",
    actionLabel: "See your credits",
  }).catch(() => {});
}

// a friend who joined through an invite link finished setup: they and their inviter each get a free application
// (a submission credit, which starts the agents), and the fourth such friend makes a study group of five. once per
// friend (referral_rewarded_at is claimed atomically). called from setup (lib/kickoff), which then starts the friend's
// fit checks itself.
export async function rewardOnIntake(userId: string) {
  const db = admin();
  const { data: me } = await db.from("profiles").select("referred_by, referral_rewarded_at").eq("id", userId).maybeSingle();
  if (!me?.referred_by || me.referral_rewarded_at) return;
  const { data: claimed } = await db.from("profiles").update({ referral_rewarded_at: new Date().toISOString() }).eq("id", userId).is("referral_rewarded_at", null).select("id");
  if (!claimed?.length) return;
  const inviterId = me.referred_by as string;
  await grant(userId, CREDITS.invite, "invite", null, `${userId}:joined`);
  await notify({ userId, key: "referral:joined", kind: "info", title: `You've got ${CREDITS.invite} free credits`, body: `You joined through a friend's invite and finished setup, so you both get ${CREDITS.invite} credits: enough for one application, prepared and submitted. The agents are checking your fit for each programme on your shortlist.`, href: "/shortlist", actionLabel: "Open shortlist" }).catch(() => {});
  const { data: inviter } = await db.from("profiles").select("referral_cap, group_rewarded_at").eq("id", inviterId).maybeSingle();
  const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", inviterId).not("referral_rewarded_at", "is", null);
  const done = count ?? 0;
  await logEvent({ userId: inviterId, actor: "system", action: "referral.intake_done", context: { friend: userId, done } }).catch(() => {});
  if (done > (inviter?.referral_cap ?? REFERRAL_CAP)) return;
  await grant(inviterId, CREDITS.invite, "invite", null, `${userId}:inviter`);
  await notify({
    userId: inviterId,
    key: `referral:${userId}`,
    kind: "info",
    title: `A friend finished setup: you've got ${CREDITS.invite} free credits`,
    body: `Someone you invited finished setup on Ivyward, so you both get ${CREDITS.invite} credits: enough for one application, prepared and submitted. Invite more friends for more.`,
    href: "/unlock",
    actionLabel: "Invite more",
  }).catch(() => {});
  const { unlockAgents } = await import("@/lib/free-tier");
  await unlockAgents(inviterId, "earned").catch(() => false);
  if (done >= GROUP_SIZE - 1 && !inviter?.group_rewarded_at) await rewardGroup(inviterId).catch(() => {});
}

// a study group of five: the inviter and the first four friends who finished setup each get GROUP_REQUESTS more
// credits. once per inviter.
async function rewardGroup(inviterId: string) {
  const db = admin();
  const { data: claimed, error } = await db.from("profiles").update({ group_rewarded_at: new Date().toISOString() }).eq("id", inviterId).is("group_rewarded_at", null).select("id");
  if (error || !claimed?.length) return;
  const { data: friends } = await db.from("profiles").select("id").eq("referred_by", inviterId).not("referral_rewarded_at", "is", null).order("referral_rewarded_at", { ascending: true }).limit(GROUP_SIZE - 1);
  for (const id of [inviterId, ...(friends ?? []).map((f) => f.id as string)]) {
    await grant(id, GROUP_REQUESTS, "group", null, `${inviterId}:${id}`).catch(() => -1);
    await notify({ userId: id, key: `group:${inviterId}`, kind: "info", title: `Study group of ${GROUP_SIZE}: ${GROUP_REQUESTS} more credits`, body: `${GROUP_SIZE} of you joined Ivyward together, so you each get ${GROUP_REQUESTS} more credits: enough for ${GROUP_REQUESTS} funding requests, the fee waiver, scholarship and assistantship emails the agents send for you.`, href: "/shortlist", actionLabel: "Open shortlist" }).catch(() => {});
  }
  await logEvent({ userId: inviterId, actor: "system", action: "referral.group_rewarded", context: { members: 1 + (friends?.length ?? 0) } }).catch(() => {});
}
