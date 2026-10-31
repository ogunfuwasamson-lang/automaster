// Ivyward runner: the background worker of the chrome extension.
// runs the same portal engine as the cloud runner, but in a tab of the applicant's own chrome: their network,
// their browser, so portals that refuse cloud browsers let it in. it never solves bot checks: when one shows,
// it brings the tab forward, asks the applicant to complete it, and carries on once it's gone.
import { runEngine, isBlockPage, type EngineDeps, type EngineState, type Outcome, type Snapshot } from "@/lib/cloud-engine";
import { chromePage } from "./chrome-page";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

const DEFAULT_API = "https://tryivyward.com";
const RUN_MS = 4 * 60_000; // one engine run; the state is saved between runs
const VERSION = "0.3.1";

type Task = { id: string; school: string; program: string; portal_url: string | null; runner_status: string; note: string | null; mode: string; reason: string | null; resume_at: number | null };
type Active = { taskId: string; school: string; tabId: number; startedAt: number; phase: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// any extension api call keeps the worker awake through long waits
async function nap(ms: number) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    await sleep(Math.min(15_000, end - Date.now()));
    await chrome.runtime.getPlatformInfo();
  }
}

async function cfg(): Promise<{ api: string; token: string; auto: boolean }> {
  return chrome.storage.local.get({ api: DEFAULT_API, token: "", auto: true });
}

async function api(path: string, opts: RequestInit = {}) {
  const c = await cfg();
  if (!c.token) throw new Error("not connected: open Ivyward and choose Connect Chrome");
  const res = await fetch(c.api.replace(/\/$/, "") + path, {
    ...opts,
    headers: { authorization: `Bearer ${c.token}`, ...(opts.body ? { "content-type": "application/json" } : {}), ...((opts.headers as Record<string, string>) || {}) },
  });
  if (res.status === 401) throw new Error("this browser was disconnected: connect it again from Ivyward");
  return res;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function apiJson(path: string, opts?: RequestInit): Promise<any> {
  const res = await api(path, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `error ${res.status}`);
  return json;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const eng = (application: string, op: string, body: Record<string, unknown> = {}): Promise<any> =>
  apiJson("/api/runner/engine", { method: "POST", body: JSON.stringify({ application, op, ...body }) });

async function getActive(): Promise<Active | null> {
  return (await chrome.storage.session.get({ active: null })).active;
}
async function setActive(a: Active | null) {
  await chrome.storage.session.set({ active: a });
}

let running = false;
let lastTasks: { paused: boolean; tasks: Task[] } | null = null;

async function tasks(): Promise<{ paused: boolean; tasks: Task[] }> {
  lastTasks = await apiJson("/api/runner/tasks");
  const n = lastTasks!.tasks.filter((t) => t.runner_status === "needs_you" && t.mode === "extension").length;
  await chrome.action.setBadgeText({ text: running ? "•" : n ? String(n) : "" });
  await chrome.action.setBadgeBackgroundColor({ color: running ? "#4f46e5" : "#ea580c" });
  return lastTasks!;
}

function notify(title: string, message: string) {
  chrome.notifications.create({ type: "basic", iconUrl: "icon.png", title, message, priority: 2 });
}

async function focusTab(tabId: number) {
  const t = await chrome.tabs.update(tabId, { active: true }).catch(() => null);
  if (t) await chrome.windows.update(t.windowId, { focused: true }).catch(() => {});
}

async function tabAlive(tabId: number) {
  return !!(await chrome.tabs.get(tabId).catch(() => null));
}

const sheets = new Map<string, { files: { key: string; url: string; filename: string; label: string }[] }>();

function deps(taskId: string, start: { canReadMail: boolean; accountEmail: string }, tabId: number): EngineDeps {
  const host = async () => new URL((await chrome.tabs.get(tabId)).url).hostname;
  let lastNote = "";
  // paused or cancelled in Ivyward: stop between steps
  let stop = false;
  let checkedAt = 0;
  return {
    shouldStop: () => {
      if (Date.now() - checkedAt > 6000) {
        checkedAt = Date.now();
        apiJson("/api/runner/tasks")
          .then((d: { tasks: Task[] }) => {
            const t = d.tasks.find((x) => x.id === taskId);
            stop = !t || t.mode !== "extension";
          })
          .catch(() => {});
      }
      return stop;
    },
    map: async (fields) =>
      (await apiJson("/api/runner/map", { method: "POST", body: JSON.stringify({ application: taskId, fields: fields.slice(0, 150).map((f) => ({ id: f.id, label: f.label.slice(0, 400), type: f.type, name: f.name?.slice(0, 200), options: f.options?.slice(0, 300).map((o) => o.slice(0, 200)), required: f.required })) }) })).fills,
    file: async (key) => {
      if (!sheets.has(taskId)) sheets.set(taskId, await apiJson(`/api/runner/sheet?application=${taskId}`));
      const f = sheets.get(taskId)!.files.find((x) => x.key === key);
      if (!f) throw new Error("file not in the packet");
      const res = await api(f.url);
      if (!res.ok) throw new Error("couldn't fetch " + f.label);
      return { name: f.filename, mime: res.headers.get("content-type") || "application/octet-stream", buffer: new Uint8Array(await res.arrayBuffer()) };
    },
    canSubmit: () => apiJson("/api/runner/check", { method: "POST", body: JSON.stringify({ application: taskId }) }),
    existingLogin: async () => (await eng(taskId, "login_get", { host: await host() })).login,
    createLogin: async (email) => (await eng(taskId, "login_create", { host: await host(), email })).login,
    accountEmail: start.accountEmail,
    canReadMail: start.canReadMail,
    verification: async (since) => (await eng(taskId, "verification", { host: await host(), since })).found,
    navigate: async (input) => (await eng(taskId, "navigate", { host: await host(), input: { ...input, snapshot: { ...input.snapshot, body: input.snapshot.body.slice(0, 4000) } } })).action,
    fillFromKey: async (field, key) => (await eng(taskId, "fill_key", { field: { id: field.id, label: field.label.slice(0, 400), type: field.type, name: field.name, options: field.options?.slice(0, 300), required: field.required }, key })).fill,
    loginFromMail: start.canReadMail ? async (since) => (await eng(taskId, "login_mail", { host: await host(), since })).login : undefined,
    decide: async (fields, page) =>
      (await eng(taskId, "decide", { fields: fields.slice(0, 60).map((f) => ({ id: f.id, label: f.label.slice(0, 400), type: f.type, name: f.name?.slice(0, 200), options: f.options?.slice(0, 300).map((o) => o.slice(0, 200)), required: f.required })), page: { url: page.url.slice(0, 2000), title: page.title.slice(0, 300), body: page.body.slice(0, 4000) } })).fills ?? [],
    resetLink: start.canReadMail ? async (since) => (await eng(taskId, "reset_link", { host: await host(), since })).link : undefined,
    rotatePassword: async () => (await eng(taskId, "rotate", { host: await host() })).login,
    progress: async (note) => {
      if (note === lastNote) return;
      lastNote = note;
      await eng(taskId, "progress", { note: note.slice(0, 300) }).catch(() => {});
    },
  };
}

// read the page without acting on it
async function peek(tabId: number): Promise<Snapshot | null> {
  try {
    await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, files: ["dom-helper.js"] });
    const [r] = await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, func: () => (window as unknown as { __am: { snapshot(): unknown } }).__am.snapshot() });
    return r?.result ?? null;
  } catch {
    return null;
  }
}

