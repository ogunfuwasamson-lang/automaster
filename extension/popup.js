const $ = (id) => document.getElementById(id);
const DEFAULT_API = "https://automaster-3p9i.vercel.app";
const send = (msg) =>
  new Promise((resolve, reject) =>
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      res && res.ok ? resolve(res.value) : reject(new Error(res ? res.error : "no reply"));
    }),
  );

const STATUS = { ready: "queued", running: "working", needs_you: "needs you", failed: "problem" };

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
    act.hidden = !d.active;
    if (d.active) {
      act.className = "task now";
      act.textContent = `${d.active.school}: ${d.active.phase}`;
    }
    const box = $("tasks");
    box.innerHTML = "";
    if (!d.tasks.length) {
      box.innerHTML = '<p class="muted">nothing to submit right now. approved applications show up here.</p>';
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    for (const t of d.tasks) {
      const el = document.createElement("div");
      el.className = "task";
      const head = document.createElement("div");
      head.innerHTML = "<b></b> <span class=\"muted\"></span>";
      head.querySelector("b").textContent = t.school;
      head.querySelector("span").textContent = t.mode === "extension" ? "· in this browser" : "· cloud";
      const st = document.createElement("div");
      st.className = t.runner_status === "needs_you" || t.runner_status === "failed" ? "warn" : "muted";
      st.textContent = (STATUS[t.runner_status] || t.runner_status) + (t.note ? `: ${t.note}` : "");
      const row = document.createElement("div");
      row.className = "row";
      const go = document.createElement("button");
      go.className = "primary";
      go.textContent = "run here now";
      go.disabled = !t.portal_url || (d.active && d.active.taskId === t.id);
      go.onclick = () => send({ type: "popup:start", id: t.id }).then(() => window.close(), (e) => ($("err").textContent = e.message));
      row.appendChild(go);
      if (tab && /^https:/.test(tab.url || "") && !/automaster/.test(tab.url || "")) {
        const here = document.createElement("button");
        here.textContent = "use this tab";
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
  if (!/^amr_[\w-]{20,}$/.test(token)) return ($("saveMsg").textContent = "that doesn't look like a key");
  await chrome.storage.local.set({ token });
  chrome.alarms.create("poll", { periodInMinutes: 1 });
  render();
};
$("auto").onchange = (e) => chrome.storage.local.set({ auto: e.target.checked });
$("refresh").onclick = () => send({ type: "popup:poll" }).finally(render);
$("saveApi").onclick = async () => {
  await chrome.storage.local.set({ api: $("api").value.trim() || DEFAULT_API });
  render();
};
$("logout").onclick = async () => {
  await chrome.storage.local.remove("token");
  render();
};
render();
