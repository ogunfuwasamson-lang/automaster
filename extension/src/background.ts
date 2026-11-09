// Ivyward runner: the background worker of the chrome extension.
// runs the same portal engine as the cloud runner, but in tabs of the applicant's own chrome: their network,
// their browser, so portals that refuse cloud browsers let it in. it never solves bot checks and never pays:
// those go to the applicant, in the side panel, and the run carries on once they're done.
//
// what it adds on top of the engine (see claude/extension-roadmap.md):
// - a side panel: progress, every answer it puts in, Pause / Take over / Hand back, the agents' questions
// - its own tab group, and a small bar on the portal page while it works
// - approval modes: ask before each page, or fill everything and ask before submitting (always asks to submit)
// - a review of every answer, page by page with pictures, before the submit button is pressed
// - several schools at once in background tabs; hand-offs wait in the panel instead of taking the window
// - the run's history (pages, answers by label, pictures) kept in Ivyward
// - the applicant's corrections, learned when they hand back
// - sign-in with the applicant's own password manager
// - weekly read-only status checks of submitted applications
// - facts read from a tab the applicant is looking at
// - a check before working on a site that isn't the school's portal
import { runEngine, isBlockPage, classify, IDP_HOST, type EngineDeps, type EngineState, type Outcome, type Snapshot } from "@/lib/cloud-engine";
import { chromePage, captureSmall } from "./chrome-page";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

const DEFAULT_API = "https://tryivyward.com";
const RUN_MS = 15 * 60_000; // one engine run in the applicant's own chrome (no server time limit); the state is saved between runs
const VERSION: string = chrome.runtime.getManifest().version;
const GROUP_TITLE = "Ivyward";
const PAY_HOST = /(^|\.)(flywire\.com|paypal\.com|stripe\.com|checkout\.stripe\.com|braintreegateway\.com|cybersource\.com|authorize\.net|paymentus\.com|touchnet\.(com|net)|transact\.com|nelnet\.(com|net)|worldpay\.com|adyen\.com|paystack\.co|paystack\.com|flutterwave\.com)$/i;
const MAX_PAGES = 15; // pages kept for the review, newest last

type Task = { id: string; school: string; program: string; portal_url: string | null; runner_status: string; note: string | null; mode: string; reason: string | null; resume_at: number | null };
type Answer = { id: string; label: string; action: string; value: string };
type Page = { title: string; url: string; fills: Answer[]; shot?: string };
// what the panel shows for each run (kept in chrome.storage.session, so the panel updates as it changes)
type RunView = { taskId: string; school: string; tabId: number; startedAt: number; phase: string; state: "working" | "paused" | "taken_over" | "waiting"; pages: Page[]; current: Page | null };
type Pending = { id: string; taskId: string; school: string; kind: "page" | "submit" | "offsite" | "signin" | "check" | "payment"; title: string; detail?: string; host?: string; at: number };
type Settings = { api: string; token: string; auto: boolean; approval: "submit" | "page"; parallel: number; pmSignIn: boolean; checkins: boolean };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// any extension api call keeps the worker awake through long waits
async function nap(ms: number) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    await sleep(Math.min(15_000, end - Date.now()));
    await chrome.runtime.getPlatformInfo();
  }
}

