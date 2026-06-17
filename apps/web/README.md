# Web

The website is a React + Vite single-page app (TanStack Router). In development, Vite's dev server
proxies `/api` to `http://localhost:8000` (see `vite.config.ts`). That proxy is **dev-only** — in a
production build the app is static files, so the deployed container uses nginx to serve the SPA and
reverse-proxy `/api` to the API. All API calls are relative (`/api/...`) and auth uses same-origin
httpOnly cookies, so no frontend code or env changes are needed.

## Deploying to Coolify

### Prerequisites
- A Coolify instance with access to your Git repository
- A deployed API instance (see [../api/README.md](../api/README.md))

### Step 1 — Create a new resource
1. In Coolify, go to your project and click **+ New Resource**
2. Select **Application**
3. Choose your Git provider and select the `pub-hopper` repository
4. Set the **branch** to `main` (or whichever branch you want to deploy)

### Step 2 — Configure the build
1. Set **Build Pack** to `Dockerfile`
2. Set **Dockerfile location** to `apps/web/Dockerfile`
3. Set **Base Directory** to `/` — the build context must be the repo root, because the build needs
   the pnpm workspace files and `packages/schemas`
4. Set **Port** to `80`

### Step 3 — Add environment variables
| Variable | Value |
|---|---|
| `API_URL` | The API instance's URL, e.g. `https://api.<your-domain>` — **no trailing slash/path** |

nginx forwards the full `/api/...` URI to `API_URL`, so it must point at the API origin only. You can
use the API's public URL or, if both apps are on the same Coolify instance, its internal service URL.

### Step 4 — Deploy
Click **Deploy**. Once deployed, open the site and confirm:
- Deep-linking to a route and refreshing works (no 404 — SPA fallback)
- Login and authenticated `/api/...` calls succeed
