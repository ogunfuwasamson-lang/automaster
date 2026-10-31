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
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
