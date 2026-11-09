import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { drain } from "@/lib/jobs";
import { admin } from "@/lib/supabase/admin";

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
  // every portal job is a chromium on the box that also serves the site: at most MAX at once. a job holding a
  // lock older than 10 minutes is dead (the claim takes those back), so it doesn't count
  const max = Number(process.env.RUNNER_MAX_BROWSERS ?? 3) || 3;
  const { count } = await admin()
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("agent", "runner")
    .eq("status", "running")
    .gt("locked_at", new Date(Date.now() - 10 * 60_000).toISOString());
  if ((count ?? 0) >= max) return NextResponse.json({ ran: 0, busy: count });
  const results = await drain(`runner-${process.env.VERCEL_REGION ?? "local"}`, 1, "runner");
  return NextResponse.json({ ran: results.length, results });
}

export const GET = handle;
export const POST = handle;
