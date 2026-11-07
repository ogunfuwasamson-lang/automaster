// what Vercel's cron and the pg_cron ping did: run the job worker every minute. jobs are claimed with row locks,
// so an extra ping (pg_cron left on during the switch) does no harm.
const SECRET = process.env.CRON_SECRET;
const tick = () =>
  fetch("http://127.0.0.1:3001/api/worker", { method: "POST", headers: { authorization: `Bearer ${SECRET}` }, signal: AbortSignal.timeout(290_000) }).catch(() => null);
if (!SECRET) console.error("cron: CRON_SECRET is not set; the worker won't run");
else {
  setTimeout(tick, 30_000); // let next start first
  setInterval(tick, 60_000);
}
