# Moving Ivyward from Vercel to Agent37

What runs where after the move:

- **Agent37 instance** (always on, 2 vCPU / 4 GB, about $5–9 a month): the Next.js app as a standalone server, a
  full Chromium for the portal runner, and a one-minute scheduler that replaces Vercel's cron.
- **Cloudflare (free)**: keeps tryivyward.com's DNS (mail forwarding and Resend records unchanged) and a small Worker
  that forwards the site to the instance with the visitor's real domain and country.
- **Unchanged**: Supabase, Resend, Bachs, Composio, the Chrome extension, Google Search Console.

Agent37's own custom-domain feature isn't used: it takes over the whole domain's DNS (which would break email) and
needs $100 of top-ups first.

## 1. Agent37 (you)

1. In the Agent37 dashboard (workspace `95ZQqMBVk7qTOZxCnfOq`), add credit to the wallet and create an **API key**.
2. Make the environment file: `npx vercel env pull deploy/agent37/env.production --environment=production`
   (or copy each value from Vercel > Settings > Environment Variables into a copy of `env.example`).
   Add `FRONT_PROXY_SECRET=` with a long random string (`openssl rand -hex 32`).

## 2. First deploy

Either on your computer:

```bash
export AGENT37_API_KEY=sk_live_...
bash deploy/agent37/deploy.sh          # builds, creates the instance, prints its id and public URL
```

or in GitHub: add the secrets `AGENT37_API_KEY` and `AGENT37_ENV` (the whole env file) under Settings > Secrets and
variables > Actions, then run **Deploy to Agent37** from the Actions tab.

Save the printed instance id as `AGENT37_INSTANCE_ID` (in your shell, or as a GitHub secret). From then on every
push to main updates the same instance. Open `https://ivyward-<instance-id>.agent37.app` to check the site.

## 3. Point tryivyward.com at it (Cloudflare)

1. Create a free Cloudflare account and **Add a site**: tryivyward.com. Cloudflare copies the existing DNS records;
   check the MX, `send.` and TXT (SPF/DKIM) records are all there.
2. At Namecheap, change the nameservers to the two Cloudflare gives you. Email keeps working throughout.
3. Workers & Pages > Create Worker > paste `deploy/cloudflare/worker.js`. Under Settings > Variables add
   `ORIGIN = https://ivyward-<instance-id>.agent37.app` and `FRONT_PROXY_SECRET` (same value as on the instance).
4. Add routes `tryivyward.com/*` and `www.tryivyward.com/*` to the Worker. Give `tryivyward.com` and `www` proxied
   DNS records (orange cloud) pointing anywhere, for example `AAAA 100::`.

## 4. After the switch

- The pg_cron ping to `/api/worker` can stay on (jobs are locked, so a second ping is harmless) or be removed.
- Vercel can be disconnected from the GitHub repo so it stops trying to deploy.
