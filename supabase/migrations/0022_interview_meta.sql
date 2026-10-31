-- what a chat message offers as answers (buttons, a search, yes/no, a date), so it survives a reload
alter table interview_turns add column if not exists meta jsonb;
