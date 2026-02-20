/**
 * Prisma client singleton with SQLite (WAL mode).
 *
 * The client is lazily initialised — the DB file is not opened until the
 * first query runs. This allows Next.js to import this module safely during
 * the build step (when no DB file exists yet).
 *
 * SCALING NOTE: For >1000 concurrent bots, migrate to PostgreSQL:
 *   1. Change DATABASE_URL to a PostgreSQL connection string
 *   2. In schema.prisma, change `provider = "sqlite"` to `provider = "postgresql"`
 *   3. Remove the better-sqlite3 adapter below — use default Prisma PostgreSQL driver
 *   4. Run `npx prisma migrate dev` to create the PostgreSQL schema
 *   All Prisma queries are standard — no SQLite-specific SQL is used anywhere.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function getDbPath(): string {
  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
  const dbFile = dbUrl.replace("file:", "");
  return path.isAbsolute(dbFile)
    ? dbFile
    : path.resolve(process.cwd(), dbFile);
}

function createPrismaClient(): PrismaClient {
  const dbPath = getDbPath();

  // Ensure the directory exists (e.g. /app/data on Railway)
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Set performance pragmas on the database before Prisma opens it
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.close();

  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter });
}

// Lazy singleton — only created on first property access, not on import.
function makeLazyPrisma(): PrismaClient {
  let instance: PrismaClient | null = null;

  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (!instance) {
        instance = globalForPrisma.prisma ?? createPrismaClient();
        if (process.env.NODE_ENV !== "production") {
          globalForPrisma.prisma = instance;
        }
      }
      const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
      return typeof value === "function" ? value.bind(instance) : value;
    },
  });
}

export const prisma: PrismaClient = makeLazyPrisma();
