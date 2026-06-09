FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.0.0 --activate
RUN apk add --no-cache python3 make g++
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/schemas/package.json ./packages/schemas/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/schemas/node_modules ./packages/schemas/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/schemas ./packages/schemas
COPY apps/api ./apps/api

# Build schemas to JS so Node.js can import it at runtime (main currently points to .ts source)
RUN pnpm --filter @pub-hopper/schemas build
# Remap schemas package.json exports from TypeScript source to compiled dist
RUN node -e " \
  const fs = require('fs'); \
  const p = JSON.parse(fs.readFileSync('./packages/schemas/package.json', 'utf8')); \
  p.main = './dist/index.js'; \
  p.exports = { '.': { types: './dist/index.d.ts', default: './dist/index.js' } }; \
  fs.writeFileSync('./packages/schemas/package.json', JSON.stringify(p, null, 2)); \
"
# Build API (esbuild bundles src, copies drizzle migrations to dist/)
RUN pnpm --filter api build

# Production image
FROM node:22-alpine AS runner
WORKDIR /app

# Copy workspace structure — pnpm symlinks in node_modules point to packages/schemas
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/schemas/node_modules ./packages/schemas/node_modules
COPY --from=builder /app/packages/schemas/package.json ./packages/schemas/
COPY --from=builder /app/packages/schemas/dist ./packages/schemas/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
# esbuild rewrites the migrations path to join(process.cwd(), "drizzle"); cwd at runtime is /app/apps/api
COPY --from=builder /app/apps/api/drizzle ./apps/drizzle
COPY pnpm-workspace.yaml package.json ./

ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 8001
CMD ["node", "dist/index.js"]
