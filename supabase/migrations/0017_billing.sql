-- payments through Bachs. africa pays per submission (the equivalent of ₦2,500); everyone else gets 3 applications
-- free, then $20 a month. the country is set once, from where the applicant first signed in.
alter table profiles add column if not exists billing_country text;
alter table profiles add column if not exists plan_until timestamptz;
alter table profiles add column if not exists plan_cancelled_at timestamptz;
alter table profiles add column if not exists bachs_customer text;
alter table profiles add column if not exists bachs_subscription text;

-- an application (or scholarship) paid for: the agents may press submit
alter table applications add column if not exists paid_at timestamptz;

-- every payment, once (webhook and return page both arrive; the reference keeps it single)
create table if not exists billing_events (
  reference     text primary key,
  user_id       uuid references profiles(id) on delete set null,
  kind          text not null,           -- submission | pro | renewal
  application_id uuid references applications(id) on delete set null,
  amount        numeric,
  currency      text,
  raw           jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists billing_events_user on billing_events(user_id, created_at desc);
alter table billing_events enable row level security;
drop policy if exists billing_events_select_own on billing_events;
create policy billing_events_select_own on billing_events for select to authenticated using (user_id = auth.uid());

-- ids made in Bachs once and remembered (the monthly product)
create table if not exists billing_settings (key text primary key, value text not null);
alter table billing_settings enable row level security;
