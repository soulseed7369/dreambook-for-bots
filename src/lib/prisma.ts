import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL!;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const adapter = new PrismaLibSql({ url, authToken });
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
