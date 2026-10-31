-- the learning loop. a lesson is one instruction an agent picks up next time it runs:
--   scope user:   learned from one applicant (how they write, what they drop from a shortlist). used only for them,
--                 active straight away, and listed in their settings where they can remove it.
--   scope global: learned across applicants (what gets portals unstuck, what gets replies). proposed first; an admin
--                 approves it before any agent uses it, and it retires itself if the numbers get worse.
-- topic narrows a lesson to one portal host or school.
create table if not exists lessons (
  id            uuid primary key default gen_random_uuid(),
  scope         text not null check (scope in ('user', 'global')),
  user_id       uuid references profiles(id) on delete cascade,
  agent         text not null,
  task          text,
  topic         text,
  text          text not null,
  evidence      jsonb not null default '{}'::jsonb,
  status        text not null default 'proposed' check (status in ('proposed', 'active', 'retired', 'rejected')),
  source        text not null default 'auto',
  fingerprint   text unique,
  baseline      jsonb,
  retired_reason text,
  created_at    timestamptz not null default now(),
  decided_at    timestamptz,
  check (scope = 'global' or user_id is not null)
);
create index if not exists lessons_lookup on lessons(agent, status, scope);
create index if not exists lessons_user on lessons(user_id) where user_id is not null;
alter table lessons enable row level security;

-- which lessons each model call carried, to measure whether they help
alter table agent_runs add column if not exists lesson_ids uuid[];
