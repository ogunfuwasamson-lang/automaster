// the small slice of a browser the portal engine needs. the cloud runner backs it with playwright; the chrome
// extension backs it with chrome.scripting in the applicant's own browser. same engine, same decisions.
import type { Frame, Page } from "playwright-core";
import { DOM_HELPER } from "@/lib/runner-dom";

export interface EngineFile {
  name: string;
  mime: string;
  buffer: Uint8Array;
}

export interface EngineFrame {
  readonly isMain: boolean;
  url(): string;
  // install the in-page helper (window.__am) if it isn't there yet
  helper(): Promise<void>;
  // run a self-contained function in the frame (it is serialised: no closures)
  evaluate<R, A>(fn: (arg: A) => R, arg: A): Promise<R>;
  click(selector: string, opts: { timeout: number }): Promise<void>;
  fill(selector: string, value: string, opts: { timeout: number }): Promise<void>;
  press(selector: string, key: "Enter"): Promise<void>;
  setInputFiles(selector: string, file: EngineFile): Promise<void>;
}

export interface EnginePage {
  url(): string | Promise<string>;
  mainFrame(): EngineFrame;
  frames(): EngineFrame[] | Promise<EngineFrame[]>;
  goto(url: string, opts?: { timeout?: number }): Promise<unknown>;
  waitForLoadState(state: "domcontentloaded" | "networkidle", opts?: { timeout?: number }): Promise<void>;
  pressEnter(): Promise<void>;
  // eyes and hands, for pages the DOM can't explain (custom dropdowns, canvas widgets, odd layouts). optional:
  // the cloud browser has them; where they're missing the engine simply doesn't look at the screen.
  screenshot?(): Promise<Uint8Array>; // jpeg of the viewport, in css pixels
  mouseClick?(x: number, y: number): Promise<void>;
  typeText?(text: string): Promise<void>;
  pressKey?(key: "Enter" | "Tab" | "Escape" | "ArrowDown" | "ArrowUp" | "Backspace" | "Control+A"): Promise<void>;
  scrollBy?(dy: number): Promise<void>;
}

const wrapped = new WeakMap<Frame, EngineFrame>();
function frame(f: Frame, page: Page): EngineFrame {
  const hit = wrapped.get(f);
  if (hit) return hit;
  const ef: EngineFrame = {
    get isMain() {
      return f === page.mainFrame();
    },
    url: () => f.url(),
    helper: async () => {
      await f.evaluate(DOM_HELPER);
    },
    evaluate: (fn, arg) => f.evaluate(fn as never, arg as never) as never,
    click: (sel, o) => f.click(sel, o),
    fill: (sel, v, o) => f.fill(sel, v, o),
    press: (sel, key) => f.press(sel, key),
    setInputFiles: (sel, file) => f.setInputFiles(sel, { name: file.name, mimeType: file.mime, buffer: Buffer.from(file.buffer) }),
  };
  wrapped.set(f, ef);
  return ef;
}

export function fromPlaywright(page: Page): EnginePage {
  return {
    url: () => page.url(),
    mainFrame: () => frame(page.mainFrame(), page),
    frames: () => page.frames().map((f) => frame(f, page)),
    goto: (url, o) => page.goto(url, { waitUntil: "domcontentloaded", timeout: o?.timeout ?? 45_000 }),
    waitForLoadState: async (state, o) => {
      await page.waitForLoadState(state, o);
    },
    pressEnter: () => page.keyboard.press("Enter"),
    screenshot: async () => new Uint8Array(await page.screenshot({ type: "jpeg", quality: 60, scale: "css", timeout: 10_000 })),
    mouseClick: async (x, y) => {
      await page.mouse.click(x, y);
    },
    typeText: (text) => page.keyboard.type(text, { delay: 25 }),
    pressKey: (key) => page.keyboard.press(key),
    scrollBy: (dy) => page.mouse.wheel(0, dy),
  };
}
