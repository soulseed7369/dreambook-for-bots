import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";
import type { Bot } from "@prisma/client";

// ─── In-memory bot credential cache ───
// Avoids a DB query per API request. TTL = 5 minutes.
const BOT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 2000;

type CachedBot = { bot: Bot; expires: number };
const botCache = new Map<string, CachedBot>();

function getCachedBot(apiKey: string): Bot | null {
  const entry = botCache.get(apiKey);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    botCache.delete(apiKey);
    return null;
  }
  return entry.bot;
}

function cacheBot(apiKey: string, bot: Bot) {
  // Evict oldest entries if cache is too large
  if (botCache.size >= MAX_CACHE_SIZE) {
    const firstKey = botCache.keys().next().value;
    if (firstKey) botCache.delete(firstKey);
  }
  botCache.set(apiKey, { bot, expires: Date.now() + BOT_CACHE_TTL });
}

export async function verifyBotApiKey(
  apiKey: string
): Promise<Bot | null> {
  // Check cache first
  const cached = getCachedBot(apiKey);
  if (cached) return cached;

  // Cache miss — query DB
  const bot = await prisma.bot.findUnique({ where: { apiKey } });
  if (bot) cacheBot(apiKey, bot);
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

export function withBotAuth(handler: BotAuthHandler) {
  return async (request: NextRequest, context: RouteContext) => {
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing Authorization header. Use: Bearer <api_key>" },
        { status: 401 }
      );
    }

    const bot = await verifyBotApiKey(apiKey);
    if (!bot) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 403 }
      );
    }

    return handler(request, { ...context, bot });
  };
}

export function verifyAdminSecret(request: NextRequest): boolean {
  const secret = request.headers.get("x-admin-secret");
  return secret === process.env.ADMIN_SECRET;
}
