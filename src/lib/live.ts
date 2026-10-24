import "server-only";
import { admin } from "@/lib/supabase/admin";
import { openBrowser, type StorageState } from "@/lib/browser";
import { runEngine, type Outcome } from "@/lib/cloud-engine";
import { fromPlaywright } from "@/lib/engine-page";
import { loadApp, loadSheet } from "@/lib/runner";
import { canReadMail } from "@/lib/gmail";
import { decrypt, encrypt } from "@/lib/crypto";
import { enqueue } from "@/lib/queue";
import { logEvent } from "@/lib/events";
import { getLogin, markLogin } from "@/lib/vault";
import { normalizeUrl } from "@/lib/portal-url";
import { markSubmitted, serverDeps, setRunner, type RunnerState } from "@/agents/runner";

// the live browser: the cloud runner's browser, streamed into automaster as screenshots, with the applicant's
// clicks and keys sent back. the agents drive until a step needs the applicant; the applicant does it in the
// same browser (bot check, payment, a question) and hands back. one session lasts as long as a function may run.

export const LIVE_MS = 270_000;
export const VIEW = { width: 1280, height: 860 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Input = { id: number; kind: "click" | "type" | "key" | "scroll" | "control"; data: Record<string, unknown> };

const KEYS = new Set(["Enter", "Backspace", "Tab", "Escape", "Delete", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown", "Space"]);

function liveNote(o: Outcome): string {
  if (o.kind !== "needs_you") return o.note;
  switch (o.reason) {
    case "captcha":
      return "Complete the check in the browser below, then choose Hand back to agents.";
    case "blocked":
      return "This portal is blocking the cloud browser. Try getting past it below. If it won't let you in, close this and choose Run in my Chrome.";
    case "payment":
      return "Everything is filled in. Pay the application fee below (or in your own browser), then choose Hand back to agents so they can confirm the submission.";
    case "account":
      return "This portal won't let the agents create the account. Create it below with the email and password from Your portal login, then choose Hand back to agents.";
    case "verification":
      return "The portal wants the code it emailed you. Enter it below, then choose Hand back to agents.";
    default:
      return `${o.note.replace(/open the live view and |open the live view/g, "").replace(/^./, (c) => c.toUpperCase())}. You can do it below, then choose Hand back to agents.`.replace(/\.\./g, ".");
  }
}

export async function runLiveSession(sessionId: string) {
  const db = admin();
  const T0 = Date.now();
  const left = () => LIVE_MS - (Date.now() - T0);
  const { data: sess } = await db.from("live_sessions").select("id, user_id, application_id").eq("id", sessionId).single();
  if (!sess) return;
  const userId = sess.user_id as string;
  const applicationId = sess.application_id as string;
  const set = (patch: Record<string, unknown>) => db.from("live_sessions").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", sessionId).then(() => undefined);

  const app = await loadApp(userId, applicationId);
  const sheet = app ? await loadSheet(userId, applicationId) : null;
  if (!app || !sheet) {
    await set({ status: "ended", prompt: "This application isn't ready for submitting yet." });
    return;
  }
  const { data: row } = await db.from("applications").select("runner_state").eq("id", applicationId).single();
  let state = ((row?.runner_state ?? {}) as RunnerState) || {};
  state.steps = 0;
  state.samePageCount = 0;
  state.navCalls = 0;
  const storage = state.storage_enc ? (JSON.parse(decrypt(state.storage_enc)) as StorageState) : null;
  const portal = normalizeUrl(state.last_url) ?? normalizeUrl(app.portal_url) ?? normalizeUrl((app.programs as unknown as { url: string | null }).url);
  if (!portal) {
    await set({ status: "ended", prompt: "There's no portal link yet. Add it on the application page first." });
    return;
  }

  await set({ status: "starting", prompt: "Opening the portal…", ends_at: new Date(T0 + LIVE_MS).toISOString() });
  await setRunner(applicationId, { runner_status: "running", runner_note: "working in the live browser" });
  await logEvent({ userId, actor: "user", action: "runner.live_opened", applicationId, channel: "portal" });

  const ob = await openBrowser({ storage });
  const page = ob.page;
  await page.setViewportSize(VIEW).catch(() => {});
  let mode = "agent" as "agent" | "you";
  let ended = false;
  let stopAgent = false;
  let lastOutcome: Outcome | null = null;
  let submitted = false;
  let filled = 0;

  // screenshots out
  const pump = (async () => {
    let last = "";
    let seq = 0;
    let beat = 0;
    while (!ended) {
      try {
        const b64 = (await page.screenshot({ type: "jpeg", quality: 55, timeout: 6000 })).toString("base64");
        if (b64 !== last) {
          last = b64;
          seq += 1;
          await set({ frame: b64, frame_seq: seq, url: page.url() });
          beat = Date.now();
        } else if (Date.now() - beat > 5000) {
          await set({});
          beat = Date.now();
        }
      } catch {
        /* mid-navigation: next frame */
      }
      await sleep(mode === "you" ? 350 : 800);
    }
  })();

  // clicks and keys in (only while the applicant has control), plus the control buttons
  const inputs = (async () => {
    let lastId = 0;
    while (!ended) {
      const { data } = await db.from("live_inputs").select("id, kind, data").eq("session_id", sessionId).gt("id", lastId).order("id").limit(60);
      const list = (data ?? []) as Input[];
      for (const i of list) {
        lastId = i.id;
        try {
          if (i.kind === "control") {
            const c = i.data.action;
            if (c === "take") {
              stopAgent = true;
              mode = "you";
              await set({ status: "you", prompt: "You have control. Choose Hand back to agents when you're done." });
            } else if (c === "continue") {
              mode = "agent";
            } else if (c === "end") ended = true;
            continue;
          }
          if (mode !== "you") continue;
          const d = i.data as { x?: number; y?: number; text?: string; key?: string; dy?: number };
          if (i.kind === "click" && typeof d.x === "number" && typeof d.y === "number") await page.mouse.click(Math.max(0, Math.min(VIEW.width, d.x)), Math.max(0, Math.min(VIEW.height, d.y)));
          if (i.kind === "type" && d.text) await page.keyboard.type(String(d.text).slice(0, 500));
          if (i.kind === "key" && d.key && KEYS.has(d.key)) await page.keyboard.press(d.key === "Space" ? " " : d.key);
          if (i.kind === "scroll" && typeof d.dy === "number") await page.mouse.wheel(0, Math.max(-2000, Math.min(2000, d.dy)));
        } catch {
          /* a click on a page that moved on */
        }
      }
      // what the applicant typed is never kept
      if (list.length) await db.from("live_inputs").delete().eq("session_id", sessionId).lte("id", lastId);
      await sleep(180);
    }
  })();

  try {
    await page.goto(portal, { waitUntil: "domcontentloaded", timeout: 45_000 }).catch(() => {});
    const readMail = await canReadMail(userId).catch(() => false);
    const host = () => {
      try {
        return new URL(page.url()).hostname;
      } catch {
        return "";
      }
    };
    while (!ended && left() > 20_000) {
      if (mode === "you") {
        await sleep(400);
        continue;
      }
      stopAgent = false;
      await set({ status: "agent", prompt: "The agents are working on the portal. Choose Take control at any time." });
      const deps = { ...serverDeps({ userId, applicationId, jobId: null, sheet, readMail, host }), shouldStop: () => stopAgent || ended || left() < 25_000 };
      const r = await runEngine(fromPlaywright(page), deps, state, Math.max(10_000, left() - 25_000));
      state = r.state;
      filled += r.filled;
      const o = r.outcome;
      lastOutcome = o;
      if (o.kind === "submitted") {
        submitted = true;
        await markSubmitted(userId, applicationId, app.program_id, o.note, page.url(), filled, "live");
        await set({ status: "you", prompt: "Submitted. The portal showed a confirmation and automaster has recorded it." });
        await sleep(4000);
        break;
      }
      if (o.kind === "continue") {
        if (stopAgent) continue; // the applicant took over; the take message already set the prompt
        break; // out of time
      }
      if (o.kind === "wait") {
        await set({ status: "agent", prompt: "Waiting for the portal's email…" });
        const until = Date.now() + Math.min(o.seconds, 60) * 1000;
        while (!ended && mode === "agent" && Date.now() < until) await sleep(500);
        continue;
      }
      mode = "you";
      await set({ status: "you", prompt: o.kind === "failed" ? "The agents hit a problem on this page. You can carry on yourself, or hand back to try again." : liveNote(o) });
    }
  } finally {
    ended = true;
    await Promise.allSettled([pump, inputs]);
    let url = state.last_url;
    let saved: StorageState | null = null;
    try {
      url = page.url();
      saved = await ob.storage();
    } catch {
      /* browser already gone */
    }
    await ob.close(false);
    const next: RunnerState = { ...state, last_url: url, storage_enc: saved ? encrypt(JSON.stringify(saved)) : state.storage_enc, samePageCount: 0, rechecks: 0, reason: null };
    if (submitted) {
      await db.from("applications").update({ runner_state: next }).eq("id", applicationId);
    } else {
      // the cloud runner picks up straight away from where the live browser left off, with its cookies
      await db.from("applications").update({ runner_state: next, runner_mode: "cloud", runner_status: "ready", runner_note: "picking up after the live browser", runner_updated_at: new Date().toISOString() }).eq("id", applicationId);
      await enqueue({ userId, agent: "runner", task: "run", payload: { applicationId } });
    }
    const login = await getLogin(userId, url ? new URL(url).hostname : "", applicationId).catch(() => null);
    if (login && login.status !== "verified" && (submitted || state.signedIn)) await markLogin(login.id, "verified").catch(() => {});
    await set({ status: "ended", frame: null, prompt: submitted ? "Submitted." : lastOutcome?.kind === "needs_you" && lastOutcome.reason === "payment" ? "Session closed. The agents keep checking for the payment." : "Session closed. The agents carry on from here." });
    await db.from("live_inputs").delete().eq("session_id", sessionId);
  }
}
