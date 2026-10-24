-- 0007: phase 6 controls, gmail sending, the runner.

-- ---------------------------------------------------------------------------
-- security: users could write their own profile row straight from the browser
-- (plan, is_admin, monthly_budget_usd) and decide approvals without the server's checks.
-- every write now goes through server routes, which validate.
-- ---------------------------------------------------------------------------
drop policy if exists profiles_update_own on profiles;
drop policy if exists approvals_decide_own on approvals;
drop policy if exists grants_update_own on grants;
drop policy if exists ripcords_insert_own on ripcords;
drop policy if exists ripcords_update_own on ripcords;

-- ---------------------------------------------------------------------------
-- digest
-- ---------------------------------------------------------------------------
alter table profiles add column if not exists digest_enabled boolean not null default true;
alter table profiles add column if not exists last_digest_at timestamptz;

create table if not exists digests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  period_start  timestamptz not null,
  period_end    timestamptz not null,
  content       jsonb not null,
  sent_via      text,                     -- gmail | null (shown in app only)
  created_at    timestamptz not null default now()
);
create index if not exists digests_user on digests(user_id, created_at desc);
alter table digests enable row level security;
drop policy if exists digests_select_own on digests;
create policy digests_select_own on digests for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- gmail: send-only access to the applicant's own mailbox. tokens are encrypted by the app
-- (AES-GCM, key in env) and the table has no user-facing policies at all.
-- ---------------------------------------------------------------------------
create table if not exists mail_accounts (
  user_id           uuid primary key references profiles(id) on delete cascade,
  provider          text not null default 'gmail',
  email             text not null,
  refresh_token_enc text not null,
  scopes            text,
  status            text not null default 'active', -- active | error | revoked
  last_error        text,
  connected_at      timestamptz not null default now()
);
alter table mail_accounts enable row level security;

alter table messages add column if not exists last_error text;
alter table messages add column if not exists attempts integer not null default 0;
alter table messages add column if not exists approved_by_user_at timestamptz;

-- ---------------------------------------------------------------------------
-- runner: the browser extension that fills and submits portals from the applicant's own browser
-- ---------------------------------------------------------------------------
create table if not exists runner_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  token_hash    text not null unique,     -- sha256 of the token; the token itself is shown once
  label         text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);
alter table runner_tokens enable row level security;

-- the attestation the applicant signs when approving a packet: it is what lets the runner
-- tick a portal's "I certify this is my own work" box on their behalf.
alter table applications add column if not exists attested_at timestamptz;
alter table applications add column if not exists attestation text;
alter table applications add column if not exists runner_status text not null default 'idle'
  check (runner_status in ('idle', 'ready', 'running', 'needs_you', 'submitted', 'failed'));
alter table applications add column if not exists runner_note text;
alter table applications add column if not exists runner_updated_at timestamptz;

-- going back to preparing also clears the attestation and the runner
create or replace function clear_attestation() returns trigger language plpgsql as $$
begin
  if new.status = 'preparing' and old.status is distinct from 'preparing' then
    new.attested_at = null;
    new.attestation = null;
    new.runner_status = 'idle';
    new.runner_note = null;
  end if;
  return new;
end $$;
drop trigger if exists applications_clear_attestation on applications;
create trigger applications_clear_attestation before update on applications
  for each row execute function clear_attestation();

-- details portals ask for that the study profile doesn't hold (phone, date of birth, address...).
-- government id numbers are never stored: the runner leaves those fields for the applicant.
alter table profiles add column if not exists portal_details jsonb not null default '{}'::jsonb;
alter table recommenders add column if not exists title text;
alter table recommenders add column if not exists organization text;
alter table recommenders add column if not exists phone text;
