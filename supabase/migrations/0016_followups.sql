-- follow-ups: things a school's email asks the applicant to do that the agents can do for them (register for a
-- webinar, claim a fee waiver, fill a form), plus the events worth having in their calendar. one row per action.
create table if not exists followups (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  application_id uuid references applications(id) on delete set null,
  message_id    uuid references messages(id) on delete set null,
  kind          text not null,      -- register_event | claim_fee_waiver | fill_form | upload_document | book_interview | event | other
  title         text not null,
  url           text,
  school        text,
  why           text,               -- why it matters, in one sentence ("attending unlocks the application fee waiver")
  unlocks       text,               -- fee_waiver | scholarship | interview | admission | ''
  event_start   timestamptz,
  event_end     timestamptz,
  deadline      date,
  status        text not null default 'queued' check (status in ('queued', 'working', 'done', 'needs_you', 'failed', 'skipped')),
  result_note   text,
  calendar_sent_at timestamptz,
  state         jsonb not null default '{}'::jsonb,   -- the browser run's progress, like runner_state
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists followups_user on followups(user_id, created_at desc);
create unique index if not exists followups_once on followups(user_id, coalesce(url, title), coalesce(event_start, 'epoch'::timestamptz));
alter table followups enable row level security;
drop policy if exists followups_select_own on followups;
create policy followups_select_own on followups for select to authenticated using (user_id = auth.uid());