async function cfg(): Promise<Settings> {
  return chrome.storage.local.get({ api: DEFAULT_API, token: "", auto: true, approval: "submit", parallel: 2, pmSignIn: false, checkins: true });
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const panelApi = (body: Record<string, unknown>): Promise<any> => apiJson("/api/runner/panel", { method: "POST", body: JSON.stringify(body) });

// ---------- the runs, and what the panel sees ----------

// live control of each run (not saved): the panel's buttons set these
type Control = { stop: boolean; why: "" | "pause" | "takeover" | "closed" | "ivyward" | "offsite"; offsite?: string; allow: Set<string>; approvedPage?: boolean };
const runs = new Map<string, RunView>();
const control = new Map<string, Control>();
let lastTasks: { paused: boolean; tasks: Task[] } | null = null;

async function publish() {
  const pending: Pending[] = (await chrome.storage.session.get({ pending: [] })).pending;
  await chrome.storage.session.set({ runs: [...runs.values()] });
  const waiting = (lastTasks?.tasks ?? []).filter((t) => t.runner_status === "needs_you" && t.mode === "extension").length;
  const n = pending.length + waiting;
  await chrome.action.setBadgeText({ text: n ? String(n) : runs.size ? "•" : "" }).catch(() => {});
  await chrome.action.setBadgeBackgroundColor({ color: n ? "#ea580c" : "#4f46e5" }).catch(() => {});
}
async function setPhase(taskId: string, phase: string, st?: RunView["state"]) {
  const r = runs.get(taskId);
  if (!r) return;
  r.phase = phase;
  if (st) r.state = st;
  await publish();
  await banner(r.tabId, r.school, phase, r.state);
}

async function tasks(): Promise<{ paused: boolean; tasks: Task[] }> {
  lastTasks = await apiJson("/api/runner/tasks");
  await publish();
  return lastTasks!;
}

function notify(id: string, title: string, message: string) {
  chrome.notifications.create(id + ":" + Date.now(), { type: "basic", iconUrl: "icons/icon-128.png", title, message, priority: 2 });
}
chrome.notifications.onClicked.addListener(async (nid: string) => {
  const r = runs.get(nid.split(":")[0]);
  if (r) await focusTab(r.tabId);
  else await openPanel();
});

async function focusTab(tabId: number) {
  const t = await chrome.tabs.update(tabId, { active: true }).catch(() => null);
  if (t) await chrome.windows.update(t.windowId, { focused: true }).catch(() => {});
}
async function openPanel(windowId?: number) {
  try {
    const w = windowId ?? (await chrome.windows.getLastFocused()).id;
    await chrome.sidePanel.open({ windowId: w });
  } catch {
    /* needs a click from the applicant; the badge and notification still show */
  }
}
async function tabAlive(tabId: number) {
  return !!(await chrome.tabs.get(tabId).catch(() => null));
}

// ---------- the agents' tab group ----------
async function intoGroup(tabId: number) {
  try {
    const tab = await chrome.tabs.get(tabId);
    const { groupId } = await chrome.storage.session.get({ groupId: -1 });
    let gid = -1;
    if (groupId >= 0) {
      const g = await chrome.tabGroups.get(groupId).catch(() => null);
      if (g && g.windowId === tab.windowId) gid = groupId;
    }
    gid = await chrome.tabs.group(gid >= 0 ? { tabIds: [tabId], groupId: gid } : { tabIds: [tabId] });
    await chrome.tabGroups.update(gid, { title: GROUP_TITLE, color: "purple" });
    await chrome.storage.session.set({ groupId: gid });
  } catch {
    /* tab groups are a nicety: carry on without one */
  }
}

// ---------- the bar on the portal page ----------
// a closed shadow root: the agents' page reader can't see it, so it's never mistaken for part of the form
function pageBanner(a: { school: string; phase: string; state: string; hide?: boolean }) {
  const ID = "ivyward-runner-bar";
  let host = document.getElementById(ID) as (HTMLElement & { __root?: ShadowRoot }) | null;
  if (a.hide) {
    host?.remove();
    return true;
  }
  if (!host) {
    host = document.createElement("div") as HTMLElement & { __root?: ShadowRoot };
    host.id = ID;
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:2147483647;pointer-events:none";
    const root = host.attachShadow({ mode: "closed" });
    host.__root = root;
    root.innerHTML = `<style>
      .bar{pointer-events:auto;display:flex;gap:8px;align-items:center;font:12px/1.3 system-ui,sans-serif;background:#1c1530;color:#fff;border-radius:999px;padding:6px 6px 6px 12px;box-shadow:0 2px 10px rgba(0,0,0,.25);max-width:340px}
      .dot{width:8px;height:8px;border-radius:50%;background:#a78bfa;flex:none}
      .t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      button{font:inherit;border:0;border-radius:999px;padding:4px 10px;cursor:pointer;background:#fff;color:#1c1530}
      button.ghost{background:transparent;color:#d8ccff}
    </style><div class="bar"><span class="dot"></span><span class="t"></span><button class="ghost" data-a="panel">Details</button><button data-a="pause">Pause</button></div>`;
    root.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("button");
      if (b) chrome.runtime.sendMessage({ type: "banner:" + b.dataset.a });
    });
    document.documentElement.appendChild(host);
  }
  const root = host.__root!;
  (root.querySelector(".t") as HTMLElement).textContent = a.state === "paused" || a.state === "taken_over" ? `Ivyward paused · ${a.school}` : `Ivyward is working · ${a.phase}`;
  const btn = root.querySelector('[data-a="pause"]') as HTMLButtonElement;
  btn.textContent = a.state === "paused" || a.state === "taken_over" ? "Resume" : "Pause";
  btn.dataset.a = a.state === "paused" || a.state === "taken_over" ? "resume" : "pause";
  return true;
}
async function banner(tabId: number, school: string, phase: string, state: string, hide = false) {
  await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, func: pageBanner, args: [{ school, phase: phase.slice(0, 80), state, hide }] }).catch(() => {});
}
// pages load and lose the bar: put it back
chrome.webNavigation.onCompleted.addListener((d: { tabId: number; frameId: number }) => {
  if (d.frameId !== 0) return;
  for (const r of runs.values()) if (r.tabId === d.tabId) banner(r.tabId, r.school, r.phase, r.state);
});

// ---------- asking the applicant (side panel) ----------
async function ask(p: Omit<Pending, "id" | "at">, minutes: number): Promise<boolean | null> {
  const id = `${p.taskId}:${p.kind}:${Date.now()}`;
  const { pending } = await chrome.storage.session.get({ pending: [] });
  await chrome.storage.session.set({ pending: [...(pending as Pending[]).filter((x) => !(x.taskId === p.taskId && x.kind === p.kind)), { ...p, id, at: Date.now() }] });
  await publish();
  notify(p.taskId, p.school, p.title);
  const end = Date.now() + minutes * 60_000;
  let answer: boolean | null = null;
  while (Date.now() < end) {
    const { answers } = await chrome.storage.session.get({ answers: {} });
    if (id in answers) {
      answer = !!answers[id];
      delete answers[id];
      await chrome.storage.session.set({ answers });
      break;
    }
    const c = control.get(p.taskId);
    if (c?.stop && c.why !== "offsite") break;
    await sleep(1000);
    await chrome.runtime.getPlatformInfo();
  }
  const { pending: now } = await chrome.storage.session.get({ pending: [] });
  await chrome.storage.session.set({ pending: (now as Pending[]).filter((x) => x.id !== id) });
  await publish();
  return answer;
}

