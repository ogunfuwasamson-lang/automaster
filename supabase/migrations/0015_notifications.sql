-- notifications: what the applicant should know or do, from any agent. one row per thing, de-duplicated by key,
-- so an agent can raise the same notice many times without spamming. resolved when the thing is done.
create table if not exists notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  kind          text not null,                 -- setup | shortlist | reminder | followup | info
  title         text not null,
  body          text,
  href          text,                          -- where to go to act on it
  action_label  text,
  dedupe_key    text not null,
  urgent        boolean not null default false,
  created_at    timestamptz not null default now(),
  read_at       timestamptz,
  resolved_at   timestamptz,
  emailed_at    timestamptz,
  unique (user_id, dedupe_key)
);
create index if not exists notifications_open on notifications(user_id, created_at desc) where resolved_at is null;

alter table notifications enable row level security;
drop policy if exists notifications_select_own on notifications;
create policy notifications_select_own on notifications for select to authenticated using (user_id = auth.uid());
-- writes go through server routes (marking read included)
