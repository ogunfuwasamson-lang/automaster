import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-redirect";
import { serverClient } from "@/lib/supabase/server";
import { recordSignup } from "@/lib/referrals";
import { CREATOR_COOKIE, VISITOR_COOKIE, attributeSignup } from "@/lib/creators";

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
    // a creator's link (lib/creators): the new account counts towards their sign-ups
    // (from the cookie, or carried in the sign-in link when the email opened in another browser)
    const q = req.nextUrl.searchParams;
    const carried = (k: string) => q.get(k) ?? fromRedirect(q, req.nextUrl.origin, k);
    await attributeSignup(data.user.id, data.user.created_at, req.cookies.get(CREATOR_COOKIE)?.value ?? carried("c") ?? undefined, req.cookies.get(VISITOR_COOKIE)?.value ?? carried("v") ?? undefined).catch(() => {});
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

// a value carried inside the email link's redirect_to (https://this-site/auth/callback?c=code)
function fromRedirect(q: URLSearchParams, origin: string, key: string): string | null {
  const to = q.get("redirect_to");
  if (!to) return null;
  try {
    const u = new URL(to, origin);
    return u.origin === origin ? u.searchParams.get(key) : null;
  } catch {
    return null;
  }
}
