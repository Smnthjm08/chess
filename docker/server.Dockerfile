# Build from the repo root: docker build -f docker/server.Dockerfile .
FROM oven/bun:1
WORKDIR /app

# Manifests first so the install layer is cached until dependencies change.
COPY package.json bun.lock ./
COPY apps/server/package.json apps/server/
COPY packages/auth/package.json packages/auth/
COPY packages/db/package.json packages/db/
COPY packages/game-core/package.json packages/game-core/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/
# web's manifest is needed only so --frozen-lockfile sees the full workspace; --filter skips installing its deps.
COPY apps/web/package.json apps/web/
RUN bun install --frozen-lockfile --filter server

COPY . .
# prisma.config.ts requires DATABASE_URL to load; generate never connects.
RUN DATABASE_URL=postgresql://build/build bun run --filter @repo/db build

ENV NODE_ENV=production
USER bun
EXPOSE 8001
# Prisma takes an advisory lock, so concurrent starts can't race the migration.
# exec hands PID 1 to bun so SIGTERM reaches the shutdown handler.
CMD ["sh", "-c", "bun run --filter @repo/db db:deploy && exec bun apps/server/src/index.ts"]
