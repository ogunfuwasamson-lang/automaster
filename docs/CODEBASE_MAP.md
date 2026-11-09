# Codebase map

Where things live in Ivyward, and which file to open for a given job. Start at the README for what the product does;
come here to find the code. Keep this file up to date when you add, move or retire a module.

## Top level

| Path | What it is |
|---|---|
| `src/app/` | Next.js 15 app router: public site, the signed-in app, the operator console and every API route |
| `src/agents/` | The agents: one file per agent, registered in `index.ts` as `"<agent>.<task>"` handlers |
| `src/lib/` | Shared logic: the portal runner, AI calls, billing, email, policy, data access |
| `src/components/` | React components, grouped by area |
| `src/content/` | Written library content (guides, university notes, glossary) |
| `src/middleware.ts` | Sign-in gate; lists the public paths |
| `supabase/migrations/` | Database schema, numbered (`0001_init.sql` onwards); `cron.sql` schedules the worker |
| `extension/` | The Chrome extension (built from source by `scripts/build-extension.mjs`, `npm run build:extension`) |
| `deploy/agent37/` | Production deploy: `deploy.sh`, `Dockerfile`, `cron.mjs` (hits `/api/worker` every 60s), `front.mjs` |
| `deploy/cloudflare/` | Edge in front of the site |
| `.github/workflows/` | `ci.yml` (tests), `deploy-agent37.yml` (deploy on push to `main`), `fetch-registries.yml` |
| `scripts/` | Extension build and packing, institution registry loaders (`hed/`) |
| `tests/` | Vitest: unit tests, plus browser end-to-end tests of the runner (`engine-e2e.test.ts`) |
| `docs/security/` | Security audit report |

## Request flow

1. A page or API route under `src/app/` handles the request. Signed-in pages are in `src/app/(app)/`.
2. Work that takes time is queued as a job (`lib/queue.ts` → `jobs` table).
3. `deploy/agent37/cron.mjs` calls `/api/worker` every minute; `lib/jobs.ts` claims due jobs and runs the handler from
   `src/agents/index.ts`.
4. Agents call the model through `lib/llm.ts` (metered into `agent_runs`, budget-checked by `lib/budget.ts`) and record
   what they did in `events` (`lib/events.ts`, append-only).
5. Every agent action passes `lib/guard.ts` → `lib/policy.ts` (the autonomy dial).

## Agents (`src/agents/`)

| File | Job |
|---|---|
| `index.ts` | Maps `"<agent>.<task>"` to handlers |
| `intake.ts` | Reads uploaded documents into the profile |
| `interviewer.ts` | The profile interview; asks the questions portals raised |
| `curator.ts` | Keeps one clean profile from many sources |
| `recon.ts` | Finds and researches programs, builds the shortlist, scholarships |
| `writer.ts` | Strategist → writer → red team loop for essays |
| `closer.ts` | Fee waivers before applying; funding after admission |
| `runner.ts` | The cloud runner job: finds the portal, creates the account, fills, uploads, submits |
| `learning.ts` | Learns from edits and outcomes (per applicant and shared lessons) |
| `system.ts` | Smoke test and housekeeping tasks |

## The portal runner (submitting applications)

The part most fixes touch. Read in this order:

| File | Role |
|---|---|
| `agents/runner.ts` | The job: opens the browser, builds the fill sheet, runs the engine, saves state, hands off to Chrome, records outcomes. Also the email lookups (verification codes, reset links, emailed logins). Saves where each run stopped: `runner_state.debug` (labels, no values) and a screenshot at `documents/<user>/runner-debug/<application>.jpg` |
| `lib/cloud-engine.ts` | The brain: classifies each page (login, sign-up, verification, form, captcha, payment, confirmation) and acts. Sign-up, sign-in, password reset and change, navigator and screen-reading fallbacks, dead-end and bot-wall handling |
| `lib/runner-dom.ts` | Injected into every portal page: reads fields and buttons (including inside shadow DOM and Salesforce components), applies fills, picks options |
| `lib/engine-page.ts` | The small browser interface the engine uses (Playwright in the cloud, the extension in Chrome) |
| `lib/fillsheet.ts` | Every answer a portal may ask, built from the applicant's profile; label → key rules |
| `lib/runner-map.ts` | Maps a page's fields to fill-sheet keys (rules first, the model picks keys, never values) |
| `lib/runner.ts` | Model-backed field mapping and decisions for fields the rules don't cover |
| `lib/runner-guard.ts` | Stops a run that keeps failing on the same page |
| `lib/requeue.ts` | When a stopped application restarts by itself (profile change, Gmail connected, sweeps) |
| `lib/vault.ts` | Portal logins the agents create: generated passwords, encrypted |
| `lib/verify-mail.ts` | Finds codes, links and emailed logins in a school's email; checks the email came from the portal |
| `lib/browser.ts`, `lib/live.ts` | Cloud browsers and the live view |
| `lib/never-fill.ts`, `lib/net-guard.ts` | Fields never typed into; addresses the browser may never reach |
| `lib/portal-url.ts`, `lib/apply-crawl.ts` | Finding the real application site |
| `lib/school-memory.ts`, `lib/lessons.ts` | What the agents learned about each school and in general |
| `app/api/runner/*` | Endpoints the Chrome extension calls (tasks, engine, map, check) |
| `extension/` | The Chrome extension that runs the same engine in the applicant's browser |

