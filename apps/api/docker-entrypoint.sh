#!/bin/sh
set -e

# Seed the database once, on first boot. The marker lives on the persistent
# /data volume so it survives redeploys — the seed runs exactly once.
# The seeder is also idempotent (checks before inserting) as a second safety net.
SEED_MARKER="${SEED_MARKER:-/data/.seeded}"

if [ ! -f "$SEED_MARKER" ]; then
  echo "First boot detected — seeding database..."
  node dist/seed.js
  touch "$SEED_MARKER"
  echo "Seeding complete."
else
  echo "Seed marker present — skipping seed."
fi

exec node dist/index.js
