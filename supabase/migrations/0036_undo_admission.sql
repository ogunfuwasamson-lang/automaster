-- an applicant who marked an application "admitted" by mistake can take it back (founder's approval, 26 nov 2026).
-- only an admission nothing backs yet: the app checks that before it moves the status (api/applications/[id]/status)
insert into app_transitions (from_status, to_status) values ('admitted', 'submitted') on conflict do nothing;
