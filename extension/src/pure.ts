// the parts of the background worker that need no browser: kept apart so they can be tested
export const DEFAULT_API = "https://tryivyward.com";

// the browser's key is only ever sent to Ivyward itself (or a developer's own machine): an address typed or pasted
// into the popup can't point it anywhere else
export function safeApi(u: string): string {
  try {
    const x = new URL(u);
    const local = x.hostname === "localhost" || x.hostname === "127.0.0.1";
    if ((x.protocol === "https:" && /(^|\.)tryivyward\.com$/.test(x.hostname)) || (local && /^https?:$/.test(x.protocol))) return x.origin;
  } catch {
    /* not an address */
  }
  return DEFAULT_API;
}

// the site a host belongs to. "apply.ox.ac.uk" belongs to ox.ac.uk, not to "ac.uk": with two labels every UK,
// Australian or Nigerian university counted as the same site, and the off-portal check never fired between them
export const root = (h: string) => {
  const parts = h.toLowerCase().replace(/^www\./, "").split(".");
  const two = parts.length >= 3 && parts[parts.length - 1].length === 2 && /^(ac|edu|co|com|org|gov|net|sch|or|ne|go)$/.test(parts[parts.length - 2]);
  return parts.slice(two ? -3 : -2).join(".");
};

// how long to wait before a run that failed to start is tried again
export const backoff = (n: number) => Math.min(30, [1, 2, 5, 15][Math.min(n, 4) - 1] ?? 30) * 60_000;