## AI, cost and health

| File | Role |
|---|---|
| `lib/llm.ts` | Model calls with structured output, retries, cost recording, enum repair |
| `lib/research.ts` | Web research with Claude's search and fetch tools |
| `lib/pricing.ts` | Per-token prices and `costOf()` |
| `lib/budget.ts` | Monthly AI allowance per user (`budgetFor()` is shared with the admin) |
| `lib/runs.ts` | Reads every `agent_runs` row (pages past Supabase's 1,000-row limit) |
| `lib/ai-health.ts` | Circuit breaker when the provider account fails; `ensureAiWorks()` test call before work resumes |

## Email and calendar

| File | Role |
|---|---|
| `lib/gmail.ts` | The applicant's Gmail through Composio (connect, read, send) |
| `app/api/mail/*` | Gmail connect and callback |
| `lib/inbox.ts` | Reads school emails and classifies them |
| `lib/followups.ts` | Acts on what a school email asks for |
| `lib/outbox.ts`, `lib/mime.ts` | Outgoing mail with an undo window |
| `lib/mailer.ts`, `lib/email-layout.ts`, `lib/digest.ts`, `lib/weekly.ts` | Ivyward's own emails to the applicant |
| `lib/gcal.ts`, `lib/calendar.ts` | Calendar invites |

## Billing and plans

`lib/plans.ts` (plans and limits), `lib/geo-pricing.ts` (price by country), `lib/billing.ts` (payments, `paymentNeeded()`),
`lib/bachs.ts` (African payments), `lib/limits.ts` (checked before work is queued), `lib/referrals.ts` (invite credits).

## Profile and data

`lib/profile.ts` (the profile object), `lib/profile-store.ts` (safe concurrent updates), `lib/profile-chapters.ts`,
`lib/details-schema.ts`, `lib/portal-fields.ts`, `lib/portal-questions.ts`, `lib/doc-kinds.ts`, `lib/upload-client.ts`,
`lib/supabase/` (server, browser and admin clients), `lib/crypto.ts` (encryption at rest).

## Public site, SEO and the school directory

| Path | Role |
|---|---|
| `app/page.tsx`, `app/pricing`, `app/about`… | Marketing pages; `lib/site.ts` holds the shared copy |
| `app/guides`, `app/universities`, `app/scholarships`, `app/glossary`, `app/study-abroad` | The library (`src/content/`, `lib/markdown.ts`, `lib/library-md.ts`) |
| `app/schools/` | Public school directory, one page per institution (`lib/directory.ts`, `lib/institutions.ts`) |
| `app/llms.txt`, `app/robots.ts`, `app/sitemap.ts`, `app/md/` | AI and search discovery; `lib/indexnow.ts` pings search engines |
| `app/es`, `app/fr`, `app/pt`, `app/ar` | Translated pages |

## The signed-in app (`src/app/(app)/`)

`dashboard`, `applications` (and `[id]` with the runner panel), `shortlist`, `documents`, `interview`, `profile`,
`messages`, `logins`, `reports`, `settings` (Gmail, Chrome, controls), `connect-chrome`. Onboarding is `app/onboarding/`;
sign-in is `app/login/` and `app/auth/`.

## Operator console (`src/app/admin/`)

`page.tsx` (tabs), `views.tsx` (Overview, Users, user detail, Submissions, Portals, AI costs, Growth, Learning, System),
`data.ts` (`loadAdmin()` and `scope()`: every read pages past the 1,000-row limit), `team-toggle.tsx`. Team accounts are
listed in `lib/team.ts`.

## Policy and safety

`lib/policy.ts` and `lib/guard.ts` (the autonomy dial), `lib/dial.ts`, `lib/attest.ts` (what the applicant signs),
`lib/safe-redirect.ts`, `lib/net-guard.ts`, `lib/never-fill.ts`. Database-level floors are in the migrations.

## Tests (`tests/`)

| File | Covers |
|---|---|
| `engine-e2e.test.ts` | The runner against fake portals in a real browser (sign-up, sign-in, Slate, PeopleSoft, Salesforce, uploads…) |
| `runner-guard.test.ts`, `school-id.test.ts`, `issued-login.test.ts` | Runner rules, label mapping, email parsing |
| `ai-health.test.ts`, `pricing.test.ts` | Outages, enum repair, cost |
| `policy.test.ts`, `security.test.ts` | The dial and security guards |
| `db.test.ts` | Database rules (needs `TEST_DATABASE_URL`) |

Run everything with `npx vitest run`; browser tests skip when no browser is available.