// wait (up to `minutes`) for the applicant to finish a step in the tab: true once `done` says so
async function watch(tabId: number, minutes: number, done: (s: Snapshot) => boolean) {
  const end = Date.now() + minutes * 60_000;
  while (Date.now() < end) {
    await nap(4000);
    if (!(await tabAlive(tabId))) return false;
    const s = await peek(tabId);
    if (s && done(s)) return true;
  }
  return false;
}

async function runTask(task: Task, opts: { tabId?: number; claim?: boolean; focus?: boolean } = {}) {
  if (running) return;
  running = true;
  let tabId: number | undefined;
  try {
    const start = await eng(task.id, "start", { claim: !!opts.claim });
    if (start.stop) {
      if (opts.claim) notify(task.school, start.stop);
      return;
    }
    const prev = await getActive();
    tabId = opts.tabId ?? (prev?.taskId === task.id && (await tabAlive(prev.tabId)) ? prev.tabId : undefined);
    if (!tabId) tabId = (await chrome.tabs.create({ url: start.url, active: !!opts.focus })).id as number;
    else if (opts.focus) await focusTab(tabId);
    await setActive({ taskId: task.id, school: task.school, tabId, startedAt: Date.now(), phase: "working" });
    await tasks().catch(() => {});

    const page = chromePage(tabId);
    await page.waitForLoadState("domcontentloaded", { timeout: 45_000 }).catch(() => {});
    let state: EngineState = start.state;
    for (let round = 0; round < 15; round++) {
      let outcome: Outcome;
      let filled = 0;
      try {
        const r = await runEngine(page, deps(task.id, start, tabId), state, RUN_MS);
        state = r.state;
        outcome = r.outcome;
        filled = r.filled;
      } catch (e) {
        if (!(await tabAlive(tabId))) outcome = { kind: "needs_you", reason: "stuck", note: "the portal tab was closed. Choose Run in my Chrome to carry on" };
        else outcome = { kind: "failed", note: `the agents hit a problem in Chrome: ${String((e as Error)?.message ?? e).slice(0, 160)}` };
      }
      const tab = await chrome.tabs.get(tabId).catch(() => null);
      const url: string | undefined = tab?.url;
      let host: string | undefined;
      try {
        host = url ? new URL(url).hostname : undefined;
      } catch {
        host = undefined;
      }
      const fin = await eng(task.id, "finish", { state, url, filled, host, outcome }).catch(() => ({}));
      if ((fin as { stop?: string }).stop) {
        notify(task.school, "Paused in Ivyward. The tab stays open; nothing else happens until you resume.");
        break;
      }
      if (outcome.kind === "continue") continue;
      if (outcome.kind === "wait") {
        await setActive({ taskId: task.id, school: task.school, tabId, startedAt: Date.now(), phase: "waiting for an email" });
        await nap(Math.min(outcome.seconds, 120) * 1000);
        continue;
      }
      if (outcome.kind === "submitted") {
        notify(`${task.school}: submitted`, "The application went in. Ivyward has recorded it.");
        break;
      }
      if (outcome.kind === "needs_you" && (outcome.reason === "captcha" || outcome.reason === "blocked")) {
        // the applicant completes the check; we never do
        await setActive({ taskId: task.id, school: task.school, tabId, startedAt: Date.now(), phase: "waiting for you" });
        notify(`${task.school}: one check for you`, "Complete the check in the tab that just opened. The agents carry on by themselves.");
        await focusTab(tabId);
        if (await watch(tabId, 30, (s) => !s.captcha && !isBlockPage(s))) {
          await eng(task.id, "progress", { note: "carrying on after the check" }).catch(() => {});
          await nap(1500);
          continue;
        }
        break;
      }
      if (outcome.kind === "needs_you" && outcome.reason === "payment") {
        await setActive({ taskId: task.id, school: task.school, tabId, startedAt: Date.now(), phase: "waiting for payment" });
        notify(`${task.school}: ready to pay`, "Everything is filled in. Pay the application fee in the portal tab; the agents confirm the submission after.");
        await focusTab(tabId);
        const startUrl = url;
        if (await watch(tabId, 60, (s) => s.confirmation || (!s.payment && s.url !== startUrl))) continue;
        break;
      }
      if (outcome.kind === "needs_you") notify(`${task.school}: needs you`, (fin as { note?: string }).note || outcome.note);
      break;
    }
  } catch (e) {
    notify(task.school, String((e as Error)?.message ?? e).slice(0, 200));
  } finally {
    running = false;
    await setActive(null);
    sheets.delete(task.id);
    await tasks().catch(() => {});
  }
}

