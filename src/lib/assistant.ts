import "server-only";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { logEvent } from "@/lib/events";
import { checkLimit } from "@/lib/limits";
import { sendInvite } from "@/lib/calendar";
import { createFollowup } from "@/lib/followups";
import { queueRunner } from "@/agents/runner";
import { normalizeUrl } from "@/lib/portal-url";
import type { ACTIONS } from "@/agents/interviewer";

// Ivyward AI's view of the season and its hands. the overview is what the other agents know (applications and
// where each stands, school emails, notices, what's coming up); the actions hand work back to those agents.

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "none");

export async function seasonOverview(userId: string): Promise<string> {
  const db = admin();
  const [{ data: apps }, { data: msgs }, { data: notes }, { data: ups }, { count: building }] = await Promise.all([
    db.from("applications").select("id, status, target_deadline, runner_status, runner_note, programs(name, degree, app_fee_usd, schools(name, country))").eq("user_id", userId).not("status", "in", "(dropped,withdrawn)").order("target_deadline", { ascending: true, nullsFirst: false }).limit(30),
    db.from("messages").select("subject, summary, purpose, created_at, threads(application_id)").eq("user_id", userId).eq("direction", "in").order("created_at", { ascending: false }).limit(6),
    db.from("notifications").select("title").eq("user_id", userId).is("resolved_at", null).order("created_at", { ascending: false }).limit(8),
    db.from("followups").select("title, school, kind, status, event_start, deadline, why").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
    db.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("agent", "recon").neq("task", "scholarships").in("status", ["queued", "running"]),
  ]);
  type P = { name: string; degree: string | null; app_fee_usd: number | null; schools: { name: string; country: string | null } };
  const appLines = (apps ?? []).map((a) => {
    const p = a.programs as unknown as P;
    return `- [${a.id}] ${p.schools.name}, ${p.name}${p.schools.country ? ` (${p.schools.country})` : ""}: ${a.status.replace(/_/g, " ")}; deadline ${day(a.target_deadline)}${p.app_fee_usd ? `; fee $${p.app_fee_usd}` : ""}${a.runner_status && a.runner_status !== "idle" ? `; portal agents: ${a.runner_status}${a.runner_note ? ` (${String(a.runner_note).slice(0, 100)})` : ""}` : ""}`;
  });
  return `their applications (id in brackets):
${appLines.join("\n") || "(none yet)"}${building ? "\nthe shortlist agent is searching for programs right now." : ""}

latest school emails:
${(msgs ?? []).map((m) => `- ${day(m.created_at)}: ${m.subject ?? ""}: ${String(m.summary ?? "").slice(0, 140)}`).join("\n") || "(none)"}

follow-ups the agents are handling:
${(ups ?? []).map((f) => `- ${f.school ? `${f.school}: ` : ""}${f.title} (${f.kind.replace(/_/g, " ")}, ${f.status}${f.event_start ? `, on ${String(f.event_start).slice(0, 16).replace("T", " ")} UTC` : ""}${f.deadline ? `, due ${f.deadline}` : ""})`).join("\n") || "(none)"}

open notices: ${(notes ?? []).map((n) => n.title).join("; ") || "none"}`;
}

type Action = { type: (typeof ACTIONS)[number]; application_id: string; title: string; at: string; minutes: number; url: string; note: string };
export type ActionResult = { type: string; ok: boolean; note: string };

