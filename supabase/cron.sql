-- run once in the supabase sql editor AFTER deploying to vercel.
-- pings the worker every minute so agent jobs run on time (vercel hobby cron is daily only).
-- replace the two placeholders first.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'automaster-worker',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-APP.vercel.app/api/worker',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET', 'Content-Type', 'application/json'),
    timeout_milliseconds := 5000
  );
  $$
);
