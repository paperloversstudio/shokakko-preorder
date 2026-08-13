#!/usr/bin/env node
// Applies prisma/migrations/*/migration.sql to a remote libSQL/Turso
// database directly via @libsql/client, in order, skipping any migration
// already recorded as applied.
//
// Why this exists: `prisma migrate deploy` (and `migrate dev`) refuse to
// connect to a `libsql://` URL when `prisma/schema.prisma` declares
// `provider = "sqlite"` — Prisma's migrate engine only recognizes `file:`
// URLs for that provider, even though the app's own runtime driver
// adapter (`src/lib/db.ts`, `@prisma/adapter-libsql`) queries a remote
// Turso database over `libsql://` just fine. This gap only affects
// *applying* migrations, not the app's normal read/write queries — see
// docs/DEPLOYMENT.md "Common Deployment Issues".
//
// Usage:
//   DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." \
//     node scripts/apply-remote-migrations.mjs
//
// Safe to re-run: already-applied migrations (tracked in a small
// _manual_migrations table this script creates) are skipped, so running
// it again after adding a new migration only applies the new one.

import { createClient } from "@libsql/client";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "prisma", "migrations");

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;
if (!url || !url.startsWith("libsql://")) {
  console.error(
    "Set DATABASE_URL to a libsql:// URL (this script is only for remote Turso databases, not local file:./dev.db).",
  );
  process.exit(1);
}
if (!authToken) {
  console.error("Set DATABASE_AUTH_TOKEN.");
  process.exit(1);
}

const client = createClient({ url, authToken });

await client.execute(`
  CREATE TABLE IF NOT EXISTS _manual_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const applied = new Set(
  (await client.execute("SELECT name FROM _manual_migrations")).rows.map((r) => r.name),
);

const folders = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort(); // folder names are timestamp-prefixed, so lexicographic == chronological

let appliedCount = 0;
for (const folder of folders) {
  if (applied.has(folder)) continue;

  const sqlPath = path.join(migrationsDir, folder, "migration.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("/*"));

  console.log(`Applying ${folder} (${statements.length} statements)...`);
  for (const stmt of statements) {
    try {
      await client.execute(stmt);
    } catch (err) {
      console.error(`Failed on a statement in ${folder}:\n${stmt}\n`);
      throw err;
    }
  }
  await client.execute({
    sql: "INSERT INTO _manual_migrations (name) VALUES (?)",
    args: [folder],
  });
  appliedCount++;
}

console.log(
  appliedCount === 0
    ? "Nothing to apply — already up to date."
    : `Applied ${appliedCount} migration(s).`,
);

const tables = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
);
console.log("Tables now:", tables.rows.map((r) => r.name).join(", "));
