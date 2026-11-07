-- link Ivyward schools already in the database to their official registry record (hed_institutions), by website
-- domain or official name. new schools are linked by the recon agent as it researches them. safe to re-run.

create or replace function public.hed_host(u text) returns text language sql immutable as $$
  select nullif(regexp_replace(lower(split_part(regexp_replace(coalesce(u, ''), '^[a-z]+://', '', 'i'), '/', 1)), '^www\.', ''), '')
$$;

create or replace function public.hed_link_schools() returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; k int;
begin
  -- 1. same website domain (or the school's site is a subdomain of the registry domain)
  with m as (
    select distinct on (s.id) s.id school_id, h.id inst_id
    from schools s
    join hed_institutions h on h.domain is not null and h.school_id is null
      and (hed_host(s.website) = h.domain or hed_host(s.website) like '%.' || h.domain)
    where s.website is not null and not exists (select 1 from hed_institutions x where x.school_id = s.id)
    order by s.id, (h.status = 'active') desc, (lower(h.name) = lower(s.name)) desc
  )
  update hed_institutions h set school_id = m.school_id from m where h.id = m.inst_id and h.school_id is null;
  get diagnostics k = row_count; n := n + k;

  -- 2. same official name (or alias), only when exactly one open institution has it
  with c as (
    select s.id school_id, h.id inst_id, count(*) over (partition by s.id) hits
    from schools s
    join hed_institutions h on h.status = 'active' and h.school_id is null
      and (lower(h.name) = lower(s.name) or lower(s.name) = any (select lower(a) from unnest(h.aliases) a))
    where not exists (select 1 from hed_institutions x where x.school_id = s.id)
  )
  update hed_institutions h set school_id = c.school_id from c where h.id = c.inst_id and c.hits = 1 and h.school_id is null;
  get diagnostics k = row_count; n := n + k;

  -- fill missing school websites from the registry
  update schools s set website = h.website from hed_institutions h where h.school_id = s.id and s.website is null and h.website is not null;
  return n;
end $$;
revoke execute on function public.hed_link_schools() from public, anon, authenticated;

create index if not exists hed_institutions_school on public.hed_institutions(school_id);
select public.hed_link_schools();
