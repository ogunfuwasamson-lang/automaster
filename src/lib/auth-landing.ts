import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-redirect";
import { serverClient } from "@/lib/supabase/server";
import { recordSignup } from "@/lib/referrals";

// after a sign-in succeeds (link, code or Google): credit the invite link and channel on the first visit, then go on
export async function land(req: NextRequest) {
  const sb = await serverClient();
  const { data } = await sb.auth.getUser();
  if (data.user) {
    let src = null;
    try {
      src = JSON.parse(req.cookies.get("iv_src")?.value ?? "null");
    } catch {}
    await recordSignup(data.user.id, data.user.created_at, req.cookies.get("iv_ref")?.value, src).catch(() => {});
  }
  return NextResponse.redirect(new URL(safeNextPath(nextFrom(req.nextUrl.searchParams, req.nextUrl.origin)), req.url));
}

// where to go after sign-in: ?next=/path, or the path carried inside the email link's redirect_to
// (https://this-site/auth/callback?next=/path). anything pointing at another site is dropped.
export function nextFrom(q: URLSearchParams, origin: string): string | null {
  const next = q.get("next");
  if (next) return next;
  const to = q.get("redirect_to");
  if (!to) return null;
  if (to.startsWith("/")) return to;
  try {
    const u = new URL(to);
    return u.origin === origin ? u.searchParams.get("next") : null;
  } catch {
    return null;
  }
}
