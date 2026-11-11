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
  return NextResponse.redirect(new URL(safeNextPath(req.nextUrl.searchParams.get("next") ?? req.nextUrl.searchParams.get("redirect_to")), req.url));
}
