-- what the school offered with an admit: used by the closer to push for more, and as outcome data
alter table applications add column if not exists aid_offered jsonb;
-- outreach drafts need a recipient even before we know a named contact
alter table messages add column if not exists to_email text;
alter table messages add column if not exists purpose text;
alter table threads alter column contact_id drop not null;
-- operators: can open /admin (costs, usage, failures). never exposed to regular users.
alter table profiles add column if not exists is_admin boolean not null default false;
