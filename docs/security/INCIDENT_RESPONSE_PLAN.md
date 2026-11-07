# Incident response

## Severity

- **Sev 1**: applicant data exposed or altered by someone else; a secret leaked; payments or submissions made without
  the applicant's consent. Act now, any hour.
- **Sev 2**: a feature abused at scale (spam, credit farming, AI spend spike); the site down. Same day.
- **Sev 3**: a weakness found with no sign of use. Next working day.

## Stop the bleeding (minutes)

| Situation | Switch |
|---|---|
| Agents doing something wrong for everyone | Admin > stop all agents (ripcord `all`), or set `ai_paused_until` in `billing_settings` to a future time: every AI call stops and queued jobs wait |
| One applicant's account misbehaving or compromised | Pull that user's ripcord; revoke their extension tokens (`runner_tokens.revoked_at`); sign them out in Supabase Auth |
| Secret leaked | Rotate it at the provider, update the environment (Vercel or Agent37 instance env), redeploy. Service-role key: Supabase > API > roll key. `TOKEN_ENCRYPTION_KEY`: rotating it makes stored portal passwords and mail tokens unreadable, so applicants reconnect Gmail and re-enter portal logins |
| Payment webhook forged or replayed | Rotate `BACHS_WEBHOOK_SECRET`; `billing_events` shows every applied reference; reverse wrongly granted credits with a `credit_ledger` row (`reason = 'refund'`) |
| Abuse of a public form | The alerts and ambassador endpoints can be disabled by removing their route files and redeploying; enable a Cloudflare rate-limit rule |

## Investigate

1. The `events` table is append-only and records who did what (`actor`: user, agent, system) with context.
2. `agent_runs` holds every model call (input, output, cost) for agent behaviour questions.
3. `billing_events` and `credit_ledger` explain every payment and credit.
4. Hosting logs: Vercel (one hour on Hobby) or `GET /v1/instances/{id}/logs` on Agent37.

## Recover and report

- Restore data from Supabase point-in-time recovery if rows were altered.
- Tell affected applicants what happened, what data, and what they should do (reconnect Gmail, change a portal
  password) within 72 hours of knowing; for EU/UK applicants this is also the GDPR deadline for notifying the
  regulator when there's risk to people.
- Write down the cause, the fix, and the test that stops it coming back, and add that test to CI.
