# API Agent Guide

## Project overview

Express 5 REST API using ES modules (`"type": "module"`). Runtime: Node.js with `--watch` in dev. Database: SQLite via Drizzle ORM (`better-sqlite3`). Auth: JWT (access + refresh) stored in HTTP-only cookies.

## Directory structure

```
apps/api/
├── src/
│   ├── index.js          # App entry — mounts middleware and routers
│   ├── db/
│   │   ├── client.js     # Drizzle db instance (reads DATABASE_URL from env)
│   │   └── schema.js     # Drizzle table definitions and relations
│   ├── lib/
│   │   └── jwt-helper.js # signAccess, signRefresh, verifyAccess, verifyRefresh, setAuthCookie
│   ├── middleware/
│   │   └── auth.js       # requireAuth — verifies Bearer token or access_token cookie
│   └── routes/
│       └── auth.js       # /register, /login, /refresh, /logout, /me
├── drizzle/              # Generated migration SQL files — do not edit manually
├── drizzle.config.js
└── eslint.config.js
```

New routes go in `src/routes/`. Mount them in `src/index.js` under `/api/<resource>`.

## Schemas and validation

### Rule: all Zod schemas live in `packages/schemas`

**Never define a Zod schema inside the API.** The `@pub-hopper/schemas` package is the single source of truth for request/response shapes and is shared with the mobile app.

```
packages/schemas/src/
├── index.ts          # re-exports everything
└── user.schema.ts    # RegisterUserSchema, LoginUserSchema, PublicUserSchema
```

**When to add a schema:**
- New route that accepts a request body → add a `<Resource>CreateSchema` / `<Resource>UpdateSchema` to `packages/schemas/src/`.
- New route that returns a public-facing shape → add a `Public<Resource>Schema`.
- Export it from `packages/schemas/src/index.ts`.

**How to use a schema in a route:**

```js
import { MyResourceSchema } from "@pub-hopper/schemas"

router.post("/", async (req, res) => {
  const result = MyResourceSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({
      message: "Invalid input",
      errors: z.flattenError(result.error).fieldErrors,
    })
  }
  const data = result.data
  // ...
})
```

Always use `.safeParse()`, never `.parse()` — the latter throws and bypasses the standard error response format.

### Drizzle schema (`src/db/schema.js`)

This file defines the **database tables** only — it is not for validation. Do not add Zod here. When you add a new table, add the corresponding Zod schema to `packages/schemas` as well.

## Authentication

Protected routes use the `requireAuth` middleware:

```js
import { requireAuth } from "../middleware/auth.js"

router.get("/protected", requireAuth, (req, res) => {
  const { userId, email, role } = res.locals.payload
  // ...
})
```

`requireAuth` accepts a `Bearer` token in the `Authorization` header or an `access_token` cookie. It writes the decoded JWT payload to `res.locals`.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Path to the SQLite file |
| `JWT_SECRET` | yes | Signs access tokens (1h expiry) |
| `JWT_REFRESH_SECRET` | yes | Signs refresh tokens (7d expiry) |
| `SALT_ROUNDS` | no | bcrypt rounds, defaults to 12 |
| `PORT` | no | Server port, defaults to 3000 |

The app throws at startup if `JWT_SECRET` or `JWT_REFRESH_SECRET` are missing.

## After making changes — run ESLint

Before finishing any task, run:

```sh
pnpm lint
```

from the `apps/api/` directory (or `pnpm --filter api lint` from the repo root). Fix all errors. Warnings about unused variables should also be resolved — import only what you use.

The linter uses `eslint-plugin-n` which enforces Node.js-specific rules on top of `eslint:recommended`. Common things it catches:

- Importing a package not listed in `package.json`
- Using Node built-ins incorrectly
- Unused variables and imports
