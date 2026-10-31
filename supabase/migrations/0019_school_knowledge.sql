-- what the agents learn about each school, shared across applicants: how its portal works, which contacts
-- answer, which fee-waiver routes work, its essay prompts. facts about the school only: never anyone's
-- answers, essays, emails, documents or passwords.
create table if not exists school_knowledge (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  kind          text not null,      -- apply_url, portal, field, contact, waiver, prompt
  key           text not null,      -- what it's about (a program id, a host, a label, an address...)
  value         jsonb not null default '{}'::jsonb,
  confirmations integer not null default 0,   -- separate applicants (or runs) it held for
  failures      integer not null default 0,   -- times it didn't
  contributors  text[] not null default '{}', -- hashed applicant ids, so one person can't confirm a fact alone
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now(),
  unique (school_id, kind, key)
);
create index if not exists school_knowledge_school on school_knowledge(school_id, kind);
-- server-only: read and written by the agents with the service role
alter table school_knowledge enable row level security;
