import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// /api/runner authenticates with the extension key itself; it has no session cookie
const PUBLIC = [
  "/login",
  "/auth",
  "/api/worker",
  "/api/health",
  "/api/runner/tasks",
  "/api/runner/sheet",
  "/api/runner/map",
  "/api/runner/file",
  "/api/runner/check",
  "/api/runner/report",
  "/api/runner/work",
  "/api/runner/engine", // the chrome extension's engine calls (extension key, no cookie)
  "/api/billing/webhook", // bachs (signed with our webhook secret, no cookie)
  "/pricing",
  "/privacy",
  "/terms",
  // search engines and AI crawlers: the sitemap, robots rules, llms.txt and the share-card images
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/llms-full.txt",
  "/001a4b28caf4a499498bf53b8c331098.txt", // the IndexNow key file (src/lib/indexnow.ts)
  // the public library: guides, scholarship profiles and the about page
  "/guides",
  "/scholarships",
  "/about",
  "/universities",
  "/glossary",
  "/tools",
  "/md/",
  "/alerts",
  "/api/alerts",
  "/embed",
  "/ambassadors",
  "/api/ambassadors",
  "/opengraph-image",
  "/twitter-image",
  "/icon",
  "/apple-icon",
];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return res; // not configured yet: let the setup page render
  if (process.env.NODE_ENV !== "production" && process.env.AM_PREVIEW === "1") return res; // local design preview

  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await sb.auth.getUser();

  const path = req.nextUrl.pathname;
  if (!data.user && !PUBLIC.some((p) => path.startsWith(p)) && path !== "/") {
    // an api call gets a clear 401 rather than a login page it can't use
    if (path.startsWith("/api/")) return NextResponse.json({ error: "sign in first" }, { status: 401 });
    const to = req.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    // come back to the page you asked for after signing in
    if (path !== "/dashboard") to.searchParams.set("next", path + req.nextUrl.search);
    return NextResponse.redirect(to);
  }
  return withAttribution(req, res);
}

// remember who invited a visitor (?ref=) and where they first came from (utm tags, referring site, landing page),
// so a signup can be credited to the right person and channel. first touch wins; nothing personal is stored.
function withAttribution(req: NextRequest, res: NextResponse) {
  if (req.method !== "GET" || req.nextUrl.pathname.startsWith("/api/")) return res;
  const q = req.nextUrl.searchParams;
  const ref = q.get("ref");
  const opts = { path: "/", maxAge: 60 * 86400, sameSite: "lax" as const, secure: true };
  if (ref && /^[a-z0-9]{4,16}$/i.test(ref)) res.cookies.set("iv_ref", ref.toLowerCase(), opts);
  if (!req.cookies.get("iv_src")) {
    const referrer = req.headers.get("referer");
    let host = "";
    try {
      host = referrer ? new URL(referrer).hostname : "";
    } catch {}
    if (host === req.nextUrl.hostname) host = "";
    const src: Record<string, string> = { landing: req.nextUrl.pathname.slice(0, 120), at: new Date().toISOString().slice(0, 10) };
    for (const k of ["utm_source", "utm_medium", "utm_campaign"]) {
      const v = q.get(k);
      if (v) src[k] = v.slice(0, 60);
    }
    if (host) src.referrer = host.slice(0, 80);
    res.cookies.set("iv_src", JSON.stringify(src), opts);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
