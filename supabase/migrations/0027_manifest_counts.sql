-- a country's inventory can come from several registries (the UK: OfS, SFC, Medr, DfE NI), so its manifest counts
-- are recomputed from hed_institutions after each load instead of taken from one file.
create or replace function public.hed_refresh_manifest(c text) returns jsonb language sql security definer set search_path = public as $$
  update hed_manifest m set
    counts = x.counts, denominator = coalesce((x.counts->>'active')::int, 0), updated_at = now()
  from (
    select jsonb_build_object('records', sum(n)) || jsonb_object_agg(status, n)
      || coalesce((select jsonb_object_agg('registry:' || registry, k) from (select registry, count(*) k from hed_institutions where country = c and status = 'active' group by 1) r), '{}') counts
    from (select status, count(*) n from hed_institutions where country = c group by 1) s
  ) x
  where m.country = c
  returning m.counts
$$;
revoke execute on function public.hed_refresh_manifest(text) from public, anon, authenticated;
grant execute on function public.hed_refresh_manifest(text) to service_role;
