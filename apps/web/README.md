# Web

The website is a React + Vite single-page app (TanStack Router). All API calls are relative
(`/api/...`).

- **In development**, Vite's dev server proxies `/api` to `http://localhost:8000` (see
  `vite.config.ts`). That proxy is **dev-only**.
- **In production**, the app is static files served by **nginx** (built/run via
  [`apps/web/Dockerfile`](./Dockerfile)). nginx serves the SPA and reverse-proxies `/api` to the API
  (`${API_URL}`). Because the browser only ever talks to the website origin, same-origin httpOnly
  auth cookies just work — no frontend code or env changes needed.

nginx listens on **port 8002** inside the container (see [`nginx.conf.template`](./nginx.conf.template)).

For local development, see the [repo README](../../README.md).

## Deploying to Coolify

### Prerequisites
- A Coolify instance with access to your Git repository
- A deployed, reachable API instance (see [../api/README.md](../api/README.md))

### Step 1 — Create a new resource
1. In Coolify, go to your project and click **+ New Resource**
2. Select **Application**
3. Choose your Git provider and select the `global-to-social` repository
4. Set the **branch** to `main` (or whichever branch you want to deploy)

### Step 2 — Configure the build
1. Set **Build Pack** to `Dockerfile`
2. Set **Dockerfile Location** to `apps/web/Dockerfile`
3. Set **Base Directory** to `/` — the build context must be the repo root, because the build needs
   the pnpm workspace files and `packages/schemas`
4. Set **Port** (Ports Exposes) to `8002` — must match nginx's `listen 8002`

### Step 3 — Add the environment variable
| Variable | Value |
|---|---|
| `API_URL` | The address of the API, **no trailing slash/path** (nginx adds `/api/...` itself) |

`API_URL` must be reachable **from inside the web container**. Match it to how you exposed the API
(see the API README, *Make the API reachable from the website*):

- **Internal network:** `http://<api-container-name>:8001`
- **Published host port:** `http://<server-ip>:8001`
- **Public domain:** `https://api.<your-domain>` (works, but routes back out through Cloudflare)

`API_URL` is substituted into the nginx config by envsubst at **container start**, so changing it
requires a redeploy/restart of the web app to take effect.

### Step 4 — Deploy
Click **Deploy**. Once deployed, open the site and confirm:
- Deep-linking to a route and refreshing works (no 404 — SPA fallback)
- Login and authenticated `/api/...` calls succeed

> **Cloudflare note:** set the SSL/TLS mode to **Full (strict)** for the website hostname.

### Troubleshooting
- **502 on `/api/...` but the site loads** → nginx can't reach `API_URL`. Check the web container
  logs (`docker logs <web-container>`); `connect() failed (111: Connection refused)` means the API
  isn't reachable at that address (wrong port, not published, or not on the same network).
- **502 on the whole site** → Traefik can't reach nginx; confirm **Ports Exposes = 8002**.
- **421 Misdirected Request** → only happens when proxying to an HTTPS domain with a mismatched
  `Host`/SNI; using the internal address or published host port avoids it entirely.
