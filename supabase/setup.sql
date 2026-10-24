-- automaster: core schema
-- conventions:
--   * user-owned tables carry user_id and are locked to auth.uid() by RLS
--   * world-model tables (schools, programs, playbooks, funding, tactics) are shared:
--     authenticated users read, only the service role (agents) writes
--   * events is append-only. it is the audit log and the learning signal.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- enums
-- ---------------------------------------------------------------------------
create type app_status as enum (
  'researching', 'shortlisted', 'preparing', 'ready_for_review',
  'packet_approved', 'submitted', 'under_review', 'interview',
  'admitted', 'waitlisted', 'rejected', 'accepted', 'declined',
  'withdrawn', 'dropped'
);

create type grant_mode as enum ('auto', 'auto_undo', 'approve', 'deny');

create type approval_status as enum ('pending', 'approved', 'rejected', 'expired', 'cancelled');

create type job_status as enum ('queued', 'running', 'done', 'failed', 'cancelled');

create type message_status as enum ('draft', 'pending_approval', 'scheduled', 'sent', 'cancelled', 'failed');

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  full_name     text,
  target_term   text default 'fall-2027',
  -- structured applicant profile built by intake. shape lives in src/lib/profile.ts
  profile       jsonb not null default '{}'::jsonb,
  -- fee envelope: max total application spend agents may make without asking
  fee_envelope_cents integer not null default 0,
  timezone      text default 'Africa/Lagos',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();

create table documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  kind          text not null,              -- cv, transcript, degree_cert, test_score, passport_bio, sop_old, other
  filename      text not null,
  storage_path  text not null,
  mime_type     text,
  status        text not null default 'uploaded', -- uploaded, extracting, extracted, failed
  extracted_text text,
  extracted     jsonb,
  created_at    timestamptz not null default now()
);
create index on documents(user_id);

create table interview_turns (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  session_id    uuid not null,
  role          text not null check (role in ('agent', 'user')),
  content       text not null,
  via_voice     boolean not null default false,
  created_at    timestamptz not null default now()
);
create index on interview_turns(user_id, session_id, created_at);

-- ---------------------------------------------------------------------------
-- world model (shared across users, written by agents)
-- ---------------------------------------------------------------------------
create table schools (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  city          text,
  state         text,
  website       text,
  intl_notes    text,
  verified_at   timestamptz,
  created_at    timestamptz not null default now()
);

create table programs (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  name          text not null,
  degree        text not null,             -- MS, MBA, MSF, MiM, MA...
  field_tags    text[] not null default '{}',
  url           text,
  stem_designated boolean,
  test_policy   text,                      -- required, optional, waivable, not_required, unknown
  toefl_min     integer,
  ielts_min     numeric(3,1),
  tuition_usd   integer,
  duration_months integer,
  app_fee_usd   integer,
  fee_waiver    text,
  deadlines     jsonb not null default '[]'::jsonb,  -- [{round, date, funding_priority, soft}]
  funding_signals jsonb not null default '{}'::jsonb,
  source_urls   text[] not null default '{}',
  verified_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (school_id, name, degree)
);
create trigger programs_updated before update on programs for each row execute function set_updated_at();
create index on programs using gin(field_tags);

-- versioned per-school dossier. latest version = current.
create table playbooks (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  version       integer not null,
  content       jsonb not null,            -- portal, offices, real vs soft deadlines, what works, dead contacts
  change_note   text,
  author        text not null,             -- agent name or 'user:<id>'
  created_at    timestamptz not null default now(),
  unique (school_id, version)
);

create table funding_opportunities (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid references schools(id) on delete cascade, -- null = external scholarship
  program_id    uuid references programs(id) on delete set null,
  name          text not null,
  kind          text not null,             -- merit_scholarship, assistantship, fee_waiver, external, fellowship
  amount_note   text,
  amount_usd    integer,
  deadline      date,
  eligibility   text,
  intl_eligible boolean,
  url           text,
  verified_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index on funding_opportunities(school_id);

-- tactics: versioned, tagged, with evidence. shared, never carries user content.
create table tactics (
  id            uuid primary key default gen_random_uuid(),
  key           text not null,
  version       integer not null default 1,
  description   text not null,
  context_tags  jsonb not null default '{}'::jsonb,
  metric        text not null,
  trials        integer not null default 0,
  successes     integer not null default 0,
  status        text not null default 'candidate' check (status in ('candidate', 'active', 'retired')),
  evidence      jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  unique (key, version)
);

-- ---------------------------------------------------------------------------
-- per-user work
-- ---------------------------------------------------------------------------
create table applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  program_id    uuid not null references programs(id) on delete restrict,
  status        app_status not null default 'researching',
  tier          text check (tier in ('reach', 'target', 'safety')),
  fit_score     numeric(4,1),
  fit_reasoning text,
  angle         text,                      -- strategist's positioning for this program
  target_deadline date,
  portal_url    text,
  -- set ONLY by the user from the packet review screen. it is their attestation.
  packet_approved_at timestamptz,
  packet_snapshot jsonb,                   -- exactly what they approved
  submitted_at  timestamptz,
  decision      text,
  decision_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, program_id)
);
create trigger applications_updated before update on applications for each row execute function set_updated_at();
create index on applications(user_id, status);

