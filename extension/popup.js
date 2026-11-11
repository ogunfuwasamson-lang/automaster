const $ = (id) => document.getElementById(id);
const DEFAULT_API = "https://tryivyward.com";
const send = (msg) =>
  new Promise((resolve, reject) =>
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      res && res.ok ? resolve(res.value) : reject(new Error(res ? res.error : "no reply"));
    }),
  );

const STATUS = { ready: "Queued", running: "Working", needs_you: "Needs you", failed: "Problem" };

async function render() {
  const c = await chrome.storage.local.get({ token: "", auto: true, api: DEFAULT_API });
  $("setup").hidden = !!c.token;
  $("main").hidden = !c.token;
  $("auto").checked = c.auto;
  $("api").value = c.api;
  if (!c.token) return;
  $("err").textContent = "";
  try {
    const d = await send({ type: "popup:tasks" });
    $("paused").hidden = !d.paused;
    const act = $("active");
    act.hidden = !d.runs.length;
    if (d.runs.length) {
      act.className = "task now";
      act.textContent = d.runs.map((r) => `${r.school}: ${r.phase}`).join("\n");
      act.style.whiteSpace = "pre-line";
    }
    if (d.pending.length) {
      act.hidden = false;
      act.className = "task now";
      act.textContent = `${d.pending.length} thing${d.pending.length === 1 ? "" : "s"} waiting for you in the side panel` + (d.runs.length ? "\n" + act.textContent : "");
    }
    const v = chrome.runtime.getManifest().version;
    const up = $("update");
    const newer = (a, b) => { const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
    up.hidden = !newer(d.latest, v);
    up.textContent = `Version ${d.latest} is ready (you have ${v}). Open Ivyward, Connect Chrome, to update.`;
    const box = $("tasks");
    box.innerHTML = "";
    if (!d.tasks.length) {
      box.innerHTML = '<p class="muted">Nothing to submit right now. Applications you've approved show up here.</p>';
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    for (const t of d.tasks) {
      const el = document.createElement("div");
      el.className = "task";
      const head = document.createElement("div");
      head.innerHTML = "<b></b> <span class=\"muted\"></span>";
      head.querySelector("b").textContent = t.school;
      head.querySelector("span").textContent = t.mode === "extension" ? "in this browser" : "cloud";
      const st = document.createElement("div");
      st.className = t.runner_status === "needs_you" || t.runner_status === "failed" ? "warn" : "muted";
      st.textContent = (STATUS[t.runner_status] || t.runner_status) + (t.note ? `: ${t.note}` : "");
      const row = document.createElement("div");
      row.className = "row";
      const go = document.createElement("button");
      go.className = "primary";
      go.textContent = "Run here now";
      go.disabled = !t.portal_url || d.runs.some((r) => r.taskId === t.id);
      go.onclick = () => send({ type: "popup:start", id: t.id }).then(() => window.close(), (e) => ($("err").textContent = e.message));
      row.appendChild(go);
      if (tab && /^https:/.test(tab.url || "") && !/ivyward|automaster/i.test(tab.url || "")) {
        const here = document.createElement("button");
        here.textContent = "Use this tab";
        here.title = "carry on from the portal page you have open";
        here.onclick = () => send({ type: "popup:attach", id: t.id, tabId: tab.id }).then(() => window.close(), (e) => ($("err").textContent = e.message));
        row.appendChild(here);
      }
      el.append(head, st, row);
      box.appendChild(el);
    }
  } catch (e) {
    $("tasks").innerHTML = "";
    $("err").textContent = e.message;
  }
}

$("connect").onclick = async () => {
  const c = await chrome.storage.local.get({ api: DEFAULT_API });
  chrome.tabs.create({ url: c.api.replace(/\/$/, "") + "/connect-chrome" });
  window.close();
};
$("save").onclick = async () => {
  const token = $("token").value.trim();
  if (!/^amr_[\w-]{20,}$/.test(token)) return ($("saveMsg").textContent = "That doesn't look like a key");
  await chrome.storage.local.set({ token });
  chrome.alarms.create("poll", { periodInMinutes: 1 });
  render();
};
$("auto").onchange = (e) => chrome.storage.local.set({ auto: e.target.checked });
$("panel").onclick = async () => {
  const w = await chrome.windows.getCurrent();
  // opened straight from the click (the side panel needs the applicant's gesture)
  chrome.sidePanel.open({ windowId: w.id }).then(() => window.close(), () => send({ type: "popup:panel", windowId: w.id }));
};
$("refresh").onclick = () => send({ type: "popup:poll" }).finally(render);
$("saveApi").onclick = async () => {
  // the key is only ever sent to Ivyward (or a developer's own machine)
  let api = DEFAULT_API;
  try {
    const x = new URL($("api").value.trim());
    const local = x.hostname === "localhost" || x.hostname === "127.0.0.1";
    if ((x.protocol === "https:" && /(^|\.)tryivyward\.com$/.test(x.hostname)) || local) api = x.origin;
    else $("err").textContent = "Only tryivyward.com is allowed here.";
  } catch {}
  await chrome.storage.local.set({ api });
  render();
};
$("logout").onclick = async () => {
  await chrome.storage.local.remove("token");
  render();
};
render();
