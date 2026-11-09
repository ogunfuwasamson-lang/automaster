import { NextResponse, after, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { drain } from "@/lib/jobs";
import { sendDue } from "@/lib/outbox";
import { scheduleDigests } from "@/lib/digest";
import { scheduleInbox } from "@/lib/inbox";
import { scheduleWeekly } from "@/lib/weekly";
import { refreshPrices } from "@/lib/fx";
import { publicUrls, schoolUrls, submitIndexNow } from "@/lib/indexnow";
import { sendMonthlyAlerts } from "@/lib/deadline-alerts";
import { sweepOrphans, sweepResumable } from "@/lib/requeue";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { appUrl } from "@/lib/gmail";
import { SITE } from "@/lib/site";
import { aiPausedUntil } from "@/lib/ai-health";

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
  // every recurring check runs every 5 minutes: inbox, digests (sent once a day; idempotency keys stop
  // duplicates) and the sweep that restarts applications a profile change could unblock
  const tick = new Date().getUTCMinutes() % 5 === 0;
  const digests = tick ? await scheduleDigests().catch(() => 0) : 0;
  if (tick) await scheduleInbox().catch(() => 0);
  if (tick) await scheduleWeekly().catch(() => 0);
  // once a day: african prices follow the exchange rate (refreshes when 25+ days old)
  if (tick && new Date().getUTCHours() === 3 && new Date().getUTCMinutes() < 5) await refreshPrices().catch(() => null);
  if (tick) await sweepResumable().catch(() => 0);
  if (tick) await sweepOrphans().catch(() => 0);
  // once a day: tell search engines about library pages that are new or re-checked since yesterday
  // the school directory's first announcement to IndexNow: once, then only new or re-checked pages daily
  if (tick) await announceSchoolsOnce().catch(() => null);
  if (tick && new Date().getUTCHours() === 4 && new Date().getUTCMinutes() < 5) {
    const since = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    await submitIndexNow(publicUrls(since)).catch(() => null);
    await submitIndexNow(await schoolUrls(since).catch(() => [])).catch(() => null);
  }
  // scholarship deadline alerts: the 1st of each month from 08:00 UTC, in batches until everyone has theirs
  if (tick && new Date().getUTCDate() === 1 && new Date().getUTCHours() >= 8) await sendMonthlyAlerts(60).catch(() => null);
  // the nightly learning pass (02:00 UTC), run under a staff account
  if (tick && new Date().getUTCHours() === 2 && new Date().getUTCMinutes() < 5) await scheduleLearning().catch(() => null);
  // the AI provider refused calls for an account reason (credit, key): hold the queue instead of failing it
  const pausedUntil = await aiPausedUntil().catch(() => 0);
  if (pausedUntil > Date.now()) {
    const mail = await sendDue().catch(() => []);
    return NextResponse.json({ ran: 0, aiPausedUntil: new Date(pausedUntil).toISOString(), mail: mail.length, digests });
  }
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

async function announceSchoolsOnce() {
  const db = admin();
  const KEY = "indexnow_schools_v1";
  const { data } = await db.from("billing_settings").select("value").eq("key", KEY).maybeSingle();
  if (data?.value) return;
  await db.from("billing_settings").upsert({ key: KEY, value: new Date().toISOString() });
  const urls = await schoolUrls("2000-01-01");
  const hubs = ["/schools", "/schools/us", "/schools/uk"].map((p) => `${SITE.url}${p}`);
  await submitIndexNow([...hubs, ...urls]);
}

async function scheduleLearning() {
  const { data: owner } = await admin().from("profiles").select("id").eq("is_admin", true).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!owner) return;
  await enqueue({ userId: owner.id, agent: "learning", task: "nightly", idempotencyKey: `learn:${new Date().toISOString().slice(0, 10)}` });
}

export const GET = handle;
export const POST = handle;