// ---------- pages, answers and the review ----------
function closePage(r: RunView, tabUrl?: string) {
  const last = r.pages[r.pages.length - 1];
  // the same page again with nothing new typed (after a hand-back, a resume): only its picture is fresher
  if (r.current && !r.current.fills.length && last && last.url === r.current.url) {
    if (r.current.shot) last.shot = r.current.shot;
  } else if (r.current && (r.current.fills.length || r.current.shot)) {
    r.pages = [...r.pages, r.current].slice(-MAX_PAGES);
  }
  r.current = tabUrl ? { title: "", url: tabUrl, fills: [] } : null;
}
// the page is done: picture it (only when its tab is on screen: background tabs are never pulled forward for
// this), keep it for the review, and send it to Ivyward's run history
async function finishPage(taskId: string) {
  const r = runs.get(taskId);
  if (!r?.current) return;
  const tab = await chrome.tabs.get(r.tabId).catch(() => null);
  if (!tab) return;
  r.current.title = tab.title || r.current.title;
  if (tab.active) r.current.shot = await captureSmall(r.tabId).catch(() => undefined);
  const page = r.current;
  if (page.fills.length) {
    panelApi({ op: "page", application: taskId, title: page.title.slice(0, 300), url: page.url.slice(0, 2000), filled: page.fills.map((f) => f.label.slice(0, 200)).slice(0, 150), shot: page.shot?.replace(/^data:image\/jpeg;base64,/, "") }).catch(() => {});
  }
  closePage(r, tab.url);
  await publish();
}

// ---------- the sites a run may work on ----------
const root = (h: string) => h.replace(/^www\./, "").split(".").slice(-2).join(".");
function hostOf(u?: string | null) {
  try {
    return u ? new URL(u).hostname : "";
  } catch {
    return "";
  }
}
async function allowed(taskId: string): Promise<Set<string>> {
  const { allow } = await chrome.storage.local.get({ allow: {} });
  return new Set([...(control.get(taskId)?.allow ?? []), ...((allow as Record<string, string[]>)[taskId] ?? [])]);
}
async function remember(taskId: string, host: string) {
  const { allow } = await chrome.storage.local.get({ allow: {} });
  const a = allow as Record<string, string[]>;
  a[taskId] = [...new Set([...(a[taskId] ?? []), root(host)])].slice(-20);
  await chrome.storage.local.set({ allow: a });
  control.get(taskId)?.allow.add(root(host));
}
// a run's tab went somewhere: a site that isn't the school's portal (or a sign-in or payment provider) stops it
// until the applicant says it's fine
chrome.webNavigation.onCommitted.addListener(async (d: { tabId: number; frameId: number; url: string }) => {
  if (d.frameId !== 0 || !/^https?:/.test(d.url)) return;
  for (const r of runs.values()) {
    if (r.tabId !== d.tabId) continue;
    const c = control.get(r.taskId);
    const h = hostOf(d.url);
    if (!c || !h || IDP_HOST.test(h) || PAY_HOST.test(h)) return;
    if ((await allowed(r.taskId)).has(root(h))) return;
    c.stop = true;
    c.why = "offsite";
    c.offsite = h;
  }
});