create table app_transitions (
  from_status app_status not null,
  to_status   app_status not null,
  primary key (from_status, to_status)
);
insert into app_transitions values
  ('researching','shortlisted'), ('researching','dropped'),
  ('shortlisted','preparing'), ('shortlisted','dropped'), ('shortlisted','researching'),
  ('preparing','ready_for_review'), ('preparing','dropped'),
  ('ready_for_review','packet_approved'), ('ready_for_review','preparing'), ('ready_for_review','dropped'),
  ('packet_approved','submitted'), ('packet_approved','preparing'), ('packet_approved','dropped'),
  ('submitted','under_review'), ('submitted','interview'), ('submitted','admitted'),
  ('submitted','waitlisted'), ('submitted','rejected'), ('submitted','withdrawn'),
  ('under_review','interview'), ('under_review','admitted'), ('under_review','waitlisted'),
  ('under_review','rejected'), ('under_review','withdrawn'),
  ('interview','admitted'), ('interview','waitlisted'), ('interview','rejected'), ('interview','withdrawn'),
  ('waitlisted','admitted'), ('waitlisted','rejected'), ('waitlisted','withdrawn'),
  ('admitted','accepted'), ('admitted','declined');

create table application_history (
  id            bigserial primary key,
  application_id uuid not null references applications(id) on delete cascade,
  user_id       uuid not null,
  from_status   app_status,
  to_status     app_status not null,
  changed_at    timestamptz not null default now()
);

create or replace function enforce_app_transition() returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if not exists (select 1 from app_transitions where from_status = old.status and to_status = new.status) then
      raise exception 'illegal application transition % -> %', old.status, new.status using errcode = 'check_violation';
    end if;
    -- hard floor: nothing reaches a school the user has not reviewed
    if new.status = 'submitted' and new.packet_approved_at is null then
      raise exception 'cannot submit: packet not approved by user' using errcode = 'check_violation';
    end if;
    if new.status = 'submitted' and new.submitted_at is null then
      new.submitted_at = now();
    end if;
    -- going back to preparing invalidates the approval: they must re-review
    if new.status = 'preparing' then
      new.packet_approved_at = null;
      new.packet_snapshot = null;
    end if;
    insert into application_history(application_id, user_id, from_status, to_status)
      values (new.id, new.user_id, old.status, new.status);
  end if;
  return new;
end $$;
create trigger applications_transition before update on applications
  for each row execute function enforce_app_transition();

-- essays, sops, short answers, emails, fill sheets
create table artifacts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  application_id uuid references applications(id) on delete cascade,
  kind          text not null,            -- sop, essay, short_answer, scholarship_essay, cv, fill_sheet
  title         text not null,
  prompt        text,
  word_limit    integer,
  current_version integer not null default 0,
  created_at    timestamptz not null default now()
);
create index on artifacts(user_id, application_id);

create table artifact_versions (
  id            uuid primary key default gen_random_uuid(),
  artifact_id   uuid not null references artifacts(id) on delete cascade,
  user_id       uuid not null,
  version       integer not null,
  content       text not null,
  author        text not null,            -- 'agent:writer' or 'user'
  critique      jsonb,                    -- red team output
  user_approved_at timestamptz,
  created_at    timestamptz not null default now(),
  unique (artifact_id, version)
);

create table recommenders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  name          text not null,
  email         text,
  relationship  text,
  notes         text,
  created_at    timestamptz not null default now()
);

create table recommendation_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  recommender_id uuid not null references recommenders(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  status        text not null default 'not_sent', -- not_sent, invited, reminded, submitted
  last_nudged_at timestamptz,
  created_at    timestamptz not null default now(),
  unique (recommender_id, application_id)
);

