// Ivyward runner: the side panel. shows what the agents are doing in this browser, every answer they put in,
// and everything that waits for the applicant (approvals, the review before submit, checks, questions).
// all text from pages and Ivyward goes in with textContent, never as HTML.
const $ = (id) => document.getElementById(id);
const DEFAULT_API = "https://tryivyward.com";
const send = (msg) =>
  new Promise((resolve, reject) =>
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      res && res.ok ? resolve(res.value) : reject(new Error(res ? res.error : "no reply"));
    }),
  );
const el = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "text") e.textContent = v;
    else if (k === "on") for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat(Infinity)) if (c) e.append(c);
  return e;
};
const err = (e) => ($("err").textContent = e ? e.message || String(e) : "");
const act = (msg) => send(msg).then(() => refresh(), err);
const STATE = { working: "working", paused: "paused", taken_over: "you have it", waiting: "waiting for you" };
const STATUS = { ready: "Queued", running: "Working", needs_you: "Needs you", failed: "Problem" };

function newer(a, b) {
  const x = String(a || "0").split(".").map(Number), y = String(b || "0").split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}

function answers(fills) {
  if (!fills || !fills.length) return el("p", { class: "muted", text: "No answers on this page yet." });
  return el("dl", {}, fills.map((f) => [el("dt", { text: f.label || "(unlabelled)" }), el("dd", { text: f.action === "upload" ? `uploaded: ${f.value}` : f.value })]));
}

function review(run) {
  const pages = [...(run?.pages || []), ...(run?.current && run.current.fills.length ? [run.current] : [])];
  if (!pages.length) return el("p", { class: "muted", text: "The agents haven't recorded answers in this browser for this application. Check the portal tab before submitting." });
  return el("div", {}, pages.map((p, i) =>
    el("div", { class: "page" },
      el("b", { text: p.title || `Page ${i + 1}` }),
      answers(p.fills),
      p.shot ? el("img", { src: p.shot, alt: `How ${p.title || "the page"} looked` }) : null,
    )));
}

function renderAsks(d) {
  const box = $("asks");
  box.replaceChildren();
  for (const p of d.pending) {
    const run = d.runs.find((r) => r.taskId === p.taskId);
    const yes = (label, primary = true) => el("button", { class: primary ? "primary" : "", text: label, on: { click: () => act({ type: "panel:resolve", id: p.id, ok: true }) } });
    const no = (label) => el("button", { text: label, on: { click: () => act({ type: "panel:resolve", id: p.id, ok: false }) } });
    const show = el("button", { text: "Show the tab", on: { click: () => act({ type: "panel:focus", id: p.taskId }) } });
    const card = el("div", { class: "card ask" }, el("b", { text: p.school }), el("p", { style: "margin:4px 0 0", text: p.title }));
    if (p.kind === "submit") {
      card.append(el("p", { class: "muted", text: "Your answers, page by page. Anything wrong? Choose Not yet, take over and fix it in the tab, then hand back." }), review(run), el("div", { class: "row" }, yes("Submit"), no("Not yet"), show));
    } else if (p.kind === "page") {
      card.append(answers(run?.pages?.[run.pages.length - 1]?.fills), el("div", { class: "row" }, yes("Approve and go on"), no("Hold"), show));
    } else if (p.kind === "offsite") {
      card.append(el("div", { class: "row" }, yes(`Allow ${p.host}`), no("Stop"), show));
    } else {
      card.append(el("div", { class: "row" }, show));
    }
    box.append(card);
  }
}

function renderRuns(d) {
  const box = $("runs");
  box.replaceChildren();
  if (!d.runs.length) return box.append(el("p", { class: "empty", text: d.paused ? "Paused from Ivyward." : "Nothing running in this browser." }));
  for (const r of d.runs) {
    const held = r.state === "paused" || r.state === "taken_over";
    box.append(el("div", { class: "card" },
      el("div", { class: "row", style: "margin:0" }, el("b", { text: r.school }), el("span", { class: "state", text: STATE[r.state] || r.state })),
      el("p", { class: "muted", style: "margin:4px 0 0", text: r.phase }),
      el("div", { class: "row" },
        held
          ? el("button", { class: "primary", text: r.state === "taken_over" ? "Hand back" : "Resume", on: { click: () => send({ type: "panel:resume", id: r.taskId }).then((x) => { if (x && x.learned) $("err").textContent = `Learned ${x.learned} correction${x.learned === 1 ? "" : "s"} from you.`; refresh(); }, err) } })
          : el("button", { text: "Pause", on: { click: () => act({ type: "panel:pause", id: r.taskId }) } }),
        held ? null : el("button", { text: "Take over", title: "Pause and bring up the tab so you can change things; hand back when done", on: { click: () => act({ type: "panel:takeover", id: r.taskId }) } }),
        el("button", { text: "Show the tab", on: { click: () => act({ type: "panel:focus", id: r.taskId }) } }),
        el("button", { text: "Stop", on: { click: () => act({ type: "panel:stop", id: r.taskId }) } }),
      ),
      el("details", {}, el("summary", { class: "muted", text: `Answers on this page (${(r.current && r.current.fills.length) || 0})` }), answers(r.current && r.current.fills)),
    ));
  }
}

