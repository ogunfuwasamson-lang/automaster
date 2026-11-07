import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// requests the server or its browsers make to addresses taken from outside (school websites, links in emails,
// portal pages) must never reach the machine itself or its private network: loopback, private ranges, link-local
// (cloud metadata at 169.254.169.254) and the like. on a single VM the app, its scheduler and any metadata
// service share the network with the browser, so this matters more there than on serverless.

function privateV4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}
function privateV6(ip: string): boolean {
  const x = ip.toLowerCase();
  if (x === "::" || x === "::1") return true;
  if (x.startsWith("::ffff:")) return privateV4(x.slice(7));
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(x);
}
export const isPrivateIp = (ip: string) => (isIP(ip) === 4 ? privateV4(ip) : isIP(ip) === 6 ? privateV6(ip) : false);

const BLOCKED_HOSTS = /^(localhost|.*\.localhost|.*\.local|.*\.internal|metadata\.google\.internal)$/i;

// cheap check on the URL alone (no DNS): scheme and literal host
export function obviouslyUnsafe(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return true;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return true;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  return BLOCKED_HOSTS.test(host) || isPrivateIp(host);
}

const cache = new Map<string, { ok: boolean; at: number }>();
// full check: the host must resolve only to public addresses
export async function isPublicUrl(raw: string): Promise<boolean> {
  if (obviouslyUnsafe(raw)) return false;
  const host = new URL(raw).hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return true;
  const hit = cache.get(host);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.ok;
  let ok = false;
  try {
    const addrs = await lookup(host, { all: true });
    ok = addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address));
  } catch {
    ok = false;
  }
  cache.set(host, { ok, at: Date.now() });
  return ok;
}

// fetch a page from the open web, following redirects by hand so every hop is checked
export async function safeFetch(url: string, init: RequestInit = {}, hops = 5): Promise<Response | null> {
  let current = url;
  for (let i = 0; i <= hops; i++) {
    if (!(await isPublicUrl(current))) return null;
    const res = await fetch(current, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, current).toString();
      continue;
    }
    return res;
  }
  return null;
}
