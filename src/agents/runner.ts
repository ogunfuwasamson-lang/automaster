import "server-only";
import * as z from "zod/v4";
import type { Handler } from "./index";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { logEvent, recordOutcome } from "@/lib/events";
import { research } from "@/lib/research";
import { runStructured } from "@/lib/llm";
import { loadApp, loadSheet, mapFields, sheetFile, submitDecision } from "@/lib/runner";
import { createLogin, getLogin, markLogin } from "@/lib/vault";
import { canReadMail, recentMail } from "@/lib/gmail";
import { extractVerification, hostRoot } from "@/lib/verify-mail";
import { decrypt, encrypt } from "@/lib/crypto";
import { openBrowser, type StorageState } from "@/lib/browser";
import { runEngine, type EngineState } from "@/lib/cloud-engine";
import { looksLikePortal, normalizeUrl } from "@/lib/portal-url";
import { hostRoot as rootOf } from "@/lib/verify-mail";

// the cloud runner: finds the portal, creates the applicant's account, fills, uploads and submits
// the signed packet from our servers. nothing to install for the applicant.

const RUN_BUDGET_MS = 200_000; // stay well inside the function's 300s
const RECHECKS = 8; // after a handoff (bot check, payment), look again this many times, 10 min apart

const PortalOut = z.object({ portal_url: z.string(), account_needed: z.enum(["yes", "no", "unknown"]), notes: z.string() });

type RunnerState = EngineState & { storage_enc?: string; last_url?: string; rechecks?: number };

