-- 0008: the cloud runner. portals are filled and submitted from our servers (no install for the applicant).

-- portal logins the agents create for the applicant: their own email, a generated password.
-- the password is encrypted by the app; the applicant can reveal it in the app and change it any time.
create table if not exists portal_accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  application_id uuid references applications(id) on delete set null,
  portal_host   text not null,                 -- e.g. apply.babson.edu
  login_email   text not null,
  password_enc  text not null,
  status        text not null default 'created' check (status in ('created', 'verified', 'failed')),
  revealed_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (user_id, portal_host)
);
alter table portal_accounts enable row level security; -- no user-facing policies: served through the api

alter table applications add column if not exists runner_mode text not null default 'cloud' check (runner_mode in ('cloud', 'extension'));
alter table applications add column if not exists runner_session_id text;
alter table applications add column if not exists runner_live_url text;
alter table applications add column if not exists runner_state jsonb not null default '{}'::jsonb;

-- browser work runs only in the function that ships chromium (/api/runner/work); everything else skips it.
-- only_agent = null: any job except the runner's. only_agent = 'runner': only the runner's.
create or replace function claim_jobs_for(worker text, max_jobs integer, only_agent text)
returns setof jobs language sql as $$
  update jobs set status = 'running', locked_at = now(), locked_by = worker, attempts = attempts + 1
  where id in (
    select id from jobs
    where ((status = 'queued' and run_at <= now())
       or (status = 'running' and locked_at < now() - interval '10 minutes' and attempts < max_attempts))
      and (case when only_agent is null then agent <> 'runner' else agent = only_agent end)
    order by run_at
    limit max_jobs
    for update skip locked
  )
  returning *;
$$;
