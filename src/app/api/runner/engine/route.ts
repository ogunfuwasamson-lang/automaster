import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { admin } from "@/lib/supabase/admin";
import { loadApp, loadSheet, runnerUser } from "@/lib/runner";
import { canReadMail } from "@/lib/gmail";
import { getLogin, markLogin } from "@/lib/vault";
import { logEvent } from "@/lib/events";
import { normalizeUrl } from "@/lib/portal-url";
import { markSubmitted, serverDeps, setRunner, type RunnerState } from "@/agents/runner";
import { recordQuestions } from "@/lib/portal-questions";
import { askToPay, paymentNeeded } from "@/lib/billing";

export const runtime = "nodejs";
export const maxDuration = 60;

// the server half of the engine when it runs inside the applicant's chrome. the extension drives the page;
// everything that needs our data (logins vault, inbox, fill sheet, the navigator model) is answered here.
const Field = z.object({ id: z.string().max(80), label: z.string().max(400), type: z.string().max(20), name: z.string().max(200).optional(), options: z.array(z.string().max(200)).max(300).optional(), required: z.boolean().optional() });
const Outcome = z.object({ kind: z.enum(["submitted", "needs_you", "wait", "continue", "failed"]), note: z.string().max(400), reason: z.string().max(30).optional(), seconds: z.number().optional() });

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("start"), application: z.string().uuid(), claim: z.boolean().optional() }),
  z.object({ op: z.literal("login_get"), application: z.string().uuid(), host: z.string().max(253) }),
  z.object({ op: z.literal("login_create"), application: z.string().uuid(), host: z.string().max(253), email: z.string().max(320) }),
  z.object({ op: z.literal("login_mail"), application: z.string().uuid(), host: z.string().max(253), since: z.number() }),
  z.object({ op: z.literal("verification"), application: z.string().uuid(), host: z.string().max(253), since: z.number() }),
  z.object({ op: z.literal("navigate"), application: z.string().uuid(), host: z.string().max(253), input: z.any() }),
  z.object({ op: z.literal("fill_key"), application: z.string().uuid(), field: Field, key: z.string().max(120) }),
  z.object({ op: z.literal("progress"), application: z.string().uuid(), note: z.string().max(300) }),
  z.object({ op: z.literal("decide"), application: z.string().uuid(), fields: z.array(Field).max(60), page: z.object({ url: z.string().max(2000), title: z.string().max(300), body: z.string().max(4000) }) }),
  z.object({ op: z.literal("reset_link"), application: z.string().uuid(), host: z.string().max(253), since: z.number() }),
  z.object({ op: z.literal("rotate"), application: z.string().uuid(), host: z.string().max(253) }),
  z.object({ op: z.literal("save"), application: z.string().uuid(), state: z.record(z.string(), z.any()), url: z.string().max(2000).optional() }),
  z.object({ op: z.literal("finish"), application: z.string().uuid(), state: z.record(z.string(), z.any()), url: z.string().max(2000).optional(), filled: z.number().int().min(0).max(5000).optional(), host: z.string().max(253).optional(), outcome: Outcome }),
]);

// what to tell the applicant when their own chrome stops
function chromeNote(reason: string | undefined, note: string) {
  if (reason === "captcha") return "a bot check is showing in the Ivyward tab in Chrome. Complete it there; the agents carry on by themselves";
  if (reason === "payment") return "payment page: pay the application fee in the Ivyward tab in Chrome. The agents confirm the submission after";
  if (reason === "blocked" || reason === "account") return "this portal blocked the agents even in your Chrome. Open the tab they left and finish that step; they pick up again after";
  if (reason === "verification") return note.replace(/open the live view and /g, "");
  return note.replace(/open the live view and /g, "open the portal tab in Chrome and ").replace(/open the live view/g, "open the portal tab in Chrome");
}

