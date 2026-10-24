-- schools anywhere in the world
alter table schools add column if not exists country text;
alter table schools add column if not exists region text;
alter table schools add column if not exists ranking_note text;
create index if not exists schools_region_idx on schools(region);
