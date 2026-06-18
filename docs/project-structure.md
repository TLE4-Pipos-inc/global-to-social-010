# Project Structure

[Back](./../README.md)

## Tech Stack

This template uses the following technologies:

- [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [Express](https://expressjs.com/)
- [React](https://react.dev/)
- [React Native](https://reactnative.dev/)
- [Vite](https://vite.dev/)
- [Expo Router](https://expo.github.io/router/)
- [TanStack Router](https://tanstack.com/router/latest)
- [TanStack Query](https://tanstack.com/query/latest)
- [TanStack Form](https://tanstack.com/form/latest)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Zod](https://zod.dev/)

## Overview

```
.
├── apps/
│   ├── api/
│   ├── mobile/
│   └── web/
├── packages/
│   └── schema/                       - Shared Zod schemas
│       ├── src/
│       │   ├── user.ts
│       │   ├── post.ts
│       │   └── index.ts              - Export
│       ├── package.json
│       └── tsconfig.json
├── docs/
│   ├── conventions.md
│   └── project-structure.md
├── .gitignore
├── tsconfig.base.json                - Shared TS config extended per app
├── pnpm-workspace.yaml               - Declares apps/* and packages/*
├── package.json                      - Root package with shared dev deps
└── README.md
```

## Back-end

```
.
├── src/
│   ├── db/
│   │   └── conn.js - Connection with mongoDB
│   ├── lib/
│   │   ├── jwt.js - JWT signing and verifying
│   │   └── response.js - Unified response schema
│   ├── middleware/
│   │   └── auth.js - Middleware function to check auth status
│   ├── routes/
│   │   ├── auth.js - Login, register, refresh, logout and me end points
│   │   ├── post.js - Crud functionality with protected routes
│   │   └── user.js - Get all and detail routes
├── index.js - Entry point
├── .env
└── .env.example
```

### Extra information

#### auth.ts

Checks for Bearer token in the authorization header, verifies it. Responds with 401 if no token or invalid token. Adds the user id in ` res.locals.userId` to use in the route handlers.

### models/user.ts

Hashes the passwords using bcrypt before saving to the database. Has a helper function to compare a plaintext password with the hashed password in the database.

### routes/auth.ts

Refresh token is a http cookie that is set on login and cleared on logout. It is used to get a new access token when the access token expires. The access token is sent in the authorization header as a Bearer token.
Refresh token is by default 7 days valid, access token is 30 minutes valid.

### index.ts

Uses cors with the option `credentials: true` to allow cookies to be sent in cross-origin requests. This is necessary for the refresh token to work.
All data is expected to be sent in the request body as JSON. The server responds with JSON as well, with a unified response schema defined in `lib/response.ts`.

### .env

```.env
# Server
PORT=8000
JWT_SECRET=
JWT_REFRESH_SECRET=
SALT_ROUNDS=12

NODE_ENV=development # development | production
```

## Mobile

```
mobile/
├── assets/
│   └── images/ - All static images
├── src/
│   ├── app/                          - Expo Router file-based routing
│   │   ├── (tabs)/                   - Tab navigator
│   │   │   ├── index.tsx             - Home tab
│   │   │   └── _layout.tsx           - Tab bar config + Auth guard + shared shell
│   │   ├── _layout.tsx               - Root layout (QueryClient, Toast, fonts)
│   │   └── index.tsx                 - Redirect to (app) or (auth)
│   ├── components/
│   │   ├── form/                     - Reusable field and form parts
│   │   ├── layout/                   - Larger elements i.e. headers, tab bars
│   │   ├── ui/                       - Base UI primitives (RN-adapted)
│   │── features/
│   │   └── auth/
│   │       └── hooks/
│   │           ├── form.ts
│   │           └── query.ts
│   ├── hooks/                        - Any shared hooks
│   ├── lib/
│   │   ├── api-error.ts              - Helper to surface API errors (dev)
│   │   ├── api.ts                    - `fetchWithAuth` with JWT + refresh
│   │   ├── form-context.ts           - Shared form context
│   │   └── token.ts                  - Secure token storage (expo-secure-store)
├── .gitignore
├── app.json
├── package.json
└── * Various config files (tsconfig, prettier, etc.)
```

## Web

```
web/
├── public/                           - Static assets served as-is
├── src/
│   ├── components/
│   │   ├── form/                     - Reusable field and form parts
│   │   ├── layout/                   - Larger elements i.e. header
│   │   └── ui/                       - Base UI primitives (shadcn / Base UI)
│   ├── features/                     - Feature modules (components + hooks)
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── conversation-starter/
│   │   ├── interest/
│   │   ├── partner/
│   │   └── venue/
│   │       ├── components/        - Feature-specific UI
│   │       ├── hooks/
│   │       │   ├── form.ts        - TanStack Form definitions
│   │       │   └── query.ts       - TanStack Query hooks
│   │       └── lib/               - Feature helpers (where needed)
│   ├── contexts/
│   │   └── auth-context.tsx          - Auth context via useSyncExternalStore
│   ├── routes/                       - TanStack Router file-based routing
│   │   ├── __root.tsx                - Root layout (providers, devtools, shell)
│   │   ├── index.tsx                 - Home route
│   │   ├── (auth)/                   - Auth routes (login, register, logout, account)
│   │   ├── admin/                    - Admin dashboard (route guard + index)
│   │   ├── interests/                - Interest CRUD + nested conversation-starters
│   │   ├── conversation-starters/    - Conversation starter CRUD
│   │   └── partner/                  - Partner venue + deals management
│   ├── lib/
│   │   ├── api.ts                    - `fetchWithAuth` with JWT + refresh
│   │   ├── api-error.ts             - Helper to surface API errors
│   │   ├── auth-store.ts            - External auth store (token + refresh)
│   │   ├── form-context.ts          - Shared form context
│   │   ├── route-guard.ts           - `checkAuth` / `checkRole` loader guards
│   │   └── utils.ts                 - Shared utilities (cn, etc.)
│   ├── types/
│   │   └── api.ts                   - API response schemas/types
│   ├── routeTree.gen.ts             - Generated route tree (do not edit)
│   ├── router.tsx                   - Router + QueryClient setup
│   ├── main.tsx                     - App entry point
│   └── styles.css                   - Tailwind entry / global styles
├── index.html
├── Dockerfile
├── nginx.conf.template
├── vite.config.ts
├── package.json
└── * Various config files (tsconfig, eslint, etc.)
```

### Extra information

#### lib/route-guard.ts

Used in route `beforeLoad`/loaders. `checkAuth` refreshes the access token when missing and redirects to `/login` (carrying the intended `location`) if that fails. `checkRole` additionally verifies the user's role and redirects to `/` when unauthorized.

#### lib/auth-store.ts & contexts/auth-context.tsx

Auth state lives in a framework-agnostic external store (`auth-store.ts`). React subscribes to it through `auth-context.tsx` using `useSyncExternalStore`, so both route loaders and components read the same source of truth.

#### routes/

File-based routing. `route.tsx` files define layout/guards for a segment, `index.tsx` the segment's page, and `$param` folders dynamic segments. `routeTree.gen.ts` is generated by the TanStack Router plugin and must not be edited by hand.
