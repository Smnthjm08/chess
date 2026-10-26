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
# ponytail: web's manifest is needed only so the lockfile matches; its deps are installed but unused, add --filter server if image size matters
COPY apps/web/package.json apps/web/
RUN bun install --frozen-lockfile

COPY . .
# prisma.config.ts requires DATABASE_URL to load; generate never connects.
RUN DATABASE_URL=postgresql://build/build bun run --filter @repo/db build

ENV NODE_ENV=production
USER bun
EXPOSE 8001
CMD ["bun", "apps/server/src/index.ts"]
