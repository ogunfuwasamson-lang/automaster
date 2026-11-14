-- everyone's first submission is free: a new account starts with one free submission (the same counter invites add to),
-- and accounts that haven't paid or been given one get one now.
-- reversible: alter table profiles alter column bonus_submissions set default 0;
alter table public.profiles alter column bonus_submissions set default 1;
update public.profiles p set bonus_submissions = 1
 where p.bonus_submissions = 0
   and not exists (select 1 from public.billing_events b where b.user_id = p.id)
   and not exists (select 1 from public.applications a where a.user_id = p.id and a.paid_at is not null);
