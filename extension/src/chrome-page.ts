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
  // fields inside web components (shadow roots) too
  const deep = (q: string): Element | null => { const rs: (Document | ShadowRoot)[] = [document]; for (let i = 0; i < rs.length && rs.length < 400; i++) { const hit = rs[i].querySelector(q); if (hit) return hit; for (const e of rs[i].querySelectorAll("*")) if ((e as HTMLElement).shadowRoot) rs.push((e as HTMLElement).shadowRoot!); } return null; };
  const el = deep(sel) as HTMLElement | null;
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
  const deep = (q: string): Element | null => { const rs: (Document | ShadowRoot)[] = [document]; for (let i = 0; i < rs.length && rs.length < 400; i++) { const hit = rs[i].querySelector(q); if (hit) return hit; for (const e of rs[i].querySelectorAll("*")) if ((e as HTMLElement).shadowRoot) rs.push((e as HTMLElement).shadowRoot!); } return null; };
  const el = deep(a.sel) as HTMLInputElement | HTMLTextAreaElement | null;
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
  const deep = (q: string): Element | null => { const rs: (Document | ShadowRoot)[] = [document]; for (let i = 0; i < rs.length && rs.length < 400; i++) { const hit = rs[i].querySelector(q); if (hit) return hit; for (const e of rs[i].querySelectorAll("*")) if ((e as HTMLElement).shadowRoot) rs.push((e as HTMLElement).shadowRoot!); } return null; };
  const el = (sel ? deep(sel) : document.activeElement) as HTMLInputElement | null;
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
  const deep = (q: string): Element | null => { const rs: (Document | ShadowRoot)[] = [document]; for (let i = 0; i < rs.length && rs.length < 400; i++) { const hit = rs[i].querySelector(q); if (hit) return hit; for (const e of rs[i].querySelectorAll("*")) if ((e as HTMLElement).shadowRoot) rs.push((e as HTMLElement).shadowRoot!); } return null; };
  const el = deep(a.sel) as HTMLInputElement | null;
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

// --- screen-coordinate actions, for the screenshot steps (self-contained) ---
export function ptClick(a: { x: number; y: number; double?: boolean; hover?: boolean }) {
  const el = document.elementFromPoint(a.x, a.y) as HTMLElement | null;
  if (!el) return false;
  const o = { bubbles: true, cancelable: true, composed: true, view: window, clientX: a.x, clientY: a.y, button: 0, pointerType: "mouse" };
  el.dispatchEvent(new PointerEvent("pointerover", o));
  el.dispatchEvent(new MouseEvent("mouseover", o));
  el.dispatchEvent(new PointerEvent("pointermove", o));
  el.dispatchEvent(new MouseEvent("mousemove", o));
  if (a.hover) return true;
  const times = a.double ? 2 : 1;
  for (let i = 0; i < times; i++) {
    el.dispatchEvent(new PointerEvent("pointerdown", { ...o, buttons: 1 }));
    el.dispatchEvent(new MouseEvent("mousedown", { ...o, buttons: 1, detail: i + 1 }));
    const f = el.closest("input,textarea,select,[contenteditable=''],[contenteditable=true],[tabindex],button,a") as HTMLElement | null;
    if (f && typeof f.focus === "function") f.focus();
    el.dispatchEvent(new PointerEvent("pointerup", o));
    el.dispatchEvent(new MouseEvent("mouseup", { ...o, detail: i + 1 }));
    el.click();
  }
  if (a.double) el.dispatchEvent(new MouseEvent("dblclick", { ...o, detail: 2 }));
  return true;
}

export function ptType(text: string) {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const key = (k: string, type: string) => el.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true, cancelable: true }));
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    // one character at a time, like a person: search-as-you-type lists react to each one
    for (const ch of text) {
      key(ch, "keydown");
      key(ch, "keypress");
      const v = el.value + ch;
      if (setter) setter.call(el, v);
      else el.value = v;
      el.dispatchEvent(new InputEvent("input", { bubbles: true, data: ch, inputType: "insertText" }));
      key(ch, "keyup");
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  if (el.isContentEditable) {
    document.execCommand("insertText", false, text);
    return true;
  }
  return false;
}

export function ptKey(k: string) {
  const el = (document.activeElement as HTMLElement | null) ?? document.body;
  const codes: Record<string, number> = { Enter: 13, Tab: 9, Escape: 27, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, Space: 32, Backspace: 8, PageDown: 34, PageUp: 33, Home: 36, End: 35 };
  const name = k === "Space" ? " " : k;
  const o = { key: name, code: k, keyCode: codes[k] ?? 0, which: codes[k] ?? 0, bubbles: true, cancelable: true };
  const go = el.dispatchEvent(new KeyboardEvent("keydown", o));
  el.dispatchEvent(new KeyboardEvent("keyup", o));
  if (!go) return true; // the page handled it
  // synthetic keys have no default action: do what the browser would
  if (k === "Tab") {
    const all = Array.from(document.querySelectorAll<HTMLElement>("a[href],button,input,select,textarea,[tabindex]")).filter((e) => e.tabIndex >= 0 && !(e as HTMLButtonElement).disabled && e.offsetParent !== null);
    const i = all.indexOf(el);
    all[(i + 1) % all.length]?.focus();
  } else if (k === "Backspace" && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, el.value.slice(0, -1));
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));
  } else if (k === "Space" && (el instanceof HTMLButtonElement || (el instanceof HTMLInputElement && /checkbox|radio/.test(el.type)) || el.getAttribute("role") === "checkbox")) {
    el.click();
  } else if (k === "Enter") {
    if (el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement) el.click();
    else if (el instanceof HTMLInputElement && el.form) el.form.requestSubmit ? el.form.requestSubmit() : el.form.submit();
  } else if (/^Page(Down|Up)$|^Home$|^End$/.test(k)) {
    const h = window.innerHeight * 0.85;
    if (k === "PageDown") window.scrollBy(0, h);
    else if (k === "PageUp") window.scrollBy(0, -h);
    else window.scrollTo(0, k === "Home" ? 0 : document.body.scrollHeight);
  }
  return true;
}

