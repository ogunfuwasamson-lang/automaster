-- submission packs (africa): pay once for 5 submissions, use them as applications go in.
-- the balance lives on profiles; every change is written to credit_ledger so it can be audited and never
-- double-spent. a credit is taken at the submit gate (reserve_submission / reserve_request), tied to that
-- application or message, so a retry or a second runner can't spend it twice.

alter table public.profiles add column if not exists submission_credits int not null default 0;
do $$ begin
  alter table public.profiles add constraint profiles_submission_credits_nonneg check (submission_credits >= 0);
exception when duplicate_object then null; end $$;

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta int not null,
  reason text not null check (reason in ('pack', 'submission', 'request', 'refund', 'grant')),
  application_id uuid references public.applications(id) on delete set null,
  message_id uuid,
  reference text,
  created_at timestamptz not null default now()
);
alter table public.credit_ledger enable row level security;
create index if not exists credit_ledger_user on public.credit_ledger(user_id, created_at desc);
-- one grant per payment, one charge per application or message
create unique index if not exists credit_ledger_pack_ref on public.credit_ledger(reference) where reason = 'pack';
create unique index if not exists credit_ledger_submission_app on public.credit_ledger(application_id) where reason = 'submission';
create unique index if not exists credit_ledger_request_msg on public.credit_ledger(message_id) where reason = 'request';

-- a paid pack: add the credits once per payment reference. returns the new balance, or -1 if this payment was
-- already applied.
create or replace function public.grant_credits(uid uuid, n int, ref text) returns int
language plpgsql security definer set search_path = public as $$
declare bal int;
begin
  if n <= 0 or n > 100 then raise exception 'bad credit amount'; end if;
  insert into credit_ledger(user_id, delta, reason, reference) values (uid, n, 'pack', ref)
    on conflict (reference) where reason = 'pack' do nothing;
  if not found then return -1; end if;
  update profiles set submission_credits = submission_credits + n where id = uid returning submission_credits into bal;
  return bal;
end $$;

-- the submit gate: cover this application from an invite bonus or a pack credit, once.
-- 'already' (paid before), 'bonus', 'credit', or 'none' (nothing left: ask to pay).
create or replace function public.reserve_submission(uid uuid, app uuid) returns text
language plpgsql security definer set search_path = public as $$
declare paid timestamptz;
begin
  select paid_at into paid from applications where id = app and user_id = uid for update;
  if not found then return 'none'; end if;
  if paid is not null then return 'already'; end if;
  update profiles set bonus_submissions = bonus_submissions - 1 where id = uid and bonus_submissions > 0;
  if found then
    update applications set paid_at = now() where id = app;
    return 'bonus';
  end if;
  update profiles set submission_credits = submission_credits - 1 where id = uid and submission_credits > 0;
  if found then
    insert into credit_ledger(user_id, delta, reason, application_id) values (uid, -1, 'submission', app);
    update applications set paid_at = now() where id = app;
    return 'credit';
  end if;
  return 'none';
end $$;

-- the same for a funding request email (fee waiver, scholarship or assistantship enquiry)
create or replace function public.reserve_request(uid uuid, msg uuid) returns text
language plpgsql security definer set search_path = public as $$
declare paid timestamptz;
begin
  select paid_at into paid from messages where id = msg and user_id = uid for update;
  if not found then return 'none'; end if;
  if paid is not null then return 'already'; end if;
  update profiles set submission_credits = submission_credits - 1 where id = uid and submission_credits > 0;
  if found then
    insert into credit_ledger(user_id, delta, reason, message_id) values (uid, -1, 'request', msg);
    update messages set paid_at = now() where id = msg;
    return 'credit';
  end if;
  return 'none';
end $$;

revoke all on function public.grant_credits(uuid, int, text) from public, anon, authenticated;
revoke all on function public.reserve_submission(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reserve_request(uuid, uuid) from public, anon, authenticated;

-- onboarding: the applicant saw the pack offer and chose "later"
alter table public.profiles add column if not exists pack_offer_seen_at timestamptz;
