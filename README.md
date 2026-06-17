# Mono repo for TLE 4

Start developing

```bash
# Install dependencies
pnpm install
# Run the development server
pnpm run dev:api
pnpm run dev:mobile

# Test locally using a tunnel
# Make an account and get your token here
# https://dashboard.ngrok.com/get-started/your-authtoken
# Run this command in the api folder
npx ngrok config add-authtoken <your-token>
# Then start the tunnel by running
pnpm run dev:tunnel
# Paste the url into constants/api.js in the front end and you're good to go!
# /apps/mobile/constants/api.js
```

## Deployment

Two apps deploy independently to Coolify, each with its own Dockerfile and guide:

- **API** — root `Dockerfile`, see [apps/api/README.md](./apps/api/README.md)
- **Website** — `apps/web/Dockerfile`, see [apps/web/README.md](./apps/web/README.md)

## Docs

- [Project Structure](./docs/project-structure.md)
- [Conventions](./docs/conventions.md)
- [Form](./docs/form.md) _Can be incorrect_
- [Query](./docs/query.md) _Can be incorrect_