create table contacts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  school_id     uuid references schools(id),
  name          text,
  email         text not null,
  contact_class text not null,            -- admissions, faculty, aid_office, alumni, recommender, other
  first_contacted_at timestamptz,
  burned        boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (user_id, email)
);

create table threads (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  contact_id    uuid not null references contacts(id) on delete cascade,
  application_id uuid references applications(id) on delete set null,
  gmail_thread_id text,
  subject       text,
  status        text not null default 'open',
  created_at    timestamptz not null default now()
);

create table messages (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  thread_id     uuid not null references threads(id) on delete cascade,
  direction     text not null check (direction in ('out', 'in')),
  subject       text,
  body          text not null,
  status        message_status not null default 'draft',
  send_after    timestamptz,              -- undo window ends here
  sent_at       timestamptz,
  gmail_message_id text,
  created_at    timestamptz not null default now()
);
create index on messages(status, send_after);

create table user_funding (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  opportunity_id uuid not null references funding_opportunities(id) on delete cascade,
  application_id uuid references applications(id) on delete set null,
  status        text not null default 'identified', -- identified, preparing, applied, awarded, declined, lost
  amount_awarded_usd integer,
  created_at    timestamptz not null default now(),
  unique (user_id, opportunity_id)
);

-- ---------------------------------------------------------------------------
-- autonomy: grants, approvals, ripcords, spend
-- ---------------------------------------------------------------------------
create table grants (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  capability    text not null,           -- see src/lib/policy.ts CAPABILITIES
  mode          grant_mode not null,
  undo_seconds  integer not null default 0,
  ceiling_cents integer,                 -- for spend
  rate_limit    jsonb,                   -- e.g. {"per_contact_per_week": 1}
  updated_at    timestamptz not null default now(),
  unique (user_id, capability)
);

create table approvals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  kind          text not null,           -- packet_review, send_email, spend, fact_confirm, attest
  title         text not null,
  summary       text,
  payload       jsonb not null default '{}'::jsonb,
  application_id uuid references applications(id) on delete cascade,
  urgency       integer not null default 0,
  status        approval_status not null default 'pending',
  expires_at    timestamptz,
  decided_at    timestamptz,
  created_by    text not null,
  created_at    timestamptz not null default now()
);
create index on approvals(user_id, status);

create table ripcords (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  scope_kind    text not null check (scope_kind in ('all', 'agent', 'capability', 'school')),
  scope_value   text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  released_at   timestamptz
);

create table spend_ledger (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  amount_cents  integer not null check (amount_cents > 0),
  currency      text not null default 'USD',
  purpose       text not null,
  application_id uuid references applications(id) on delete set null,
  approval_id   uuid references approvals(id),
  receipt_ref   text,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- learning: events (append-only), outcomes, tactic usage
-- ---------------------------------------------------------------------------
create table events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  actor         text not null,           -- agent:recon, agent:writer, user, system
  action        text not null,           -- e.g. program.shortlisted, email.sent, artifact.drafted
  capability    text,
  school_id     uuid references schools(id),
  program_id    uuid references programs(id),
  application_id uuid references applications(id) on delete set null,
  channel       text,
  artifact_version_id uuid references artifact_versions(id) on delete set null,
  agent_run_id  uuid,
  context       jsonb not null default '{}'::jsonb,
  reasoning     text,
  created_at    timestamptz not null default now()
);
create index on events(user_id, created_at desc);
create index on events(application_id);

create or replace function events_append_only() returns trigger language plpgsql as $$
begin
  -- allow the cascade from account deletion; block everything else
  if tg_op = 'DELETE' and not exists (select 1 from profiles where id = old.user_id) then
    return old;
  end if;
  raise exception 'events are append-only' using errcode = 'insufficient_privilege';
end $$;
create trigger events_no_update before update or delete on events
  for each row execute function events_append_only();

create table outcomes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  event_id      uuid references events(id) on delete cascade,
  application_id uuid references applications(id) on delete set null,
  kind          text not null check (kind in ('proxy', 'final')),
  label         text not null,           -- opened, replied, fee_waived, interview, admitted, rejected, ignored...
  value         numeric,
  failure_reason text,                   -- taxonomy label when it's a loss
  source        text not null,
  observed_at   timestamptz not null default now()
);
create index on outcomes(event_id);

