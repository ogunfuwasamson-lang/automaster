-- the live browser: a cloud browser the applicant can watch and take over from inside automaster.
-- the session row carries the latest screenshot; inputs (clicks, keys) queue in live_inputs and are deleted as
-- soon as they're applied, so nothing the applicant types is kept.
create table if not exists live_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  status text not null default 'starting' check (status in ('starting', 'agent', 'you', 'ended')),
  prompt text,
  url text,
  frame text,
  frame_seq integer not null default 0,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists live_sessions_app on live_sessions (application_id, status, updated_at desc);
alter table live_sessions enable row level security;
drop policy if exists live_sessions_own on live_sessions;
create policy live_sessions_own on live_sessions for select using (auth.uid() = user_id);

create table if not exists live_inputs (
  id bigserial primary key,
  session_id uuid not null references live_sessions (id) on delete cascade,
  kind text not null check (kind in ('click', 'type', 'key', 'scroll', 'control')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists live_inputs_session on live_inputs (session_id, id);
alter table live_inputs enable row level security;
-- no client policies: inputs only go through the api
