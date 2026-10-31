import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// sign out: end the session at supabase and clear the auth cookies on this response itself, so the browser
// forgets the session even if the supabase call fails. works for a form post (redirects home) and for fetch.
export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/", req.url), { status: 303 });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (toSet) => toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    },
  });
  await sb.auth.signOut({ scope: "local" }).catch(() => null);
  for (const c of req.cookies.getAll()) if (c.name.startsWith("sb-")) res.cookies.set(c.name, "", { path: "/", maxAge: 0 });
  return res;
}

export const GET = POST;
