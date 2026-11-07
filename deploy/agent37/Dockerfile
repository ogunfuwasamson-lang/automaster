# Ivyward on an Agent37 instance: the Next.js app as a standalone server, a full Chromium for the portal runner,
# and a one-minute scheduler in place of Vercel's cron. Built by deploy/agent37/deploy.sh from a clean git export.
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 STANDALONE=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# public build-time settings only (NEXT_PUBLIC_*): written by deploy.sh, never server secrets
RUN npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3001 HOSTNAME=127.0.0.1 CHROMIUM_PATH=/usr/bin/chromium
RUN apt-get update && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-noto-color-emoji ca-certificates tini \
  && rm -rf /var/lib/apt/lists/* && useradd -m -u 10001 ivyward
WORKDIR /app
COPY --from=build --chown=ivyward /app/.next/standalone ./
COPY --from=build --chown=ivyward /app/.next/static ./.next/static
COPY --from=build --chown=ivyward /app/public ./public
COPY --chown=ivyward deploy/agent37/front.mjs deploy/agent37/cron.mjs deploy/agent37/start.sh ./
USER ivyward
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["bash", "./start.sh"]
