import "server-only";
import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { admin } from "@/lib/supabase/admin";
import { SITE } from "@/lib/site";
import { logEvent } from "@/lib/events";
import { enqueue } from "@/lib/queue";
import { emailHtml } from "@/lib/email-layout";
import { sendSystem, systemMailReady } from "@/lib/mailer";
import { getProfile, updateProfile } from "@/lib/profile-store";
import { usStudyBlocked, usSuspensionNote } from "@/lib/us-visa-suspension";
import { guessKind } from "@/lib/doc-kinds";
import { downloadMedia, sendButtons, sendList, sendText } from "@/lib/whatsapp";
import { isStop, newCode } from "@/lib/whatsapp-rules";
import * as F from "@/lib/whatsapp-flow";

// starting on WhatsApp and everything after it (founder, 26 nov 2026: "build all"): sign-up with an email code, the
// setup questions, the shortlist in the chat, starting an application, files, the quick form questions, and the
// commands. lib/whatsapp-flow holds the conversation; this file runs it. Ivyward AI's own answers are a job
// (agents/whatsapp, lib/whatsapp-server) because the webhook has to answer Meta within seconds.

const db = () => admin();
const MAX_BYTES = 10 * 1024 * 1024; // what the agents read (agents/intake)

export type Media = { id: string; mime: string; filename: string | null; caption: string | null };
export type Msg = { id: string; from: string; type: string; text: string; reply: string | null; media: Media | null; name: string | null };

type State = F.Answers & { linked?: boolean; email?: string; code_hash?: string; code_at?: string; tries?: number; codes?: string[]; ref?: string | null; wa_name?: string | null; seen?: string[]; card?: string | null };
type Flow = { phone: string; user_id: string | null; step: F.Step; state: State; finished_at: string | null };

export async function getFlow(phone: string): Promise<Flow | null> {
  const { data } = await db().from("whatsapp_flows").select("phone, user_id, step, state, finished_at").eq("phone", phone).maybeSingle();
  return (data as Flow | null) ?? null;
}
async function saveFlow(phone: string, step: F.Step, state: State, userId?: string | null, finished?: boolean) {
  const now = new Date().toISOString();
  await db()
    .from("whatsapp_flows")
    .upsert({ phone, step, state, updated_at: now, ...(userId !== undefined ? { user_id: userId } : {}), ...(finished ? { finished_at: now } : {}) }, { onConflict: "phone" });
}
// Meta can deliver a message twice: the last few ids are kept so a step isn't answered twice
const remember = (seen: string[] | undefined, id: string) => [...(seen ?? []).slice(-9), id];
const seenBefore = (f: Flow | null, id: string) => !!f?.state.seen?.includes(id);

export async function send(to: string, out: F.Out, replyTo?: string): Promise<string> {
  if (out.kind === "buttons" && out.buttons.length) return sendButtons(to, out.body, out.buttons, replyTo);
  if (out.kind === "list" && out.rows.length) return sendList(to, out.body, out.button, out.rows, replyTo);
  return sendText(to, out.body, replyTo);
}
const withPrefix = (out: F.Out, prefix: string): F.Out => ({ ...out, body: `${prefix}\n\n${out.body}` });

// ---- signing up: a number we don't know yet ----

const hashOf = (phone: string, code: string) => createHash("sha256").update(`${phone}:${code}`).digest("hex");
const DAY = 86_400_000;

export async function signup(m: Msg): Promise<string> {
  const flow = await getFlow(m.from);
  if (seenBefore(flow, m.id)) return "duplicate";
  if (isStop(m.text)) {
    if (flow) await db().from("whatsapp_flows").delete().eq("phone", m.from);
    await sendText(m.from, "Done. I won't message you here. Say hi any time to start again.");
    return "stopped";
  }
  const state: State = { ...(flow?.state ?? {}), seen: remember(flow?.state.seen, m.id) };
  if (!flow) {
    state.ref = F.refIn(m.text);
    state.wa_name = m.name;
  }
  const email = F.emailIn(m.text);

  if (flow?.step === "code" && state.email) {
    if (m.reply === "code:resend") return sendCode(m.from, state.email, state);
    if (m.reply === "code:change") {
      await saveFlow(m.from, "email", { ...state, email: undefined, code_hash: undefined });
      await sendText(m.from, "Type the email you want for your Ivyward account.");
      return "change email";
    }
    const code = F.codeOf(m.text);
    if (code) return checkCode(m, state, code);
    if (email && email !== state.email) return sendCode(m.from, email, state);
    await saveFlow(m.from, "code", state);
    await send(m.from, { ...F.askedCode(state.email), body: `Type the 6-digit code from the email I sent to ${state.email}.` });
    return "waiting for code";
  }

  if (!flow) {
    await saveFlow(m.from, "email", state);
    await sendText(m.from, F.GREETING);
    if (!email) return "greeted";
  }
  if (!email) {
    await saveFlow(m.from, "email", state);
    await sendText(m.from, "That doesn't look like an email address. Type the one you want for your Ivyward account, like ada@gmail.com.");
    return "asked again";
  }
  return sendCode(m.from, email, state);
}

