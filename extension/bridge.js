// automaster runner: the bridge between the automaster site and this extension. it only runs on automaster's
// own pages, lets the site know the extension is here, and passes on "connect this browser" and "run now".
(() => {
  const send = (msg) =>
    new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (res) => resolve(chrome.runtime.lastError ? { ok: false, error: chrome.runtime.lastError.message } : res || { ok: false, error: "no reply" }));
      } catch (e) {
        resolve({ ok: false, error: String(e) });
      }
    });
  const post = (type, data) => window.postMessage({ source: "automaster-ext", type, ...data }, location.origin);
  const hello = async () => {
    const r = await send({ type: "bridge:hello" });
    document.documentElement.dataset.amRunner = r && r.ok ? r.value.version : "1";
    post("hello", r && r.ok ? r.value : { error: r && r.error });
  };
  window.addEventListener("message", async (e) => {
    if (e.source !== window || e.origin !== location.origin) return;
    const m = e.data;
    if (!m || m.source !== "automaster-app") return;
    if (m.type === "hello") return hello();
    if (m.type === "pair") return post("paired", await send({ type: "bridge:pair", token: m.token }));
    if (m.type === "run") return post("run", { id: m.id, ...(await send({ type: "bridge:run", id: m.id })) });
    if (m.type === "kick") return post("kick", await send({ type: "bridge:kick" }));
  });
  hello();
})();
