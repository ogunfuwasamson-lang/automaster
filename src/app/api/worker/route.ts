import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { drain } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 300;

// hit by supabase pg_cron every minute (see README) and by the vercel daily cron as a backstop.
function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const results = await drain(`vercel-${process.env.VERCEL_REGION ?? "local"}`, 5);
  return NextResponse.json({ ran: results.length, results });
}

export const GET = handle;
export const POST = handle;
