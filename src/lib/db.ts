import "server-only";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

// Local SQLite (via libSQL) for development. Before deploying for a live
// exhibition, switch this to a hosted database — see PROJECT_NOTES.md
// "Going live" section. Swapping to Turso's own hosted libSQL just means
// changing DATABASE_URL/DATABASE_AUTH_TOKEN, no code change here; swapping
// to Postgres (e.g. Neon) means swapping this adapter for @prisma/adapter-pg
// and changing prisma/schema.prisma's provider, same as the sibling
// Paper Lovers Studio project already does.
function createClient() {
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
