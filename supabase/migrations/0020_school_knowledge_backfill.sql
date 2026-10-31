-- seed school_knowledge from what has already happened (safe to run more than once)
create or replace function pg_temp.who(u uuid) returns text language sql immutable as
$$ select left(encode(sha256(convert_to('ivw-school-memory:' || u::text, 'UTF8')), 'hex'), 16) $$;

-- portals that blocked automated sign-ups / cloud browsers
insert into school_knowledge (school_id, kind, key, value, confirmations, contributors, first_seen, last_seen)
select p.school_id, 'portal',
       regexp_replace(substring(e.context->>'note' from 'https?://([^/ ]+)'), '^www\.', '') || case when e.context->>'reason' = 'account' then ':signup_blocked' else ':cloud_blocked' end,
       '{}'::jsonb, count(distinct e.user_id), array_agg(distinct pg_temp.who(e.user_id)), min(e.created_at), max(e.created_at)
from events e join applications a on a.id = e.application_id join programs p on p.id = a.program_id
where e.action = 'runner.needs_you' and e.context->>'reason' in ('account', 'captcha', 'blocked') and substring(e.context->>'note' from 'https?://([^/ ]+)') is not null
group by 1, 3
on conflict (school_id, kind, key) do nothing;

-- school office addresses the agents emailed (never referees or professors)
insert into school_knowledge (school_id, kind, key, value, confirmations, contributors, first_seen, last_seen)
select p.school_id, 'contact', lower(m.to_email),
       jsonb_build_object('office', min(case m.purpose when 'fee_waiver' then 'admissions' when 'aid_reconsideration' then 'financial aid' when 'assistantship_inquiry' then 'graduate school' when 'scholarship_inquiry' then 'scholarships' else 'admissions' end), 'sent', count(*)),
       count(distinct m.user_id), array_agg(distinct pg_temp.who(m.user_id)), min(m.sent_at), max(m.sent_at)
from messages m join threads t on t.id = m.thread_id join applications a on a.id = t.application_id join programs p on p.id = a.program_id
where m.direction = 'out' and m.status = 'sent' and m.to_email is not null
  and m.purpose in ('fee_waiver', 'aid_reconsideration', 'assistantship_inquiry', 'scholarship_inquiry', 'other')
group by 1, 3
on conflict (school_id, kind, key) do nothing;

-- essay prompts the planner found for each program
insert into school_knowledge (school_id, kind, key, value, confirmations, contributors, first_seen, last_seen)
select distinct on (p.school_id, k)
       p.school_id, 'prompt', k,
       jsonb_build_object('title', left(ar.title, 120), 'prompt', left(ar.prompt, 2000), 'word_limit', ar.word_limit, 'kind', ar.kind),
       1, array[pg_temp.who(ar.user_id)], ar.created_at, ar.created_at
from artifacts ar join applications a on a.id = ar.application_id join programs p on p.id = a.program_id,
     lateral (select p.id::text || '|' || left(encode(sha256(convert_to(trim(regexp_replace(lower(ar.prompt), '\s+', ' ', 'g')), 'UTF8')), 'hex'), 12) as k) kk
where ar.prompt is not null and length(ar.prompt) >= 15 and ar.kind not in ('strategy', 'fee_plan', 'funding_plan')
order by p.school_id, k, ar.created_at desc
on conflict (school_id, kind, key) do nothing;
