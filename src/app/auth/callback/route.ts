import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (code) {
    const sb = await serverClient();
    await sb.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
