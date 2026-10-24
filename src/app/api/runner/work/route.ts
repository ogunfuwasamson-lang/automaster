import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { drain } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 300;

// the only function that ships chromium. runs one portal job at a time; kicked by /api/worker when runner work is due.
function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
  const want = Buffer.from(secret);
  return got.length === want.length && timingSafeEqual(got, want);
}

async function handle(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const results = await drain(`runner-${process.env.VERCEL_REGION ?? "local"}`, 1, "runner");
  return NextResponse.json({ ran: results.length, results });
}

export const GET = handle;
export const POST = handle;
