-- the creator partnership (founder's call, 24 nov 2026): creators post videos about Ivyward with their own tracked
-- links and are paid per qualified sign-up (lib/creator-terms has the rates). a qualified sign-up came through a
-- creator's link, made an account, uploaded a CV and finished the basic profile in setup.
--   creators              who applied, their handles, status (pending until the operator approves) and rate
--   creator_links         their links: tryivyward.com/c/<code>, one per platform or campaign if they like
--   creator_clicks        visits through a link: one per visitor per link per day, bots left out
--   creator_referrals     accounts made through a link, and whether (and when) each qualified
--   creator_posts         the videos they posted, with the operator's review
--   creator_banks         where payouts go; the account number is encrypted (lib/crypto)
--   creator_withdrawals   payout requests, paid by hand within 24 hours
-- additive: drop the function and these tables to reverse it. the server reads and writes them (rls on, no policies).

create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null,
  phone text,
  handles jsonb not null default '{}'::jsonb, -- {"tiktok": "@name", "instagram": "@name", ...}
  audience text, -- what they make and who watches, in their words
  followers text,
  status text not null default 'pending' check (status in ('pending', 'active', 'paused', 'rejected')),
  rate_ngn int not null default 350 check (rate_ngn >= 0 and rate_ngn <= 100000),
  note text, -- the operator's note, shown to the creator when paused or rejected
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
alter table public.creators enable row level security;

create table if not exists public.creator_links (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9-]{2,23}$'),
  label text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
alter table public.creator_links enable row level security;
create index if not exists creator_links_creator on public.creator_links(creator_id);

create table if not exists public.creator_clicks (
  id bigint generated always as identity primary key,
  link_id uuid not null references public.creator_links(id) on delete cascade,
  visitor text not null,
  day date not null default (now() at time zone 'Africa/Lagos')::date,
  created_at timestamptz not null default now(),
  unique (link_id, visitor, day)
);
alter table public.creator_clicks enable row level security;
create index if not exists creator_clicks_link_day on public.creator_clicks(link_id, day);

create table if not exists public.creator_referrals (
  id uuid primary key default gen_random_uuid(),
  -- kept when the account is deleted later, so earnings already made don't move
  user_id uuid unique references public.profiles(id) on delete set null,
  creator_id uuid not null references public.creators(id) on delete cascade,
  link_id uuid references public.creator_links(id) on delete set null,
  visitor text,
  status text not null default 'pending' check (status in ('pending', 'qualified', 'duplicate', 'rejected')),
  reason text,
  earn_ngn int not null default 0,
  qualified_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.creator_referrals enable row level security;
create index if not exists creator_referrals_creator on public.creator_referrals(creator_id, created_at);
create index if not exists creator_referrals_qualified on public.creator_referrals(creator_id, qualified_at) where status = 'qualified';

create table if not exists public.creator_posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  url text not null,
  platform text not null,
  title text,
  posted_on date not null,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  note text,
  created_at timestamptz not null default now(),
  unique (creator_id, url)
);
alter table public.creator_posts enable row level security;
create index if not exists creator_posts_creator on public.creator_posts(creator_id, posted_on);

create table if not exists public.creator_banks (
  creator_id uuid primary key references public.creators(id) on delete cascade,
  bank_name text not null,
  account_name text not null,
  account_number_enc text not null,
  account_last4 text not null,
  updated_at timestamptz not null default now()
);
alter table public.creator_banks enable row level security;

create table if not exists public.creator_withdrawals (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  amount_ngn int not null check (amount_ngn > 0),
  -- the bank details at the time of the request: {bank_name, account_name, account_last4, account_number_enc}
  bank jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected')),
  reference text, -- the transfer reference, when paid
  note text, -- why it was rejected
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references public.profiles(id) on delete set null
);
alter table public.creator_withdrawals enable row level security;
create index if not exists creator_withdrawals_creator on public.creator_withdrawals(creator_id, requested_at);
create index if not exists creator_withdrawals_pending on public.creator_withdrawals(requested_at) where status = 'pending';

-- a payout request: one creator at a time (the creator row is locked), one pending request at a time, and never more
-- than what they've earned (worked out by the server from lib/creator-terms and passed in) less what's already paid
-- or waiting. 'ok', 'inactive', 'pending' or 'too_much'.
create or replace function public.creator_request_withdrawal(cid uuid, amt int, earned int, bank jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare
  taken int;
begin
  if amt <= 0 then return 'too_much'; end if;
  perform 1 from creators where id = cid and status = 'active' for update;
  if not found then return 'inactive'; end if;
  if exists (select 1 from creator_withdrawals where creator_id = cid and status = 'pending') then return 'pending'; end if;
  select coalesce(sum(amount_ngn), 0) into taken from creator_withdrawals where creator_id = cid and status in ('pending', 'paid');
  if amt > earned - taken then return 'too_much'; end if;
  insert into creator_withdrawals(creator_id, amount_ngn, bank) values (cid, amt, bank);
  return 'ok';
end $$;
revoke all on function public.creator_request_withdrawal(uuid, int, int, jsonb) from public, anon, authenticated;

-- whether an account has finished the basic profile in setup: a degree level and at least one region
create or replace function public.creator_profile_done(p jsonb) returns boolean
language sql immutable set search_path = public as $$
  select coalesce(p->'goals'->>'study_level', '') <> ''
     and jsonb_typeof(p->'preferences'->'regions') = 'array'
     and jsonb_array_length(p->'preferences'->'regions') > 0;
$$;

-- sign-ups that now qualify: made through an active creator's link, with a CV and the basic profile. each earns the
-- creator's rate at the moment it qualifies. cid and uid narrow it to one creator or one account (null: all).
-- returns how many qualified.
create or replace function public.creator_qualify(cid uuid, uid uuid) returns int
language sql security definer set search_path = public as $$
  with done as (
    update creator_referrals r set status = 'qualified', qualified_at = now(), earn_ngn = c.rate_ngn
      from creators c, profiles p
     where r.status = 'pending' and r.creator_id = c.id and c.status = 'active' and p.id = r.user_id
       and (cid is null or r.creator_id = cid) and (uid is null or r.user_id = uid)
       and creator_profile_done(p.profile)
       and exists (select 1 from documents d where d.user_id = r.user_id and d.kind = 'cv')
    returning 1
  )
  select count(*)::int from done;
$$;

-- a creator's month so far (or any period from `since`, a Lagos date): sign-ups made through their links, how many
-- of those uploaded a CV, finished the profile and qualified, and how many were duplicates
create or replace function public.creator_funnel(cid uuid, since date)
returns table(signups int, with_cv int, with_profile int, qualified int, duplicates int)
language sql stable security definer set search_path = public as $$
  select count(*) filter (where r.status <> 'duplicate')::int,
         count(*) filter (where r.status <> 'duplicate' and exists (select 1 from documents d where d.user_id = r.user_id and d.kind = 'cv'))::int,
         count(*) filter (where r.status <> 'duplicate' and creator_profile_done(p.profile))::int,
         count(*) filter (where r.status = 'qualified')::int,
         count(*) filter (where r.status = 'duplicate')::int
    from creator_referrals r left join profiles p on p.id = r.user_id
   where r.creator_id = cid and (r.created_at at time zone 'Africa/Lagos')::date >= since;
$$;

-- one row per Lagos day from `since` to today: visits, sign-ups and qualified sign-ups
create or replace function public.creator_daily(cid uuid, since date)
returns table(day date, visits int, signups int, qualified int)
language sql stable security definer set search_path = public as $$
  with v as (
    select k.day d, count(*)::int n from creator_clicks k join creator_links l on l.id = k.link_id
     where l.creator_id = cid and k.day >= since group by 1
  ), s as (
    select (r.created_at at time zone 'Africa/Lagos')::date d, count(*)::int n from creator_referrals r
     where r.creator_id = cid and r.status <> 'duplicate' and (r.created_at at time zone 'Africa/Lagos')::date >= since group by 1
  ), q as (
    select (r.qualified_at at time zone 'Africa/Lagos')::date d, count(*)::int n from creator_referrals r
     where r.creator_id = cid and r.status = 'qualified' and (r.qualified_at at time zone 'Africa/Lagos')::date >= since group by 1
  )
  select g::date, coalesce(v.n, 0), coalesce(s.n, 0), coalesce(q.n, 0)
    from generate_series(since::timestamp, (now() at time zone 'Africa/Lagos')::date::timestamp, interval '1 day') g
    left join v on v.d = g::date left join s on s.d = g::date left join q on q.d = g::date
   order by 1;
$$;

-- each of a creator's links: visits (all time and since a Lagos date), sign-ups and qualified sign-ups
create or replace function public.creator_link_stats(cid uuid, since date)
returns table(link_id uuid, visits int, visits_since int, signups int, qualified int, qualified_since int)
language sql stable security definer set search_path = public as $$
  select l.id,
         (select count(*) from creator_clicks k where k.link_id = l.id)::int,
         (select count(*) from creator_clicks k where k.link_id = l.id and k.day >= since)::int,
         (select count(*) from creator_referrals r where r.link_id = l.id and r.status <> 'duplicate')::int,
         (select count(*) from creator_referrals r where r.link_id = l.id and r.status = 'qualified')::int,
         (select count(*) from creator_referrals r where r.link_id = l.id and r.status = 'qualified' and (r.qualified_at at time zone 'Africa/Lagos')::date >= since)::int
    from creator_links l where l.creator_id = cid;
$$;

-- qualified sign-ups and base pay per Lagos month, for one creator or all (cid null)
create or replace function public.creator_months(cid uuid)
returns table(creator_id uuid, month text, qualified int, base int)
language sql stable security definer set search_path = public as $$
  select r.creator_id, to_char(r.qualified_at at time zone 'Africa/Lagos', 'YYYY-MM'), count(*)::int, coalesce(sum(r.earn_ngn), 0)::int
    from creator_referrals r
   where r.status = 'qualified' and (cid is null or r.creator_id = cid)
   group by 1, 2;
$$;

-- a creator's sign-ups, newest first, with how far each got. the creator sees an initial, never who it is; the
-- operator (reveal) also gets the account's email to check for fraud.
create or replace function public.creator_referral_list(cid uuid, lim int, reveal boolean)
returns table(id uuid, creator_id uuid, user_id uuid, created_at timestamptz, status text, reason text, qualified_at timestamptz, earn_ngn int, link_id uuid, has_cv boolean, has_profile boolean, initial text, email text)
language sql stable security definer set search_path = public as $$
  select r.id, r.creator_id, case when reveal then r.user_id end, r.created_at, r.status, r.reason, r.qualified_at, r.earn_ngn, r.link_id,
         exists (select 1 from documents d where d.user_id = r.user_id and d.kind = 'cv'),
         coalesce(creator_profile_done(p.profile), false),
         upper(left(coalesce(nullif(trim(p.profile->'identity'->>'full_name'), ''), '?'), 1)),
         case when reveal then (select u.email::text from auth.users u where u.id = r.user_id) end
    from creator_referrals r left join profiles p on p.id = r.user_id
   where (cid is null or r.creator_id = cid)
   order by r.created_at desc
   limit least(greatest(lim, 1), 1000);
$$;

-- every creator in one go, for the operator console: visits, sign-ups and qualified sign-ups since a Lagos date and
-- all time, what's been paid and what's waiting, and their videos
create or replace function public.creator_overview(since date)
returns table(creator_id uuid, visits_since int, signups_since int, qualified_since int, signups_all int, qualified_all int, paid int, pending int, posts_since int, last_post date)
language sql stable security definer set search_path = public as $$
  select c.id,
         (select count(*) from creator_clicks k join creator_links l on l.id = k.link_id where l.creator_id = c.id and k.day >= since)::int,
         (select count(*) from creator_referrals r where r.creator_id = c.id and r.status <> 'duplicate' and (r.created_at at time zone 'Africa/Lagos')::date >= since)::int,
         (select count(*) from creator_referrals r where r.creator_id = c.id and r.status = 'qualified' and (r.qualified_at at time zone 'Africa/Lagos')::date >= since)::int,
         (select count(*) from creator_referrals r where r.creator_id = c.id and r.status <> 'duplicate')::int,
         (select count(*) from creator_referrals r where r.creator_id = c.id and r.status = 'qualified')::int,
         (select coalesce(sum(w.amount_ngn), 0) from creator_withdrawals w where w.creator_id = c.id and w.status = 'paid')::int,
         (select coalesce(sum(w.amount_ngn), 0) from creator_withdrawals w where w.creator_id = c.id and w.status = 'pending')::int,
         (select count(*) from creator_posts p where p.creator_id = c.id and p.posted_on >= since)::int,
         (select max(p.posted_on) from creator_posts p where p.creator_id = c.id)
    from creators c;
$$;

revoke all on function public.creator_qualify(uuid, uuid) from public, anon, authenticated;
revoke all on function public.creator_funnel(uuid, date) from public, anon, authenticated;
revoke all on function public.creator_daily(uuid, date) from public, anon, authenticated;
revoke all on function public.creator_link_stats(uuid, date) from public, anon, authenticated;
revoke all on function public.creator_months(uuid) from public, anon, authenticated;
revoke all on function public.creator_referral_list(uuid, int, boolean) from public, anon, authenticated;
revoke all on function public.creator_overview(date) from public, anon, authenticated;
