-- the credit wallet (founder's call, 24 nov 2026): one currency for everything the agents do.
--   earning: a pack (₦10,000) gives 60 credits that last 30 days; Pro ($20 a month) 160 that last the paid month; a
--            friend who joins through an invite and finishes setup earns both people 10 that don't expire.
--   using:   an application costs 10 (set aside when the agents start it, spent when it's submitted, given back if
--            it's dropped first); checking a programme or a scholarship 1; a funding request 1.
-- additive. reversible: drop the functions below and the two tables, set bonus_submissions' default back to 1, and
-- restore profiles.submission_credits from the 'converted' grants (reference ends in the old count).

create table if not exists public.credit_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('pack', 'pro', 'invite', 'group', 'converted', 'grant', 'submission')),
  amount int not null check (amount > 0),
  remaining int not null check (remaining >= 0),
  expires_at timestamptz,
  reference text,
  created_at timestamptz not null default now()
);
alter table public.credit_grants enable row level security;
create index if not exists credit_grants_user on public.credit_grants(user_id, expires_at);
-- one grant per payment, invite or conversion
create unique index if not exists credit_grants_once on public.credit_grants(source, reference) where reference is not null;

create table if not exists public.credit_uses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('application', 'check', 'request')),
  ref text not null, -- the application id, the check's job id, the message id
  amount int not null check (amount > 0),
  status text not null default 'spent' check (status in ('held', 'spent', 'released')),
  parts jsonb not null default '[]'::jsonb, -- [{grant, n}]: which grants it came from, so a release can give it back
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
alter table public.credit_uses enable row level security;
-- one charge per application, check or message
create unique index if not exists credit_uses_once on public.credit_uses(user_id, kind, ref);

-- credits an account can use now: unexpired grants
create or replace function public.credit_balance(uid uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(remaining), 0)::int from credit_grants where user_id = uid and remaining > 0 and (expires_at is null or expires_at > now());
$$;

-- add credits once per reference. returns the new balance, or -1 when this reference was already granted.
create or replace function public.grant_wallet(uid uuid, n int, src text, expires timestamptz, ref text) returns int
language plpgsql security definer set search_path = public as $$
begin
  if n <= 0 or n > 1000 then raise exception 'bad credit amount'; end if;
  insert into credit_grants(user_id, source, amount, remaining, expires_at, reference) values (uid, src, n, n, expires, ref)
    on conflict (source, reference) where reference is not null do nothing;
  if not found then return -1; end if;
  return credit_balance(uid);
end $$;

-- use n credits for one thing (kind + ref), once: 'ok', 'already' (held or spent before), or 'none' (not enough).
-- hold = set aside for an application the agents are starting; settle_credits spends it at submission. the
-- credits that expire soonest go first. one account at a time (the profile row is locked), so two runners can't
-- both spend the last credits.
create or replace function public.use_credits(uid uuid, k text, r text, n int, hold boolean) returns text
language plpgsql security definer set search_path = public as $$
declare
  st text;
  have int;
  left_n int := n;
  took int;
  g record;
  parts jsonb := '[]'::jsonb;
begin
  if n <= 0 or n > 100 then raise exception 'bad credit amount'; end if;
  perform 1 from profiles where id = uid for update;
  if not found then return 'none'; end if;
  select status into st from credit_uses where user_id = uid and kind = k and ref = r;
  if found then
    if st <> 'released' then return 'already'; end if;
    delete from credit_uses where user_id = uid and kind = k and ref = r;
  end if;
  have := credit_balance(uid);
  if have < n then return 'none'; end if;
  for g in
    select id, remaining from credit_grants
     where user_id = uid and remaining > 0 and (expires_at is null or expires_at > now())
     order by expires_at nulls last, created_at
     for update
  loop
    took := least(g.remaining, left_n);
    update credit_grants set remaining = remaining - took where id = g.id;
    parts := parts || jsonb_build_object('grant', g.id, 'n', took);
    left_n := left_n - took;
    exit when left_n = 0;
  end loop;
  insert into credit_uses(user_id, kind, ref, amount, status, parts, settled_at)
    values (uid, k, r, n, case when hold then 'held' else 'spent' end, parts, case when hold then null else now() end);
  return 'ok';
end $$;

-- an application went in: what was set aside for it is spent. 'ok', 'already' (spent before), or 'none' (nothing
-- was set aside: the caller charges it with use_credits)
create or replace function public.settle_credits(uid uuid, k text, r text) returns text
language plpgsql security definer set search_path = public as $$
declare st text;
begin
  select status into st from credit_uses where user_id = uid and kind = k and ref = r for update;
  if not found or st = 'released' then return 'none'; end if;
  if st = 'spent' then return 'already'; end if;
  update credit_uses set status = 'spent', settled_at = now() where user_id = uid and kind = k and ref = r;
  return 'ok';
end $$;

-- an application dropped before it went in: what was set aside goes back to the grants it came from (credits whose
-- grant has since expired stay expired). returns how many credits came back to grants still valid.
create or replace function public.release_credits(uid uuid, k text, r text) returns int
language plpgsql security definer set search_path = public as $$
declare
  u record;
  p jsonb;
  back int := 0;
begin
  select id, parts into u from credit_uses where user_id = uid and kind = k and ref = r and status = 'held' for update;
  if not found then return 0; end if;
  for p in select * from jsonb_array_elements(u.parts) loop
    update credit_grants set remaining = remaining + (p->>'n')::int where id = (p->>'grant')::uuid;
    if exists (select 1 from credit_grants where id = (p->>'grant')::uuid and (expires_at is null or expires_at > now())) then
      back := back + (p->>'n')::int;
    end if;
  end loop;
  update credit_uses set status = 'released', settled_at = now() where id = u.id;
  return back;
end $$;

revoke all on function public.credit_balance(uuid) from public, anon, authenticated;
revoke all on function public.grant_wallet(uuid, int, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.use_credits(uuid, text, text, int, boolean) from public, anon, authenticated;
revoke all on function public.settle_credits(uuid, text, text) from public, anon, authenticated;
revoke all on function public.release_credits(uuid, text, text) from public, anon, authenticated;

-- new accounts no longer start with a free submission: invites and payments give credits instead. existing
-- accounts keep theirs (it still pays for an application they had already signed).
alter table public.profiles alter column bonus_submissions set default 0;

-- what was bought before the wallet: each unused submission becomes 12 credits (an application and two checks, so
-- a full pack of 5 becomes 60), with no expiry, since those packs were sold as never expiring
do $$
declare p record;
begin
  for p in select id, submission_credits from profiles where submission_credits > 0 loop
    perform grant_wallet(p.id, p.submission_credits * 12, 'converted', null, p.id || ':submission_credits:' || p.submission_credits);
    update profiles set submission_credits = 0 where id = p.id;
  end loop;
end $$;

-- applications those accounts already have in progress keep their place: 10 credits set aside for each
do $$
declare a record;
begin
  for a in
    select ap.id, ap.user_id from applications ap
     where ap.status in ('preparing', 'ready_for_review', 'packet_approved') and ap.paid_at is null
       and exists (select 1 from credit_grants g where g.user_id = ap.user_id and g.source = 'converted')
     order by ap.target_deadline nulls last
  loop
    perform use_credits(a.user_id, 'application', a.id::text, 10, true);
  end loop;
end $$;
