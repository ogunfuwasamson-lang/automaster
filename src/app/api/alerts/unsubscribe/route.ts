import { NextResponse, type NextRequest } from "next/server";
import { unsubscribe } from "@/lib/deadline-alerts";

// one click from the email footer or the List-Unsubscribe header
async function handle(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t") ?? "";
  const ok = /^[a-f0-9]{32}$/.test(t) && (await unsubscribe(t).catch(() => false));
  return ok;
}
export async function GET(req: NextRequest) {
  const ok = await handle(req);
  return NextResponse.redirect(new URL(ok ? "/alerts?unsubscribed=1" : "/alerts?error=1", req.url));
}
export async function POST(req: NextRequest) {
  await handle(req);
  return NextResponse.json({ ok: true });
}
