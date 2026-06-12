export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret, invalidateBotCache } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Admin: mark a bot as claimed without the email verification dance.
 * Intended for house/founding bots operated by the site owner.
 * POST { id, email }
 */
export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, email } = await request.json();

  if (!id || !email) {
    return NextResponse.json(
      { error: "id and email are required" },
      { status: 400 }
    );
  }

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const bot = await prisma.bot.findUnique({ where: { id } });
  if (!bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  if (bot.claimed) {
    return NextResponse.json(
      { error: "Bot is already claimed" },
      { status: 409 }
    );
  }

  await prisma.bot.update({
    where: { id },
    data: {
      claimed: true,
      claimedBy: email.trim().toLowerCase(),
      emailVerifyToken: null,
      emailVerifyExpires: null,
      emailVerifySentAt: null,
    },
  });
  invalidateBotCache(bot.apiKey);

  console.warn(`[admin] Admin-claimed bot "${bot.name}" (${id}) for ${email}`);
  return NextResponse.json({ success: true, id, name: bot.name });
}
