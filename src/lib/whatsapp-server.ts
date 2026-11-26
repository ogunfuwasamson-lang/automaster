import "server-only";
import { randomUUID } from "node:crypto";
import { admin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { localHour } from "@/lib/activity";
import { loadToday } from "@/lib/today-data";
import { markRead, sendTemplate, sendText, whatsappReady } from "@/lib/whatsapp";
import { chat, getFlow, onboardStep, send, sendShortlist, signup, type Msg } from "@/lib/whatsapp-onboard";
import * as F from "@/lib/whatsapp-flow";
import { codeIn, isStart, isStop, linkUrl, masked, newCode, pickNudge, shouldSend, type Contact } from "@/lib/whatsapp-rules";

// WhatsApp for applicants: turning it on in Settings and linking their number, every message coming in (new numbers
// sign up and set up in the chat, lib/whatsapp-onboard), Ivyward AI's replies, STOP, and the one message when
// something needs them (the worker's hourly sweep). lib/whatsapp-rules holds the sweep's rules.

type Row = Contact & { user_id: string; code: string; last_inbound_at: string | null };
const db = () => admin();

// linked: their number was linked at some point (it stays true after STOP, so setup doesn't ask again)
export type WhatsAppState = { status: "off" | "pending" | "active" | "stopped"; code?: string; link?: string; phone?: string; linked?: boolean };

export async function whatsappState(userId: string): Promise<WhatsAppState> {
  const { data } = await db().from("whatsapp_contacts").select("status, code, phone, linked_at").eq("user_id", userId).maybeSingle();
  if (!data) return { status: "off" };
  return { status: data.status as WhatsAppState["status"], code: data.code as string, link: linkUrl(data.code as string), ...(data.phone ? { phone: masked(data.phone as string) } : {}), linked: !!data.linked_at };
}

// they ticked the consent and turned it on: a code to send from their WhatsApp, or straight back on if the number is
// already linked
export async function turnOn(userId: string): Promise<WhatsAppState> {
  const { data: cur } = await db().from("whatsapp_contacts").select("status, code, phone").eq("user_id", userId).maybeSingle();
  const now = new Date().toISOString();
  if (cur) {
    const status = cur.phone ? "active" : "pending";
    await db().from("whatsapp_contacts").update({ status, consented_at: now, stopped_at: null, updated_at: now }).eq("user_id", userId);
  } else {
    for (let i = 0; i < 5; i++) {
      const { error } = await db().from("whatsapp_contacts").insert({ user_id: userId, code: newCode(), status: "pending", consented_at: now });
      if (!error) break;
    }
  }
  await logEvent({ userId, actor: "user", action: "whatsapp.turned_on" }).catch(() => "");
  return whatsappState(userId);
}

export async function turnOff(userId: string): Promise<WhatsAppState> {
  const now = new Date().toISOString();
  await db().from("whatsapp_contacts").update({ status: "stopped", stopped_at: now, updated_at: now }).eq("user_id", userId);
  await logEvent({ userId, actor: "user", action: "whatsapp.turned_off" }).catch(() => "");
  return whatsappState(userId);
}

async function firstName(userId: string): Promise<string> {
  const { data } = await db().from("profiles").select("full_name, profile, portal_details").eq("id", userId).maybeSingle();
  const d = (data?.portal_details ?? {}) as Record<string, string | undefined>;
  const full = d.preferred_name || d.legal_first_name || (data?.profile as { identity?: { full_name?: string } } | null)?.identity?.full_name || (data?.full_name as string | null) || "";
  return full.trim().split(/\s+/)[0] ?? "";
}

// ---- messages coming in (api/whatsapp/webhook) ----

export type Inbound = Msg;

const WELCOME = (first: string) =>
  `You're set${first ? `, ${first}` : ""}. I'll message you here when one of your applications needs you: at most once a week, or a bit more often when a deadline is close.\n\nYou can also ask me anything about your applications here, or type *help* to see what else I can do. Reply STOP to turn these messages off.`;

export async function handleInbound(m: Inbound): Promise<string> {
  const text = m.text.trim();
  const now = new Date().toISOString();
  // linking from Settings: they send the code the website showed them
  const code = text ? codeIn(text) : null;
  if (code) {
    const { data: c } = await db().from("whatsapp_contacts").select("user_id, status").eq("code", code).maybeSingle();
    if (c) {
      // the number moves to whoever sent the code: one account per number
      await db().from("whatsapp_contacts").update({ phone: null, status: "pending", updated_at: now }).eq("phone", m.from).neq("user_id", c.user_id);
      await db().from("whatsapp_contacts").update({ phone: m.from, status: "active", linked_at: now, last_inbound_at: now, stopped_at: null, updated_at: now }).eq("user_id", c.user_id);
      await logEvent({ userId: c.user_id as string, actor: "user", action: "whatsapp.linked" }).catch(() => "");
      await markRead(m.id);
      await sendText(m.from, WELCOME(await firstName(c.user_id as string)));
      // something to look at straight away: the shortlist setup just made, as a list they can open and start from
      await sendShortlist(c.user_id as string, m.from).catch(() => 0);
      return "linked";
    }
  }
  const { data: c } = await db().from("whatsapp_contacts").select("user_id, status").eq("phone", m.from).maybeSingle();
  // a number we don't know: they start here (lib/whatsapp-onboard), from the email onwards
  if (!c) {
    await markRead(m.id);
    return signup(m);
  }
  const userId = c.user_id as string;
  await db().from("whatsapp_contacts").update({ last_inbound_at: now, updated_at: now }).eq("user_id", userId);
  if (isStop(text)) {
    await db().from("whatsapp_contacts").update({ status: "stopped", stopped_at: now }).eq("user_id", userId);
    await logEvent({ userId, actor: "user", action: "whatsapp.stopped" }).catch(() => "");
    await sendText(m.from, "Done: no more messages here. You can turn them back on in Settings on tryivyward.com, or reply START.");
    return "stopped";
  }
  if (isStart(text)) {
    await db().from("whatsapp_contacts").update({ status: "active", stopped_at: null }).eq("user_id", userId);
    await sendText(m.from, WELCOME(await firstName(userId)));
    return "started";
  }
  if (c.status === "stopped") return "ignored";
  await markRead(m.id);
  const flow = await getFlow(m.from);
  if (flow && flow.user_id === userId && flow.step !== "done") return onboardStep(userId, m, flow);
  return chat(userId, m, flow && flow.user_id === userId ? flow : null);
}

// Ivyward AI's answer to their message, in the same conversation as the dashboard's chat. a question with a few
// answers comes with them as buttons or a list, and a tapped answer comes back as if typed (lib/whatsapp-onboard)
export async function replyWithAi(userId: string, text: string, messageId: string): Promise<string> {
  const { data: c } = await db().from("whatsapp_contacts").select("phone, status, last_inbound_at").eq("user_id", userId).maybeSingle();
  if (!c?.phone || c.status !== "active") return "not on";
  if (!c.last_inbound_at || Date.now() - Date.parse(c.last_inbound_at as string) > 23.5 * 3600_000) return "window closed";
  const { data: last } = await db().from("interview_turns").select("session_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const session = (last?.session_id as string) ?? randomUUID();
  const { interviewTurn } = await import("@/agents/interviewer");
  let out: F.Out;
  try {
    const turn = await interviewTurn(userId, session, text, false, "whatsapp");
    out = F.askOut(F.waText(turn.reply as string), turn.ask ?? null, (o) => F.answerId(o));
  } catch {
    out = { kind: "text", body: "I can't answer right now. Type *status* to see where your applications stand, or try again in a few minutes." };
  }
  await send(c.phone as string, out, messageId);
  await logEvent({ userId, actor: "agent:whatsapp", action: "whatsapp.replied", channel: "whatsapp" }).catch(() => "");
  return "replied";
}

// ---- the one message when something needs them (worker, hourly) ----

async function lastActive(userId: string): Promise<string | null> {
  const [{ data: ev }, { data: turn }] = await Promise.all([
    db().from("events").select("created_at").eq("user_id", userId).eq("actor", "user").not("action", "like", "whatsapp.%").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db().from("interview_turns").select("created_at").eq("user_id", userId).eq("role", "user").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const t = [ev?.created_at, turn?.created_at].filter(Boolean) as string[];
  return t.sort().at(-1) ?? null;
}

export async function sweepWhatsApp(now = new Date()): Promise<{ checked: number; sent: number }> {
  if (!whatsappReady()) return { checked: 0, sent: 0 };
  const { data } = await db().from("whatsapp_contacts").select("user_id, code, status, phone, last_sent_at, last_sent_key, last_inbound_at").eq("status", "active").not("phone", "is", null).limit(2000);
  let sent = 0;
  for (const c of (data ?? []) as Row[]) {
    // cheap checks before loading anything
    if (c.last_sent_at && now.getTime() - Date.parse(c.last_sent_at) < 2 * 86_400_000) continue;
    const { data: prof } = await db().from("profiles").select("timezone").eq("id", c.user_id).maybeSingle();
    const hour = localHour((prof?.timezone as string | null) ?? "Africa/Lagos", now);
    if (hour < 9 || hour >= 20) continue;
    const today = await loadToday(c.user_id).catch(() => null);
    if (!today) continue;
    const nudge = pickNudge(today.input, today.map.pendingAdmission, await firstName(c.user_id), now.toISOString().slice(0, 10));
    if (!nudge) continue;
    const go = shouldSend(c, nudge, { lastActiveAt: await lastActive(c.user_id), now, localHour: hour });
    if (!go.ok) continue;
    try {
      const id = await sendTemplate(c.phone!, nudge.template, nudge.params, nudge.path);
      await db().from("whatsapp_contacts").update({ last_sent_at: now.toISOString(), last_sent_key: nudge.key, updated_at: now.toISOString() }).eq("user_id", c.user_id);
      await logEvent({ userId: c.user_id, actor: "agent:whatsapp", action: "whatsapp.sent", context: { template: nudge.template, key: nudge.key, id } }).catch(() => "");
      sent++;
    } catch (e) {
      await logEvent({ userId: c.user_id, actor: "agent:whatsapp", action: "whatsapp.failed", context: { template: nudge.template, error: String(e).slice(0, 300) } }).catch(() => "");
    }
  }
  return { checked: data?.length ?? 0, sent };
}
