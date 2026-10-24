-- per-user scholarship match: why this applicant qualifies and how strong the match is
alter table user_funding add column if not exists fit text check (fit in ('strong', 'possible', 'long_shot'));
alter table user_funding add column if not exists why text;
alter table funding_opportunities add column if not exists sponsor text;
