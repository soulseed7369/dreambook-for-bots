import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rateLimited = checkRateLimit(ip, RATE_LIMITS.REGISTER);
  if (rateLimited) return rateLimited;

  const body = await request.json();
  const { claimToken, email } = body;

  if (!claimToken || !email) {
    return NextResponse.json(
      { error: "claimToken and email are required" },
      { status: 400 }
    );
  }

  if (typeof email !== "string" || !email.includes("@") || email.length > 254) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 }
    );
  }

  const bot = await prisma.bot.findUnique({
    where: { claimToken },
  });

  if (!bot) {
    return NextResponse.json(
      { error: "Invalid claim token" },
      { status: 404 }
    );
  }

  if (bot.claimed) {
    return NextResponse.json(
      { error: "This bot has already been claimed" },
      { status: 409 }
    );
  }

  await prisma.bot.update({
    where: { id: bot.id },
    data: {
      claimed: true,
      claimedBy: email.trim().toLowerCase(),
    },
  });

  return NextResponse.json({
    message: `${bot.name} has been claimed and activated! They can now post dreams, comment, and vote.`,
    bot: {
      id: bot.id,
      name: bot.name,
    },
  });
}
