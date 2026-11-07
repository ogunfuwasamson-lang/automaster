-- the global higher-education directory: every recognised institution, its campuses, units, programs, catalog
-- courses and application routes, each fact with the source it came from and when it was checked. built from
-- official inventories first (IPEDS, OfS, CICIC, NUC...), then filled in program by program. the research agents
-- read this before searching the web, and write back what they find.
-- plan: Auto-Master project doc claude/schools-database-plan.md

create table if not exists public.hed_sources (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  title text,
  publisher text,
  source_type text not null check (source_type in ('registry', 'dataset', 'institution_page', 'catalog', 'pdf', 'api', 'repository', 'other')),
  published_on date,
  accessed_at timestamptz not null default now(),
  lineage text, -- upstream source or repository it came through
  license text,
  notes text,
  unique (url, accessed_at)
);

create table if not exists public.hed_institutions (
  id uuid primary key default gen_random_uuid(),
  country text not null, -- ISO 3166-1 alpha-2
  registry text not null, -- e.g. 'ipeds', 'ofs', 'cicic', 'nuc'
  registry_id text not null, -- the id in that registry (IPEDS UNITID, OfS UKPRN...)
  name text not null, -- official name as published
  local_name text,
  aliases text[] not null default '{}',
  region text, -- state / province
  city text,
  address text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  local_type text, -- as the registry words it
  type text check (type in ('university', 'college', 'community_college', 'polytechnic', 'institute', 'specialised', 'other')),
  control text check (control in ('public', 'private_nonprofit', 'private_for_profit', 'other')),
  highest_award text,
  status text not null default 'active' check (status in ('active', 'closed', 'merged', 'candidate', 'excluded', 'unverified')),
  recognition text, -- what makes it recognised (e.g. 'Title IV participating', 'OfS registered')
  website text,
  domain text,
  admissions_url text,
  financial_aid_url text,
  application_url text,
  net_price_url text,
  international_url text,
  parent_id uuid references public.hed_institutions(id) on delete set null, -- system or main campus
  school_id uuid references public.schools(id) on delete set null, -- the Ivyward school this matches, once linked
  source_id uuid references public.hed_sources(id) on delete set null,
  checked_at timestamptz not null default now(),
  coverage jsonb not null default '{}', -- per category: institution, campuses, units, programs, courses, admissions, costs
  issues text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (registry, registry_id)
);
create index if not exists hed_institutions_country on public.hed_institutions(country, status);
create index if not exists hed_institutions_domain on public.hed_institutions(domain);
create index if not exists hed_institutions_name on public.hed_institutions using gin (to_tsvector('simple', name));

create table if not exists public.hed_campuses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.hed_institutions(id) on delete cascade,
  name text not null,
  campus_type text, -- main, branch, online, learning centre
  city text, region text, country text, address text,
  latitude double precision, longitude double precision,
  online_only boolean not null default false,
  url text,
  source_id uuid references public.hed_sources(id) on delete set null,
  checked_at timestamptz not null default now()
);

create table if not exists public.hed_units (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.hed_institutions(id) on delete cascade,
  campus_id uuid references public.hed_campuses(id) on delete set null,
  parent_unit_id uuid references public.hed_units(id) on delete set null,
  name text not null,
  unit_type text, -- faculty, school, college, department, institute
  url text,
  source_id uuid references public.hed_sources(id) on delete set null,
  checked_at timestamptz not null default now()
);

create table if not exists public.hed_programs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.hed_institutions(id) on delete cascade,
  unit_id uuid references public.hed_units(id) on delete set null,
  campus_id uuid references public.hed_campuses(id) on delete set null,
  name text not null, -- official
  local_name text,
  credential text, -- as published: "MSc", "Bachelor of Arts (Hons)"
  level text check (level in ('certificate', 'diploma', 'associate', 'bachelors', 'masters', 'doctorate', 'professional', 'other')),
  subject text,
  cip_code text, isced_code text,
  status text not null default 'active' check (status in ('active', 'paused', 'discontinued', 'unclear')),
  modes text[] not null default '{}', -- in_person, online, hybrid, distance
  full_time boolean, part_time boolean,
  duration_text text, duration_months numeric,
  credits_text text,
  intakes text[] not null default '{}',
  program_url text, catalog_url text,
  application_url text,
  application_scope text check (application_scope in ('program', 'department', 'institution', 'external_portal')),
  admissions_url text,
  facts jsonb not null default '{}', -- tuition, fees, deadlines, requirements, documents, funding: each {value, original, source_id, checked_at, status}
  source_id uuid references public.hed_sources(id) on delete set null,
  checked_at timestamptz not null default now(),
  quality text[] not null default '{}'
);
create index if not exists hed_programs_inst on public.hed_programs(institution_id);
create index if not exists hed_programs_search on public.hed_programs using gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(subject, '') || ' ' || coalesce(credential, '')));

create table if not exists public.hed_courses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.hed_institutions(id) on delete cascade,
  unit_id uuid references public.hed_units(id) on delete set null,
  catalog_year text,
  code text, title text not null, description text,
  credits_text text, prerequisites text,
  url text,
  source_id uuid references public.hed_sources(id) on delete set null,
  checked_at timestamptz not null default now()
);

-- every fact with where it came from: one row per (record, field) claim, so conflicting sources sit side by side
create table if not exists public.hed_facts (
  id uuid primary key default gen_random_uuid(),
  record_type text not null check (record_type in ('institution', 'campus', 'unit', 'program', 'course')),
  record_id uuid not null,
  field text not null,
  value text, -- normalised
  original text, -- as the source words it
  status text not null default 'verified' check (status in ('verified', 'extracted', 'inferred', 'not_found', 'not_published', 'not_applicable', 'requires_confirmation', 'conflicting_sources', 'source_unavailable')),
  source_id uuid references public.hed_sources(id) on delete set null,
  checked_at timestamptz not null default now()
);
create index if not exists hed_facts_record on public.hed_facts(record_type, record_id, field);

-- the per-country inventory: scope, official source, denominator, progress
create table if not exists public.hed_manifest (
  country text primary key,
  region text not null, -- us, uk, canada, europe, asia, other
  scope text not null,
  source_id uuid references public.hed_sources(id) on delete set null,
  denominator int,
  counts jsonb not null default '{}',
  phase text not null default 'inventory' check (phase in ('inventory', 'pilot', 'collecting', 'audited')),
  notes text,
  updated_at timestamptz not null default now()
);

-- server-only: the agents read and write through the service key; nothing here is user data
alter table public.hed_sources enable row level security;
alter table public.hed_institutions enable row level security;
alter table public.hed_campuses enable row level security;
alter table public.hed_units enable row level security;
alter table public.hed_programs enable row level security;
alter table public.hed_courses enable row level security;
alter table public.hed_facts enable row level security;
alter table public.hed_manifest enable row level security;

-- staging for official bulk files: a loader drops raw rows here, then a SQL step normalises them
create table if not exists public.hed_staging (
  id bigserial primary key,
  batch text not null,
  row jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.hed_staging enable row level security;
