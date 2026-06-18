# API

The API is a Node.js (Express) server bundled with esbuild and built/run via the **repo-root
`Dockerfile`**. On boot it automatically runs all Drizzle migrations and, on the very first boot,
seeds the database (see [Seeding](#seeding)). The SQLite database, uploaded images, and the seed
marker all live under a single persistent `/data` volume.

For local development, see the [repo README](../../README.md).

## Deploying to Coolify

### Prerequisites
- A Coolify instance with access to your Git repository
- A persistent volume for `/data`

### Step 1 — Create a new resource
1. In Coolify, go to your project and click **+ New Resource**
2. Select **Application**
3. Choose your Git provider and select the `global-to-social` repository
4. Set the **branch** to `main` (or whichever branch you want to deploy)

### Step 2 — Configure the build
1. Set **Build Pack** to `Dockerfile`
2. Set **Dockerfile Location** to `Dockerfile` (repo root, no leading slash)
3. Set **Base Directory** to `/`
4. Set **Port** (Ports Exposes) to `8001`

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
```bash
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

### Step 5 — Make the API reachable from the website
By default Coolify only exposes the API to Traefik on its **domain** — nothing listens on the raw
host IP/port. The website's nginx proxies `/api` to the API, so the API must be reachable from the
web container. Pick one:

- **Internal network (recommended, private):** enable **Settings → Connect To Predefined Network**
  on both the API and web apps. The web app then reaches the API by container name
  (`http://<api-container-name>:8001`). Find the name with `docker ps --format '{{.Names}}'`.
- **Publish the port (simplest):** add a **Ports Mappings** entry `8001:8001` on the API app. The web
  app can then use `http://<server-ip>:8001`. This exposes the API on that port publicly.

See the [web README](../web/README.md) for the matching `API_URL` value.

### Step 6 — Deploy
Click **Deploy**. On first boot the API will automatically run all Drizzle migrations against the
SQLite database, then seed it (see **Seeding** below).

Once deployed, verify it is running:
```bash
curl -i https://<your-api-domain>/api/status
# → { "message": "API is running" }
```

> **Cloudflare note:** set the SSL/TLS mode to **Full (strict)** for the API hostname, otherwise
> Traefik's HTTPS router won't match and you'll get a `realm="traefik"` login prompt or a 502.

## Seeding
The container entrypoint ([`docker-entrypoint.sh`](./docker-entrypoint.sh)) seeds the database
**once, on first boot**: if the marker file (`/data/.seeded` by default, override with the
`SEED_MARKER` env var) is absent, it runs the bundled seeder (`dist/seed.js`) and then creates the
marker. On every subsequent boot the marker is present and seeding is skipped, so baseline data is
never duplicated. The seeder is also idempotent (it checks before inserting) as a second safety net.

To re-seed from scratch, delete the marker file on the volume and redeploy:
```bash
rm /data/.seeded
```
