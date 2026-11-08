-- link schools by their programs' page URLs too (a program page on gsb.stanford.edu belongs to stanford.edu), and by
-- the university part of names such as "Carnegie Mellon University (Tepper School of Business)" or
-- "University of Michigan, Stephen M. Ross School of Business". each school links to at most one institution and only
-- on an unambiguous match. safe to re-run.

create or replace function public.hed_link_schools() returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; k int;
begin
  -- 1. the school's website, or its programs' page URLs, on the institution's domain (or a subdomain of it)
  with sites as (
    select s.id school_id, hed_host(s.website) host from schools s where s.website is not null
    union all
    select p.school_id, hed_host(p.url) from programs p where p.url is not null and p.school_id is not null
  ), hits as (
    select x.school_id, h.id inst_id, count(*) votes, bool_or(h.status = 'active') open
    from sites x join hed_institutions h on h.domain is not null and h.school_id is null
      and (x.host = h.domain or x.host like '%.' || h.domain)
    where not exists (select 1 from hed_institutions y where y.school_id = x.school_id)
    group by 1, 2
  ), best as (
    select distinct on (school_id) school_id, inst_id from hits order by school_id, open desc, votes desc
  ), uniq as (
    select distinct on (inst_id) school_id, inst_id from best order by inst_id, school_id
  )
  update hed_institutions h set school_id = u.school_id from uniq u where h.id = u.inst_id and h.school_id is null;
  get diagnostics k = row_count; n := n + k;

  -- 2. official name or alias, also trying the name before a parenthesis or comma; only one open institution may match
  with names as (
    select s.id school_id, lower(trim(v)) nm
    from schools s, unnest(array[s.name, regexp_replace(s.name, '\s*\(.*$', ''), split_part(s.name, ',', 1)]) v
    where not exists (select 1 from hed_institutions y where y.school_id = s.id) and length(trim(v)) >= 6
  ), c as (
    select distinct x.school_id, h.id inst_id
    from names x join hed_institutions h on h.status = 'active' and h.school_id is null
      and (lower(h.name) = x.nm or x.nm = any (select lower(a) from unnest(h.aliases) a))
  ), one as (
    select school_id, min(inst_id::text)::uuid inst_id from c group by 1 having count(*) = 1
  ), uniq as (
    select distinct on (inst_id) school_id, inst_id from one order by inst_id, school_id
  )
  update hed_institutions h set school_id = u.school_id from uniq u where h.id = u.inst_id and h.school_id is null;
  get diagnostics k = row_count; n := n + k;

  -- fill missing school websites from the registry
  update schools s set website = h.website from hed_institutions h where h.school_id = s.id and s.website is null and h.website is not null;
  return n;
end $$;
revoke execute on function public.hed_link_schools() from public, anon, authenticated;
grant execute on function public.hed_link_schools() to service_role;

select public.hed_link_schools();
