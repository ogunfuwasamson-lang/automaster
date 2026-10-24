import "server-only";
import * as z from "zod/v4";
import type { Handler } from "./index";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { logEvent, recordOutcome } from "@/lib/events";
import { research } from "@/lib/research";
import { runStructured } from "@/lib/llm";
import { loadApp, loadSheet, mapFields, sheetFile, submitDecision } from "@/lib/runner";
import { createLogin, getLogin, markLogin, saveIssuedLogin } from "@/lib/vault";
import { canReadMail, recentMail } from "@/lib/gmail";
import { extractCredentials, extractVerification, hostRoot } from "@/lib/verify-mail";
import { decrypt, encrypt } from "@/lib/crypto";
import { openBrowser, type StorageState } from "@/lib/browser";
import { runEngine, type EngineDeps, type EngineState, type NavInput } from "@/lib/cloud-engine";
import { fromPlaywright } from "@/lib/engine-page";
import { recordQuestions } from "@/lib/portal-questions";
import { resolve, keyMenu } from "@/lib/runner-map";
import type { FillSheet } from "@/lib/fillsheet";
import { looksLikePortal, normalizeUrl } from "@/lib/portal-url";
import { hostRoot as rootOf } from "@/lib/verify-mail";

// the cloud runner: finds the portal, creates the applicant's account, fills, uploads and submits
// the signed packet from our servers. nothing to install for the applicant.

const RUN_BUDGET_MS = 200_000; // stay well inside the function's 300s
// every recurring check on the platform runs every 5 minutes
export const RECHECK_MINUTES = 5;
const RECHECKS = 16; // after a handoff (bot check, payment), look again this many times, 5 min apart (about 80 minutes)

const NavOut = z.object({
  action: z.enum(["click", "fill", "goto", "wait_email", "handoff", "done"]),
  target_id: z.string(),
  sheet_key: z.string(),
  url: z.string(),
  note: z.string(),
});

const NAV_SYSTEM = `you drive a university application portal in a browser for an applicant who has reviewed and signed their application packet.
goal: get the application for the named program filled in and submitted. pick exactly ONE next action.
actions:
- click: press the button/link with target_id (use ids from the buttons list). use this to sign in, create an account, start or continue an application, open the next section, save, or submit.
- fill: put the applicant's answer into the empty field target_id, taken from sheet_key (a key from the fill sheet). never invent values; if no key answers it, don't fill it.
- goto: open url (must be a link on this page or on the same site).
- wait_email: the portal sent an email (code, link, or login) and nothing else can be done until it arrives.
- handoff: the applicant must do this step themselves (bot check, payment, a question only they can answer, anything you are unsure about). note says exactly what to do, in one plain sentence.
- done: the application is already submitted.
rules: never press pay/checkout/delete/withdraw/sign out. prefer the main application flow over navigation menus, news, events or other programs.
if the page lists several programs or applications, choose the one matching the program. explain your choice in note (short).`;

function navPrompt(n: NavInput, sheet: FillSheet) {
  const s = n.snapshot;
  const fields = s.fields.slice(0, 60).map((f) => `${f.id} | ${f.type}${f.required ? " required" : ""} | ${f.label.slice(0, 90)}${f.options?.length ? ` | options: ${f.options.slice(0, 10).join(" / ").slice(0, 160)}` : ""}`);
  const buttons = s.buttons.slice(0, 80).map((b) => `${b.id} | ${b.label.slice(0, 60)}${b.href ? ` | ${b.href.slice(0, 100)}` : ""}`);
  return `program: ${sheet.program} at ${sheet.school}
why you're being asked: ${n.why}
signed in: ${n.signedIn ? "yes" : "not yet"}; login on file: ${n.haveLogin ? "yes" : "no"}
recent steps: ${n.history.join(" → ") || "none"}

page: ${s.title} (${s.url})
portal errors: ${(s.errors ?? []).join("; ") || "none"}
page text: ${s.body.slice(0, 1800)}

empty fields:
${fields.join("\n") || "none"}

buttons and links:
${buttons.join("\n") || "none"}`;
}

const CredOut = z.object({ username: z.string(), password: z.string() });

