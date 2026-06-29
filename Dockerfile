# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS deps
ARG PRISMA_ENGINES_MIRROR=https://case.artifacts.medtronic.com/artifactory/operations_innovation-generic-dev-local
ARG PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ARG ARTIFACTORY_USERNAME
ARG ARTIFACTORY_PASSWORD
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING="${PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING}" \
  && export ARTIFACTORY_USERNAME="${ARTIFACTORY_USERNAME}" \
  && export ARTIFACTORY_PASSWORD="${ARTIFACTORY_PASSWORD}" \
  && ENCODED_PASSWORD="$(node -e "console.log(encodeURIComponent(process.env.ARTIFACTORY_PASSWORD))")" \
  && MIRROR_HOST="$(echo "${PRISMA_ENGINES_MIRROR}" | sed 's|^https://||')" \
  && export PRISMA_ENGINES_MIRROR="https://${ARTIFACTORY_USERNAME}:${ENCODED_PASSWORD}@${MIRROR_HOST}" \
  && pnpm install --frozen-lockfile

FROM base AS builder
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