export async function runActions(userId: string, actions: Action[]): Promise<ActionResult[]> {
  const db = admin();
  const out: ActionResult[] = [];
  for (const a of actions.slice(0, 4)) {
    try {
      const app = a.application_id ? (await db.from("applications").select("id, status, packet_approved_at, attested_at, programs(schools(name))").eq("id", a.application_id).eq("user_id", userId).maybeSingle()).data : null;
      const school = (app?.programs as unknown as { schools: { name: string } } | undefined)?.schools.name ?? null;
      if (a.type === "find_programs") {
        const { count } = await db.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("agent", "recon").eq("task", "discover").in("status", ["queued", "running"]);
        if (count) {
          out.push({ type: a.type, ok: true, note: "a search is already running" });
          continue;
        }
        const blocked = await checkLimit(userId, "recon_run");
        if (blocked) {
          out.push({ type: a.type, ok: false, note: blocked });
          continue;
        }
        await enqueue({ userId, agent: "recon", task: "discover" });
        out.push({ type: a.type, ok: true, note: "shortlist search started" });
      } else if (a.type === "prepare_application") {
        if (!app || !["shortlisted", "preparing"].includes(app.status)) {
          out.push({ type: a.type, ok: false, note: "that application can't be prepared from where it is" });
          continue;
        }
        if (app.status === "shortlisted") {
          const blocked = await checkLimit(userId, "application");
          if (blocked) {
            out.push({ type: a.type, ok: false, note: blocked });
            continue;
          }
          await db.from("applications").update({ status: "preparing" }).eq("id", app.id);
        }
        await enqueue({ userId, agent: "strategist", task: "plan", payload: { applicationId: app.id }, idempotencyKey: `assistant-prepare:${app.id}:${new Date().toISOString().slice(0, 13)}` });
        out.push({ type: a.type, ok: true, note: `preparing ${school}` });
      } else if (a.type === "start_portal") {
        if (!app || app.status !== "packet_approved" || !app.attested_at) {
          out.push({ type: a.type, ok: false, note: "the packet has to be signed before the portal agents can submit" });
          continue;
        }
        await queueRunner(userId, app.id);
        out.push({ type: a.type, ok: true, note: `portal agents started on ${school}` });
      } else if (a.type === "remind") {
        const at = Date.parse(a.at);
        if (!a.title || !Number.isFinite(at) || at < Date.now() - 60_000) {
          out.push({ type: a.type, ok: false, note: "couldn't set that reminder: the time wasn't clear" });
          continue;
        }
        await enqueue({ userId, agent: "system", task: "remind", payload: { title: a.title.slice(0, 160), body: a.note.slice(0, 300) || undefined, href: app ? `/applications/${app.id}` : "/dashboard" }, runAt: new Date(at) });
        out.push({ type: a.type, ok: true, note: `reminder set for ${new Date(at).toISOString().slice(0, 16).replace("T", " ")} UTC` });
      } else if (a.type === "calendar") {
        const at = Date.parse(a.at);
        if (!a.title || !Number.isFinite(at)) {
          out.push({ type: a.type, ok: false, note: "couldn't add that to the calendar: the time wasn't clear" });
          continue;
        }
        const ok = await createFollowup(userId, { kind: "event", title: a.title.slice(0, 200), url: normalizeUrl(a.url), act: false, start: new Date(at), minutes: Math.min(Math.max(a.minutes || 60, 15), 480), deadline: null, why: a.note.slice(0, 300), unlocks: "", school, applicationId: app?.id ?? null, messageId: null });
        if (!ok) await sendInvite(userId, { uid: `${userId.slice(0, 8)}-${at}`, title: a.title, start: new Date(at), end: new Date(at + (a.minutes || 60) * 60_000), url: normalizeUrl(a.url), description: a.note });
        out.push({ type: a.type, ok: true, note: "calendar invite sent" });
      } else if (a.type === "follow_link") {
        const url = normalizeUrl(a.url);
        if (!url) {
          out.push({ type: a.type, ok: false, note: "that link didn't look right" });
          continue;
        }
        const ok = await createFollowup(userId, { kind: /waiver/i.test(`${a.title} ${a.note}`) ? "claim_fee_waiver" : /webinar|session|event|register/i.test(`${a.title} ${a.note}`) ? "register_event" : /interview|slot/i.test(`${a.title} ${a.note}`) ? "book_interview" : "fill_form", title: (a.title || "Form from a school").slice(0, 200), url, act: true, start: null, minutes: 60, deadline: null, why: a.note.slice(0, 300), unlocks: /waiver/i.test(`${a.title} ${a.note}`) ? "fee_waiver" : "", school, applicationId: app?.id ?? null, messageId: null });
        out.push({ type: a.type, ok, note: ok ? "the agents are opening the link" : "that link is already being handled" });
      }
      await logEvent({ userId, actor: "agent:interviewer", action: `assistant.${a.type}`, applicationId: app?.id ?? null, context: { title: a.title, at: a.at || null, url: a.url || null } });
    } catch (e) {
      out.push({ type: a.type, ok: false, note: `couldn't do that just now` });
      console.error("assistant action failed", a.type, e);
    }
  }
  return out;
}
