// the engine's browser, backed by a tab in the applicant's own chrome (chrome.scripting + webNavigation).
// every function handed to executeScript is serialised and run in the page: they must not use outer variables.
import type { EngineFile, EngineFrame, EnginePage } from "@/lib/engine-page";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function b64(buf: Uint8Array) {
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + 0x8000)));
  return btoa(s);
}

async function run<R>(tabId: number, frameId: number, func: (arg: never) => R, arg?: unknown): Promise<R> {
  const res = await chrome.scripting.executeScript({ target: { tabId, frameIds: [frameId] }, func, args: arg === undefined ? [] : [arg] });
  const r = res?.[0];
  if (r?.error) throw new Error(String(r.error?.message ?? r.error));
  return r?.result as R;
}

// --- in-page actions (self-contained) ---
function pageClick(sel: string) {
  const el = document.querySelector(sel) as HTMLElement | null;
  if (!el) throw new Error("element gone: " + sel);
  el.scrollIntoView({ block: "center", inline: "center" });
  const r = el.getBoundingClientRect();
  const o = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0 };
  el.dispatchEvent(new PointerEvent("pointerdown", o));
  el.dispatchEvent(new MouseEvent("mousedown", o));
  el.dispatchEvent(new PointerEvent("pointerup", o));
  el.dispatchEvent(new MouseEvent("mouseup", o));
  el.click();
  return true;
}

function pageFill(a: { sel: string; value: string }) {
  const el = document.querySelector(a.sel) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el) throw new Error("field gone: " + a.sel);
  el.focus();
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, a.value);
  else el.value = a.value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
  return true;
}

function pageEnter(sel: string | null) {
  const el = (sel ? document.querySelector(sel) : document.activeElement) as HTMLInputElement | null;
  if (!el) return false;
  el.focus();
  const o = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
  const down = el.dispatchEvent(new KeyboardEvent("keydown", o));
  el.dispatchEvent(new KeyboardEvent("keypress", o));
  el.dispatchEvent(new KeyboardEvent("keyup", o));
  // synthetic keys don't submit forms: do what the browser would
  const form = el.form;
  if (down && form) {
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else form.submit();
  }
  return true;
}

function pageFiles(a: { sel: string; b64: string; name: string; mime: string }) {
  const el = document.querySelector(a.sel) as HTMLInputElement | null;
  if (!el) throw new Error("upload box gone");
  const bin = atob(a.b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const dt = new DataTransfer();
  dt.items.add(new File([bytes], a.name, { type: a.mime }));
  el.files = dt.files;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

export function chromePage(tabId: number): EnginePage {
  let mainUrl = "";
  const frame = (frameId: number, url: string): EngineFrame => ({
    isMain: frameId === 0,
    url: () => (frameId === 0 ? mainUrl || url : url),
    helper: async () => {
      await chrome.scripting.executeScript({ target: { tabId, frameIds: [frameId] }, files: ["dom-helper.js"] });
    },
    evaluate: (fn, arg) => run(tabId, frameId, fn as unknown as (a: never) => never, arg),
    click: async (sel) => {
      await run(tabId, frameId, pageClick as (a: never) => boolean, sel);
    },
    fill: async (sel, value) => {
      await run(tabId, frameId, pageFill as (a: never) => boolean, { sel, value });
    },
    press: async (sel) => {
      await run(tabId, frameId, pageEnter as (a: never) => boolean, sel);
    },
    setInputFiles: async (sel, file: EngineFile) => {
      await run(tabId, frameId, pageFiles as (a: never) => boolean, { sel, b64: b64(file.buffer), name: file.name, mime: file.mime });
    },
  });

  const waitLoad = async (timeout: number, settle: number) => {
    const end = Date.now() + timeout;
    await sleep(250);
    while (Date.now() < end) {
      const t = await chrome.tabs.get(tabId);
      mainUrl = t.url || mainUrl;
      if (t.status === "complete") break;
      await sleep(300);
    }
    if (settle) await sleep(settle);
  };

  return {
    url: async () => {
      const t = await chrome.tabs.get(tabId);
      mainUrl = t.url || mainUrl;
      return mainUrl;
    },
    mainFrame: () => frame(0, mainUrl),
    frames: async () => {
      const all = ((await chrome.webNavigation.getAllFrames({ tabId })) ?? []) as { frameId: number; url: string; errorOccurred?: boolean }[];
      const main = all.find((f) => f.frameId === 0);
      if (main) mainUrl = main.url;
      return all.filter((f) => !f.errorOccurred).map((f) => frame(f.frameId, f.url));
    },
    goto: async (url, o) => {
      await chrome.tabs.update(tabId, { url });
      await waitLoad(o?.timeout ?? 45_000, 600);
    },
    waitForLoadState: (state, o) => waitLoad(o?.timeout ?? 15_000, state === "networkidle" ? 700 : 0),
    pressEnter: async () => {
      await run(tabId, 0, pageEnter as (a: never) => boolean, null);
    },
  };
}