// a login the portal emailed to the applicant, read from their inbox and kept in the vault
async function issuedLogin(userId: string, applicationId: string, jobId: string | null, host: string, since: number) {
  const root = hostRoot(host);
  const mails = await recentMail(userId, `newer_than:60d from:${root} (password OR "user id" OR userid OR username OR identifiant OR "mot de passe" OR account OR compte)`, 6).catch(() => []);
  for (const m of mails.filter((x) => x.at >= since).sort((a, b) => b.at - a.at)) {
    let c = extractCredentials(m);
    if (!c.username || !c.password) {
      // unusual wording: let the cheap model read just this one email
      try {
        const { output } = await runStructured({
          userId,
          agent: "runner",
          jobId: jobId ?? undefined,
          promptVersion: "issued-login-v1",
          tier: "cheap",
          system: "extract the portal login (user id or username, and password) that this email gives the applicant. empty strings if the email doesn't contain one. copy them exactly.",
          prompt: `subject: ${m.subject}\n\n${(m.text || m.html.replace(/<[^>]+>/g, " ")).slice(0, 4000)}`,
          schema: CredOut,
          maxTokens: 200,
        });
        c = { username: output.username || c.username, password: output.password || c.password };
      } catch {
        /* keep what the patterns found */
      }
    }
    if (c.username && c.password) return saveIssuedLogin(userId, applicationId, host, c.username, c.password);
  }
  return null;
}

const PortalOut = z.object({ portal_url: z.string(), account_needed: z.enum(["yes", "no", "unknown"]), notes: z.string() });

export type RunnerState = EngineState & { storage_enc?: string; last_url?: string; rechecks?: number; reason?: string | null; resume_at?: number; paused?: boolean };

export async function setRunner(applicationId: string, patch: Record<string, unknown>) {
  await admin().from("applications").update({ ...patch, runner_updated_at: new Date().toISOString() }).eq("id", applicationId);
}

// everything the engine needs from our side (fill sheet, logins vault, inbox, the navigator model). the browser
// is separate: playwright in the cloud, the applicant's chrome through the extension, or a live session.
export interface DepsCtx {
  userId: string;
  applicationId: string;
  jobId: string | null;
  sheet: FillSheet;
  readMail: boolean;
  host: () => string;
}
export function serverDeps(c: DepsCtx): EngineDeps {
  let lastNote = "";
  // the applicant can pause or cancel at any time: running engines notice within a few seconds
  let stopped = false;
  let checkedAt = 0;
  const check = async () => {
    checkedAt = Date.now();
    stopped = !!(await userHalted(c.applicationId));
    return stopped;
  };
  return {
    shouldStop: () => {
      if (Date.now() - checkedAt > 6000) void check().catch(() => {});
      return stopped;
    },
    map: (fields) => mapFields(c.userId, c.sheet, fields),
    file: (key) => sheetFile(c.userId, c.sheet, key),
    canSubmit: () => submitDecision(c.userId, c.applicationId),
    existingLogin: () => getLogin(c.userId, c.host(), c.applicationId),
    createLogin: async (email) => {
      const l = await createLogin(c.userId, c.applicationId, c.host(), email);
      await logEvent({ userId: c.userId, actor: "agent:runner", action: "runner.account_created", applicationId: c.applicationId, channel: "portal", context: { host: c.host(), email } });
      return l;
    },
    accountEmail: c.sheet.fields.email ?? "",
    canReadMail: c.readMail,
    navigate: async (n) => {
      const { output } = await runStructured({
        userId: c.userId,
        agent: "runner",
        jobId: c.jobId ?? undefined,
        promptVersion: "nav-v1",
        tier: "cheap",
        system: NAV_SYSTEM,
        cachePrefix: `fill sheet keys (fill only from these):\n${keyMenu(c.sheet)}`,
        prompt: navPrompt(n, c.sheet),
        schema: NavOut,
        maxTokens: 400,
      });
      return output;
    },
    fillFromKey: (f, key) => resolve(f, key, c.sheet),
    loginFromMail: c.readMail ? (since) => issuedLogin(c.userId, c.applicationId, c.jobId, c.host(), since) : undefined,
    verification: (since) => findVerification(c.userId, c.host(), since),
    progress: async (note) => {
      if (note === lastNote) return;
      lastNote = note;
      if (await check()) return;
      await setRunner(c.applicationId, { runner_note: note });
    },
  };
}

export async function findVerification(userId: string, host: string, since: number) {
  const root = hostRoot(host);
  const mails = await recentMail(userId, `newer_than:1d (from:${root} OR subject:(verify OR verification OR code OR confirm OR activate OR account OR pin))`, 8);
  for (const m of mails.filter((x) => x.at >= since - 60_000).sort((a, b) => b.at - a.at)) {
    const v = extractVerification(m, host);
    if (v.code || v.link) return v;
  }
  return null;
}

