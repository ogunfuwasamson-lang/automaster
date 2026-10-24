// automaster runner: background service worker.
// polls for approved applications, opens their portals, injects the filler, relays its calls to the api.
// your key lives in chrome.storage.local on this computer; your passwords and card never pass through here.

const DEFAULT_API = "https://automaster-3p9i.vercel.app";
const POLL_MINUTES = 3;

async function cfg() {
  return chrome.storage.local.get({ api: DEFAULT_API, token: "", auto: true });
}

async function api(path, opts = {}) {
  const c = await cfg();
  if (!c.token) throw new Error("no key: paste your extension key in the popup");
  const res = await fetch(c.api.replace(/\/$/, "") + path, {
    ...opts,
    headers: { authorization: `Bearer ${c.token}`, ...(opts.body ? { "content-type": "application/json" } : {}), ...(opts.headers || {}) },
  });
  if (res.status === 401) throw new Error("key rejected: create a new one in automaster settings");
  return res;
}

async function apiJson(path, opts) {
  const res = await api(path, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `error ${res.status}`);
  return json;
}

// tabId -> { taskId, steps, reachedSubmit, submitClicked, startedAt }
async function runs() {
  return (await chrome.storage.session.get({ runs: {} })).runs;
}
async function saveRuns(r) {
  await chrome.storage.session.set({ runs: r });
}

let taskCache = { at: 0, data: null };
async function tasks(force = false) {
  if (!force && taskCache.data && Date.now() - taskCache.at < 60_000) return taskCache.data;
  const data = await apiJson("/api/runner/tasks");
  taskCache = { at: Date.now(), data };
  return data;
}

const sheets = new Map(); // taskId -> sheet (service worker memory; refetched if it restarts)
async function sheet(taskId) {
  if (!sheets.has(taskId)) sheets.set(taskId, await apiJson(`/api/runner/sheet?application=${taskId}`));
  return sheets.get(taskId);
}

async function setBadge(data) {
  const n = (data?.tasks || []).filter((t) => t.runner_status === "needs_you").length;
  await chrome.action.setBadgeText({ text: n ? String(n) : "" });
  await chrome.action.setBadgeBackgroundColor({ color: "#b45309" });
}

function notify(title, message) {
  chrome.notifications.create({ type: "basic", iconUrl: "icon.png", title, message, priority: 2 });
}

async function startTask(task, active = false) {
  if (!task.portal_url) throw new Error("no portal link for this application");
  const tab = await chrome.tabs.create({ url: task.portal_url, active });
  const r = await runs();
  r[tab.id] = { taskId: task.id, school: task.school, steps: 0, reachedSubmit: false, submitClicked: false, startedAt: Date.now() };
  await saveRuns(r);
  await apiJson("/api/runner/report", { method: "POST", body: JSON.stringify({ application: task.id, status: "running", note: "opening the portal" }) }).catch(() => {});
  return tab.id;
}

async function poll() {
  const c = await cfg();
  if (!c.token) return;
  let data;
  try {
    data = await tasks(true);
  } catch {
    return;
  }
  await setBadge(data);
  if (data.paused || !c.auto) return;
  const r = await runs();
  const busy = new Set(Object.values(r).map((x) => x.taskId));
  // one portal at a time, so you're never asked for two things at once
  if (busy.size) return;
  const next = data.tasks.find((t) => t.runner_status === "ready" && t.portal_url && !busy.has(t.id));
  if (next) await startTask(next).catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => chrome.alarms.create("poll", { periodInMinutes: POLL_MINUTES }));
chrome.runtime.onStartup.addListener(() => chrome.alarms.create("poll", { periodInMinutes: POLL_MINUTES }));
chrome.alarms.onAlarm.addListener((a) => a.name === "poll" && poll());

