-- scholarships become applications: a scholarship is a "program" of kind 'scholarship' under its sponsor, so the
-- strategist, writer, red team, packet signing, runner and inbox all work on it unchanged.
alter table programs add column if not exists kind text not null default 'program';
do $$ begin
  alter table programs add constraint programs_kind_check check (kind in ('program', 'scholarship'));
exception when duplicate_object then null; end $$;
create index if not exists programs_kind on programs (kind) where kind = 'scholarship';

-- opt in: agents start applications for strong-fit scholarships on their own (they still wait for your signature)
alter table profiles add column if not exists auto_scholarships boolean not null default false;
