-- starting on WhatsApp (founder's go-ahead, 26 nov 2026: "build all"). someone messages Ivyward's number, confirms
-- their email with a code we send to it, and sets up their search in the chat. one row per number: the step they're
-- on and what they've answered so far. before the email is confirmed there's no account yet, so the row is keyed by
-- the number, not the user. the server reads and writes it; nothing is exposed to the browser (no policies).
create table if not exists public.whatsapp_flows (
  phone text primary key,                        -- E.164 digits as WhatsApp gives them
  user_id uuid references auth.users(id) on delete cascade, -- once the email is confirmed
  step text not null,                            -- "email", "code", "name", "level", ... "done"
  state jsonb not null default '{}'::jsonb,      -- answers so far, the pending email and its code's hash
  started_at timestamptz not null default now(),
  finished_at timestamptz,                       -- setup done, shortlist sent
  updated_at timestamptz not null default now()
);
alter table public.whatsapp_flows enable row level security;
create index if not exists whatsapp_flows_user on public.whatsapp_flows(user_id);
create index if not exists whatsapp_flows_email on public.whatsapp_flows((state->>'email'));