// the portal showed a confirmation after we pressed submit
export async function markSubmitted(userId: string, applicationId: string, programId: string | null, note: string, url: string | null, filled: number, via: string) {
  const db = admin();
  const { error } = await db.from("applications").update({ status: "submitted", runner_status: "submitted", runner_note: note, runner_live_url: null, runner_updated_at: new Date().toISOString() }).eq("id", applicationId);
  if (error) throw new Error(error.message);
  const eventId = await logEvent({ userId, actor: "agent:runner", action: "runner.submitted", applicationId, programId, channel: "portal", context: { url, filled, via } });
  await logEvent({ userId, actor: "agent:runner", action: "application.submitted", applicationId, programId, channel: "portal" });
  await recordOutcome({ userId, eventId, applicationId, kind: "proxy", label: "submitted", source: "runner" });
}

// paused or cancelled by the applicant while agents were working: "paused" keeps progress, "cancelled" drops it
export async function userHalted(applicationId: string): Promise<"paused" | "cancelled" | null> {
  const { data } = await admin().from("applications").select("runner_status, runner_state").eq("id", applicationId).maybeSingle();
  if (data?.runner_status !== "idle") return null;
  return (data.runner_state as { paused?: boolean } | null)?.paused ? "paused" : "cancelled";
}

// the applicant's chrome extension has checked in within the last few minutes
export async function extensionOnline(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - 4 * 60_000).toISOString();
  const { count } = await admin().from("runner_tokens").select("id", { count: "exact", head: true }).eq("user_id", userId).is("revoked_at", null).gte("last_used_at", since);
  return (count ?? 0) > 0;
}