function renderQueue(d) {
  const box = $("queue");
  box.replaceChildren();
  const list = d.tasks.filter((t) => !d.runs.some((r) => r.taskId === t.id));
  if (!list.length) return box.append(el("p", { class: "empty", text: "Nothing else queued." }));
  for (const t of list) {
    box.append(el("div", { class: "card" },
      el("b", { text: t.school }),
      el("div", { class: t.runner_status === "needs_you" || t.runner_status === "failed" ? "warn" : "muted", text: (STATUS[t.runner_status] || t.runner_status) + (t.note ? `: ${t.note}` : "") }),
      el("div", { class: "row" }, el("button", { class: "primary", text: "Run here now", disabled: !t.portal_url, on: { click: () => act({ type: "popup:start", id: t.id }) } })),
    ));
  }
}

async function renderQuestions() {
  const box = $("questions");
  let d;
  try { d = await send({ type: "panel:questions" }); } catch (e) { return; }
  if (d && d.latest) showUpdate(d.latest);
  box.replaceChildren();
  if (!d.questions.length) return box.append(el("p", { class: "empty", text: "None right now." }));
  for (const q of d.questions) {
    const input = q.options && q.options.length
      ? el("select", { "aria-label": q.question }, el("option", { value: "", text: "Choose…" }), q.options.map((o) => el("option", { value: o, text: o })))
      : el("input", { type: "text", "aria-label": q.question });
    const save = el("button", { class: "primary", text: "Save answer", on: { click: async () => {
      if (!input.value.trim()) return;
      save.disabled = true;
      try { await send({ type: "panel:answer", id: q.id, answer: input.value }); renderQuestions(); } catch (e) { err(e); save.disabled = false; }
    } } });
    const skip = el("button", { text: "Doesn't apply to me", on: { click: () => send({ type: "panel:answer", id: q.id, answer: null }).then(renderQuestions, err) } });
    box.append(el("div", { class: "card" }, el("div", { class: "muted", text: q.school || "" }), el("p", { style: "margin:2px 0 6px", text: q.question }), input, el("div", { class: "row" }, save, skip)));
  }
}

let latestShown = "";
async function showUpdate(latest) {
  const v = chrome.runtime.getManifest().version;
  if (!latest || !newer(latest, v) || latestShown === latest) return;
  latestShown = latest;
  const { api } = await chrome.storage.local.get({ api: DEFAULT_API });
  const box = $("update");
  box.replaceChildren(
    el("b", { text: `Version ${latest} is ready` }), " ",
    el("span", { class: "muted", text: `(you have ${v}). ` }),
    el("a", { href: api.replace(/\/$/, "") + "/connect-chrome", target: "_blank", text: "How to update" }),
  );
  box.hidden = false;
}

function renderSettings(s) {
  for (const r of document.querySelectorAll('input[name="approval"]')) r.checked = r.value === s.approval;
  $("parallel").value = String(s.parallel);
  $("pmSignIn").checked = !!s.pmSignIn;
  $("checkins").checked = !!s.checkins;
  $("auto").checked = !!s.auto;
}

async function refresh() {
  const { token } = await chrome.storage.local.get({ token: "" });
  $("setup").hidden = !!token;
  $("app").hidden = !token;
  $("v").textContent = "v" + chrome.runtime.getManifest().version;
  if (!token) return;
  try {
    const d = await send({ type: "panel:state" });
    renderAsks(d);
    renderRuns(d);
    renderQueue(d);
    renderSettings(d.settings);
    showUpdate(d.latest);
  } catch (e) {
    err(e);
  }
}

// settings
for (const r of document.querySelectorAll('input[name="approval"]')) r.addEventListener("change", () => send({ type: "panel:settings", settings: { approval: r.value } }).catch(err));
$("parallel").addEventListener("change", (e) => send({ type: "panel:settings", settings: { parallel: Number(e.target.value) } }).catch(err));
for (const k of ["pmSignIn", "checkins", "auto"]) $(k).addEventListener("change", (e) => send({ type: "panel:settings", settings: { [k]: e.target.checked } }).catch(err));
$("checkNow").addEventListener("click", () => send({ type: "panel:checkins" }).then(() => ($("err").textContent = "Checking your submitted portals in background tabs. Changes show up in Ivyward."), err));

// facts from the tab the applicant is reading
$("facts").addEventListener("click", async () => {
  const out = $("factsOut");
  out.replaceChildren(el("p", { class: "muted", text: "Reading…" }));
  try {
    const { facts, matches } = await send({ type: "panel:facts" });
    const rows = [["School", facts.school], ["Program", facts.program], ["Deadline", facts.deadline || "not stated"], ["Fee", facts.fee || "not stated"]];
    out.replaceChildren(
      el("dl", {}, rows.map(([k, v]) => [el("dt", { text: k }), el("dd", { text: v || "—" })])),
      facts.requirements.length ? el("ul", { style: "margin:6px 0 0;padding-left:18px" }, facts.requirements.slice(0, 12).map((r) => el("li", { text: r }))) : null,
      ...(facts.deadline ? matches.map((m) => el("div", { class: "row" }, el("button", { text: `Save ${facts.deadline} as the deadline for ${m.program}`, on: { click: (e) => send({ type: "panel:save_deadline", id: m.id, deadline: facts.deadline }).then(() => { e.target.disabled = true; e.target.textContent = "Saved"; }, err) } }))) : []),
    );
  } catch (e) {
    out.replaceChildren();
    err(e);
  }
});

chrome.storage.onChanged.addListener((_c, area) => { if (area === "session") refresh(); });
refresh();
renderQuestions();
setInterval(refresh, 5000);
setInterval(renderQuestions, 30000);