// re-inject the filler after every page load in a runner tab
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status !== "complete") return;
  const r = await runs();
  if (!r[tabId] || !/^https?:/.test(tab.url || "")) return;
  chrome.scripting.executeScript({ target: { tabId }, files: ["runner.js"] }).catch(() => {});
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const r = await runs();
  const run = r[tabId];
  if (!run) return;
  delete r[tabId];
  await saveRuns(r);
  sheets.delete(run.taskId);
  if (!run.done) {
    await apiJson("/api/runner/report", { method: "POST", body: JSON.stringify({ application: run.taskId, status: "needs_you", note: "you closed the portal tab; press run again to continue" }) }).catch(() => {});
  }
});

function b64(buf) {
  let s = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function handle(msg, sender) {
  const tabId = sender.tab?.id;
  const r = await runs();
  const run = tabId != null ? r[tabId] : null;

  if (msg.type === "popup:tasks") return tasks(true).then(async (d) => (await setBadge(d), d));
  if (msg.type === "popup:start") {
    const d = await tasks(true);
    const t = d.tasks.find((x) => x.id === msg.id);
    if (!t) throw new Error("not in your queue");
    return { tabId: await startTask(t, true) };
  }
  if (msg.type === "popup:attach") {
    // run on the portal page the applicant already has open
    r[msg.tabId] = { taskId: msg.id, school: msg.school, steps: 0, reachedSubmit: false, submitClicked: false, startedAt: Date.now() };
    await saveRuns(r);
    await chrome.scripting.executeScript({ target: { tabId: msg.tabId }, files: ["runner.js"] });
    return { ok: true };
  }
  if (msg.type === "popup:poll") return poll().then(() => ({ ok: true }));

  if (!run) return null; // not a runner tab: the filler stays inert

  if (msg.type === "task") {
    const d = await tasks();
    const t = d.tasks.find((x) => x.id === run.taskId);
    if (d.paused) return { stop: "agents are paused" };
    if (!t) {
      // stopped by the applicant, or already submitted
      run.done = true;
      await saveRuns(r);
      return { stop: "this application is no longer queued" };
    }
    run.steps += 1;
    await saveRuns(r);
    return { taskId: run.taskId, steps: run.steps, reachedSubmit: run.reachedSubmit, submitClicked: run.submitClicked, attested: t.attested };
  }
  if (msg.type === "map") return apiJson("/api/runner/map", { method: "POST", body: JSON.stringify({ application: run.taskId, fields: msg.fields }) });
  if (msg.type === "file") {
    const s = await sheet(run.taskId);
    const f = s.files.find((x) => x.key === msg.key);
    if (!f) throw new Error("file not in your packet");
    const res = await api(f.url);
    if (!res.ok) throw new Error("couldn't fetch " + f.label);
    return { name: f.filename, mime: res.headers.get("content-type") || "application/octet-stream", b64: b64(await res.arrayBuffer()) };
  }
  if (msg.type === "check") return apiJson("/api/runner/check", { method: "POST", body: JSON.stringify({ application: run.taskId }) });
  if (msg.type === "mark") {
    Object.assign(run, msg.flags || {});
    await saveRuns(r);
    return { ok: true };
  }
  if (msg.type === "report") {
    await apiJson("/api/runner/report", { method: "POST", body: JSON.stringify({ application: run.taskId, status: msg.status, note: msg.note, url: sender.tab?.url, filled: msg.filled }) });
    taskCache.at = 0;
    if (msg.status === "needs_you") notify(`${run.school}: needs you`, msg.note || "the runner stopped on this portal");
    if (msg.status === "submitted") {
      notify(`${run.school}: submitted`, "the application went in. automaster has recorded it.");
      run.done = true;
      await saveRuns(r);
      sheets.delete(run.taskId);
      setTimeout(poll, 5000); // next one
    }
    return { ok: true };
  }
  return null;
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  handle(msg, sender).then(
    (v) => reply({ ok: true, value: v }),
    (e) => reply({ ok: false, error: String(e && e.message ? e.message : e) }),
  );
  return true; // async reply
});