// portals that refuse a cloud browser (bot walls, blocked sign-ups) usually accept the applicant's own chrome:
// move the job there. the extension picks it up within a minute.
export const BLOCKED_REASONS = new Set(["captcha", "account", "blocked"]);
export async function handOffToChrome(userId: string, applicationId: string, state: RunnerState, why: string) {
  await admin()
    .from("applications")
    .update({
      runner_mode: "extension",
      runner_status: "ready",
      runner_note: "moved to your Chrome: this portal blocks cloud browsers. It carries on there within a minute",
      runner_state: { ...state, reason: null, rechecks: 0, samePageCount: 0, storage_enc: undefined },
      runner_session_id: null,
      runner_live_url: null,
      runner_updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);
  await logEvent({ userId, actor: "agent:runner", action: "runner.moved_to_chrome", applicationId, channel: "portal", context: { why } });
}

// a live browser session is open for this application: the cloud runner leaves it alone
async function liveActive(applicationId: string): Promise<boolean> {
  const since = new Date(Date.now() - 90_000).toISOString();
  const { data, error } = await admin().from("live_sessions").select("id").eq("application_id", applicationId).neq("status", "ended").gte("updated_at", since).limit(1);
  return !error && !!data?.length;
}

export const runner: Record<string, Handler> = {
  // find where the online application for this program starts
  "runner.find_portal": async (job) => {
    const { applicationId } = job.payload as { applicationId: string };
    const app = await loadApp(job.user_id, applicationId);
    if (!app) return { skipped: "gone" };
    const p = app.programs as unknown as { name: string; degree: string | null; url: string | null; schools: { name: string } };
    const found = await research({
      userId: job.user_id,
      agent: "runner",
      jobId: job.id,
      system: "you find the official online application portal for a university program: the page where an applicant creates an account or signs in to start the application (often slate, apply.*, gradapply.*, or the school's own system). official university pages only. quote the exact url.",
      prompt: `program: ${p.name}${p.degree ? ` (${p.degree})` : ""} at ${p.schools.name}\nprogram page: ${p.url ?? "unknown"}\nfind the exact url where the online application starts for the next intake (the "apply now" / "start your application" destination).`,
      maxSearches: 3,
      maxFetches: 3,
    });
    const { output } = await runStructured({
      userId: job.user_id,
      agent: "runner",
      jobId: job.id,
      promptVersion: "portal-v2",
      tier: "cheap",
      system: "extract the online application portal url from the research: where an applicant creates an account or signs in to apply. if only the program page is known, return \"\".",
      prompt: `${found.text}\n\nurls seen: ${found.sources.slice(0, 40).join(" ")}`,
      schema: PortalOut,
      maxTokens: 600,
    });
    // accept it if it came out of the research (text or sources) or sits on the school's own domain
    const cand = normalizeUrl(output.portal_url);
    const schoolRoot = p.url ? rootOf(new URL(normalizeUrl(p.url) ?? "https://x.invalid").hostname) : null;
    const seen = (u: string) => found.text.includes(u.replace(/^https:\/\//, "").slice(0, 40)) || found.sources.some((x) => x.startsWith(new URL(u).origin));
    let url = cand && looksLikePortal(cand) && (seen(cand) || (schoolRoot && rootOf(new URL(cand).hostname) === schoolRoot)) ? cand : null;
    // the model passed: take the first application-site link the search itself turned up
    if (!url) {
      const links = [...found.sources, ...(found.text.match(/https?:\/\/[^\s)"'<>\]]+/g) ?? [])].map((u) => normalizeUrl(u)).filter((u): u is string => !!u);
      // only an application *site* (apply./slate/portal host or login path), never a brochure page that merely mentions applying
      const site = (u: string) => looksLikePortal(u) && /(^|\.)(apply|applygrad|gradapply|slate|portal|applications?|enligne)\.|account\/(login|register)|my\.site\.com|course-application|technolutions/i.test(new URL(u).hostname + new URL(u).pathname);
      // without the school's own domain, the link must at least carry a word from the school's name
      const GENERIC = /^(university|universite|universidad|school|business|college|management|institute|graduate|faculty|of|the|and|de|des|du)$/i;
      const tokens = p.schools.name.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !GENERIC.test(w));
      const ours = (u: string) => (schoolRoot ? rootOf(new URL(u).hostname) === schoolRoot : tokens.some((t) => new URL(u).hostname.includes(t.slice(0, 6))));
      url = links.find((u) => site(u) && ours(u)) ?? null;
    }
    let note = output.notes;
    if (!url && p.url) {
      // no portal found: start from the program page and follow its "apply" link
      url = normalizeUrl(p.url);
      note = "starting from the program page";
    }
    if (!url) {
      await setRunner(applicationId, { runner_status: "needs_you", runner_note: "couldn't find the application portal link. paste it on the application page and press try again" });
      return { found: false };
    }
    await admin().from("applications").update({ portal_url: url }).eq("id", applicationId);
    await logEvent({ userId: job.user_id, actor: "agent:runner", action: "runner.portal_found", applicationId, context: { url, notes: note } });
    if ((job.payload as { thenRun?: boolean }).thenRun) await enqueue({ userId: job.user_id, agent: "runner", task: "run", payload: { applicationId, portalChecked: true } });
    return { url };
  },

  "runner.run": async (job) => {
    const { applicationId } = job.payload as { applicationId: string };
    const db = admin();
    const app = await loadApp(job.user_id, applicationId);
    const { data: row0 } = await db.from("applications").select("runner_state, runner_mode").eq("id", applicationId).maybeSingle();
    if (!app || app.status !== "packet_approved" || !["ready", "running", "needs_you"].includes(app.runner_status as string)) return { skipped: "not queued" };
    // the applicant's chrome has this one, or they're driving it in the live browser
    if (row0?.runner_mode === "extension") return { skipped: "running in the applicant's chrome" };
    if (await liveActive(applicationId)) return { skipped: "live browser open" };
    const portal = normalizeUrl(app.portal_url);
    const checked = (job.payload as { portalChecked?: boolean }).portalChecked;
    if (!portal || (!looksLikePortal(portal) && !checked && !(row0?.runner_state as RunnerState | null)?.last_url)) {
      await enqueue({ userId: job.user_id, agent: "runner", task: "find_portal", payload: { applicationId, thenRun: true } });
      await setRunner(applicationId, { runner_status: "running", runner_note: "finding the application portal" });
      return { next: "finding the portal" };
    }
    if (portal !== app.portal_url) await db.from("applications").update({ portal_url: portal }).eq("id", applicationId);
    const sheet = await loadSheet(job.user_id, applicationId);
    if (!sheet) return { skipped: "no approved packet" };
    const { data: row } = await db.from("applications").select("runner_state, runner_session_id").eq("id", applicationId).single();
    const state = ((row?.runner_state ?? {}) as RunnerState) || {};
    state.steps ??= 0;
    const storage = state.storage_enc ? (JSON.parse(decrypt(state.storage_enc)) as StorageState) : null;

    await setRunner(applicationId, { runner_status: "running", runner_note: "working on the portal" });
    if (!state.steps) await logEvent({ userId: job.user_id, actor: "agent:runner", action: "runner.started", applicationId, channel: "portal" });

    const ob = await openBrowser({ sessionId: row?.runner_session_id, storage });
    let keep = false;
    try {
      const page = ob.page;
      if (!page.url() || page.url() === "about:blank") await page.goto(normalizeUrl(state.last_url) ?? portal, { waitUntil: "domcontentloaded", timeout: 45_000 });
      const host = () => new URL(page.url()).hostname;
      const readMail = await canReadMail(job.user_id).catch(() => false);
      const { outcome, state: next, filled } = await runEngine(
        fromPlaywright(page),
        serverDeps({ userId: job.user_id, applicationId, jobId: job.id, sheet, readMail, host }),
        state,
        RUN_BUDGET_MS,
      );

      const halted = await userHalted(applicationId);
      if (halted) {
        // paused: keep where it got to (page, cookies) for Resume. cancelled: nothing to keep
        if (halted === "paused") await db.from("applications").update({ runner_state: { ...next, paused: true, last_url: page.url(), storage_enc: encrypt(JSON.stringify(await ob.storage())) }, runner_session_id: null }).eq("id", applicationId);
        return { halted };
      }

      const saved: RunnerState & { debug?: unknown } = {
        ...next,
        last_url: page.url(),
        storage_enc: encrypt(JSON.stringify(await ob.storage())),
        // what the last page looked like, for fixing the runner (no values, labels only)
        debug: await (async () => {
          const one = (f: import("playwright-core").Frame) => f
          .evaluate(() => {
            const t = (e: Element | null) => (e?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
            return {
              title: document.title.slice(0, 80),
              fields: [...document.querySelectorAll("input:not([type=hidden]), select, textarea")].slice(0, 30).map((e) => `${(e as HTMLInputElement).type || e.tagName}:${(e as HTMLInputElement).name}:${e.getAttribute("aria-label") ?? ""}`),
              buttons: [...document.querySelectorAll("button, input[type=submit], a")].slice(0, 40).map(t).filter(Boolean),
              values: [...document.querySelectorAll("input:not([type=hidden]):not([type=password]), select")].slice(0, 30).map((e) => `${(e as HTMLInputElement).name}=${(e as HTMLInputElement).value ? "set" : "empty"}`),
              errors: [...document.querySelectorAll(".error, .errors, [role=alert], .invalid, .validation, .form_error, .message, .notification, .alert")].map(t).filter(Boolean).slice(0, 8),
              captcha: !!document.querySelector("iframe[src*=recaptcha], iframe[src*=hcaptcha], iframe[src*=turnstile], [data-sitekey], .grecaptcha-badge"),
              body: (document.body?.innerText ?? "").replace(/\s+/g, " ").slice(0, 700),
            };
          })
          .catch(() => null);
          const all = (await Promise.all(page.frames().map(one))).filter(Boolean) as { fields: string[] }[];
          return all.sort((a, b) => b.fields.length - a.fields.length)[0] ?? null;
        })(),
      };
      const login = await getLogin(job.user_id, host(), applicationId).catch(() => null);
      if (login && login.status !== "verified" && (outcome.kind === "submitted" || next.signedIn)) await markLogin(login.id, "verified");

      if (outcome.kind === "submitted") {
        await db.from("applications").update({ runner_state: saved, runner_session_id: null }).eq("id", applicationId);
        await markSubmitted(job.user_id, applicationId, app.program_id, outcome.note, page.url(), filled, "cloud");
        return { submitted: true, filled };
      }

      if (outcome.kind === "wait" || outcome.kind === "continue") {
        keep = true;
        await db.from("applications").update({ runner_state: saved, runner_session_id: ob.sessionId }).eq("id", applicationId);
        await enqueue({ userId: job.user_id, agent: "runner", task: "run", payload: { applicationId }, runAt: new Date(Date.now() + (outcome.kind === "wait" ? outcome.seconds * 1000 : 0)) });
        return { outcome: outcome.kind, note: outcome.note, filled };
      }

      if (outcome.kind === "needs_you" && BLOCKED_REASONS.has(outcome.reason) && (await extensionOnline(job.user_id))) {
        // the portal won't take a cloud browser: the applicant's own chrome takes over from here
        await handOffToChrome(job.user_id, applicationId, saved, outcome.note);
        return { outcome: "moved_to_chrome", reason: outcome.reason, filled };
      }

      if (outcome.kind === "needs_you" && outcome.reason === "question") await recordQuestions(job.user_id, applicationId, next.questions).catch(() => 0);

      if (outcome.kind === "needs_you") {
        // bot checks and payments: the applicant finishes that step (live view, or their own browser with the
        // login we show them). we look again every 5 minutes and carry on once it's done.
        const liveView = !!ob.sessionId;
        // a bot check only clears in the browser that saw it: without a live view, hand the portal over instead of looping
        if (outcome.reason === "account") {
          // generate the password now so the applicant creates the account with it; we sign in with it after
          const login = await createLogin(job.user_id, applicationId, new URL(page.url()).hostname, sheet.fields.email ?? "");
          outcome.note = `this portal blocks automated sign-ups. Create the account yourself at ${portal} with ${login.login_email} and the password shown under "Your portal login" on this application. Already made it? Check the password matches. The agents sign in and finish the rest within 5 minutes.`;
          saved.last_url = portal; // start again from the landing page, which has the "log in" link
          saved.samePageCount = 0;
        }
        const recheck = (outcome.reason === "payment" || outcome.reason === "verification" || outcome.reason === "account" || (outcome.reason === "captcha" && liveView)) && (state.rechecks ?? 0) < (outcome.reason === "account" ? 72 : RECHECKS); // about six hours to create an account
        keep = recheck;
        const live = liveView ? await ob.liveUrl() : null;
        if (!liveView) {
          const login = await getLogin(job.user_id, new URL(page.url()).hostname, applicationId).catch(() => null);
          const signIn = login ? " sign in with the login shown below," : "";
          if (outcome.reason === "captcha" || outcome.reason === "blocked") outcome.note = "this portal blocks cloud browsers. Open the live browser to get past the check yourself, or let it run in your Chrome";
          if (outcome.reason === "payment") outcome.note = `payment page: open the portal,${signIn} and pay the fee. the agents check back every 5 minutes and confirm the submission`;
          if (outcome.reason === "verification") outcome.note = outcome.note.replace("open the live view and enter it", "enter it on the portal");
          outcome.note = outcome.note.replace(/open the live view and /g, "open the portal and ");
        }
        await db
          .from("applications")
          .update({
            runner_state: { ...saved, reason: outcome.reason, rechecks: recheck ? (state.rechecks ?? 0) + 1 : 0, samePageCount: 0 },
            runner_session_id: recheck ? ob.sessionId : null,
            runner_status: "needs_you",
            runner_note: outcome.note,
            runner_live_url: live,
            runner_updated_at: new Date().toISOString(),
          })
          .eq("id", applicationId);
        if (app.runner_status !== "needs_you") await logEvent({ userId: job.user_id, actor: "agent:runner", action: "runner.needs_you", applicationId, channel: "portal", context: { reason: outcome.reason, note: outcome.note } });
        if (recheck) await enqueue({ userId: job.user_id, agent: "runner", task: "run", payload: { applicationId }, runAt: new Date(Date.now() + RECHECK_MINUTES * 60_000) });
        return { outcome: "needs_you", reason: outcome.reason, filled };
      }

      await db.from("applications").update({ runner_state: saved, runner_session_id: null, runner_status: "failed", runner_note: outcome.note }).eq("id", applicationId);
      return { outcome: "failed" };
    } catch (e) {
      if (await userHalted(applicationId).catch(() => null)) return { halted: true };
      await setRunner(applicationId, { runner_status: "failed", runner_note: "something went wrong while working on the portal. Choose Try again; if it keeps happening, open the portal and finish that step yourself." }); // the raw error stays on the job for the operator view
      throw e;
    } finally {
      await ob.close(keep);
    }
  },
};

// called when a packet is signed (and from "send to runner")
export async function queueRunner(userId: string, applicationId: string) {
  await admin().from("applications").update({ runner_status: "ready", runner_mode: "cloud", runner_note: "queued", runner_state: {}, runner_live_url: null, runner_updated_at: new Date().toISOString() }).eq("id", applicationId);
  await enqueue({ userId, agent: "runner", task: "run", payload: { applicationId } });
}