create table tactic_uses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  tactic_id     uuid not null references tactics(id),
  event_id      uuid not null references events(id) on delete cascade,
  arm           text not null default 'treatment' check (arm in ('treatment', 'control')),
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- agent runtime
-- ---------------------------------------------------------------------------
create table jobs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  agent         text not null,
  task          text not null,
  payload       jsonb not null default '{}'::jsonb,
  status        job_status not null default 'queued',
  run_at        timestamptz not null default now(),
  attempts      integer not null default 0,
  max_attempts  integer not null default 3,
  locked_at     timestamptz,
  locked_by     text,
  last_error    text,
  result        jsonb,
  idempotency_key text unique,
  parent_job_id uuid references jobs(id) on delete set null,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index on jobs(status, run_at);

create table agent_runs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  job_id        uuid references jobs(id) on delete set null,
  agent         text not null,
  model         text,
  prompt_version text,
  input         jsonb,
  output        jsonb,
  status        text not null default 'running',
  input_tokens  integer,
  output_tokens integer,
  cost_usd      numeric(10,4),
  error         text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index on agent_runs(user_id, started_at desc);

-- claim the next due job atomically. called by the worker with the service role.
create or replace function claim_jobs(worker text, max_jobs integer default 5)
returns setof jobs language sql as $$
  update jobs set status = 'running', locked_at = now(), locked_by = worker, attempts = attempts + 1
  where id in (
    select id from jobs
    where (status = 'queued' and run_at <= now())
       or (status = 'running' and locked_at < now() - interval '10 minutes' and attempts < max_attempts)
    order by run_at
    limit max_jobs
    for update skip locked
  )
  returning *;
$$;

create table prompt_versions (
  id            uuid primary key default gen_random_uuid(),
  agent         text not null,
  version       integer not null,
  content       text not null,
  status        text not null default 'proposed' check (status in ('proposed', 'active', 'retired')),
  approved_by   uuid references profiles(id),
  created_at    timestamptz not null default now(),
  unique (agent, version)
);

