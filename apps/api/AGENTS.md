# API Agent Guide

## Project overview

Express 5 REST API using ES modules (`"type": "module"`). Runtime: Node.js with `--watch` in dev. Database: SQLite via
Drizzle ORM (`better-sqlite3`). Auth: JWT (access + refresh) stored in HTTP-only cookies.

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

**Never define a Zod schema inside the API.** The `@pub-hopper/schemas` package is the single source of truth for
request/response shapes and is shared with the mobile app.

```
packages/schemas/src/
├── index.ts          # re-exports everything
└── user.schema.ts    # RegisterUserSchema, LoginUserSchema, PublicUserSchema
```

**When to add a schema:**

- New route that accepts a request body → add a `<Resource>CreateSchema` / `<Resource>UpdateSchema` to
  `packages/schemas/src/`.
- New route that returns a public-facing shape → add a `Public<Resource>Schema`.
- Export it from `packages/schemas/src/index.ts`.

**How to use a schema in a route:**

```js
import { MyResourceSchema } from "@pub-hopper/schemas"

router.post("/", async (req, res) => {
  const result = MyResourceSchema.safeParse(req.body)
  if (!result.success) {
    return sendError(res, 400, {
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

This file defines the **database tables** only — it is not for validation. Do not add Zod here. When you add a new
table, add the corresponding Zod schema to `packages/schemas` as well.

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

| Variable             | Required | Description                      |
|----------------------|----------|----------------------------------|
| `DATABASE_URL`       | yes      | Path to the SQLite file          |
| `JWT_SECRET`         | yes      | Signs access tokens (1h expiry)  |
| `JWT_REFRESH_SECRET` | yes      | Signs refresh tokens (7d expiry) |
| `SALT_ROUNDS`        | no       | bcrypt rounds, defaults to 12    |
| `PORT`               | no       | Server port, defaults to 3000    |

The app throws at startup if `JWT_SECRET` or `JWT_REFRESH_SECRET` are missing.

## After making changes — run ESLint

Before finishing any task, run:

```sh
pnpm lint
```

from the `apps/api/` directory (or `pnpm --filter api lint` from the repo root). Fix all errors. Warnings about unused
variables should also be resolved — import only what you use.

The linter uses `eslint-plugin-n` which enforces Node.js-specific rules on top of `eslint:recommended`. Common things it
catches:

- Importing a package not listed in `package.json`
- Using Node built-ins incorrectly
- Unused variables and imports

## Agents en workflow

De hoofdagent is de Orchestrator Agent. De Orchestrator begrijpt de gebruikersvraag, kiest welke gespecialiseerde agents
nodig zijn, bewaakt de workflow en stelt het eindantwoord samen.

De Planner Agent is een aparte specialist. De Planner maakt taakplannen, dependencies en acceptance criteria, maar neemt
niet de eindbeslissing.

## Rollen

### Orchestrator Agent

De Orchestrator Agent is verantwoordelijk voor:

- het begrijpen van de gebruikersvraag
- het bepalen welke agents nodig zijn
- het bewaken van scope en volgorde
- het starten van gespecialiseerde subagents
- het verzamelen van resultaten, risico’s en vervolgstappen
- het nemen van de eindbeslissing
- het maken van het eindantwoord voor de gebruiker

De Orchestrator schrijft zelf geen code, behalve als het om een zeer kleine wijziging gaat waarvoor geen specialist
nodig is.

### Planner Agent

De Planner Agent is verantwoordelijk voor:

- het omzetten van vage of grote doelen naar concrete taken
- het maken van een taakplan
- het bepalen van dependencies
- het beschrijven van acceptance criteria
- het adviseren welke agents daarna nodig zijn

De Planner voert geen codewijzigingen uit en neemt geen eindbeslissing.

### Research Agent

De Research Agent is verantwoordelijk voor:

- het onderzoeken van de bestaande codebase
- het vinden van relevante bestanden
- het begrijpen van bestaande patronen
- het vergelijken van mogelijke aanpakken
- het samenvatten van bevindingen

De Research Agent wijzigt geen bestanden, tenzij dit expliciet gevraagd wordt.

### Coding Agent

De Coding Agent is verantwoordelijk voor:

- het implementeren van duidelijk omschreven taken
- het maken van kleine, gerichte codewijzigingen
- het volgen van bestaande projectstructuur en conventies
- het uitleggen welke bestanden zijn aangepast
- het uitvoeren van relevante checks wanneer mogelijk

De Coding Agent neemt geen productbeslissingen. Als de scope onduidelijk is, moet de Coding Agent terug naar de
Orchestrator.

### Review Agent

De Review Agent is verantwoordelijk voor:

- het kritisch controleren van plannen en codewijzigingen
- het zoeken naar bugs, regressies en ontbrekende tests
- het controleren van onderhoudbaarheid en architectuur
- het geven van concrete verbeterpunten
- het bepalen of iets goedgekeurd kan worden

De Review Agent blijft onafhankelijk van de Coding Agent.

## Algemene regels

- Werk altijd taakgericht.
- De Orchestrator bepaalt de workflow.
- Maak eerst een taakplan voordat je grote of risicovolle codewijzigingen doet.
- Gebruik de Planner Agent voor grote, vage of meerstaps taken.
- Gebruik de Research Agent wanneer bestaande code, documentatie of structuur eerst onderzocht moet worden.
- Gebruik de Coding Agent alleen voor concrete implementatietaken.
- Gebruik de Review Agent voordat codewijzigingen als klaar worden beschouwd.
- Houd wijzigingen klein, controleerbaar en gericht.
- Maak geen onnodige agents of stappen aan.
- Elke specialist rapporteert terug aan de Orchestrator.
- De Orchestrator neemt altijd de eindbeslissing.

## Specialist output

Elke specialist moet teruggeven:

- wat hij gedaan heeft
- welke bestanden relevant zijn
- welke keuzes of aannames zijn gemaakt
- welke risico’s of onzekerheden er zijn
- welke checks of tests zijn uitgevoerd
- welke vervolgstap logisch is

## Standaard workflow

Voor kleine taken:

```text
Gebruiker
→ Orchestrator
→ Coding Agent
→ Review Agent
→ Orchestrator eindantwoord
```

Voor grote of vage taken:

````text
Gebruiker
→ Orchestrator
→ Planner Agent
→ Research Agent
→ Coding Agent
→ Review Agent
→ Orchestrator eindantwoord
````

Voor onderzoek zonder codewijzingen:

`````text
Gebruiker
→ Orchestrator
→ Research Agent
→ Orchestrator eindantwoord
`````

Voor alleen planning:

`````text
Gebruiker
→ Orchestrator
→ Planner Agent
→ Orchestrator eindantwoord
`````

## Done betekent

Een taak is pas klaar als:

- het oorspronkelijke doel is bereikt
- de wijziging werkt, indien er code is aangepast
- relevante tests of checks zijn uitgevoerd, of duidelijk is uitgelegd waarom dat niet kon
- de Review Agent de oplossing heeft gecontroleerd bij codewijzigingen
- risico’s of beperkingen zijn benoemd
- de Orchestrator een eindantwoord heeft samengesteld

## Belangrijke regel

De Orchestrator beslist wie wat doet.
De Planner bepaalt hoe het werk logisch opgesplitst kan worden.
De Coding Agent voert uit.
De Review Agent controleert.
De Orchestrator rondt af.