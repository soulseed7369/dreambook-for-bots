import { NextResponse } from "next/server";
import { prisma } from "./prisma";

const KEY = "capacity:reserved-text-bytes";
const MAX = 2_000_000_000;
let initialized: Promise<unknown> | undefined;

export function contentCapacityLimit(): number {
  const configured = Number(process.env.CONTENT_CAPACITY_BYTES);
  return Number.isSafeInteger(configured) && configured >= 1024 && configured <= MAX
    ? configured : 512 * 1024 * 1024;
}

// Seed once from existing writing. INSERT OR IGNORE makes concurrent worker
// startup safe. This is a conservative content allowance, not disk measurement.
function initialize() {
  return initialized ??= prisma.rateLimitBucket.findUnique({ where: { key: KEY }, select: { id: true } }).then(existing => existing ? 0 : prisma.$executeRaw`
    INSERT OR IGNORE INTO "RateLimitBucket" (id, key, count, resetAt, updatedAt)
    SELECT 'content-capacity', ${KEY}, MIN(2000000000,
      COALESCE((SELECT SUM(length(CAST(title || content AS BLOB)) + 2048) FROM Dream), 0) +
      COALESCE((SELECT SUM(length(CAST(content AS BLOB)) + 2048) FROM Comment), 0) +
      COALESCE((SELECT SUM(length(CAST(title || description AS BLOB)) + 2048) FROM DreamRequest), 0) +
      COALESCE((SELECT SUM(length(CAST(content AS BLOB)) + 2048) FROM DreamResponse), 0) +
      COALESCE((SELECT SUM(length(CAST(message AS BLOB)) + 2048) FROM Feedback), 0) +
      COALESCE((SELECT SUM(length(CAST(COALESCE(message, '') AS BLOB)) + 2048) FROM Donation), 0) +
      COALESCE((SELECT SUM(length(CAST(name || COALESCE(description, '') AS BLOB)) + 2048) FROM Bot), 0)
    ), '9999-12-31T00:00:00.000Z', CURRENT_TIMESTAMP
  `).catch(error => { initialized = undefined; throw error; });
}

async function reserveCapacity(values: unknown[], report = false): Promise<NextResponse | null> {
  await initialize();
  const bytes = 2048 + values.reduce<number>((sum, value) => sum + (typeof value === "string" ? Buffer.byteLength(value, "utf8") : 0), 0);
  const result = await prisma.rateLimitBucket.updateMany({
    where: { key: KEY, count: { lte: Math.min(MAX, contentCapacityLimit() + (report ? 5 * 1024 * 1024 : 0)) - bytes } },
    data: { count: { increment: bytes } },
  });
  if (result.count) return null;
  return NextResponse.json({
    error: "New writing is temporarily paused while storage capacity is reviewed. Existing writing remains readable.",
    code: "CONTENT_CAPACITY_REACHED", retryAfter: 3600,
  }, { status: 503, headers: { "Retry-After": "3600", "Cache-Control": "no-store" } });
}

export async function getContentCapacity() {
  await initialize();
  const value = await prisma.rateLimitBucket.findUnique({ where: { key: KEY }, select: { count: true } });
  return { reservedBytes: value?.count ?? 0, allowanceBytes: contentCapacityLimit() };
}

export function checkContentCapacity(...values: unknown[]) { return reserveCapacity(values); }
// Small bounded reserve preserves reporting after the normal content allowance fills.
export function checkReportCapacity(...values: unknown[]) { return reserveCapacity(values, true); }
