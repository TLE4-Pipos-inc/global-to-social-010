# Build the web SPA and serve it with nginx, which also reverse-proxies /api.
# Build context must be the repo root (needs the pnpm workspace + packages/schemas).

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.0.0 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/schemas/package.json ./packages/schemas/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/schemas/node_modules ./packages/schemas/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/schemas ./packages/schemas
COPY apps/web ./apps/web
# Vite compiles the @pub-hopper/schemas TS source directly — no dist remap needed
RUN pnpm --filter web build

# Production image — nginx serves static files and proxies /api to the API
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
# Only substitute API_URL so nginx runtime vars ($host, $remote_addr, …) are left intact
ENV NGINX_ENVSUBST_FILTER=API_URL
EXPOSE 8002
