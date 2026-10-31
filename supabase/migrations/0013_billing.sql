-- paid plans through paystack. "pro" is now the paid monthly plan; everyone else is on "free".
-- plan_until: when the paid plan lapses (renewals push it forward); after it, the account is on free.
alter table profiles add column if not exists plan_until timestamptz;
alter table profiles add column if not exists billing_currency text;
alter table profiles add column if not exists paystack_customer text;
alter table profiles add column if not exists paystack_subscription text;
alter table profiles add column if not exists paystack_email_token text;
alter table profiles add column if not exists plan_cancelled_at timestamptz;

-- every paystack event once: the webhook and the return-from-checkout check can both apply a payment
create table if not exists billing_events (
  reference   text primary key,
  user_id     uuid references profiles(id) on delete set null,
  kind        text not null,              -- pro | season | renewal | cancel
  amount      bigint,                     -- in the smallest unit (kobo / cents)
  currency    text,
  raw         jsonb,
  created_at  timestamptz not null default now()
);
alter table billing_events enable row level security;

-- paystack plan codes, created on first use
create table if not exists billing_settings (
  key   text primary key,
  value text not null
);
alter table billing_settings enable row level security;
