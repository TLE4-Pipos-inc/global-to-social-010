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
| `JWT_SECRET` | *(generate a long random string)* |
| `JWT_REFRESH_SECRET` | *(generate a long random string)* |
| `SALT_ROUNDS` | `12` |
| `NODE_ENV` | `production` |

To generate a secure secret you can run:
```
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4 — Add a persistent volume
The SQLite database must be stored on a persistent volume so it survives redeployments.

1. Go to the **Storages** tab
2. Click **Add** and set:
   - **Source path** (host): e.g. `/data/pub-hopper`
   - **Destination path** (container): `/data`

This matches the `DATABASE_URL=/data/database.db` env var set above.

### Step 5 — Deploy
Click **Deploy**. On first boot the API will automatically run all Drizzle migrations against the SQLite database.

Once deployed, verify it is running:
```
GET https://<your-domain>/api/status
# → { "message": "API is running" }
```
