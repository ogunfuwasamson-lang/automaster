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
