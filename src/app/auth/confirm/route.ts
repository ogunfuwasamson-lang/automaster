import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { serverClient } from "@/lib/supabase/server";
import { land } from "@/lib/auth-landing";

// a sign-in link that carries its own proof (token_hash), so it works in whichever browser the email opens in.
// /auth/callback links only work in the browser that asked for them, which fails for people who request the link
// in one app and open their mail in another.
const TYPES = new Set(["email", "magiclink", "signup", "invite", "recovery", "email_change"]);

export async function GET(req: NextRequest) {
  const hash = req.nextUrl.searchParams.get("token_hash");
  const type = req.nextUrl.searchParams.get("type") ?? "email";
  if (!hash || !TYPES.has(type)) return NextResponse.redirect(new URL("/login?error=link", req.url));
  const sb = await serverClient();
  const { error } = await sb.auth.verifyOtp({ token_hash: hash, type: type as EmailOtpType });
  if (error) return NextResponse.redirect(new URL("/login?error=link", req.url));
  return land(req);
}
