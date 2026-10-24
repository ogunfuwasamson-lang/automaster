import { NextResponse, after, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { drain } from "@/lib/jobs";
import { sendDue } from "@/lib/outbox";
import { scheduleDigests } from "@/lib/digest";
import { admin } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/gmail";

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
  // digests: a few checks an hour; idempotency keys stop duplicates
  const digests = new Date().getUTCMinutes() % 15 === 0 ? await scheduleDigests().catch(() => 0) : 0;
  const [results, mail] = await Promise.all([drain(`vercel-${process.env.VERCEL_REGION ?? "local"}`, 5), sendDue().catch(() => [])]);
  // portal work runs in its own function (it ships chromium). poke it when some is due: up to 3 in parallel.
  const { count } = await admin().from("jobs").select("id", { count: "exact", head: true }).eq("agent", "runner").eq("status", "queued").lte("run_at", new Date().toISOString());
  if (count) {
    after(() =>
      Promise.all(
        Array.from({ length: Math.min(count, 3) }, () =>
          fetch(`${appUrl()}/api/runner/work`, { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }, signal: AbortSignal.timeout(8000) }).catch(() => null), // fire and forget
        ),
      ).then(() => undefined),
    );
  }
  return NextResponse.json({ ran: results.length, results, mail: mail.length, digests, runner: count ?? 0 });
}

export const GET = handle;
export const POST = handle;
