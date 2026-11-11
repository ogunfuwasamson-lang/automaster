-- fee-waiver results per application, so waivers won can be counted and shown.
-- reversible: alter table applications drop column fee_waiver_status, drop column fee_waived_usd;
alter table applications
  add column if not exists fee_waiver_status text check (fee_waiver_status in ('requested', 'granted', 'denied')),
  add column if not exists fee_waived_usd integer;