async function setRunner(applicationId: string, patch: Record<string, unknown>) {
  await admin().from("applications").update({ ...patch, runner_updated_at: new Date().toISOString() }).eq("id", applicationId);
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
    let url = cand && (seen(cand) || (schoolRoot && rootOf(new URL(cand).hostname) === schoolRoot)) ? cand : null;
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
    const { data: row0 } = await db.from("applications").select("runner_state").eq("id", applicationId).maybeSingle();
    if (!app || app.status !== "packet_approved" || !["ready", "running", "needs_you"].includes(app.runner_status as string)) return { skipped: "not queued" };
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
      let lastNote = "";

      const { outcome, state: next, filled } = await runEngine(
        page,
        {
          map: (fields) => mapFields(job.user_id, sheet, fields),
          file: (key) => sheetFile(job.user_id, sheet, key),
          canSubmit: () => submitDecision(job.user_id, applicationId),
          existingLogin: () => getLogin(job.user_id, host()),
          createLogin: async (email) => {
            const l = await createLogin(job.user_id, applicationId, host(), email);
            await logEvent({ userId: job.user_id, actor: "agent:runner", action: "runner.account_created", applicationId, channel: "portal", context: { host: host(), email } });
            return l;
          },
          accountEmail: sheet.fields.email ?? "",
          canReadMail: readMail,
          verification: async (since) => {
            const root = hostRoot(host());
            const mails = await recentMail(job.user_id, `newer_than:1d (from:${root} OR subject:(verify OR verification OR code OR confirm OR activate OR account OR pin))`, 8);
            for (const m of mails.filter((x) => x.at >= since - 60_000).sort((a, b) => b.at - a.at)) {
              const v = extractVerification(m, host());
              if (v.code || v.link) return v;
            }
            return null;
          },
          progress: async (note) => {
            if (note === lastNote) return;
            lastNote = note;
            await setRunner(applicationId, { runner_note: note });
          },
        },
        state,
        RUN_BUDGET_MS,
      );

      const saved: RunnerState & { debug?: unknown } = {
        ...next,
        last_url: page.url(),
        storage_enc: encrypt(JSON.stringify(await ob.storage())),
        // what the last page looked like, for fixing the runner (no values, labels only)
        debug: await page
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
          .catch(() => null),
      };
      const login = await getLogin(job.user_id, host()).catch(() => null);
      if (login && login.status !== "verified" && (outcome.kind === "submitted" || next.steps > 3)) await markLogin(login.id, "verified");

      if (outcome.kind === "submitted") {
        await db.from("applications").update({ runner_state: saved, runner_session_id: null }).eq("id", applicationId);
        const { error } = await db.from("applications").update({ status: "submitted", runner_status: "submitted", runner_note: outcome.note, runner_live_url: null, runner_updated_at: new Date().toISOString() }).eq("id", applicationId);
        if (error) throw new Error(error.message);
        const eventId = await logEvent({ userId: job.user_id, actor: "agent:runner", action: "runner.submitted", applicationId, programId: app.program_id, channel: "portal", context: { url: page.url(), filled } });
        await logEvent({ userId: job.user_id, actor: "agent:runner", action: "application.submitted", applicationId, programId: app.program_id, channel: "portal" });
        await recordOutcome({ userId: job.user_id, eventId, applicationId, kind: "proxy", label: "submitted", source: "runner" });
        return { submitted: true, filled };
      }

      if (outcome.kind === "wait" || outcome.kind === "continue") {
        keep = true;
        await db.from("applications").update({ runner_state: saved, runner_session_id: ob.sessionId }).eq("id", applicationId);
        await enqueue({ userId: job.user_id, agent: "runner", task: "run", payload: { applicationId }, runAt: new Date(Date.now() + (outcome.kind === "wait" ? outcome.seconds * 1000 : 0)) });
        return { outcome: outcome.kind, note: outcome.note, filled };
      }

      if (outcome.kind === "needs_you") {
        // bot checks and payments: the applicant finishes that step (live view, or their own browser with the
        // login we show them). we look again every 10 minutes and carry on once it's done.
        const liveView = !!ob.sessionId;
        // a bot check only clears in the browser that saw it: without a live view, hand the portal over instead of looping
        const recheck = (outcome.reason === "payment" || outcome.reason === "verification" || (outcome.reason === "captcha" && liveView)) && (state.rechecks ?? 0) < RECHECKS;
        keep = recheck;
        const live = liveView ? await ob.liveUrl() : null;
        if (!liveView) {
          const login = await getLogin(job.user_id, new URL(page.url()).hostname).catch(() => null);
          const signIn = login ? " sign in with the login shown below," : "";
          if (outcome.reason === "captcha") outcome.note = `this portal shows a bot check to automated browsers. open it yourself,${signIn} and finish the application there (your answers are on this page). or press try again later`;
          if (outcome.reason === "payment") outcome.note = `payment page: open the portal,${signIn} and pay the fee. the agents check back every 10 minutes and confirm the submission`;
          if (outcome.reason === "verification") outcome.note = outcome.note.replace("open the live view and enter it", "enter it on the portal");
          outcome.note = outcome.note.replace(/open the live view and /g, "open the portal and ");
        }
        await db
          .from("applications")
          .update({
            runner_state: { ...saved, rechecks: recheck ? (state.rechecks ?? 0) + 1 : 0, samePageCount: 0 },
            runner_session_id: recheck ? ob.sessionId : null,
            runner_status: "needs_you",
            runner_note: outcome.note,
            runner_live_url: live,
            runner_updated_at: new Date().toISOString(),
          })
          .eq("id", applicationId);
        if (app.runner_status !== "needs_you") await logEvent({ userId: job.user_id, actor: "agent:runner", action: "runner.needs_you", applicationId, channel: "portal", context: { reason: outcome.reason, note: outcome.note } });
        if (recheck) await enqueue({ userId: job.user_id, agent: "runner", task: "run", payload: { applicationId }, runAt: new Date(Date.now() + 10 * 60_000) });
        return { outcome: "needs_you", reason: outcome.reason, filled };
      }

      await db.from("applications").update({ runner_state: saved, runner_session_id: null, runner_status: "failed", runner_note: outcome.note }).eq("id", applicationId);
      return { outcome: "failed" };
    } catch (e) {
      await setRunner(applicationId, { runner_status: "failed", runner_note: `hit a problem: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}` });
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