// ---------- one run ----------
function deps(taskId: string, start: { canReadMail: boolean; accountEmail: string }, tabId: number, s: Settings): EngineDeps {
  const host = async () => new URL((await chrome.tabs.get(tabId)).url).hostname;
  let lastNote = "";
  const typed = new Map<string, string>();
  // the document keys, for the screenshot steps' upload choices
  if (!sheets.has(taskId)) apiJson(`/api/runner/sheet?application=${taskId}`).then((d) => sheets.set(taskId, d)).catch(() => {});
  // paused or cancelled in Ivyward, or from the panel: stop between steps
  let checkedAt = 0;
  return {
    shouldStop: () => {
      const c = control.get(taskId);
      if (Date.now() - checkedAt > 6000) {
        checkedAt = Date.now();
        apiJson("/api/runner/tasks")
          .then((d: { tasks: Task[] }) => {
            const t = d.tasks.find((x) => x.id === taskId);
            if ((!t || t.mode !== "extension") && c) {
              c.stop = true;
              c.why = "ivyward";
            }
          })
          .catch(() => {});
      }
      return !!c?.stop;
    },
    map: async (fields) =>
      (await apiJson("/api/runner/map", { method: "POST", body: JSON.stringify({ application: taskId, host: await host().catch(() => undefined), fields: fields.slice(0, 150).map((f) => ({ id: f.id, label: f.label.slice(0, 400), type: f.type, name: f.name?.slice(0, 200), options: f.options?.slice(0, 300).map((o) => o.slice(0, 200)), required: f.required })) }) })).fills,
    file: async (key) => {
      if (!sheets.has(taskId)) sheets.set(taskId, await apiJson(`/api/runner/sheet?application=${taskId}`));
      const f = sheets.get(taskId)!.files.find((x) => x.key === key);
      if (!f) throw new Error("file not in the packet");
      const res = await api(f.url);
      if (!res.ok) throw new Error("couldn't fetch " + f.label);
      return { name: f.filename, mime: res.headers.get("content-type") || "application/octet-stream", buffer: new Uint8Array(await res.arrayBuffer()) };
    },
    // the server checks the packet is signed and paid for; then the applicant sees every answer and says submit.
    // nothing is submitted from this browser without that yes
    canSubmit: async () => {
      const d = await apiJson("/api/runner/check", { method: "POST", body: JSON.stringify({ application: taskId }) });
      if (!d.allowed) return d;
      const r = runs.get(taskId);
      await finishPage(taskId);
      if (r) await setPhase(taskId, "waiting for you to review and submit", "waiting");
      const yes = await ask({ taskId, school: r?.school ?? "", kind: "submit", title: "Everything is filled in. Check your answers in the side panel, then choose Submit." }, 60);
      if (r) await setPhase(taskId, yes ? "submitting" : "waiting for your review", "working");
      return yes ? d : { allowed: false, reason: "waiting for you to review the answers and choose Submit in the Ivyward side panel" };
    },
    existingLogin: async () => (await eng(taskId, "login_get", { host: await host() })).login,
    createLogin: async (email) => (await eng(taskId, "login_create", { host: await host(), email })).login,
    accountEmail: start.accountEmail,
    canReadMail: start.canReadMail,
    verification: async (since) => (await eng(taskId, "verification", { host: await host(), since })).found,
    navigate: async (input) => (await eng(taskId, "navigate", { host: await host(), input: { ...input, snapshot: { ...input.snapshot, body: input.snapshot.body.slice(0, 4000) } } })).action,
    fillFromKey: async (field, key) => (await eng(taskId, "fill_key", { field: { id: field.id, label: field.label.slice(0, 400), type: field.type, name: field.name, options: field.options?.slice(0, 300), required: field.required }, key })).fill,
    loginFromMail: start.canReadMail ? async (since) => (await eng(taskId, "login_mail", { host: await host(), since })).login : undefined,
    decide: async (fields, page) =>
      (await eng(taskId, "decide", { fields: fields.slice(0, 60).map((f) => ({ id: f.id, label: f.label.slice(0, 400), type: f.type, name: f.name?.slice(0, 200), options: f.options?.slice(0, 300).map((o) => o.slice(0, 200)), required: f.required })), page: { url: page.url.slice(0, 2000), title: page.title.slice(0, 300), body: page.body.slice(0, 4000), errors: (page.errors ?? []).slice(0, 20).map((e) => e.slice(0, 300)) } })).fills ?? [],
    resetLink: start.canReadMail ? async (since) => (await eng(taskId, "reset_link", { host: await host(), since })).link : undefined,
    rotatePassword: async () => (await eng(taskId, "rotate", { host: await host() })).login,
    // screenshot steps: the picture goes to Ivyward, which picks the move (and the value to type, from the fill sheet)
    see: async (v) => {
      let bin = "";
      for (let i = 0; i < v.image.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(v.image.subarray(i, i + 0x8000)));
      const r = await eng(taskId, "see", { host: await host(), image: btoa(bin), goal: v.goal.slice(0, 400), url: v.url.slice(0, 2000), history: v.history.slice(-12).map((h) => h.slice(0, 200)), empty: v.empty.slice(0, 30).map((e) => e.slice(0, 200)), marks: v.marks.slice(0, 120).map((m) => ({ ...m, type: m.type.slice(0, 30), label: m.label.slice(0, 200), value: m.value.slice(0, 200) })) });
      if (r.action?.sheet_key && typeof r.value === "string") typed.set(r.action.sheet_key, r.value);
      return r.action ?? null;
    },
    sheetValue: (key) => typed.get(key) ?? null,
    files: () => sheets.get(taskId)?.files.map((f) => f.key) ?? [],
    progress: async (note) => {
      if (note === lastNote) return;
      lastNote = note;
      await setPhase(taskId, note);
      await eng(taskId, "progress", { note: note.slice(0, 300) }).catch(() => {});
    },
    onFilled: (f) => {
      const r = runs.get(taskId);
      if (!r) return;
      if (!r.current) r.current = { title: "", url: "", fills: [] };
      r.current.fills = [...r.current.fills.filter((x) => x.id !== f.id), { id: f.id, label: f.label.replace(/\s+/g, " ").trim().slice(0, 160), action: f.action, value: f.value.slice(0, 300) }].slice(-120);
      publish();
    },
    beforeNext: async (p) => {
      await finishPage(taskId);
      if (s.approval !== "page") return true;
      // approved from the panel while the run was held: this page goes on without asking twice
      const c = control.get(taskId);
      if (c?.approvedPage) {
        c.approvedPage = false;
        return true;
      }
      const r = runs.get(taskId);
      await setPhase(taskId, "waiting for you to approve this page", "waiting");
      const yes = await ask({ taskId, school: r?.school ?? "", kind: "page", title: `Page filled in: ${p.title.slice(0, 80)}. Approve it to go on to "${p.label.slice(0, 40)}".` }, 30);
      await setPhase(taskId, yes ? `pressing "${p.label.slice(0, 40)}"` : "waiting for you", yes ? "working" : "waiting");
      return !!yes;
    },
    signInYourself: () => s.pmSignIn,
  };
}

