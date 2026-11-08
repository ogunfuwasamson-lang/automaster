-- deleting an account failed with "Database error deleting user". the auth service deletes from auth.users as
-- supabase_auth_admin, whose search_path is "auth": the cascade into events fired events_append_only, which looks
-- up "profiles" unqualified and so couldn't find it. pin every trigger function to the public schema, and let the
-- events guard read profiles whoever deletes.
alter function public.events_append_only() security definer set search_path = public, pg_temp;
alter function public.enforce_app_transition() set search_path = public, pg_temp;
alter function public.clear_attestation() set search_path = public, pg_temp;
alter function public.guard_sign_grant() set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;

-- an admin who approved prompt versions could never be deleted: keep the version, forget who approved it
alter table public.prompt_versions drop constraint if exists prompt_versions_approved_by_fkey;
alter table public.prompt_versions add constraint prompt_versions_approved_by_fkey foreign key (approved_by) references public.profiles(id) on delete set null;
