# automaster

agents that run a bachelor's, master's or PhD application cycle for anyone, in any field, to universities anywhere
(US, Canada, UK, Europe, Asia, Australia/NZ, Middle East, Africa, Latin America): intake, shortlist,
drafts, funding, submission prep. you review, they run.

## strategy: admissions first

1. **get as many good admits as possible.** recon searches each region you pick from its top-ranked
   universities down, and only holds a program back for things that block admission (a required test
   you won't take, english proof you can't meet, closed deadlines). funding is shown, never used as a filter.
2. **then work every admit for money.** the closer agent (phase 4) goes after merit reconsideration,
   assistantships posted after admission, departmental awards, competing offers, and outside scholarships
   matched to the applicant's own hooks (field, employers, awards, ventures, region, citizenship).

## status

| phase | what | state |
|---|---|---|
| 0 | schema, autonomy policy, job queue, agent runtime, event log, tests | done |
| 1 | intake: doc upload, extraction, voice interview | done |
| 2 | recon + deadline tracker | done |
| 3 | strategist, writer, red team | done |
| 4 | closer: post-admission funding, fee waivers, gmail outreach | next |
| 5 | runner: fill sheets, browser extension | |
| 6 | dashboard polish, digest, ripcord ui | |

## how it's wired

- **next.js 15** on vercel. server routes only; the service-role key never touches the browser.
- **supabase**: auth (magic link), postgres, storage (private `documents` bucket).
- **job queue in postgres** (`jobs` table + `claim_jobs()` with `skip locked`). no extra service.
  supabase `pg_cron` hits `/api/worker` every minute; new jobs also get kicked inline with `after()`.
- **claude** via `@anthropic-ai/sdk` structured outputs. every call is logged to `agent_runs`.
- **events** table is append-only (trigger-enforced). it's the audit log and the learning data.

### the autonomy dial

every agent action goes through `guard()` → `decide()` in `src/lib/policy.ts`. defaults, seeded per user:

| capability | default |
|---|---|
| research, draft, prefill, add/drop school | auto |
| email.follow_up | auto, 10 min undo, 2/thread/week |
| email.new_contact | auto, 10 min undo, 1 per contact, 10/day |
| submit | auto **once you've approved that packet** |
| spend.app_fee | auto inside your fee envelope (starts at $0 = ask) |
| state_fact, sign, spend.deposit | always you |

hard floors enforced in the database, not just the app:
- an application can't move to `submitted` without `packet_approved_at` (only set from your review screen)
- moving back to `preparing` wipes the approval, so edited packets get re-reviewed
- `sign` can't be set to anything but `approve`
- events can't be edited or deleted

ripcords (`ripcords` table) stop everything, one agent, one capability, or one school until released.

## setup (one time, ~15 min)

1. **supabase**: create a free project at supabase.com. region: closest to you (eu-west works well from lagos).
2. sql editor → paste and run `supabase/migrations/0001_init.sql`, then `0002_storage.sql`.
3. auth → url configuration: set site url to your vercel url, add `https://YOUR-APP.vercel.app/auth/callback` to redirect urls.
4. **vercel**: import the github repo. add env vars from `.env.example`. deploy.
5. sql editor → edit placeholders in `supabase/cron.sql` and run it.
6. open the app, sign in, hit **test agent loop** on the dashboard. an event `system.pinged` should appear within a few seconds.

## local dev

```sh
cp .env.example .env.local   # fill in
npm i
npm run dev
```

tests (policy unit tests always run; db tests need a throwaway postgres superuser url):

```sh
TEST_DATABASE_URL=postgres://am:am@localhost/am_test npm test
```

## runbook

- **agent misbehaving**: dashboard ripcord (phase 6) or `insert into ripcords(user_id, scope_kind) values ('<uid>', 'all');`
- **job stuck**: `select * from jobs where status in ('running','failed') order by created_at desc;` stale `running` jobs are reclaimed after 10 min, up to `max_attempts`.
- **what did an agent do and why**: `select actor, action, reasoning, context from events where user_id = '<uid>' order by created_at desc;`
- **llm spend**: `select agent, sum(input_tokens), sum(output_tokens) from agent_runs group by agent;`

## plans and AI cost control

| plan | price | AI budget / month | limits |
|---|---|---|---|
| free | $0 | $1.50 | 1 region, 1 shortlist run (6 programs), 1 application, 5 documents |
| pro | $49 / month | $25 | all regions, 6 runs x 20 programs, 15 applications, 40 documents |
| season pass | $199 / 6 months | $25 / month | same as pro, paid once per cycle |

- every model call is metered (`agent_runs.cost_usd`, official per-token prices in `src/lib/pricing.ts`) and
  budget-checked first. the monthly budget is split research 45% / writing 35% / core 20% so one feature can't starve the rest.
- over budget: the call is refused, queued work parks until the 1st (or until the plan changes), the dashboard says so.
- model tiers: haiku 5.5 for web research and parsing (the bulk of tokens), sonnet 5.5 for writing, review and chat.
  system prompts and fact sheets are prompt-cached. program research is shared across users for 30 days.
- per-user override: `profiles.monthly_budget_usd`. plan: `profiles.plan` (billing will set it).
