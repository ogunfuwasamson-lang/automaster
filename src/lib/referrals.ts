import "server-only";
import { randomBytes } from "node:crypto";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { notify } from "@/lib/notify";
import { SITE } from "@/lib/site";

// invite links: a friend who signs up through yours gets one free submission straight away, and you get one when
// their first application is submitted (so fake signups earn nothing). capped so it can't be farmed.
export const REFERRAL_CAP = 25;
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

export async function referralStats(userId: string) {
  const db = admin();
  const [{ data: me }, { count: joined }, { count: submitted }] = await Promise.all([
    db.from("profiles").select("bonus_submissions").eq("id", userId).maybeSingle(),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", userId),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", userId).not("referral_rewarded_at", "is", null),
  ]);
  return { bonus: me?.bonus_submissions ?? 0, joined: joined ?? 0, submitted: submitted ?? 0 };
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
      patch.bonus_submissions = 1;
      await logEvent({ userId, actor: "system", action: "referral.joined", context: { inviter: inviter.id } }).catch(() => {});
    }
  }
  await db.from("profiles").update(patch).eq("id", userId);
}

// their first submitted application earns the inviter a free submission
export async function rewardInviter(userId: string) {
  const db = admin();
  const { data: me } = await db.from("profiles").select("referred_by, referral_rewarded_at").eq("id", userId).maybeSingle();
  if (!me?.referred_by || me.referral_rewarded_at) return;
  const { data: claimed } = await db.from("profiles").update({ referral_rewarded_at: new Date().toISOString() }).eq("id", userId).is("referral_rewarded_at", null).select("id");
  if (!claimed?.length) return;
  const { data: inviter } = await db.from("profiles").select("bonus_submissions, referral_cap").eq("id", me.referred_by).maybeSingle();
  const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", me.referred_by).not("referral_rewarded_at", "is", null);
  if ((count ?? 0) > (inviter?.referral_cap ?? REFERRAL_CAP)) return;
  await db.from("profiles").update({ bonus_submissions: (inviter?.bonus_submissions ?? 0) + 1 }).eq("id", me.referred_by);
  await notify({ userId: me.referred_by, key: `referral:${userId}`, kind: "info", title: "Your invite earned you a free submission", body: "Someone you invited just submitted their first application with Ivyward. Your next submission is on us.", href: "/settings#invite", actionLabel: "Invite more" }).catch(() => {});
}
