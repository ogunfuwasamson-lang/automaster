-- the free tier and the new referral rules (approved by the founder, 21 nov 2026).
-- additive only. reversible:
--   drop function public.add_bonus(uuid, text, int);
--   alter table public.profiles drop column bonus_requests, drop column group_rewarded_at;
--   (and re-run reserve_request from 0024_submission_packs.sql)

-- free funding requests (study group reward) and the once-per-inviter group stamp
alter table public.profiles add column if not exists bonus_requests int not null default 0;
alter table public.profiles add column if not exists group_rewarded_at timestamptz;

-- add free submissions or free requests atomically (two friends finishing setup at once both count)
create or replace function public.add_bonus(uid uuid, col text, n int) returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if n <= 0 or n > 10 then raise exception 'bad amount'; end if;
  if col = 'bonus_submissions' then
    update profiles set bonus_submissions = bonus_submissions + n where id = uid returning bonus_submissions into v;
  elsif col = 'bonus_requests' then
    update profiles set bonus_requests = bonus_requests + n where id = uid returning bonus_requests into v;
  else
    raise exception 'bad column';
  end if;
  return v;
end $$;
revoke all on function public.add_bonus(uuid, text, int) from public, anon, authenticated;

-- a funding request email: a free request (study group) first, then a pack credit
create or replace function public.reserve_request(uid uuid, msg uuid) returns text
language plpgsql security definer set search_path = public as $$
declare paid timestamptz;
begin
  select paid_at into paid from messages where id = msg and user_id = uid for update;
  if not found then return 'none'; end if;
  if paid is not null then return 'already'; end if;
  update profiles set bonus_requests = bonus_requests - 1 where id = uid and bonus_requests > 0;
  if found then
    update messages set paid_at = now() where id = msg;
    return 'bonus';
  end if;
  update profiles set submission_credits = submission_credits - 1 where id = uid and submission_credits > 0;
  if found then
    insert into credit_ledger(user_id, delta, reason, message_id) values (uid, -1, 'request', msg);
    update messages set paid_at = now() where id = msg;
    return 'credit';
  end if;
  return 'none';
end $$;
revoke all on function public.reserve_request(uuid, uuid) from public, anon, authenticated;