const sheets = new Map<string, { files: { key: string; url: string; filename: string; label: string }[] }>();

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
async function watch(tabId: number, minutes: number, done: (s: Snapshot) => boolean, taskId?: string) {
  const end = Date.now() + minutes * 60_000;
  while (Date.now() < end) {
    await nap(4000);
    if (!(await tabAlive(tabId))) return false;
    if (taskId && control.get(taskId)?.stop && control.get(taskId)?.why !== "offsite") return false;
    const s = await peek(tabId);
    if (s && done(s)) return true;
  }
  return false;
}

// what the applicant changed while they had the wheel: the answers the agents put in, read back from the page
function readBack(ids: string[]) {
  const deep = (q: string): Element | null => {
    const rs: (Document | ShadowRoot)[] = [document];
    for (let i = 0; i < rs.length && rs.length < 400; i++) {
      const hit = rs[i].querySelector(q);
      if (hit) return hit;
      for (const e of rs[i].querySelectorAll("*")) if ((e as HTMLElement).shadowRoot) rs.push((e as HTMLElement).shadowRoot!);
    }
    return null;
  };
  const out: Record<string, string | null> = {};
  for (const id of ids) {
    const el = deep(`[data-am-id="${id}"]`) as HTMLInputElement | HTMLSelectElement | null;
    if (!el) {
      out[id] = null;
      continue;
    }
    if (el instanceof HTMLSelectElement) out[id] = el.selectedIndex >= 0 ? el.options[el.selectedIndex].text.trim() : "";
    else if (el.type === "checkbox") out[id] = el.checked ? "ticked" : "";
    else if (el.type === "radio") {
      const group = el.name ? Array.from(document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(el.name)}"]`)) : [el];
      const on = group.find((g) => g.checked);
      out[id] = on ? (on.labels?.[0]?.textContent ?? on.value).trim() : "";
    } else if (el.type === "file" || el.type === "password") out[id] = null;
    else out[id] = String(el.value ?? "");
  }
  return out;
}
async function learnCorrections(taskId: string) {
  const r = runs.get(taskId);
  if (!r) return 0;
  const answers = [...r.pages.slice(-3).flatMap((p) => p.fills), ...(r.current?.fills ?? [])].filter((a) => a.action !== "upload");
  if (!answers.length) return 0;
  const [res] = await chrome.scripting.executeScript({ target: { tabId: r.tabId, frameIds: [0] }, func: readBack, args: [answers.map((a) => a.id)] }).catch(() => [null]);
  const now = (res?.result ?? {}) as Record<string, string | null>;
  const items = answers
    .filter((a) => now[a.id] != null && now[a.id]!.trim() !== a.value.trim() && now[a.id]!.trim())
    .map((a) => ({ label: a.label, value: now[a.id]!.trim().slice(0, 2000) }));
  if (!items.length) return 0;
  const tab = await chrome.tabs.get(r.tabId).catch(() => null);
  await panelApi({ op: "corrections", application: taskId, host: hostOf(tab?.url), items: items.slice(0, 60) }).catch(() => {});
  return items.length;
}

