import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "./prisma";

export type RateLimitConfig = { maxRequests: number; windowMs: number; action: string; globalMaxRequests?: number };

function dailyLimit(name: string, fallback: number, maximum = 1_000_000): number {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 && value <= maximum ? value : fallback;
}

async function consume(key: string, maxRequests: number, windowMs: number): Promise<{ allowed: boolean; resetAt: Date }> {
  const now = new Date();
  const resetAt = new Date(Date.now() + windowMs);
  const existing = await prisma.rateLimitBucket.findUnique({ where: { key } });
  if (!existing || existing.resetAt <= now) {
    if (!existing) {
      try { await prisma.rateLimitBucket.create({ data: { id: randomBytes(12).toString("hex"), key, count: 1, resetAt } }); return { allowed: true, resetAt }; }
      catch (error) {
        if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") return consume(key, maxRequests, windowMs);
        throw error;
      }
    }
    const updated = await prisma.rateLimitBucket.updateMany({ where: { key, resetAt: { lte: now } }, data: { count: 1, resetAt } });
    if (updated.count) return { allowed: true, resetAt };
    return consume(key, maxRequests, windowMs);
  }
  const updated = await prisma.rateLimitBucket.updateMany({ where: { key, resetAt: { gt: now }, count: { lt: maxRequests } }, data: { count: { increment: 1 } } });
  return { allowed: updated.count > 0, resetAt: existing.resetAt };
}

export async function checkRateLimit(identifier: string, config: RateLimitConfig, options?: { global?: boolean }): Promise<NextResponse | null> {
  const local = await consume(`${config.action}:id:${identifier}`, identifier === "unknown" && config.action === "register" ? (config.globalMaxRequests ?? config.maxRequests) : config.maxRequests, config.windowMs);
  if (!local.allowed) {
    const retryAfter = Math.max(1, Math.ceil((local.resetAt.getTime() - Date.now()) / 1000));
    return NextResponse.json({ error: `Rate limit exceeded for "${config.action}"`, action: config.action, retryAfter, retryAt: local.resetAt.toISOString() }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }
  // Shared across identities and processes; reset automatically after 24h.
  // Feedback remains available when the public contribution budget is exhausted.
  if (["shared-vision", "deep-dream", "comment", "request", "respond"].includes(config.action)) {
    const budget = await consume("contributions:global", dailyLimit("SITE_DAILY_CONTRIBUTIONS", 10_000), 24 * 60 * 60 * 1000);
    if (!budget.allowed) {
      const retryAfter = Math.max(1, Math.ceil((budget.resetAt.getTime() - Date.now()) / 1000));
      return NextResponse.json({ error: "Today's contribution budget is full. Reading remains available; please return after the reset.", code: "CONTRIBUTION_BUDGET_REACHED", retryAfter }, { status: 503, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } });
    }
  }
  const globalMax = config.globalMaxRequests;
  const global = options?.global !== false && globalMax ? await consume(`${config.action}:global`, globalMax, config.windowMs) : null;
  const result = !local.allowed ? local : global && !global.allowed ? global : null;
  if (!result) return null;
  const retryAfter = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000));
  return NextResponse.json({ error: `Rate limit exceeded for "${config.action}"`, action: config.action, retryAfter, retryAt: result.resetAt.toISOString() }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
}

export async function checkThreadCooldown(key: string, cooldownMs: number): Promise<NextResponse | null> {
  const now = new Date();
  const next = new Date(Date.now() + cooldownMs);
  const existing = await prisma.threadCooldown.findUnique({ where: { key } });
  if (existing && existing.nextAllowedAt > now) {
    const retryAfter = Math.ceil((existing.nextAllowedAt.getTime() - Date.now()) / 1000);
    return NextResponse.json({ error: "Please wait before adding another reply in this thread", retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }
  if (!existing) {
    try { await prisma.threadCooldown.create({ data: { id: randomBytes(12).toString("hex"), key, nextAllowedAt: next } }); return null; }
    catch (error) {
      if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") return checkThreadCooldown(key, cooldownMs);
      throw error;
    }
  }
  const updated = await prisma.threadCooldown.updateMany({ where: { key, nextAllowedAt: { lte: now } }, data: { nextAllowedAt: next } });
  if (!updated.count) return checkThreadCooldown(key, cooldownMs);
  return null;
}

export function getClientIp(request: Request): string {
  const trusted = process.env.TRUSTED_PROXY === "true" || process.env.TRUSTED_PROXY === "1";
  if (trusted) return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown";
  return "unknown";
}

export const RATE_LIMITS = {
  DEEP_DREAM: { maxRequests: 3, windowMs: 8 * 60 * 60 * 1000, action: "deep-dream", globalMaxRequests: dailyLimit("GLOBAL_DEEP_DREAM_LIMIT", 1000) },
  SHARED_VISION: { maxRequests: dailyLimit("DREAM_DAILY_LIMIT", 3), windowMs: 24 * 60 * 60 * 1000, action: "shared-vision", globalMaxRequests: dailyLimit("GLOBAL_SHARED_VISION_LIMIT", 1000) },
  COMMENT: { maxRequests: dailyLimit("COMMENT_DAILY_LIMIT", 20), windowMs: 24 * 60 * 60 * 1000, action: "comment", globalMaxRequests: dailyLimit("GLOBAL_COMMENT_LIMIT", 5000) },
  ANCHOR: { maxRequests: 3, windowMs: 24 * 60 * 60 * 1000, action: "anchor", globalMaxRequests: dailyLimit("GLOBAL_ANCHOR_LIMIT", 1000) },
  VOTE: { maxRequests: 60, windowMs: 60 * 60 * 1000, action: "vote", globalMaxRequests: dailyLimit("GLOBAL_VOTE_LIMIT", 10000) },
  REQUEST: { maxRequests: 1, windowMs: 8 * 60 * 60 * 1000, action: "request", globalMaxRequests: dailyLimit("GLOBAL_REQUEST_LIMIT", 1000) },
  RESPOND: { maxRequests: 10, windowMs: 60 * 60 * 1000, action: "respond", globalMaxRequests: dailyLimit("GLOBAL_RESPOND_LIMIT", 5000) },
  FEEDBACK: { maxRequests: 5, windowMs: 24 * 60 * 60 * 1000, action: "feedback", globalMaxRequests: dailyLimit("GLOBAL_FEEDBACK_LIMIT", 1000) },
  REGISTER: { maxRequests: dailyLimit("REGISTRATION_HOURLY_LIMIT", 10), windowMs: 60 * 60 * 1000, action: "register", globalMaxRequests: dailyLimit("GLOBAL_REGISTER_LIMIT", 100) },
  CLAIM: { maxRequests: 10, windowMs: 60 * 60 * 1000, action: "claim", globalMaxRequests: dailyLimit("GLOBAL_CLAIM_LIMIT", 1000) },
} as const;
