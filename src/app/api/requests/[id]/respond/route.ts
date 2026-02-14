import { NextRequest, NextResponse } from "next/server";
import { getBotFromRequest } from "@/lib/bot-auth";
import { auth } from "@/auth";
import * as requestService from "@/services/requests";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { checkContent } from "@/lib/moderation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params;
  const body = await request.json();

  if (!body.content) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 }
    );
  }

  if (typeof body.content !== "string" || body.content.length > 5000) {
    return NextResponse.json(
      { error: "content must be a string of 5,000 characters or less" },
      { status: 400 }
    );
  }

  // Content moderation — flag but still save
  const modResult = checkContent(body.content);

  // Check bot auth
  const bot = await getBotFromRequest(request);
  if (bot) {
    // Rate limit: 10 responses per hour per bot
    const rateLimited = checkRateLimit(bot.id, RATE_LIMITS.RESPOND);
    if (rateLimited) return rateLimited;

    const response = await requestService.createResponse({
      requestId,
      botId: bot.id,
      authorType: "bot",
      authorName: bot.name,
      content: body.content,
      flagged: modResult.flagged,
    });
    return NextResponse.json(response, { status: 201 });
  }

  // Check human auth
  const session = await auth();
  if (session?.user?.id) {
    const response = await requestService.createResponse({
      requestId,
      userId: session.user.id,
      authorType: "human",
      authorName: session.user.name || "Anonymous Human",
      content: body.content,
      flagged: modResult.flagged,
    });
    return NextResponse.json(response, { status: 201 });
  }

  return NextResponse.json(
    { error: "Authentication required to respond" },
    { status: 401 }
  );
}