async function runTask(task: Task, opts: { tabId?: number; claim?: boolean; focus?: boolean } = {}) {
  if (runs.has(task.id)) return;
  const s = await cfg();
  const c: Control = { stop: false, why: "", allow: new Set() };
  control.set(task.id, c);
  let tabId: number | undefined;
  try {
    const start = await eng(task.id, "start", { claim: !!opts.claim });
    if (start.stop) {
      if (opts.claim) notify(task.id, task.school, start.stop);
      return;
    }
    for (const u of [start.url, task.portal_url]) if (hostOf(u)) c.allow.add(root(hostOf(u)));
    const { tabs: kept } = await chrome.storage.session.get({ tabs: {} });
    const prev = (kept as Record<string, number>)[task.id];
    tabId = opts.tabId ?? (prev && (await tabAlive(prev)) ? prev : undefined);
    // a background tab: the applicant keeps working in theirs
    if (!tabId) tabId = (await chrome.tabs.create({ url: start.url, active: !!opts.focus })).id as number;
    else if (opts.focus) await focusTab(tabId);
    if (opts.tabId) c.allow.add(root(hostOf((await chrome.tabs.get(tabId)).url)));
    await chrome.storage.session.set({ tabs: { ...(kept as Record<string, number>), [task.id]: tabId } });
    await intoGroup(tabId);
    runs.set(task.id, { taskId: task.id, school: task.school, tabId, startedAt: Date.now(), phase: "starting", state: "working", pages: [], current: null });
    await setPhase(task.id, "starting");

    const page = chromePage(tabId);
    await page.waitForLoadState("domcontentloaded", { timeout: 45_000 }).catch(() => {});
    let state: EngineState = start.state;
    for (let round = 0; round < 20; round++) {
      let outcome: Outcome;
      let filled = 0;
      try {
        const r = await runEngine(page, deps(task.id, start, tabId, s), state, RUN_MS);
        state = r.state;
        outcome = r.outcome;
        filled = r.filled;
      } catch (e) {
        if (!(await tabAlive(tabId))) outcome = { kind: "needs_you", reason: "stuck", note: "the portal tab was closed. Choose Run in my Chrome to carry on" };
        else outcome = { kind: "failed", note: `the agents hit a problem in Chrome: ${String((e as Error)?.message ?? e).slice(0, 160)}` };
      }

      // stopped from the panel, the page bar, the tab group, or Ivyward
      if (c.stop) {
        if (c.why === "offsite") {
          const h = c.offsite ?? "";
          c.stop = false;
          c.why = "";
          await setPhase(task.id, `waiting: is ${h} part of ${task.school}'s application?`, "waiting");
          const yes = await ask({ taskId: task.id, school: task.school, kind: "offsite", host: h, title: `The agents went to ${h}, which isn't ${task.school}'s portal. Let them work there?` }, 30);
          if (yes) {
            await remember(task.id, h);
            await setPhase(task.id, "carrying on", "working");
            continue;
          }
          await chrome.tabs.goBack(tabId).catch(() => {});
          outcome = { kind: "needs_you", reason: "stuck", note: `the agents were stopped from working on ${h}. Open the portal tab and take the next step yourself, then choose Run in my Chrome` };
        } else if (c.why === "pause" || c.why === "takeover") {
          await eng(task.id, "save", { state, url: (await chrome.tabs.get(tabId).catch(() => null))?.url }).catch(() => {});
          await setPhase(task.id, c.why === "takeover" ? "you have the wheel: hand back in the side panel when you're done" : "paused: resume from the side panel", c.why === "takeover" ? "taken_over" : "paused");
          // wait for Resume / Hand back (up to 2 hours); the tab stays as it is
          const end = Date.now() + 2 * 3600_000;
          while (c.stop && Date.now() < end && (await tabAlive(tabId))) await nap(2000);
          if (c.stop) break;
          await setPhase(task.id, "carrying on", "working");
          continue;
        } else {
          if (c.why === "ivyward") notify(task.id, task.school, "Paused in Ivyward. The tab stays open; nothing else happens until you resume.");
          // stopped from the panel or its tab closed: tell Ivyward, or the next queue check starts it again
          else await eng(task.id, "finish", { state, outcome: { kind: "needs_you", reason: "stopped", note: "you stopped it in Chrome. Choose Run in my Chrome to carry on" } }).catch(() => {});
          break;
        }
      }

      const tab = await chrome.tabs.get(tabId).catch(() => null);
      const url: string | undefined = tab?.url;
      const host = hostOf(url) || undefined;
      const fin = await eng(task.id, "finish", { state, url, filled, host, outcome }).catch(() => ({}));
      if ((fin as { stop?: string }).stop) {
        notify(task.id, task.school, "Paused in Ivyward. The tab stays open; nothing else happens until you resume.");
        break;
      }
      if (outcome.kind === "continue") continue;
      if (outcome.kind === "wait") {
        await setPhase(task.id, "waiting for an email", "waiting");
        await nap(Math.min(outcome.seconds, 120) * 1000);
        await setPhase(task.id, "carrying on", "working");
        continue;
      }
      if (outcome.kind === "submitted") {
        await finishPage(task.id);
        notify(task.id, `${task.school}: submitted`, "The application went in. Ivyward has recorded it.");
        break;
      }
      // the applicant's turn in the tab: a bot check, payment, or signing in with their password manager. the
      // panel says so; the tab isn't pulled forward (they may be busy), the notification brings it up
      if (outcome.kind === "needs_you" && ["captcha", "blocked", "payment", "login", "review"].includes(outcome.reason)) {
        const k = outcome.reason;
        if (k === "review") {
          // "ask before each page" said not yet: wait for them to approve from the panel
          const yes = await ask({ taskId: task.id, school: task.school, kind: "page", title: "This page is waiting for your approval in the side panel." }, 60);
          if (yes) {
            await setPhase(task.id, "carrying on", "working");
            state = { ...state, samePageCount: 0 };
            c.approvedPage = true;
            continue;
          }
          break;
        }
        if (k === "login" && !s.pmSignIn) {
          notify(task.id, `${task.school}: needs you`, (fin as { note?: string }).note || outcome.note);
          break;
        }
        const what = k === "payment" ? "Pay the application fee in the portal tab. The agents confirm the submission after." : k === "login" ? "Sign in to the portal in its tab (your password manager can fill it in). The agents carry on once you're in." : "Complete the check in the portal tab. The agents carry on by themselves.";
        await setPhase(task.id, k === "payment" ? "waiting for you to pay" : k === "login" ? "waiting for you to sign in" : "waiting for you to complete a check", "waiting");
        const pend = ask({ taskId: task.id, school: task.school, kind: k === "payment" ? "payment" : k === "login" ? "signin" : "check", title: what }, k === "payment" ? 60 : 30);
        const startUrl = url;
        const done = await watch(
          tabId,
          k === "payment" ? 60 : 30,
          (x) => (k === "payment" ? x.confirmation || (!x.payment && x.url !== startUrl) : k === "login" ? classify(x) !== "login" : !x.captcha && !isBlockPage(x)),
          task.id,
        );
        // the watch saw it done: close the panel item
        const { answers } = await chrome.storage.session.get({ answers: {} });
        const { pending } = await chrome.storage.session.get({ pending: [] });
        for (const p of pending as Pending[]) if (p.taskId === task.id) (answers as Record<string, boolean>)[p.id] = true;
        await chrome.storage.session.set({ answers });
        await pend;
        if (done) {
          await eng(task.id, "progress", { note: "carrying on after your step" }).catch(() => {});
          await setPhase(task.id, "carrying on", "working");
          await nap(1500);
          continue;
        }
        break;
      }
      if (outcome.kind === "needs_you") {
        await setPhase(task.id, outcome.reason === "question" ? "waiting for your answers (side panel)" : "needs you", "waiting");
        notify(task.id, `${task.school}: needs you`, (fin as { note?: string }).note || outcome.note);
        if (outcome.reason === "question") await openPanel();
      }
      break;
    }
  } catch (e) {
    notify(task.id, task.school, String((e as Error)?.message ?? e).slice(0, 200));
  } finally {
    if (tabId) await banner(tabId, task.school, "", "", true);
    runs.delete(task.id);
    control.delete(task.id);
    sheets.delete(task.id);
    const { pending } = await chrome.storage.session.get({ pending: [] });
    await chrome.storage.session.set({ pending: (pending as Pending[]).filter((p) => p.taskId !== task.id) });
    await tasks().catch(() => publish());
    setTimeout(poll, 1000);
  }
}