export async function POST(req: NextRequest) {
  const uid = await runnerUser(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const b = parsed.data;
  const db = admin();
  const app = await loadApp(uid, b.application);
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data: row } = await db.from("applications").select("runner_mode, runner_state, runner_status").eq("id", b.application).single();
  if (app.status !== "packet_approved" && b.op !== "finish") return NextResponse.json({ stop: "this application isn't approved for submitting" });

  // paused or cancelled from Ivyward: the extension stops; nothing it sends changes the status
  if (row?.runner_status === "idle" && b.op !== "start") {
    if (b.op === "finish" || b.op === "save") {
      const st = (row.runner_state ?? {}) as RunnerState;
      if (st.paused) await db.from("applications").update({ runner_state: { ...st, ...(b.state as RunnerState), paused: true, last_url: b.url ?? st.last_url } }).eq("id", b.application);
    }
    return NextResponse.json({ stop: "paused or cancelled in Ivyward" });
  }
  if (b.op === "progress") {
    await setRunner(b.application, { runner_note: b.note.slice(0, 300) });
    return NextResponse.json({ ok: true });
  }
  if (b.op === "save") {
    const prev = (row?.runner_state ?? {}) as RunnerState;
    await db.from("applications").update({ runner_state: { ...prev, ...b.state, last_url: b.url ?? prev.last_url } }).eq("id", b.application);
    return NextResponse.json({ ok: true });
  }

  const sheet = await loadSheet(uid, b.application);
  if (!sheet) return NextResponse.json({ stop: "no approved packet for this application" });

  if (b.op === "start") {
    if (row?.runner_mode !== "extension" && !b.claim) return NextResponse.json({ stop: "the cloud runner has this application" });
    if (!["ready", "running", "needs_you", "failed"].includes(row?.runner_status ?? "")) return NextResponse.json({ stop: "this application is no longer queued" });
    const st = (row?.runner_state ?? {}) as RunnerState;
    const portal = normalizeUrl(app.portal_url) ?? normalizeUrl((app.programs as unknown as { url: string | null }).url);
    if (!portal && !st.last_url) return NextResponse.json({ stop: "no portal link yet: add it on the application page" });
    await db
      .from("applications")
      .update({ runner_mode: "extension", runner_status: "running", runner_note: "working in your Chrome", runner_live_url: null, runner_session_id: null, runner_updated_at: new Date().toISOString() })
      .eq("id", b.application);
    if (row?.runner_mode !== "extension") await logEvent({ userId: uid, actor: "user", action: "runner.moved_to_chrome", applicationId: b.application, channel: "portal" });
    // the cloud browser's cookies don't belong in this browser; everything else (account made, steps) carries over
    const { storage_enc: _drop, ...state } = st;
    void _drop;
    return NextResponse.json({
      state: { ...state, steps: 0, samePageCount: 0, navCalls: 0 },
      url: normalizeUrl(st.last_url) ?? portal,
      canReadMail: await canReadMail(uid).catch(() => false),
      accountEmail: sheet.fields.email ?? "",
      school: sheet.school,
    });
  }

  const readMail = await canReadMail(uid).catch(() => false);
  const host = "host" in b && b.host ? b.host : "";
  const deps = serverDeps({ userId: uid, applicationId: b.application, jobId: null, sheet, readMail, host: () => host });

  if (b.op === "login_get") return NextResponse.json({ login: await deps.existingLogin() });
  if (b.op === "login_create") return NextResponse.json({ login: await deps.createLogin(b.email || deps.accountEmail) });
  if (b.op === "login_mail") return NextResponse.json({ login: deps.loginFromMail ? await deps.loginFromMail(b.since) : null });
  if (b.op === "verification") return NextResponse.json({ found: readMail ? await deps.verification(b.since) : null });
  if (b.op === "navigate") return NextResponse.json({ action: await deps.navigate!(b.input).catch(() => null) });
  if (b.op === "fill_key") return NextResponse.json({ fill: deps.fillFromKey!(b.field, b.key) });
  if (b.op === "decide") return NextResponse.json({ fills: await deps.decide!(b.fields, b.page).catch(() => []) });
  if (b.op === "reset_link") return NextResponse.json({ link: deps.resetLink ? await deps.resetLink(b.since).catch(() => null) : null });
  if (b.op === "rotate") return NextResponse.json({ login: await deps.rotatePassword!() });

  // finish: one run of the engine in chrome ended
  const o = b.outcome;
  const prev = (row?.runner_state ?? {}) as RunnerState;
  const state: RunnerState = { ...prev, ...(b.state as RunnerState), last_url: b.url ?? prev.last_url };
  if (b.host) {
    const login = await getLogin(uid, b.host, b.application).catch(() => null);
    if (login && login.status !== "verified" && (o.kind === "submitted" || state.signedIn)) await markLogin(login.id, "verified");
  }
  if (o.kind === "submitted") {
    if (app.status === "submitted") return NextResponse.json({ ok: true });
    await db.from("applications").update({ runner_state: state }).eq("id", b.application);
    await markSubmitted(uid, b.application, app.program_id, o.note, b.url ?? null, b.filled ?? 0, "chrome");
    return NextResponse.json({ ok: true });
  }
  if (o.kind === "wait" || o.kind === "continue") {
    const resume_at = o.kind === "wait" ? Date.now() + (o.seconds ?? 60) * 1000 : undefined;
    await db.from("applications").update({ runner_state: { ...state, resume_at }, runner_status: "running", runner_note: o.note, runner_updated_at: new Date().toISOString() }).eq("id", b.application);
    return NextResponse.json({ ok: true });
  }
  if (o.kind === "needs_you" && state.reachedSubmit) {
    const need = await paymentNeeded(uid, b.application).catch(() => null);
    if (need) {
      await db.from("applications").update({ runner_state: { ...state, reason: "unpaid" }, runner_status: "needs_you", runner_note: need.note.replace(/^ready to submit: /, "Ready to submit: "), runner_updated_at: new Date().toISOString() }).eq("id", b.application);
      await askToPay(uid, b.application, need, sheet.school);
      return NextResponse.json({ ok: true, note: need.note });
    }
  }
  if (o.kind === "needs_you") {
    const note = chromeNote(o.reason, o.note).slice(0, 300);
    if (o.reason === "question") await recordQuestions(uid, b.application, state.questions).catch(() => 0);
    await db.from("applications").update({ runner_state: { ...state, reason: o.reason ?? null }, runner_status: "needs_you", runner_note: note, runner_updated_at: new Date().toISOString() }).eq("id", b.application);
    if (row?.runner_status !== "needs_you") await logEvent({ userId: uid, actor: "agent:runner", action: "runner.needs_you", applicationId: b.application, channel: "portal", context: { reason: o.reason ?? null, note, via: "chrome" } });
    return NextResponse.json({ ok: true, note });
  }
  await db.from("applications").update({ runner_state: state, runner_status: "failed", runner_note: o.note.slice(0, 300), runner_updated_at: new Date().toISOString() }).eq("id", b.application);
  return NextResponse.json({ ok: true });
}