async function poll() {
  const c = await cfg();
  if (!c.token || running) return;
  let data;
  try {
    data = await tasks();
  } catch {
    return;
  }
  if (data.paused || !c.auto) return;
  const now = Date.now();
  // jobs Ivyward moved to this browser (the portal refused the cloud runner), one at a time
  const next = data.tasks.find((t) => t.mode === "extension" && ["ready", "running"].includes(t.runner_status) && (!t.resume_at || t.resume_at <= now));
  if (next) runTask(next);
}

function ensureAlarm() {
  chrome.alarms.create("poll", { periodInMinutes: 1 });
}
chrome.runtime.onInstalled.addListener(ensureAlarm);
chrome.runtime.onStartup.addListener(ensureAlarm);
chrome.alarms.onAlarm.addListener((a: { name: string }) => a.name === "poll" && poll());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handle(msg: any, sender: any) {
  // from the Ivyward site (bridge.js): pairing and "run now"
  if (msg.type === "bridge:hello") {
    const c = await cfg();
    const a = await getActive();
    return { version: VERSION, paired: !!c.token, running: a ? { id: a.taskId, school: a.school, phase: a.phase } : null };
  }
  if (msg.type === "bridge:pair") {
    const origin = new URL(sender.url).origin;
    if (!/^amr_[\w-]{20,}$/.test(msg.token)) throw new Error("bad key");
    await chrome.storage.local.set({ token: msg.token, api: origin, auto: true });
    ensureAlarm();
    setTimeout(poll, 500);
    return { paired: true, version: VERSION };
  }
  if (msg.type === "bridge:run" || msg.type === "popup:start") {
    const d = await tasks();
    const t = d.tasks.find((x) => x.id === msg.id);
    if (!t) throw new Error("that application isn't queued for submitting");
    if (running) {
      const a = await getActive();
      if (a?.taskId === t.id) return { started: true };
      throw new Error(`busy with ${a?.school ?? "another school"}; this one is next`);
    }
    runTask(t, { claim: true, focus: msg.type === "popup:start" || !!msg.focus });
    return { started: true };
  }
  if (msg.type === "bridge:kick" || msg.type === "popup:poll") {
    poll();
    return { ok: true };
  }
  if (msg.type === "popup:tasks") {
    const d = await tasks();
    return { ...d, active: await getActive() };
  }
  if (msg.type === "popup:attach") {
    // work on the portal page the applicant already has open
    const d = await tasks();
    const t = d.tasks.find((x) => x.id === msg.id);
    if (!t) throw new Error("not in your queue");
    if (running) throw new Error("busy with another school");
    runTask(t, { claim: true, tabId: msg.tabId });
    return { started: true };
  }
  return null;
}

chrome.runtime.onMessage.addListener((msg: unknown, sender: unknown, reply: (v: unknown) => void) => {
  handle(msg, sender).then(
    (v) => reply({ ok: true, value: v }),
    (e) => reply({ ok: false, error: String((e as Error)?.message ?? e) }),
  );
  return true;
});
