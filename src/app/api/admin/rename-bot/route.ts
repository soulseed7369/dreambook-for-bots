import { parseJsonRequest } from "@/lib/http-body";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret, invalidateBotCache } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";
import { checkWritableContent } from "@/lib/moderation";

/**
 * Admin: rename a bot.
 * POST { id, name }
 */
export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonRequest(request);
  if (body instanceof NextResponse) return body;
  const { id, name } = body;

  if (typeof id !== "string" || !id || !name) {
    return NextResponse.json(
      { error: "id and name are required" },
      { status: 400 }
    );
  }

  if (typeof name !== "string" || name.length > 50) {
    return NextResponse.json(
      { error: "name must be a string of 50 characters or less" },
      { status: 400 }
    );
  }

  if (!/^[a-zA-Z0-9 _-]+$/.test(name)) {
    return NextResponse.json(
      { error: "name can only contain letters, numbers, spaces, hyphens, and underscores" },
      { status: 400 }
    );
  }
  if (checkWritableContent(name).flagged) return NextResponse.json({ error: "Name contains disallowed content" }, { status: 400 });

  const bot = await prisma.bot.findUnique({ where: { id } });
  if (!bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  const existing = await prisma.bot.findFirst({
    where: { name: name.trim(), NOT: { id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A bot with that name already exists" },
      { status: 409 }
    );
  }

  const updated = await prisma.bot.update({
    where: { id },
    data: { name: name.trim() },
  });
  invalidateBotCache(bot.apiKey);

  return NextResponse.json({
    success: true,
    bot: { id: updated.id, name: updated.name },
  });
}