create table eval_runs (
  id            uuid primary key default gen_random_uuid(),
  agent         text not null,
  prompt_version integer,
  fixture_set   text not null,
  metrics       jsonb not null,
  passed        boolean,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- new user bootstrap: profile + default grants (the dial)
-- ---------------------------------------------------------------------------
create or replace function seed_default_grants(uid uuid) returns void language sql as $$
  insert into grants(user_id, capability, mode, undo_seconds, ceiling_cents, rate_limit) values
    (uid, 'research',          'auto',      0,   null, null),
    (uid, 'draft',             'auto',      0,   null, null),
    (uid, 'prefill',           'auto',      0,   null, null),
    (uid, 'school.add_drop',   'auto',      0,   null, null),
    (uid, 'email.follow_up',   'auto_undo', 600, null, '{"per_thread_per_week": 2}'),
    (uid, 'email.new_contact', 'auto_undo', 600, null, '{"per_contact_total": 1, "per_day": 10}'),
    (uid, 'submit',            'auto',      0,   null, null),  -- still requires packet_approved_at (db-enforced)
    (uid, 'spend.app_fee',     'auto',      0,   0,    null),  -- ceiling = fee envelope; 0 means ask
    (uid, 'state_fact',        'approve',   0,   null, null),  -- any new claim about the user
    (uid, 'sign',              'approve',   0,   null, null),  -- never auto
    (uid, 'spend.deposit',     'approve',   0,   null, null)
  on conflict (user_id, capability) do nothing;
$$;

create or replace function handle_new_user() returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into profiles(id, email, full_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
    on conflict (id) do nothing;
  perform seed_default_grants(new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  -- tables the user fully owns and may read; writes go through server routes
  foreach t in array array[
    'documents','interview_turns','applications','application_history','artifacts','artifact_versions',
    'recommenders','recommendation_requests','contacts','threads','messages','user_funding',
    'grants','approvals','ripcords','spend_ledger','events','outcomes','tactic_uses','jobs','agent_runs'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select to authenticated using (user_id = auth.uid())', t || '_select_own', t);
  end loop;
end $$;

alter table profiles enable row level security;
create policy profiles_select_own on profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_own on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- shared world model: read-only to users
do $$
declare t text;
begin
  foreach t in array array['schools','programs','playbooks','funding_opportunities','tactics','app_transitions'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select to authenticated using (true)', t || '_read', t);
  end loop;
end $$;

alter table prompt_versions enable row level security;
alter table eval_runs enable row level security;

-- the user can drive their own controls directly from the client
create policy grants_update_own on grants for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ripcords_insert_own on ripcords for insert to authenticated with check (user_id = auth.uid());
create policy ripcords_update_own on ripcords for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy approvals_decide_own on approvals for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy recommenders_write_own on recommenders for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 'sign' can never be loosened, even by the user via the api
create or replace function guard_sign_grant() returns trigger language plpgsql as $$
begin
  if new.capability = 'sign' and new.mode <> 'approve' then
    raise exception 'sign must stay on approve' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger grants_guard_sign before insert or update on grants for each row execute function guard_sign_grant();
-- private bucket for applicant documents. path convention: <user_id>/<document_id>/<filename>
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "docs_read_own" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "docs_upload_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
-- per-user scholarship match: why this applicant qualifies and how strong the match is
alter table user_funding add column if not exists fit text check (fit in ('strong', 'possible', 'long_shot'));
alter table user_funding add column if not exists why text;
alter table funding_opportunities add column if not exists sponsor text;
-- schools anywhere in the world
alter table schools add column if not exists country text;
alter table schools add column if not exists region text;
alter table schools add column if not exists ranking_note text;
create index if not exists schools_region_idx on schools(region);
-- per-user monthly AI budget override (null = platform default, $25)
alter table profiles add column if not exists monthly_budget_usd numeric(8,2);
-- agent_runs.cost_usd needs more precision for cheap calls
alter table agent_runs alter column cost_usd type numeric(12,6);
create index if not exists agent_runs_user_month_idx on agent_runs(user_id, started_at) where cost_usd is not null;
-- plan: free | pro | season. billing sets it; until then it's changed by hand.
alter table profiles add column if not exists plan text not null default 'free' check (plan in ('free', 'pro', 'season'));
alter table profiles add column if not exists plan_renews_at timestamptz;
-- what the school offered with an admit: used by the closer to push for more, and as outcome data
alter table applications add column if not exists aid_offered jsonb;
-- outreach drafts need a recipient even before we know a named contact
alter table messages add column if not exists to_email text;
alter table messages add column if not exists purpose text;
alter table threads alter column contact_id drop not null;
-- operators: can open /admin (costs, usage, failures). never exposed to regular users.
alter table profiles add column if not exists is_admin boolean not null default false;
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
-- 0008: the cloud runner. portals are filled and submitted from our servers (no install for the applicant).

-- portal logins the agents create for the applicant: their own email, a generated password.
-- the password is encrypted by the app; the applicant can reveal it in the app and change it any time.
create table if not exists portal_accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  application_id uuid references applications(id) on delete set null,
  portal_host   text not null,                 -- e.g. apply.babson.edu
  login_email   text not null,
  password_enc  text not null,
  status        text not null default 'created' check (status in ('created', 'verified', 'failed')),
  revealed_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (user_id, portal_host)
);
alter table portal_accounts enable row level security; -- no user-facing policies: served through the api

alter table applications add column if not exists runner_mode text not null default 'cloud' check (runner_mode in ('cloud', 'extension'));
alter table applications add column if not exists runner_session_id text;
alter table applications add column if not exists runner_live_url text;
alter table applications add column if not exists runner_state jsonb not null default '{}'::jsonb;

-- browser work runs only in the function that ships chromium (/api/runner/work); everything else skips it.
-- only_agent = null: any job except the runner's. only_agent = 'runner': only the runner's.
create or replace function claim_jobs_for(worker text, max_jobs integer, only_agent text)
returns setof jobs language sql as $$
  update jobs set status = 'running', locked_at = now(), locked_by = worker, attempts = attempts + 1
  where id in (
    select id from jobs
    where ((status = 'queued' and run_at <= now())
       or (status = 'running' and locked_at < now() - interval '10 minutes' and attempts < max_attempts))
      and (case when only_agent is null then agent <> 'runner' else agent = only_agent end)
    order by run_at
    limit max_jobs
    for update skip locked
  )
  returning *;
$$;
-- messages: keep the whole email a school sent, who sent it, what it means, and whether the applicant has read it
alter table messages add column if not exists summary text;          -- one plain sentence from the inbox agent
alter table messages add column if not exists from_email text;
alter table messages add column if not exists from_name text;
alter table messages add column if not exists action_needed text;    -- what the school asks the applicant to do, if anything
alter table messages add column if not exists due_date date;
alter table messages add column if not exists read_at timestamptz;   -- inbound only: null = unread

-- replies the applicant already saw before this column existed stay read
update messages set read_at = coalesce(sent_at, created_at) where direction = 'in' and read_at is null and created_at < now();
update messages set read_at = coalesce(sent_at, created_at) where direction = 'out' and read_at is null;

create index if not exists messages_unread on messages(user_id) where direction = 'in' and read_at is null;
create index if not exists threads_gmail on threads(user_id, gmail_thread_id);
