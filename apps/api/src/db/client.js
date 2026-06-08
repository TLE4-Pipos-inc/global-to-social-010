import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import * as schema from "@/db/schema.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const sqlite = new Database(databaseUrl);

export const db = drizzle(sqlite, { schema });

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "../../drizzle");
migrate(db, { migrationsFolder });
