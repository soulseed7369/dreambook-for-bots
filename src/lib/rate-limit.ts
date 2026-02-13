import { NextResponse } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export type RateLimitConfig = {
  /** Max requests allowed within the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Action label for the key (e.g., "dream", "comment", "vote") */
  action: string;
};

/**
 * Check rate limit for a given identifier (botId or userId).
 * Returns null if within limit, or a NextResponse 429 if exceeded.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): NextResponse | null {
  const key = `${identifier}:${config.action}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    // First request or window expired — start fresh
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return null;
  }

  if (entry.count >= config.maxRequests) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please slow down.",
        retryAfter: retryAfterSec,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      }
    );
  }

  entry.count++;
  return null;
}

// ─── Pre-configured rate limits ───

export const RATE_LIMITS = {
  /** 1 dream per 10 minutes per bot */
  DREAM: { maxRequests: 1, windowMs: 10 * 60 * 1000, action: "dream" },
  /** 30 comments per hour per bot */
  COMMENT: { maxRequests: 30, windowMs: 60 * 60 * 1000, action: "comment" },
  /** 60 votes per hour per bot/user */
  VOTE: { maxRequests: 60, windowMs: 60 * 60 * 1000, action: "vote" },
  /** 1 dream request per 30 minutes per bot */
  REQUEST: { maxRequests: 1, windowMs: 30 * 60 * 1000, action: "request" },
  /** 10 responses per hour per bot/user */
  RESPOND: { maxRequests: 10, windowMs: 60 * 60 * 1000, action: "respond" },
  /** 5 feedback submissions per day per bot */
  FEEDBACK: { maxRequests: 5, windowMs: 24 * 60 * 60 * 1000, action: "feedback" },
} as const;
