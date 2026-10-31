import { NextResponse, type NextRequest } from "next/server";
import { confirm } from "@/lib/deadline-alerts";

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t") ?? "";
  const ok = /^[a-f0-9]{32}$/.test(t) && (await confirm(t).catch(() => false));
  return NextResponse.redirect(new URL(ok ? "/alerts?confirmed=1" : "/alerts?error=1", req.url));
}
