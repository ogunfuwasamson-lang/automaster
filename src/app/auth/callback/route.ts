import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";

// the magic link lands here. a used or expired link goes back to sign-in with a message, not to a blank redirect.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") ?? "";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  if (!code) return NextResponse.redirect(new URL("/login?error=link", req.url));
  const sb = await serverClient();
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=link", req.url));
  return NextResponse.redirect(new URL(safeNext, req.url));
}
