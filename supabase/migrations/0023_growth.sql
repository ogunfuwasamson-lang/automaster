-- growth: where signups come from, invite links with a free submission for both sides, and deadline alerts for
-- visitors who aren't ready to sign up yet.
alter table public.profiles add column if not exists referral_code text unique;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists bonus_submissions int not null default 0;
alter table public.profiles add column if not exists signup_source jsonb;
alter table public.profiles add column if not exists referral_rewarded_at timestamptz;
create index if not exists profiles_referred_by_idx on public.profiles(referred_by);

create table if not exists public.alert_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  interests text[] not null default '{}',
  source text,
  token text not null default replace(gen_random_uuid()::text, '-', ''),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.alert_subscribers enable row level security;
-- no policies: only the service role reads or writes subscribers

-- spend one free submission atomically; returns true when one was available
create or replace function public.use_bonus_submission(uid uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update profiles set bonus_submissions = bonus_submissions - 1 where id = uid and bonus_submissions > 0 returning bonus_submissions into n;
  return found;
end $$;
revoke all on function public.use_bonus_submission(uuid) from public, anon, authenticated;

-- campus and community ambassadors: people who bring applicants in with their own invite code
create table if not exists public.ambassador_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  country text,
  institution text,
  audience text,
  channels text,
  user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
alter table public.ambassador_applications enable row level security;
alter table public.profiles add column if not exists referral_cap int;
