import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { land } from "@/lib/auth-landing";

// after a sign-in that finished in the browser (Google's own button): credit the invite and go on.
// nobody signed in: back to sign-in.
export async function GET(req: NextRequest) {
  const sb = await serverClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) return NextResponse.redirect(new URL("/login", req.url));
  return land(req);
}
