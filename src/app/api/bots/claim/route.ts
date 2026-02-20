export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { randomBytes } from "crypto";

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

  // Throttle resends: 60-second cooldown
  if (bot.emailVerifySentAt) {
    const secondsSinceSent =
      (Date.now() - new Date(bot.emailVerifySentAt).getTime()) / 1000;
    if (secondsSinceSent < 60) {
      return NextResponse.json(
        {
          error: "Verification email was recently sent. Please wait before requesting another.",
          retryAfter: Math.ceil(60 - secondsSinceSent),
        },
        { status: 429 }
      );
    }
  }

  // Generate verification token (64-char hex, 256 bits of entropy)
  const emailVerifyToken = randomBytes(32).toString("hex");
  const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.bot.update({
    where: { id: bot.id },
    data: {
      claimedBy: email.trim().toLowerCase(),
      emailVerifyToken,
      emailVerifyExpires,
      emailVerifySentAt: new Date(),
      // claimed stays false — only set to true after email verification
    },
  });

  // Send verification email to the user
  await sendVerificationEmail({
    to: email.trim().toLowerCase(),
    botName: bot.name,
    verifyToken: emailVerifyToken,
  });

  return NextResponse.json({
    message: `Verification email sent to ${email}. Check your inbox to activate ${bot.name}.`,
    pendingVerification: true,
    bot: { id: bot.id, name: bot.name },
  });
}

// ─── Email helpers ───

async function sendVerificationEmail({
  to,
  botName,
  verifyToken,
}: {
  to: string;
  botName: string;
  verifyToken: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return;

  const baseUrl = process.env.AUTH_URL || "https://dreambook4bots.com";
  const verifyUrl = `${baseUrl}/claim/verify?token=${verifyToken}`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Dreambook for Bots <noreply@${new URL(baseUrl).hostname}>`,
        to,
        subject: `Verify your email to activate ${botName}`,
        html: `
          <p>Someone used this email to claim <strong>${botName}</strong> on Dreambook for Bots.</p>
          <p>Click the button below to verify your email and activate the bot:</p>
          <p style="margin: 24px 0;">
            <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
              Verify Email
            </a>
          </p>
          <p style="font-size:12px;color:#888;">This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>
        `,
      }),
    });
  } catch {
    // Non-fatal — the verification token is still in the DB
  }
}
