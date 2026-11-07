# Ivyward security audit, November 2026

Scope: the Ivyward repository (Next.js 15 app, Supabase Postgres, job worker, cloud and Chrome-extension form runners,
billing with Bachs, Gmail/Calendar through Composio, email through Resend) and its deployment (Vercel today; the
Agent37 kit in `deploy/agent37`). Method: code inspection of every API route, migration and agent; targeted tests
for each suspected issue; fixes with regression tests; full suite, lint and dependency audit afterwards.

This one document covers the architecture, threat model, attack surface, findings, fixes, tests and the risks
left open; incident handling is in `INCIDENT_RESPONSE_PLAN.md`. Nothing here was tested against production data.

## 1. Architecture and trust boundaries

| Component | Trust boundary | Holds |
|---|---|---|
| Browser (applicant) | untrusted | session cookie (Supabase), nothing else |
| Next.js app (pages, 63 API routes) | server, holds service-role key | all secrets, via environment variables |
| Supabase Postgres | RLS on every table; the browser has select-only policies on its own rows | profiles, applications, documents, encrypted portal logins and mail tokens |
| Job worker (`/api/worker`, `/api/runner/work`) | bearer `CRON_SECRET`, compared in constant time | runs agents and the cloud browser |
| Cloud browser (Playwright/Chromium) | loads untrusted school pages and links | portal cookies for one run |
| Chrome extension | per-device bearer token, stored hashed (sha256), max 5 live per user | acts in the applicant's own browser |
| Bachs webhooks | HMAC-SHA256 signature, 5-minute replay window, idempotent by reference | payment state |
| Anthropic API | outbound only | prompts contain profile data |
| Agent37 front door (new) | trusts host/country only with `FRONT_PROXY_SECRET` from the Cloudflare worker | none |

Sensitive assets, highest first: service-role key and other server secrets; encrypted portal passwords and Gmail
tokens (AES-GCM, key in env); applicant documents and profile (personal data, optional sensitive categories);
payment state and submission credits; admin flag.

## 2. Threat model (summary)

Attackers considered: anonymous visitor; signed-in applicant probing other users' data; bot farming free credits;
malicious school page or email link reaching the agents' browser (prompt injection, SSRF); a leaked extension token;
a forged payment webhook; an expensive-operation flood (denial of wallet).

Existing controls verified to work (by reading the code and, where marked, by tests):

- Users cannot update their own `profiles` row from the browser at all (policy dropped in 0007), so plan, admin flag,
  budget and credits are server-only. Test: `db.test.ts` "applicants can't grant or spend credits themselves".
- Every `[id]` route filters by the signed-in user (applications, documents, messages, threads, live sessions,
  logins, lessons, reports, approvals, artifacts). Reviewed one by one.
- Cron and runner endpoints compare secrets with `timingSafeEqual`.
- Bachs webhooks: signature, timestamp window, and one `billing_events` row per reference (duplicate = no-op).
- Payment amounts are checked against the real price (90% floor), so an edited checkout can't buy credits cheaply.
- Submission credits are spent in Postgres with row locks; two runners racing for the last credit get one each of
  "credit" and "none". Test: `db.test.ts` "submission packs".
- Signup: Cloudflare Turnstile; referral rewards capped per inviter.
- AI spend: per-user monthly budgets plus a global breaker that pauses all AI work on credit or key errors.
- Extension tokens are random, stored as sha256, revocable, at most 5 live per user.
- Portal passwords and mail tokens are encrypted; ID numbers (passport, national ID, bank) are never stored and the
  form filler leaves those fields to the applicant.

## 3. Findings and fixes

| # | Severity | Finding | Fix | Test |
|---|---|---|---|---|
| 1 | P1 (on a single VM) | **SSRF from the cloud browser and the crawler.** Links from school pages and emails were loaded without checking the address; on a VM that shares its network with the app, a link to `http://127.0.0.1:3001/...` or cloud metadata (`169.254.169.254`) would be reachable. | `lib/net-guard.ts`: refuses non-http(s), loopback, private, link-local, CGNAT and multicast addresses, and names that resolve to them. Every browser context routes requests through it; the crawler uses `safeFetch`, which re-checks each redirect hop. | `security.test.ts` (private ranges, metadata, `file:`, names resolving to loopback) |
| 2 | P2 | **Open redirect after sign-in.** `next=/\evil.com` passed the "starts with / and not //" check; browsers treat `\` as `/`. | `lib/safe-redirect.ts`: only same-site paths, no backslashes or whitespace. | `security.test.ts` (8 bypass spellings) |
| 3 | P2 | **Inbox flooding through the public alerts form.** Each POST re-sent the confirmation email to any address. | One confirmation per address per day. | covered by code review; honeypot already present |
| 4 | P2 | **No browser security headers.** Pages could be framed (clickjacking), no HSTS, no nosniff. | `next.config.ts`: `X-Frame-Options`/`frame-ancestors 'self'` (except `/embed/*`, which is meant to be framed), HSTS, nosniff, referrer policy, permissions policy (microphone for voice only). | build output |
| 5 | P2 | **Vulnerable image library.** `sharp` with libvips/libheif/librsvg advisories. | Upgraded (`npm audit fix`). | `npm audit --omit=dev` |
| 6 | P3 | **Host and country spoofing behind a proxy (new hosting).** | The Agent37 front door accepts the forwarded host and country only with the proxy secret, strips client copies, and rewrites redirects. | manual test, documented in `deploy/agent37/README.md` |
| 7 | P3 | **No CI gate.** Regressions could ship unnoticed. | `.github/workflows/ci.yml`: types, lint, 177 tests (incl. real-Postgres RLS and billing races), dependency audit. | the workflow itself |

## 4. Results

- Full suite: 177 tests pass (18 files), including the new security and billing tests. One upload test is
  timing-sensitive under full load and passes on its own.
- Type check and lint clean; production build succeeds.
- `npm audit --omit=dev`: one remaining high (postcss inside Next's own build tooling; build-time only, fixed by the
  next Next.js upgrade).

## 5. Remaining risks and recommended next steps

- **Prompt injection through school pages and emails.** Agents read untrusted text. Mitigations in place: actions
  that spend money or submit need the applicant's signed packet and the dial; sends have an undo window; the
  browser can't reach internal addresses. Recommended: keep tool permissions narrow, and add a review step before
  any action an email asks for that the applicant didn't.
- **Content Security Policy.** Only `frame-ancestors` is set; a full script CSP needs nonces for the inline JSON-LD
  and theme scripts. Worth doing as a separate change with report-only first.
- **Rate limiting** is per-user (budgets) and per-form (honeypot, Turnstile, daily email cap), not per-IP at the
  edge. Behind Cloudflare, enable its free rate-limiting rule on `/api/*` (e.g. 120 requests/minute per IP).
- **Secrets rotation.** No secret was found in the repository or history scan; rotate `CRON_SECRET` and the
  Supabase service-role key once the move off Vercel is done, since they'll have been copied between systems.
- **Postcss in Next's tooling**: clears with the next Next.js minor upgrade.
