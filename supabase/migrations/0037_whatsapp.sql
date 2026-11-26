-- WhatsApp updates (founder's approval, 26 nov 2026: the cheaper option, a message only when something needs the
-- applicant; a new table rather than profile details). one row per applicant who turned them on in settings.
-- the number is the one their own WhatsApp message came from (they send a code to Ivyward's number), so it's theirs
-- and they asked for it. the server reads and writes it; nothing is exposed to the browser (no policies).
create table if not exists public.whatsapp_contacts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique,                     -- what they send to link the number ("IVY-7K2Q9")
  phone text unique,                             -- E.164 digits as WhatsApp gives them ("2348012345678"), once linked
  status text not null default 'pending' check (status in ('pending', 'active', 'stopped')),
  consented_at timestamptz not null default now(),
  linked_at timestamptz,
  stopped_at timestamptz,
  last_inbound_at timestamptz,                   -- opens the 24-hour window for free-form replies
  last_sent_at timestamptz,
  last_sent_key text,                            -- the last "needs you" item sent, so the same one isn't sent twice
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.whatsapp_contacts enable row level security;
create index if not exists whatsapp_contacts_active on public.whatsapp_contacts(status, last_sent_at) where status = 'active';
