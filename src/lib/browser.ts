import "server-only";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";

// browsers for the cloud runner, cheapest first:
//   1. our own headless chromium inside the vercel function (default, no extra cost). each run restores the
//      portal's cookies from the last run, so a session survives between short function runs.
//   2. browserbase (set BROWSERBASE_API_KEY): long-lived sessions and a live view for bot checks.
//   3. RUNNER_CDP_URL: any chromium you point it at (local tests, a self-hosted box).
// captcha solving is never switched on: bot checks go to the applicant.

const BB = "https://api.browserbase.com/v1";
export type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

export interface OpenBrowser {
  page: Page;
  sessionId: string | null; // browserbase session to reuse next run
  storage(): Promise<StorageState>;
  liveUrl(): Promise<string | null>;
  close(keepAlive: boolean): Promise<void>;
}

async function bb(path: string, init?: RequestInit) {
  const res = await fetch(`${BB}${path}`, { ...init, headers: { "x-bb-api-key": process.env.BROWSERBASE_API_KEY!, "content-type": "application/json", ...(init?.headers ?? {}) } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`browserbase ${path}: ${res.status} ${JSON.stringify(json).slice(0, 200)}`);
  return json;
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

export async function openBrowser(opts: { sessionId?: string | null; storage?: StorageState | null }): Promise<OpenBrowser> {
  // 2. browserbase
  if (process.env.BROWSERBASE_API_KEY) {
    let id = opts.sessionId ?? null;
    if (id) {
      const s = (await bb(`/sessions/${id}`).catch(() => null)) as { status?: string } | null;
      if (s?.status !== "RUNNING") id = null;
    }
    if (!id) {
      id = ((await bb("/sessions", {
        method: "POST",
        body: JSON.stringify({
          ...(process.env.BROWSERBASE_PROJECT_ID ? { projectId: process.env.BROWSERBASE_PROJECT_ID } : {}),
          keepAlive: true,
          timeout: 3600,
          browserSettings: { solveCaptchas: false, recordSession: true, viewport: { width: 1280, height: 900 } },
        }),
      })) as { id: string }).id;
    }
    const { connectUrl } = (await bb(`/sessions/${id}`)) as { connectUrl?: string };
    const browser = await chromium.connectOverCDP(connectUrl ?? `wss://connect.browserbase.com?apiKey=${process.env.BROWSERBASE_API_KEY}&sessionId=${id}`);
    const ctx = browser.contexts()[0] ?? (await browser.newContext());
    if (opts.storage?.cookies?.length && !opts.sessionId) await ctx.addCookies(opts.storage.cookies);
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    const sid = id;
    return {
      page,
      sessionId: sid,
      storage: () => ctx.storageState(),
      liveUrl: async () => ((await bb(`/sessions/${sid}/debug`).catch(() => ({}))) as { debuggerFullscreenUrl?: string }).debuggerFullscreenUrl ?? null,
      close: async (keepAlive) => {
        await browser.close().catch(() => {});
        if (!keepAlive) await bb(`/sessions/${sid}`, { method: "POST", body: JSON.stringify({ status: "REQUEST_RELEASE", ...(process.env.BROWSERBASE_PROJECT_ID ? { projectId: process.env.BROWSERBASE_PROJECT_ID } : {}) }) }).catch(() => {});
      },
    };
  }

  // 1 and 3: a fresh browser per run with the portal cookies carried over
  let browser: Browser;
  if (process.env.RUNNER_CDP_URL) {
    browser = await chromium.connectOverCDP(process.env.RUNNER_CDP_URL);
  } else {
    const Sparticuz = (await import("@sparticuz/chromium")).default;
    browser = await chromium.launch({ executablePath: await Sparticuz.executablePath(), args: Sparticuz.args, headless: true });
  }
  const ctx = await browser.newContext({ storageState: opts.storage ?? undefined, userAgent: UA, viewport: { width: 1280, height: 900 }, locale: "en-US" });
  const page = await ctx.newPage();
  return {
    page,
    sessionId: null,
    storage: () => ctx.storageState(),
    liveUrl: async () => null,
    close: async () => {
      await ctx.close().catch(() => {});
      if (!process.env.RUNNER_CDP_URL) await browser.close().catch(() => {});
    },
  };
}

export const hasLiveView = () => !!process.env.BROWSERBASE_API_KEY;