async function sendCode(phone: string, email: string, state: State): Promise<string> {
  const now = Date.now();
  const recent = (state.codes ?? []).filter((t) => now - Date.parse(t) < DAY);
  if (recent.length >= F.CODES_PER_DAY) {
    await saveFlow(phone, "code", state);
    await sendText(phone, `I've sent ${recent.length} codes today, which is the most I can. Try again tomorrow, or sign up on ${F.SITE_HOST}.`);
    return "code limit";
  }
  // one email can't be sent codes from many numbers
  const { count: others } = await db().from("whatsapp_flows").select("phone", { count: "exact", head: true }).eq("state->>email", email).neq("phone", phone).gte("updated_at", new Date(now - DAY).toISOString());
  if ((others ?? 0) >= 2) {
    await sendText(phone, `That email has had too many codes today. Sign up on ${F.SITE_HOST} instead, or try again tomorrow.`);
    return "email limit";
  }
  if (!systemMailReady()) {
    await sendText(phone, `I can't send email codes right now. Sign up on ${F.SITE_HOST} instead.`);
    return "no mail";
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  try {
    await sendSystem({
      to: email,
      subject: `${code} is your Ivyward code`,
      text: `Type this code in WhatsApp to confirm your email and finish setting up your Ivyward account: ${code}\n\nIt works for ${F.CODE_MINUTES} minutes. Didn't ask for it? Ignore this email: nothing happens without the code.`,
      html: emailHtml({
        preheader: `Type ${code} in WhatsApp to confirm your email.`,
        kicker: "Your code",
        headline: "Confirm your email",
        blocks: [
          { t: "p", text: "Type this code in your WhatsApp chat with Ivyward to finish setting up your account." },
          { t: "stats", items: [{ value: code, label: `Works for ${F.CODE_MINUTES} minutes` }] },
          { t: "p", text: "Didn't ask for it? Ignore this email: nothing happens without the code." },
        ],
      }),
      tag: "whatsapp-code",
    });
  } catch {
    await sendText(phone, `I couldn't send an email to ${email}. Check the address and type it again.`);
    await saveFlow(phone, "email", state);
    return "send failed";
  }
  await saveFlow(phone, "code", { ...state, email, code_hash: hashOf(phone, code), code_at: new Date(now).toISOString(), tries: 0, codes: [...recent, new Date(now).toISOString()] });
  await send(phone, F.askedCode(email));
  return "code sent";
}

async function checkCode(m: Msg, state: State, code: string): Promise<string> {
  const again: F.Button[] = [{ id: "code:resend", title: "Send it again" }];
  if (!state.code_hash || !state.code_at || Date.now() - Date.parse(state.code_at) > F.CODE_MINUTES * 60_000) {
    await saveFlow(m.from, "code", state);
    await send(m.from, { kind: "buttons", body: "That code has expired. Tap Send it again for a new one.", buttons: again });
    return "expired";
  }
  if ((state.tries ?? 0) >= F.CODE_TRIES) {
    await saveFlow(m.from, "code", state);
    await send(m.from, { kind: "buttons", body: "Too many wrong codes. Tap Send it again for a new one.", buttons: again });
    return "too many tries";
  }
  const want = Buffer.from(state.code_hash, "hex");
  const got = Buffer.from(hashOf(m.from, code), "hex");
  if (want.length !== got.length || !timingSafeEqual(want, got)) {
    await saveFlow(m.from, "code", { ...state, tries: (state.tries ?? 0) + 1 });
    await send(m.from, { kind: "buttons", body: "That code doesn't match. Check the email and type it again.", buttons: again });
    return "wrong code";
  }
  return linkAccount(m, state);
}

// the email is theirs: a new account, or the one they already have, now on this number
async function linkAccount(m: Msg, state: State): Promise<string> {
  const email = state.email!;
  const now = new Date().toISOString();
  const { data: existing } = await db().from("profiles").select("id").eq("email", email).limit(1).maybeSingle();
  let userId = existing?.id as string | undefined;
  const created = !userId;
  if (!userId) {
    const { data, error } = await db().auth.admin.createUser({ email, email_confirm: true, user_metadata: { signup: "whatsapp" } });
    if (error || !data.user) {
      console.error("whatsapp signup failed", error);
      await sendText(m.from, `I couldn't set up your account just now. Try again in a few minutes, or sign up on ${F.SITE_HOST}.`);
      return "create failed";
    }
    userId = data.user.id;
    // where they came from, the invite that brought them, and the welcome credits every new account gets
    const { recordSignup } = await import("@/lib/referrals");
    await recordSignup(userId, data.user.created_at, state.ref ?? undefined, { utm_source: "whatsapp", utm_medium: "chat", landing: "whatsapp", at: now }).catch(() => {});
    const home = F.countryFromPhone(m.from);
    if (home) await db().from("profiles").update({ timezone: home.zone }).eq("id", userId);
  }
  // one account per number: the number moves to this account
  await db().from("whatsapp_contacts").update({ phone: null, status: "pending", updated_at: now }).eq("phone", m.from).neq("user_id", userId);
  const { data: cur } = await db().from("whatsapp_contacts").select("user_id").eq("user_id", userId).maybeSingle();
  const live = { phone: m.from, status: "active", consented_at: now, linked_at: now, last_inbound_at: now, stopped_at: null, updated_at: now };
  if (cur) await db().from("whatsapp_contacts").update(live).eq("user_id", userId);
  else
    for (let i = 0; i < 5; i++) {
      const { error } = await db().from("whatsapp_contacts").insert({ user_id: userId, code: newCode(), ...live });
      if (!error) break;
    }
  await logEvent({ userId, actor: "user", action: created ? "whatsapp.signed_up" : "whatsapp.linked", channel: "whatsapp", context: { via: "whatsapp", created } }).catch(() => "");

  const have = await answersFor(userId);
  const next = F.nextStep(have);
  const clean: State = { ...have, email, seen: state.seen, wa_name: state.wa_name ?? null };
  if (next === "done") {
    await saveFlow(m.from, "done", clean, userId, true);
    await sendText(m.from, `Email confirmed: that's your Ivyward account, so it's now on this number.\n\n${F.HELP}`);
    return "linked existing";
  }
  await saveFlow(m.from, next, clean, userId);
  const ctx = await ctxFor(m.from, clean);
  const lead = created ? "Email confirmed: your free Ivyward account is ready. A few quick questions so your agents know what to look for." : "Email confirmed: that's your Ivyward account, so it's now on this number. A few questions to finish setting it up.";
  await send(m.from, withPrefix(F.question(next, ctx), lead));
  return created ? "signed up" : "linked, setting up";
}

// what an account already has, so a linked account skips those questions
async function answersFor(userId: string): Promise<F.Answers> {
  const [p, { data: row }, { count: docs }] = await Promise.all([
    getProfile(userId),
    db().from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    db().from("documents").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  return {
    name: p.identity.full_name ?? (row?.full_name as string | null) ?? undefined,
    level: p.goals.study_level ?? undefined,
    fields: p.goals.fields?.length ? p.goals.fields : undefined,
    passport: p.identity.citizenship ?? undefined,
    regions: p.preferences.regions?.length ? p.preferences.regions : undefined,
    funding: p.funding.need ?? undefined,
    term: p.goals.target_term ?? undefined,
    cv: (docs ?? 0) > 0 || undefined,
  };
}

async function ctxFor(phone: string, a: F.Answers): Promise<F.Ctx> {
  const us = usStudyBlocked(a.passport ?? null);
  return { first: F.firstOf(a.name), phone, answers: a, usBlocked: us ? usSuspensionNote(us) : null };
}

// ---- the setup questions ----

export async function onboardStep(userId: string, m: Msg, flow: Flow): Promise<string> {
  if (seenBefore(flow, m.id)) return "duplicate";
  const state: State = { ...flow.state, seen: remember(flow.state.seen, m.id) };
  const ctx = await ctxFor(m.from, state);
  const ask = () => send(m.from, F.question(flow.step, ctx));

  if (m.media && (m.type === "document" || m.type === "image")) {
    await saveFlow(m.from, flow.step, state);
    await enqueue({ userId, agent: "whatsapp", task: "media", payload: { media: m.media, kind: flow.step === "cv" ? "cv" : null, setup: flow.step === "cv" }, idempotencyKey: `wa-media:${m.id}` });
    if (flow.step === "cv") return "cv queued";
    await sendText(m.from, "Got it: your agents will read it.");
    await ask();
    return "file queued";
  }
  if (m.type === "audio") {
    await saveFlow(m.from, flow.step, state);
    await voiceNote(userId, m.from);
    await ask();
    return "voice";
  }
  if (!m.text && !m.reply) {
    await saveFlow(m.from, flow.step, state);
    await ask();
    return "asked again";
  }
  // a question in the middle of setup ("what is this?") isn't an answer: Ivyward AI takes questions once it's done.
  // only a question mark counts here: "Will" can be a name
  if (!m.reply && /\?\s*$/.test(m.text)) {
    await saveFlow(m.from, flow.step, state);
    const left = F.stepsLeft(flow.step);
    await sendText(m.from, `I'll answer anything once your account is set up: ${left} quick step${left === 1 ? "" : "s"} left.`);
    await ask();
    return "question during setup";
  }
  const p = F.parse(flow.step, { text: m.text, reply: m.reply }, ctx);
  if (!p.ok) {
    await saveFlow(m.from, flow.step, state);
    await sendText(m.from, p.again);
    return "asked again";
  }
  await applyAnswers(userId, p.set);
  const next = { ...state, ...p.set };
  await saveFlow(m.from, p.next, next);
  if (p.next === "done") {
    await enqueue({ userId, agent: "whatsapp", task: "finish", idempotencyKey: `wa-finish:${userId}` });
    await sendText(m.from, "Thanks. Your agents are matching you with programmes now: give me a minute.");
    return "finishing";
  }
  await send(m.from, F.question(p.next, await ctxFor(m.from, next)));
  return p.next;
}

// each answer goes into the profile as it comes, the same fields the web setup fills (api/profile/preferences)
async function applyAnswers(userId: string, set: F.Answers) {
  if (set.name) await db().from("profiles").update({ full_name: set.name }).eq("id", userId);
  if (!(set.name || set.level || set.fields || set.passport || set.regions || set.funding || set.term)) return;
  await updateProfile(userId, (p) => ({
    ...p,
    identity: { ...p.identity, ...(set.name ? { full_name: set.name } : {}), ...(set.passport ? { citizenship: set.passport } : {}) },
    goals: { ...p.goals, ...(set.level ? { study_level: set.level } : {}), ...(set.fields ? { fields: set.fields } : {}), ...(set.term ? { target_term: set.term } : {}) },
    preferences: set.regions ? { ...p.preferences, regions: set.regions } : p.preferences,
    funding: set.funding ? { ...p.funding, need: set.funding } : p.funding,
  }));
  await logEvent({ userId, actor: "user", action: "preferences.updated", channel: "whatsapp", context: { keys: Object.keys(set) } }).catch(() => "");
}

// setup is done (agents/whatsapp "finish"): the agents start, and the shortlist comes back in the chat
export async function finishSetup(userId: string): Promise<string> {
  const phone = await phoneOf(userId);
  if (!phone) return "no number";
  const { kickoff } = await import("@/lib/kickoff");
  const k = await kickoff(userId, "whatsapp").catch(() => null);
  await db().from("whatsapp_flows").update({ step: "done", finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("phone", phone);
  const shown = await sendShortlist(userId, phone);
  if (!shown) await sendText(phone, "Your agents are searching your regions now. The first programmes usually arrive within the hour, and I'll send them here.");
  await sendText(phone, "Ask me anything about your applications here, any time. Type *help* to see what else I can do.");
  await logEvent({ userId, actor: "system", action: "whatsapp.onboarded", channel: "whatsapp", context: { shortlist: shown, missing: k?.missing ?? null } }).catch(() => "");
  return shown ? `shortlist of ${shown}` : "searching";
}

// ---- after setup ----

// a question to Ivyward AI rather than an answer to the quick question: a question mark, or a question word leading
// a sentence ("Will Smith" is an answer; "is IELTS required for UCL" is a question)
const looksLikeQuestion = (t: string) => /\?\s*$/.test(t) || (/^(what|how|why|when|where|which|who|can|could|should|is|are|do|does|will|would)\b/i.test(t.trim()) && t.trim().split(/\s+/).length >= 4);

export async function chat(userId: string, m: Msg, flow: Flow | null): Promise<string> {
  const r = m.reply ?? "";
  if (m.media && (m.type === "document" || m.type === "image")) {
    await enqueue({ userId, agent: "whatsapp", task: "media", payload: { media: m.media, kind: null, setup: false }, idempotencyKey: `wa-media:${m.id}` });
    return "file queued";
  }
  if (m.type === "audio") return voiceNote(userId, m.from);
  if (m.type === "reaction") return "reaction";
  if (!m.text && !r) {
    await sendText(m.from, "I can read text, files and photos here. Type your question, or send a document.");
    return "unsupported";
  }
  if (r === "shortlist") return (await sendShortlist(userId, m.from)) ? "shortlist" : noShortlist(m.from);
  if (r.startsWith("app:")) return showApp(userId, m.from, r.slice(4));
  if (r.startsWith("start:")) return startApp(userId, m.from, r.slice(6));
  const card = F.cardReply(r);
  if (card) return answerCardTap(userId, m.from, card.id, card.option);
  if (r.startsWith("code:")) {
    await sendText(m.from, "You're already set up on this number.");
    return "already";
  }
  const text = r.startsWith("ans:") ? r.slice(4) : m.text;
  const cmd = r ? null : F.commandOf(text);
  if (cmd) {
    if (flow?.state.card) await setCard(m.from, userId, flow, null);
    return command(userId, m.from, cmd);
  }
  // they're answering the quick question we just sent (a typed date, a name, one of its options)
  if (flow?.state.card && !r && !looksLikeQuestion(text)) return answerCardTyped(userId, m.from, flow, text);
  if (flow?.state.card) await setCard(m.from, userId, flow, null);
  await enqueue({ userId, agent: "whatsapp", task: "reply", payload: { text: text.slice(0, 4000), messageId: m.id }, idempotencyKey: `wa-in:${m.id}` });
  return "queued";
}

async function command(userId: string, phone: string, cmd: F.Command): Promise<string> {
  switch (cmd) {
    case "help": {
      const first = F.firstOf((await answersFor(userId)).name);
      await sendText(phone, `Hi${first ? ` ${first}` : ""}. ${F.HELP}`);
      return "help";
    }
    case "shortlist":
      return (await sendShortlist(userId, phone)) ? "shortlist" : noShortlist(phone);
    case "link": {
      const link = await signInLink(userId);
      await sendText(phone, link ? `Your sign-in link (it works once, and only for a short while):\n${link}` : `Sign in on ${F.SITE_HOST} with your email.`);
      return "link";
    }
    case "questions":
      return sendCard(userId, phone);
    case "status": {
      const { loadToday } = await import("@/lib/today-data");
      const t = await loadToday(userId).catch(() => null);
      await sendText(phone, F.statusText(t?.input.apps ?? [], t?.task ? { title: t.task.title, href: t.task.href } : null, SITE.url.replace(/^https?:\/\//, "")));
      return "status";
    }
    case "visa": {
      const { loadToday } = await import("@/lib/today-data");
      const t = await loadToday(userId).catch(() => null);
      const stage = t?.map.stages.find((s) => s.id === "visa") ?? null;
      await sendText(phone, F.visaText(stage, !!t?.map.destination, SITE.url.replace(/^https?:\/\//, "")));
      return "visa";
    }
  }
}

async function voiceNote(userId: string, phone: string): Promise<string> {
  // counted: how many people try voice notes decides whether speech-to-text is worth paying for
  await logEvent({ userId, actor: "user", action: "whatsapp.voice_note", channel: "whatsapp" }).catch(() => "");
  await sendText(phone, "I can't listen to voice notes yet. Please type it, and I'll answer here.");
  return "voice";
}

async function noShortlist(phone: string): Promise<string> {
  await sendText(phone, "Nothing on your shortlist yet. Your agents are still searching; I'll send the programmes here as they're checked.");
  return "no shortlist";
}

// ---- the shortlist, one programme, starting it ----

type AppRow = { id: string; status: string; target_deadline: string | null; programs: { name: string; schools: { name: string } | null } | null };
const appOf = (a: AppRow): F.ShortApp => ({ id: a.id, school: a.programs?.schools?.name ?? "A school", program: a.programs?.name ?? "", deadline: a.target_deadline, status: a.status });

export async function sendShortlist(userId: string, phone: string): Promise<number> {
  const { data, count } = await db()
    .from("applications")
    .select("id, status, target_deadline, programs(name, schools(name))", { count: "exact" })
    .eq("user_id", userId)
    .in("status", ["shortlisted", "preparing"])
    .order("fit_score", { ascending: false, nullsFirst: false })
    .order("target_deadline", { ascending: true, nullsFirst: false })
    .limit(10);
  const apps = ((data ?? []) as unknown as AppRow[]).map(appOf);
  if (!apps.length) return 0;
  await send(phone, F.shortlistOut(apps, count ?? apps.length));
  await logEvent({ userId, actor: "agent:whatsapp", action: "whatsapp.shortlist_sent", channel: "whatsapp", context: { shown: apps.length } }).catch(() => "");
  return apps.length;
}

async function showApp(userId: string, phone: string, id: string): Promise<string> {
  const { data } = await db()
    .from("applications")
    .select("id, status, target_deadline, fit_reasoning, programs(name, degree, app_fee_usd, fee_waiver, tuition_usd, url, schools(name))")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) {
    await sendText(phone, "I can't find that programme any more. Type *shortlist* to see what's on it now.");
    return "gone";
  }
  const p = (data.programs ?? null) as unknown as { name: string; degree: string | null; app_fee_usd: number | null; fee_waiver: string | null; tuition_usd: number | null; url: string | null; schools: { name: string } | null } | null;
  await send(
    phone,
    F.appOut({
      id: data.id as string,
      status: data.status as string,
      school: p?.schools?.name ?? "A school",
      program: p?.name ?? "",
      deadline: data.target_deadline as string | null,
      degree: p?.degree ?? null,
      fee: p?.app_fee_usd ?? null,
      waiver: !!p?.fee_waiver && !/^(no|none|false)$/i.test(p.fee_waiver),
      tuition: p?.tuition_usd ?? null,
      why: (data.fit_reasoning as string | null) ?? null,
      url: p?.url ?? null,
    }),
  );
  return "app";
}

async function startApp(userId: string, phone: string, id: string): Promise<string> {
  const { startPreparing } = await import("@/lib/prepare");
  const out = await startPreparing(userId, id, "whatsapp");
  const { data } = await db().from("applications").select("programs(schools(name))").eq("id", id).maybeSingle();
  const school = ((data?.programs as { schools?: { name?: string } } | null)?.schools?.name ?? "this school").split(",")[0];
  if (out.ok) {
    await sendText(phone, `Started. Your agents are reading ${school}'s requirements and drafting your application. I'll message you here when they need you, and you sign it before anything is sent.`);
    return "started";
  }
  if (out.status === 409) await sendText(phone, `Your agents are already preparing ${school}.`);
  else if (out.status === 402) await sendText(phone, `${out.error} Open your dashboard to carry on: ${SITE.url}/credits`);
  else await sendText(phone, `I couldn't start ${school}: ${out.error}.`);
  return "not started";
}

// ---- the quick questions forms need (lib/cards), as taps ----

async function latestSession(userId: string): Promise<string> {
  const { data } = await db().from("interview_turns").select("session_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data?.session_id as string) ?? randomUUID();
}

// the quick question waiting for a typed answer. someone who linked from Settings has no setup row yet: theirs is
// marked so the sign-up counts leave it out (api/admin/whatsapp)
async function setCard(phone: string, userId: string, flow: Flow | null, card: string | null) {
  await saveFlow(phone, flow?.step ?? "done", { ...(flow?.state ?? { linked: true }), card }, userId);
}

type CardLike = { id: string | null; question: string; options: string[]; kind: "choice" | "search" | "yes_no" | "date" | "text"; school?: string | null; why?: string | null; topic?: string | null };
function cardOut(c: CardLike, lead?: string): F.Out {
  const head = [lead, c.topic ? `*${c.topic}*` : c.school ? `*${c.school}*` : null, c.question, c.why ? `_${c.why}_` : null].filter(Boolean).join("\n");
  const out = F.askOut(head, c, (_o, i) => F.cardId(c.id!, i), F.cardId(c.id!, "skip"));
  return out.kind === "text" ? { kind: "text", body: `${head}\n\nType your answer, or type *skip*.` } : out;
}

async function sendCard(userId: string, phone: string, lead?: string): Promise<string> {
  const { cardState } = await import("@/lib/cards");
  const s = await cardState(userId);
  const flow = await getFlow(phone);
  if (!s.card?.id) {
    await setCard(phone, userId, flow, null);
    await sendText(phone, `${lead ? `${lead}\n\n` : ""}No questions waiting: your forms have what they need for now.`);
    return "no cards";
  }
  await setCard(phone, userId, flow, s.card.id);
  await send(phone, cardOut(s.card, lead ?? `${s.left} quick question${s.left === 1 ? "" : "s"} for your forms. Here's the first:`));
  return "card";
}

async function answerCard(userId: string, phone: string, id: string, answer: string | null): Promise<string> {
  const { answerCard: save } = await import("@/lib/card-answer");
  const out = await save(userId, id, answer, { sessionId: await latestSession(userId), via: "whatsapp" });
  const flow = await getFlow(phone);
  if (!out.ok) {
    await setCard(phone, userId, flow, null);
    await sendText(phone, out.status === 409 ? "That one's already answered." : `I couldn't save that: ${out.error}.`);
    return sendCard(userId, phone);
  }
  if (out.next?.id) {
    await setCard(phone, userId, flow, out.next.id);
    await send(phone, cardOut(out.next, "Saved. Next:"));
    return "next card";
  }
  await setCard(phone, userId, flow, null);
  await sendText(phone, out.reply);
  return "cards done";
}

async function answerCardTap(userId: string, phone: string, id: string, option: number | "skip"): Promise<string> {
  const { cardState } = await import("@/lib/cards");
  const { toAsk } = await import("@/lib/ask");
  const { openQuestions } = await import("@/lib/portal-questions");
  // the options of the question it came from: the current card, or a school's question still waiting
  const s = await cardState(userId);
  let options = s.card?.id === id ? s.card.options : null;
  if (!options) {
    const q = (await openQuestions(userId)).find((x) => x.id === id);
    options = q ? toAsk(q).options : null;
  }
  if (!options && !id.startsWith("d:")) return sendCard(userId, phone, "That one's already answered.");
  const answer = option === "skip" ? null : (options?.[option] ?? null);
  if (option !== "skip" && !answer) return sendCard(userId, phone);
  return answerCard(userId, phone, id, answer);
}

async function answerCardTyped(userId: string, phone: string, flow: Flow, text: string): Promise<string> {
  const id = flow.state.card!;
  if (/^\s*skip\s*$/i.test(text)) return answerCard(userId, phone, id, null);
  const { cardState } = await import("@/lib/cards");
  const s = await cardState(userId);
  const card = s.card?.id === id ? s.card : null;
  if (card?.options.length && card.kind !== "search") {
    const n = Number(text.trim());
    const hit = card.options.find((o) => o.toLowerCase() === text.trim().toLowerCase()) ?? (Number.isInteger(n) && n >= 1 ? card.options[n - 1] : undefined);
    if (!hit) {
      await send(phone, cardOut(card, "Tap one of the answers below, or type *skip*."));
      return "asked again";
    }
    return answerCard(userId, phone, id, hit);
  }
  return answerCard(userId, phone, id, text.trim().slice(0, 2000));
}

// ---- files: a CV, a transcript, an admission letter ----

const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx", "text/plain": "txt" };
const safeName = (name: string) => name.replace(/[^\w.\-]+/g, "_").slice(-120) || "file";
const ADMISSION = /admission|offer|acceptance|admit|unconditional|conditional|\bcas\b|i-?20/i;

// a file they sent (agents/whatsapp "media"): saved to their documents and read by the agents, like an upload
export async function saveMedia(userId: string, p: { media: Media; kind: string | null; setup: boolean }): Promise<string> {
  const phone = await phoneOf(userId);
  if (!phone) return "no number";
  const mime = p.media.mime.split(";")[0].trim().toLowerCase();
  const ext = EXT[mime];
  if (!ext) {
    await sendText(phone, "I can't read that kind of file. Send it as a PDF, a Word file (.docx) or a photo.");
    return "unsupported";
  }
  const { checkLimit } = await import("@/lib/limits");
  const blocked = await checkLimit(userId, "document");
  if (blocked) {
    await sendText(phone, blocked);
    return "limit";
  }
  let file: { bytes: Buffer; mime: string };
  try {
    file = await downloadMedia(p.media.id, MAX_BYTES);
  } catch (e) {
    await sendText(phone, String(e).includes("too big") ? "That file is over 10 MB. Send a smaller copy, or a PDF." : "I couldn't open that file. Try sending it again.");
    return "download failed";
  }
  const { count: docs } = await db().from("documents").select("id", { count: "exact", head: true }).eq("user_id", userId);
  const filename = safeName(p.media.filename ?? `whatsapp-${new Date().toISOString().slice(0, 10)}.${ext}`);
  const hint = `${p.media.caption ?? ""} ${p.media.filename ?? ""}`;
  const kind = p.kind ?? (ADMISSION.test(hint) ? "admission_letter" : guessKind(hint.trim() || filename, docs ?? 0));
  const id = randomUUID();
  const path = `${userId}/${id}/${filename}`;
  const { error } = await db().storage.from("documents").upload(path, file.bytes, { contentType: mime });
  if (error) {
    await sendText(phone, "I couldn't save that file. Try sending it again.");
    return "upload failed";
  }
  const { registerDocument } = await import("@/lib/document-register");
  const saved = await registerDocument(userId, { id, kind, filename, storagePath: path, mime }, "whatsapp");
  if (!saved.ok) {
    await sendText(phone, "I couldn't save that file. Try sending it again.");
    return "register failed";
  }
  if (p.setup) {
    // the CV was the last step: setup finishes once, even if they sent two files at once
    const flow = await getFlow(phone);
    const { data: won } = await db().from("whatsapp_flows").update({ step: "done", state: { ...(flow?.state ?? {}), cv: true }, updated_at: new Date().toISOString() }).eq("phone", phone).eq("step", "cv").select("phone");
    if (won?.length) {
      await sendText(phone, "Got your CV. Your agents are reading it now.");
      return finishSetup(userId);
    }
  }
  await sendText(
    phone,
    kind === "admission_letter"
      ? "Got your letter. Your agents are reading it to confirm the offer; I'll tell you here what they find."
      : kind === "cv"
        ? "Got your CV. Your agents are reading it and adding what's in it to your profile."
        : "Got it. Your agents are reading it and adding what's in it to your profile.",
  );
  return kind;
}

// ---- links, numbers, and messages from the agents ----

async function phoneOf(userId: string): Promise<string | null> {
  const { data } = await db().from("whatsapp_contacts").select("phone, status").eq("user_id", userId).maybeSingle();
  return data?.status === "active" && data.phone ? (data.phone as string) : null;
}

// a one-time sign-in link to their dashboard, sent only to the number linked to the account
export async function signInLink(userId: string, next = "/dashboard"): Promise<string | null> {
  const { data: u } = await db().auth.admin.getUserById(userId);
  const email = u.user?.email;
  if (!email) return null;
  const { data, error } = await db().auth.admin.generateLink({ type: "magiclink", email });
  const hash = data?.properties?.hashed_token;
  if (error || !hash) return null;
  return `${SITE.url}/auth/confirm?token_hash=${encodeURIComponent(hash)}&type=magiclink&next=${encodeURIComponent(next)}`;
}

// while they've written to us in the last 24 hours, what the agents tell them in the app also arrives here: Ivyward
// AI's messages (lib/followups say) and the notices important enough to email (lib/notify). outside those hours
// only the approved templates can be sent (lib/whatsapp-server sweep).
export async function mirror(userId: string, m: { text: string; key?: string }): Promise<boolean> {
  const { data: c } = await db().from("whatsapp_contacts").select("phone, status, last_inbound_at").eq("user_id", userId).maybeSingle();
  if (!c?.phone || c.status !== "active" || !c.last_inbound_at || Date.now() - Date.parse(c.last_inbound_at as string) > 23.5 * 3600_000) return false;
  // the shortlist is ready: the list itself, not a link to it
  if (m.key?.startsWith("shortlist-ready:") && (await sendShortlist(userId, c.phone as string))) return true;
  await sendText(c.phone as string, F.waText(m.text).slice(0, 4000));
  return true;
}