// a run's tab closed (or its whole tab group): that run stops
chrome.tabs.onRemoved.addListener((tabId: number) => {
  for (const r of runs.values()) {
    if (r.tabId !== tabId) continue;
    const c = control.get(r.taskId);
    if (c) {
      c.stop = true;
      c.why = "closed";
    }
  }
});

async function poll() {
  const c = await cfg();
  if (!c.token) return;
  let data;
  try {
    data = await tasks();
  } catch {
    return;
  }
  await checkVersion().catch(() => {});
  if (data.paused || !c.auto) return;
  const now = Date.now();
  // jobs Ivyward moved to this browser (the portal refused the cloud runner): several at once, each in its own tab
  const room = Math.max(1, Math.min(3, c.parallel)) - runs.size;
  if (room <= 0) return;
  const next = data.tasks.filter((t) => t.mode === "extension" && ["ready", "running"].includes(t.runner_status) && !runs.has(t.id) && (!t.resume_at || t.resume_at <= now)).slice(0, room);
  for (const t of next) runTask(t);
}

// ---------- updates ----------
async function checkVersion() {
  const { versionAt } = await chrome.storage.local.get({ versionAt: 0 });
  if (Date.now() - versionAt < 6 * 3600_000) return;
  const d = await apiJson("/api/runner/panel");
  await chrome.storage.local.set({ versionAt: Date.now(), latest: d.latest ?? VERSION });
}

// ---------- weekly status checks of submitted applications (read only) ----------
function pageText() {
  return { title: document.title, text: (document.body?.innerText ?? "").slice(0, 30_000) };
}
async function checkins() {
  const c = await cfg();
  if (!c.token || !c.checkins || runs.size) return;
  const d = await apiJson("/api/runner/panel?what=checkins");
  const due = (d.checkins as { id: string; school: string; url: string; last: number | null }[]).filter((x) => !x.last || Date.now() - x.last > 7 * 86_400_000).slice(0, 5);
  for (const x of due) {
    if (runs.size) return; // an application to submit comes first
    const tab = await chrome.tabs.create({ url: x.url, active: false });
    try {
      await intoGroup(tab.id);
      await chromePage(tab.id).waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => {});
      await nap(2500);
      const snap = await peek(tab.id);
      const t = await chrome.tabs.get(tab.id);
      // signed out: nothing is typed; the panel says to sign in once in this browser
      if (!snap || classify(snap) === "login") {
        await panelApi({ op: "checkin", application: x.id, url: t.url, title: t.title ?? "", text: "", signedOut: true }).catch(() => {});
        continue;
      }
      const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [0] }, func: pageText });
      const res = await panelApi({ op: "checkin", application: x.id, url: t.url, title: r.result.title, text: r.result.text }).catch(() => null);
      if (res?.changed) notify(x.id, `${x.school}: your portal changed`, res.summary ?? "Open Ivyward to see what changed.");
    } finally {
      await chrome.tabs.remove(tab.id).catch(() => {});
    }
  }
}

function ensureAlarms() {
  chrome.alarms.create("poll", { periodInMinutes: 1 });
  chrome.alarms.create("checkins", { periodInMinutes: 24 * 60, delayInMinutes: 30 });
  chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: false }).catch?.(() => {});
}
chrome.runtime.onInstalled.addListener(ensureAlarms);
chrome.runtime.onStartup.addListener(ensureAlarms);
chrome.alarms.onAlarm.addListener((a: { name: string }) => {
  if (a.name === "poll") poll();
  if (a.name === "checkins") checkins().catch(() => {});
});

