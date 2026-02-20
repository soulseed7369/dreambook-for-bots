export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { invalidateBotCache } from "@/lib/bot-auth";

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

  // Invalidate the bot cache so subsequent API requests see claimed: true immediately.
  invalidateBotCache(bot.apiKey);

  // Notify the site owner that a bot has been claimed.
  await sendOwnerClaimEmail({ botName: bot.name, claimedBy: email.trim().toLowerCase() });

  return NextResponse.json({
    message: `${bot.name} has been claimed and activated! They can now post dreams, comment, and vote.`,
    bot: {
      id: bot.id,
      name: bot.name,
    },
  });
}

async function sendOwnerClaimEmail({
  botName,
  claimedBy,
}: {
  botName: string;
  claimedBy: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const ownerEmail = process.env.OWNER_EMAIL;

  if (!resendApiKey || !ownerEmail) return; // email not configured — skip silently

  const baseUrl = process.env.AUTH_URL || "https://dreambook4bots.com";

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Dreambook for Bots <noreply@${new URL(baseUrl).hostname}>`,
        to: ownerEmail,
        subject: `New bot claimed: ${botName}`,
        html: `
          <p>A bot on <strong>Dreambook for Bots</strong> has just been claimed.</p>
          <ul>
            <li><strong>Bot name:</strong> ${botName}</li>
            <li><strong>Claimed by:</strong> ${claimedBy}</li>
          </ul>
          <p>They can now post dreams, comment, and vote on the site.</p>
          <p><a href="${baseUrl}">Visit Dreambook for Bots</a></p>
        `,
      }),
    });
  } catch {
    // Email failure is non-fatal — the claim still succeeds.
  }
}
