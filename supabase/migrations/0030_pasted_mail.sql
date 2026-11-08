-- school emails the applicant pasted into Ivyward (or an operator added for them): read by the portal agents the
-- same way as Gmail, for verification codes, sign-up PINs and password resets, when Gmail isn't connected
create table if not exists public.pasted_mail (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  from_addr text,
  subject text,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists pasted_mail_user on public.pasted_mail (user_id, created_at desc);
alter table public.pasted_mail enable row level security;
create policy pasted_mail_own on public.pasted_mail for select using (auth.uid() = user_id);
