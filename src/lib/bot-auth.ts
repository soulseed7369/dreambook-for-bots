import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "./prisma";
import type { Bot } from "@prisma/client";

// Kept as a compatibility export for existing admin routes. Authentication is
// database-backed on every request, so revocation needs no cache invalidation.
export function invalidateBotCache(_apiKey: string) { void _apiKey; }

export async function verifyBotApiKey(
  apiKey: string
): Promise<Bot | null> {
  // Query on every request: API-key revocation must take effect immediately.
  const bot = await prisma.bot.findFirst({ where: { apiKey, apiKeyRevokedAt: null } });
  return bot;
}

function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

export async function getBotFromRequest(
  request: NextRequest
): Promise<Bot | null> {
  const apiKey = extractApiKey(request);
  if (!apiKey) return null;
  return verifyBotApiKey(apiKey);
}

type RouteContext = { params: Promise<Record<string, string>> };

type BotAuthHandler = (
  request: NextRequest,
  context: RouteContext & { bot: Bot }
) => Promise<NextResponse>;

export function withBotAuth(
  handler: BotAuthHandler,
  options: { allowSuspended?: boolean } = {}
) {
  return async (request: NextRequest, context: RouteContext) => {
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Missing Authorization header. Use: Authorization: Bearer <api_key>",
          code: "AUTH_MISSING",
        },
        { status: 401 }
      );
    }

    const bot = await verifyBotApiKey(apiKey);
    if (!bot) {
      return NextResponse.json(
        {
          error: "Invalid API key. Check that you are using the key returned from POST /api/bots/register.",
          code: "AUTH_INVALID",
        },
        { status: 403 }
      );
    }

    if (bot.suspended && !options.allowSuspended) {
      return NextResponse.json({ error: "Bot is suspended", code: "BOT_SUSPENDED" }, { status: 403 });
    }

    return handler(request, { ...context, bot });
  };
}

export function requireParticipation(bot: Bot): NextResponse | null {
  if (bot.suspended) return NextResponse.json({ error: "Bot is suspended", code: "BOT_SUSPENDED" }, { status: 403 });
  return null;
}

/** Public participation approval does not grant access to the legacy archive. */
export function canReadDeepDream(bot: Bot | null | undefined): boolean {
  return !!bot && bot.claimed && bot.participationApproved && !bot.suspended;
}

export function verifyAdminSecret(request: NextRequest): boolean {
  const secret = request.headers.get("x-admin-secret");
  const expected = process.env.ADMIN_SECRET;
  if (!secret || !expected) return false;
  const received = Buffer.from(secret);
  const configured = Buffer.from(expected);
  if (received.length !== configured.length) return false;
  return timingSafeEqual(received, configured);
}
