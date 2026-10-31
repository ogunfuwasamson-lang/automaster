-- deleting an application or an account.
-- events is append-only, but deleting an application sets events.application_id (and artifact_version_id for its
-- essays) to null, which is an UPDATE the old trigger refused, so the delete failed. allow exactly that unlinking,
-- and anything at all once the account itself is gone (the cascade from deleting a sign-in).

create or replace function events_append_only() returns trigger language plpgsql as $$
begin
  if not exists (select 1 from profiles where id = old.user_id) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'UPDATE'
     and new.id = old.id and new.user_id = old.user_id and new.actor = old.actor and new.action = old.action
     and new.capability is not distinct from old.capability
     and new.school_id is not distinct from old.school_id
     and new.program_id is not distinct from old.program_id
     and new.channel is not distinct from old.channel
     and new.agent_run_id is not distinct from old.agent_run_id
     and new.context = old.context
     and new.reasoning is not distinct from old.reasoning
     and new.created_at = old.created_at
     and (new.application_id is null or new.application_id = old.application_id)
     and (new.artifact_version_id is null or new.artifact_version_id = old.artifact_version_id)
  then
    return new;
  end if;
  raise exception 'events are append-only' using errcode = 'insufficient_privilege';
end $$;
