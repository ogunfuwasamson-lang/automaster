-- questions a portal asked that the applicant's profile doesn't answer. the interviewer asks them; the answer
-- goes into the profile (confirmed facts, and form details where one fits) so every later portal can use it.
create table if not exists portal_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid references applications (id) on delete cascade,
  qkey text not null,                 -- normalised question, so the same question from two schools is asked once
  question text not null,
  field_type text,
  options jsonb not null default '[]'::jsonb,
  sheet_key text,                     -- e.g. country_of_birth, when we know which profile detail answers it
  status text not null default 'open' check (status in ('open', 'answered', 'dismissed')),
  answer text,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create unique index if not exists portal_questions_open on portal_questions (user_id, qkey) where status = 'open';
create index if not exists portal_questions_user on portal_questions (user_id, status, created_at desc);
alter table portal_questions enable row level security;
drop policy if exists portal_questions_own on portal_questions;
create policy portal_questions_own on portal_questions for select using (auth.uid() = user_id);