export function ptScroll(a: { dy: number; x?: number; y?: number }) {
  let el = a.x !== undefined && a.y !== undefined ? (document.elementFromPoint(a.x, a.y) as HTMLElement | null) : null;
  while (el && el !== document.body) {
    const st = getComputedStyle(el);
    if (/(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 2) {
      el.scrollBy(0, a.dy);
      return true;
    }
    el = el.parentElement;
  }
  window.scrollBy(0, a.dy);
  return true;
}

function ptUpload(a: { x: number; y: number; b64: string; name: string; mime: string }) {
  const el = document.elementFromPoint(a.x, a.y);
  const box = (el instanceof HTMLInputElement && el.type === "file" ? el : null) ?? el?.closest("label")?.querySelector('input[type="file"]') ?? (el?.closest("label") as HTMLLabelElement | null)?.control ?? el?.closest("div,section,form,li")?.querySelector('input[type="file"]') ?? null;
  if (!(box instanceof HTMLInputElement) || box.type !== "file") return false;
  const bin = atob(a.b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const dt = new DataTransfer();
  dt.items.add(new File([bytes], a.name, { type: a.mime }));
  box.files = dt.files;
  box.dispatchEvent(new Event("input", { bubbles: true }));
  box.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

// the runner's own bar on the page stays out of every picture
function barVisible(show: boolean) {
  const el = document.getElementById("ivyward-runner-bar");
  if (el) el.style.visibility = show ? "" : "hidden";
  return true;
}
async function shoot(windowId: number, tabId: number, quality: number): Promise<string> {
  await run(tabId, 0, barVisible as (a: never) => boolean, false).catch(() => {});
  try {
    return await chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality });
  } finally {
    await run(tabId, 0, barVisible as (a: never) => boolean, true).catch(() => {});
  }
}

// a small picture of a page for the applicant's review and the run history: only of a tab already on screen
export async function captureSmall(tabId: number): Promise<string | undefined> {
  const t = await chrome.tabs.get(tabId);
  if (!t.active) return undefined;
  const url = await shoot(t.windowId, tabId, 55);
  if (typeof OffscreenCanvas === "undefined") return url;
  const bmp = await createImageBitmap(await (await fetch(url)).blob());
  const w = Math.min(720, bmp.width);
  const h = Math.round((bmp.height * w) / bmp.width);
  const c = new OffscreenCanvas(w, h);
  c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  const blob = await c.convertToBlob({ type: "image/jpeg", quality: 0.55 });
  const buf = new Uint8Array(await blob.arrayBuffer());
  return "data:image/jpeg;base64," + b64(buf);
}

// the visible tab as a jpeg in css pixels (captureVisibleTab gives device pixels)
async function capture(tabId: number): Promise<Uint8Array> {
  const t = await chrome.tabs.get(tabId);
  if (!t.active) await chrome.tabs.update(tabId, { active: true });
  const url: string = await shoot(t.windowId, tabId, 60);
  const dpr = (await run(tabId, 0, (() => window.devicePixelRatio || 1) as (a: never) => number)) || 1;
  const blob = await (await fetch(url)).blob();
  if (dpr === 1 || typeof OffscreenCanvas === "undefined") return new Uint8Array(await blob.arrayBuffer());
  const bmp = await createImageBitmap(blob);
  const w = Math.round(bmp.width / dpr);
  const h = Math.round(bmp.height / dpr);
  const c = new OffscreenCanvas(w, h);
  c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  return new Uint8Array(await (await c.convertToBlob({ type: "image/jpeg", quality: 0.6 })).arrayBuffer());
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
    // eyes and hands for the screenshot steps. chrome only captures the tab on screen, so it's brought to the front
    screenshot: () => capture(tabId),
    mouseClick: async (x, y) => {
      await run(tabId, 0, ptClick as (a: never) => boolean, { x, y });
    },
    doubleClick: async (x, y) => {
      await run(tabId, 0, ptClick as (a: never) => boolean, { x, y, double: true });
    },
    hover: async (x, y) => {
      await run(tabId, 0, ptClick as (a: never) => boolean, { x, y, hover: true });
    },
    typeText: async (text) => {
      await run(tabId, 0, ptType as (a: never) => boolean, text);
    },
    pressKey: async (key) => {
      await run(tabId, 0, ptKey as (a: never) => boolean, key);
    },
    scrollBy: async (dy, x, y) => {
      await run(tabId, 0, ptScroll as (a: never) => boolean, { dy, x, y });
    },
    goBack: async () => {
      await chrome.tabs.goBack(tabId).catch(() => null);
      await waitLoad(20_000, 500);
    },
    uploadAt: async (x, y, file) => run(tabId, 0, ptUpload as (a: never) => boolean, { x, y, b64: b64(file.buffer), name: file.name, mime: file.mime }),
  };
}
