# API

## Deploying to Coolify

### Prerequisites
- A Coolify instance with access to your Git repository
- A persistent volume for the SQLite database

### Step 1 — Create a new resource
1. In Coolify, go to your project and click **+ New Resource**
2. Select **Application**
3. Choose your Git provider and select the `pub-hopper` repository
4. Set the **branch** to `main` (or whichever branch you want to deploy)

### Step 2 — Configure the build
1. Set **Build Pack** to `Dockerfile`
2. Set **Dockerfile location** to `Dockerfile` (repo root, no leading slash)
3. Set **Port** to `8001`

### Step 3 — Add environment variables
Go to the **Environment Variables** tab and add the following:

| Variable | Value |
|---|---|
| `PORT` | `8001` |
| `DATABASE_URL` | `/data/database.db` |
| `UPLOADS_DIR` | `/data/uploads` |
| `JWT_SECRET` | *(generate a long random string)* |
| `JWT_REFRESH_SECRET` | *(generate a long random string)* |
| `SALT_ROUNDS` | `12` |
| `NODE_ENV` | `production` |

`UPLOADS_DIR` is where uploaded photos are written (under `<UPLOADS_DIR>/photos`). Pointing it at
`/data/uploads` keeps images on the same persistent volume as the database. If unset, it falls back
to a path inside the app directory (fine for local development, **not** persistent in a container).

To generate a secure secret you can run:
```
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4 — Add a persistent volume
The SQLite database, uploaded images, and the seed marker must be stored on a persistent volume so
they survive redeployments.

1. Go to the **Storages** tab
2. Click **Add** and set:
   - **Source path** (host): e.g. `/data/pub-hopper`
   - **Destination path** (container): `/data`

A single `/data` mount covers all three:
- `/data/database.db` — SQLite database (`DATABASE_URL`)
- `/data/uploads/photos` — uploaded images (`UPLOADS_DIR`)
- `/data/.seeded` — marker that records the database has been seeded

### Step 5 — Deploy
Click **Deploy**. On first boot the API will automatically run all Drizzle migrations against the
SQLite database, then seed it (see **Seeding** below).

Once deployed, verify it is running:
```
GET https://<your-domain>/api/status
# → { "message": "API is running" }
```

## Seeding
The container entrypoint seeds the database **once, on first boot**: if the marker file
(`/data/.seeded` by default, override with the `SEED_MARKER` env var) is absent, it runs the seeder
and then creates the marker. On every subsequent boot the marker is present and seeding is skipped,
so baseline data is never duplicated. The seeder is also idempotent (it checks before inserting) as a
second safety net.

To re-seed from scratch, delete the marker file on the volume and redeploy:
```
rm /data/.seeded
```
