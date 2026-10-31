import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { recordSignup } from "@/lib/referrals";

// the magic link lands here. a used or expired link goes back to sign-in with a message, not to a blank redirect.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") ?? "";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  if (!code) return NextResponse.redirect(new URL("/login?error=link", req.url));
  const sb = await serverClient();
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=link", req.url));
  // first sign-in: credit the invite link and the channel they came from
  const { data } = await sb.auth.getUser();
  if (data.user) {
    let src = null;
    try {
      src = JSON.parse(req.cookies.get("iv_src")?.value ?? "null");
    } catch {}
    await recordSignup(data.user.id, data.user.created_at, req.cookies.get("iv_ref")?.value, src).catch(() => {});
  }
  return NextResponse.redirect(new URL(safeNext, req.url));
}
