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
  pressKey?(key: string): Promise<void>;
  scrollBy?(dy: number, x?: number, y?: number): Promise<void>;
  doubleClick?(x: number, y: number): Promise<void>;
  hover?(x: number, y: number): Promise<void>;
  goBack?(): Promise<void>;
  // click something that opens a file picker (or a file box) and give it this file
  uploadAt?(x: number, y: number, file: EngineFile): Promise<boolean>;
  // messages the page showed in alert/confirm boxes since the last call (accepted, so the page carries on)
  dialogs?(): string[];
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
  // alert boxes ("The system does not understand the date you entered") carry the portal's error: keep the text
  const said: string[] = [];
  if (!(page as unknown as { __amDialogs?: boolean }).__amDialogs) {
    (page as unknown as { __amDialogs?: boolean }).__amDialogs = true;
    page.on("dialog", (d) => {
      said.push(d.message().slice(0, 300));
      d.accept().catch(() => {});
    });
  }
  return {
    dialogs: () => said.splice(0, said.length),
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
    scrollBy: async (dy, x, y) => {
      if (x !== undefined && y !== undefined) await page.mouse.move(x, y);
      await page.mouse.wheel(0, dy);
    },
    doubleClick: async (x, y) => {
      await page.mouse.dblclick(x, y);
    },
    hover: async (x, y) => {
      await page.mouse.move(x, y);
    },
    goBack: async () => {
      await page.goBack({ waitUntil: "domcontentloaded", timeout: 20_000 }).catch(() => null);
    },
    uploadAt: async (x, y, file) => {
      const payload = { name: file.name, mimeType: file.mime, buffer: Buffer.from(file.buffer) };
      // a file box under the pointer takes the file directly; anything else should open the picker when clicked
      const handle = await page.evaluateHandle(([px, py]) => {
        const el = document.elementFromPoint(px, py);
        const box = el?.closest("label")?.querySelector('input[type="file"]') ?? (el instanceof HTMLInputElement && el.type === "file" ? el : null) ?? el?.closest("div,section,form")?.querySelector('input[type="file"]');
        return box ?? null;
      }, [x, y] as const);
      const input = handle.asElement();
      if (input) {
        await (input as import("playwright-core").ElementHandle<HTMLInputElement>).setInputFiles(payload).catch(() => null);
        return true;
      }
      const chooser = page.waitForEvent("filechooser", { timeout: 6000 }).catch(() => null);
      await page.mouse.click(x, y);
      const fc = await chooser;
      if (!fc) return false;
      await fc.setFiles(payload);
      return true;
    },
  };
}