// ---------- messages: the Ivyward site, the popup, the side panel, the page bar ----------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handle(msg: any, sender: any) {
  // from the Ivyward site (bridge.js): pairing and "run now"
  if (msg.type === "bridge:hello") {
    const c = await cfg();
    const a = [...runs.values()][0];
    return { version: VERSION, paired: !!c.token, running: a ? { id: a.taskId, school: a.school, phase: a.phase } : null, runs: [...runs.values()].map((r) => ({ id: r.taskId, school: r.school, phase: r.phase })) };
  }
  if (msg.type === "bridge:pair") {
    const origin = new URL(sender.url).origin;
    if (!/^amr_[\w-]{20,}$/.test(msg.token)) throw new Error("bad key");
    await chrome.storage.local.set({ token: msg.token, api: origin, auto: true });
    ensureAlarms();
    setTimeout(poll, 500);
    return { paired: true, version: VERSION };
  }
  if (msg.type === "bridge:run" || msg.type === "popup:start") {
    const d = await tasks();
    const t = d.tasks.find((x) => x.id === msg.id);
    if (!t) throw new Error("that application isn't queued for submitting");
    if (runs.has(t.id)) return { started: true };
    const c = await cfg();
    if (runs.size >= Math.max(1, Math.min(3, c.parallel))) throw new Error(`busy with ${[...runs.values()].map((r) => r.school).join(" and ")}; this one is next`);
    runTask(t, { claim: true, focus: msg.type === "popup:start" || !!msg.focus });
    return { started: true };
  }
  if (msg.type === "bridge:kick" || msg.type === "popup:poll") {
    poll();
    return { ok: true };
  }
  if (msg.type === "popup:tasks" || msg.type === "panel:state") {
    const d = lastTasks ?? (await tasks());
    const { pending } = await chrome.storage.session.get({ pending: [] });
    const { latest } = await chrome.storage.local.get({ latest: VERSION });
    return { ...d, runs: [...runs.values()], active: [...runs.values()][0] ?? null, pending, version: VERSION, latest, settings: await cfg().then(({ token: _t, ...rest }) => (void _t, rest)) };
  }
  if (msg.type === "popup:attach") {
    // work on the portal page the applicant already has open
    const d = await tasks();
    const t = d.tasks.find((x) => x.id === msg.id);
    if (!t) throw new Error("not in your queue");
    if (runs.has(t.id)) throw new Error("already running");
    runTask(t, { claim: true, tabId: msg.tabId });
    return { started: true };
  }
  if (msg.type === "popup:panel") {
    await openPanel(msg.windowId);
    return { ok: true };
  }

  // the side panel
  if (msg.type === "panel:resolve") {
    const { answers } = await chrome.storage.session.get({ answers: {} });
    await chrome.storage.session.set({ answers: { ...answers, [msg.id]: !!msg.ok } });
    return { ok: true };
  }
  if (msg.type === "panel:pause" || msg.type === "panel:takeover") {
    const c = control.get(msg.id);
    if (!c) throw new Error("not running");
    c.stop = true;
    c.why = msg.type === "panel:takeover" ? "takeover" : "pause";
    if (msg.type === "panel:takeover") {
      const r = runs.get(msg.id);
      if (r) await focusTab(r.tabId);
    }
    await setPhase(msg.id, msg.type === "panel:takeover" ? "handing you the wheel…" : "pausing after this step…");
    return { ok: true };
  }
  if (msg.type === "panel:resume") {
    const c = control.get(msg.id);
    const r = runs.get(msg.id);
    if (!c || !r) throw new Error("not running");
    // the applicant had the wheel: what they changed is learned before the agents go on
    const learned = r.state === "taken_over" ? await learnCorrections(msg.id).catch(() => 0) : 0;
    c.stop = false;
    c.why = "";
    return { ok: true, learned };
  }
  if (msg.type === "panel:stop") {
    const c = control.get(msg.id);
    if (c) {
      c.stop = true;
      c.why = "closed";
    }
    return { ok: true };
  }
  if (msg.type === "panel:focus") {
    const r = runs.get(msg.id);
    if (r) await focusTab(r.tabId);
    return { ok: true };
  }
  if (msg.type === "panel:questions") return apiJson(`/api/runner/panel${msg.id ? `?application=${msg.id}` : ""}`);
  if (msg.type === "panel:answer") return panelApi({ op: "answer", id: msg.id, answer: msg.answer });
  if (msg.type === "panel:settings") {
    const allowedKeys = ["approval", "parallel", "pmSignIn", "checkins", "auto"];
    const patch = Object.fromEntries(Object.entries(msg.settings ?? {}).filter(([k]) => allowedKeys.includes(k)));
    await chrome.storage.local.set(patch);
    if ("parallel" in patch) setTimeout(poll, 300);
    return { ok: true };
  }
  if (msg.type === "panel:facts") {
    // the tab the applicant is looking at (a program page): read, never touched
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id || !/^https?:/.test(tab.url || "")) throw new Error("open a university page in this window first");
    const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [0] }, func: pageText });
    return panelApi({ op: "facts", url: tab.url, title: r.result.title, text: r.result.text });
  }
  if (msg.type === "panel:save_deadline") return panelApi({ op: "facts_save", application: msg.id, deadline: msg.deadline });
  if (msg.type === "panel:checkins") {
    await chrome.storage.local.set({ versionAt: 0 });
    checkins().catch(() => {});
    return { ok: true };
  }

  // the bar on the portal page
  if (msg.type.startsWith("banner:")) {
    const r = [...runs.values()].find((x) => x.tabId === sender.tab?.id);
    if (msg.type === "banner:panel") await openPanel(sender.tab?.windowId);
    if (r && msg.type === "banner:pause") return handle({ type: "panel:pause", id: r.taskId }, sender);
    if (r && msg.type === "banner:resume") return handle({ type: "panel:resume", id: r.taskId }, sender);
    return { ok: true };
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
