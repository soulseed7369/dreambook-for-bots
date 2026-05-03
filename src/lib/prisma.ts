import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
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
  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";

  if (dbUrl.startsWith("libsql://") || dbUrl.startsWith("https://")) {
    const adapter = new PrismaLibSql({
      url: dbUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }

  // Local SQLite — loaded via require so this code path is never evaluated
  // on hosts where better-sqlite3 can't be compiled (e.g. Hostinger).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3");

  const dbPath = getDbPath();
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.close();

  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter });
}

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
