# syntax=docker/dockerfile:1.7
# Multi-stage build for the @pl-conf/web Next.js app running in SSR/standalone mode.
# Used by the experiment CDK stack (packages/cdk/lib/pl-conf-experiment-stack.ts).

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY packages/web/package.json ./packages/web/
COPY packages/core/package.json ./packages/core/
COPY packages/data/package.json ./packages/data/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts \
      --filter @pl-conf/web... \
      --filter @pl-conf/data...

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/data/node_modules ./packages/data/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/web ./packages/web
COPY packages/core ./packages/core
COPY packages/data ./packages/data
RUN test -f ./packages/data/generated/events.ts || (echo "ERROR: packages/data/generated/events.ts missing — run \`pnpm run generate\` before \`docker build\`" && exit 1)
RUN pnpm --filter @pl-conf/web run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache wget && addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/packages/web/.next/standalone ./
COPY --from=build --chown=app:app /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=build --chown=app:app /app/packages/web/public ./packages/web/public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q -O - http://127.0.0.1:3000/ > /dev/null || exit 1
CMD ["node", "packages/web/server.js"]
