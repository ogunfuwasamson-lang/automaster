-- operator alerts (one email per kind of failure per hour), and paying for funding requests one by one
create table if not exists ops_alerts (
  key        text primary key,
  last_at    timestamptz not null default now(),
  count      integer not null default 1
);
alter table ops_alerts enable row level security;

-- a fee-waiver or funding email paid for (pay-per-request): it may be sent
alter table messages add column if not exists paid_at timestamptz;
alter table billing_events add column if not exists message_id uuid references messages(id) on delete set null;

-- a direct google calendar connection (composio connection id), when the applicant adds one
alter table profiles add column if not exists calendar_account text;
