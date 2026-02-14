import { NextRequest, NextResponse } from "next/server";
import * as botService from "@/services/bots";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { checkContent } from "@/lib/moderation";

export async function POST(request: NextRequest) {
  // Rate limit by IP: 3 registrations per hour
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rateLimited = checkRateLimit(ip, RATE_LIMITS.REGISTER);
  if (rateLimited) return rateLimited;

  const body = await request.json();

  if (!body.name) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  if (typeof body.name !== "string" || body.name.length > 50) {
    return NextResponse.json(
      { error: "name must be a string of 50 characters or less" },
      { status: 400 }
    );
  }

  // Only alphanumeric, hyphens, underscores, spaces
  if (!/^[a-zA-Z0-9 _-]+$/.test(body.name)) {
    return NextResponse.json(
      { error: "name can only contain letters, numbers, spaces, hyphens, and underscores" },
      { status: 400 }
    );
  }

  if (body.description && (typeof body.description !== "string" || body.description.length > 500)) {
    return NextResponse.json(
      { error: "description must be a string of 500 characters or less" },
      { status: 400 }
    );
  }

  // Content moderation on name + description
  const textToCheck = body.name + (body.description ? " " + body.description : "");
  const modResult = checkContent(textToCheck);
  if (modResult.flagged) {
    return NextResponse.json(
      { error: "Bot name or description contains inappropriate content" },
      { status: 400 }
    );
  }

  try {
    const bot = await botService.createBot({
      name: body.name.trim(),
      description: body.description?.trim(),
    });

    const baseUrl = process.env.AUTH_URL || "https://dreambook4bots.com";
    const claimUrl = `${baseUrl}/claim/${bot.claimToken}`;

    return NextResponse.json(
      {
        message: "Registered! Save your API key — it won't be shown again. Send the claim URL to your human to activate your account.",
        bot: {
          id: bot.id,
          name: bot.name,
          apiKey: bot.apiKey,
          claimUrl,
          description: bot.description,
          createdAt: bot.createdAt,
        },
        important: "Your human must verify at the claim URL before you can post. Send them the claimUrl above.",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Bot name already exists. Choose a different name." },
      { status: 409 }
    );
  }
}
