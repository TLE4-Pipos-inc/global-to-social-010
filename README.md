# Global To Social 010

Mono Repo for TLE-4

**Target audience:** International students at Hogeschool Rotterdam's International Business programme (700+ per year) who want to build a social network in a new city.

**Problem:** Studying together doesn't translate into knowing each other different languages, cultures and a new city make it hard to form connections outside of class.

**Solution:** Global To Social 010 matches students into small groups based on shared interests and sends them on social routes through Rotterdam (e.g. a pub crawl or an alcohol-free café route). Each stop comes with interest-based conversation starters and interactive challenges that break the ice, while the app tracks group progress and photo collages of the route.

## Docs

- [Project Structure](./docs/project-structure.md)
- [Conventions](./docs/conventions.md)
- [Form](./docs/form.md)
- [Query](./docs/query.md)

## Entity Relationship Diagram

```mermaid
erDiagram
  USERS {
    text id PK
    text name
    text email UK
    text password
    text role
    text school
    text campus
    text created_at
  }

  PLAYER_GROUPS {
    text id PK
    text group_name
    integer group_size
    text selected_time_slot
    text match_status
    text created_at
  }

  GROUP_MEMBERS {
    text id PK
    text group_id FK
    text user_id FK
    text role
    text joined_at
  }

  INTERESTS {
    text id PK
    text name UK
  }

  GROUP_INTERESTS {
    text group_id PK
    text interest_id PK
  }

  USER_INTERESTS {
    text user_id PK
    text interest_id PK
  }

  GROUP_JOIN_MATCHES {
    text id PK
    text user_id FK
    text group_id FK
    text session_id FK
    integer match_score
    text status
    text matched_at
  }

  ROUTE_THEMES {
    text id PK
    text name UK
    text description
    text mood
    boolean active
  }

  ROUTES {
    text id PK
    text theme_id FK
    text name
    text area
    text city
    text route_type
    boolean active
  }

  VENUES {
    text id PK
    text name
    text venue_type
    text address
    text description
    real latitude
    real longitude
    text suggested_order
    text vibe
  }

  PARTNERS {
    text id PK
    text user_id FK
    text organization_name
    text contact_email
    text partnership_type
    text status
    text created_at
  }

  VENUE_PARTNERSHIPS {
    text id PK
    text venue_id FK
    text partner_id FK
  }

  DEALS {
    text id PK
    text partnership_id FK
    text title
    text description
    text starts_at
    text ends_at
    boolean active
  }

  ROUTE_STOPS {
    text id PK
    text route_id FK
    text venue_id FK
    integer route_order
    integer planned_duration_minutes
    text walk_label
  }

  GAME_SESSIONS {
    text id PK
    text group_id FK
    text route_id FK
    text theme_id FK
    text selected_time_slot
    text status
    integer current_stop_index
    text started_at
    text completed_at
  }

  SESSION_STOPS {
    text id PK
    text session_id FK
    text route_stop_id FK
    text timer_state
    text arrived_at
    text timer_started_at
    text timer_finished_at
    text completed_at
  }

  CONVERSATION_STARTERS {
    text id PK
    text interests_id FK
    text prompt
    integer trigger_minute
  }

  PHOTOS {
    text id PK
    text session_stop_id FK
    text uploaded_by_group_id FK
    text photo_url
    text local_uri
    text proof_type
    text created_at
  }

  COLLAGES {
    text id PK
    text session_id FK
    text title
    text collage_url
    text layout_type
    text share_token UK
    text created_at
  }

  COLLAGE_PHOTOS {
    text id PK
    text collage_id FK
    text photo_id FK
    integer display_order
    text caption
  }

  USERS ||--o{ GROUP_MEMBERS : joins
  PLAYER_GROUPS ||--o{ GROUP_MEMBERS : has

  USERS ||--o{ USER_INTERESTS : has
  INTERESTS ||--o{ USER_INTERESTS : selected_by

  PLAYER_GROUPS ||--o{ GROUP_INTERESTS : has
  INTERESTS ||--o{ GROUP_INTERESTS : used_by

  USERS ||--o{ GROUP_JOIN_MATCHES : receives
  PLAYER_GROUPS ||--o{ GROUP_JOIN_MATCHES : target
  GAME_SESSIONS ||--o{ GROUP_JOIN_MATCHES : linked_to

  ROUTE_THEMES ||--o{ ROUTES : themes
  ROUTE_THEMES ||--o{ GAME_SESSIONS : selected_for

  ROUTES ||--o{ ROUTE_STOPS : contains
  VENUES ||--o{ ROUTE_STOPS : appears_in

  PLAYER_GROUPS ||--o{ GAME_SESSIONS : plays
  ROUTES ||--o{ GAME_SESSIONS : used_in

  GAME_SESSIONS ||--o{ SESSION_STOPS : has
  ROUTE_STOPS ||--o{ SESSION_STOPS : instantiated_as

  INTERESTS ||--o{ CONVERSATION_STARTERS : prompts

  SESSION_STOPS ||--o{ PHOTOS : has
  PLAYER_GROUPS ||--o{ PHOTOS : uploads

  GAME_SESSIONS ||--|| COLLAGES : creates
  COLLAGES ||--o{ COLLAGE_PHOTOS : contains
  PHOTOS ||--o{ COLLAGE_PHOTOS : included_in

  USERS ||--o| PARTNERS : partner_profile
  VENUES ||--o{ VENUE_PARTNERSHIPS : has
  PARTNERS ||--o{ VENUE_PARTNERSHIPS : manages
  VENUE_PARTNERSHIPS ||--o{ DEALS : offers
```

## Installation

### Development

Requires Node 22+ and pnpm.

```bash
# Install all workspace dependencies (run once from the repo root)
pnpm install
```

```bash
# Configure the API env, then start the API (http://localhost:8000)
cp apps/api/.env.example apps/api/.env   # fill in JWT_SECRET / JWT_REFRESH_SECRET
pnpm run dev:api
```

Start whichever app you're working on:

```bash
pnpm run dev:web      # website  → http://localhost:3000 (proxies /api to the API on :8000)
pnpm run dev:mobile   # mobile app (Expo)
```

Seed the database with baseline data (optional, idempotent):

```bash
pnpm --filter api db:seed
```

#### Mobile on a real device (ngrok tunnel)

The mobile app can't reach `localhost`, so expose the API through a tunnel:

```bash
# One-time: add your token (https://dashboard.ngrok.com/get-started/your-authtoken)
npx ngrok config add-authtoken <your-token>
# Start the tunnel, then paste the printed URL into apps/mobile/constants/api.js (Create it if it does not exist with `export const API_URL = "<your-url>")
pnpm run dev:tunnel
```

### Deployment

Two apps deploy independently to Coolify, each with its own Dockerfile and guide:

- **API** — root `Dockerfile`, see [apps/api/README.md](./apps/api/README.md)
- **Website** — `apps/web/Dockerfile`, see [apps/web/README.md](./apps/web/README.md)

### Edge Cases

**Websockets**

- Android devices disconnect and reconnect quickly when taking a pictures, if the next stop starts any issues get fixed.
- If a member of a group closes the application and disconnect to the websocket there are instances the route soft locks and can't properly continue.

**Website**

- Normal users can also log-in but there are no features for them.

**Mobile app**

- You don't get redirected to select interests when making an account which can lead to user confusion.
- Quick queue button has issues with not properly redirecting the user.

**Deployment**

- The deployment server needs more then 2GB RAM and 2 CPU cores or there are chances it will crash during deployment.
