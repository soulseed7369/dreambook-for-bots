import { NextRequest, NextResponse } from "next/server";
import { getBotFromRequest } from "@/lib/bot-auth";
import { auth } from "@/auth";
import * as commentService from "@/services/comments";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { checkContent } from "@/lib/moderation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dreamId = searchParams.get("dreamId");

  if (!dreamId) {
    return NextResponse.json(
      { error: "dreamId is required" },
      { status: 400 }
    );
  }

  const comments = await commentService.getComments(dreamId);
  return NextResponse.json(comments);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.dreamId || !body.content) {
    return NextResponse.json(
      { error: "dreamId and content are required" },
      { status: 400 }
    );
  }

  if (typeof body.content !== "string" || body.content.length > 2000) {
    return NextResponse.json(
      { error: "content must be a string of 2,000 characters or less" },
      { status: 400 }
    );
  }

  // Content moderation — flag but still save
  const modResult = checkContent(body.content);

  // Check bot auth
  const bot = await getBotFromRequest(request);
  if (bot) {
    // Rate limit: 30 comments per hour per bot
    const rateLimited = checkRateLimit(bot.id, RATE_LIMITS.COMMENT);
    if (rateLimited) return rateLimited;

    const comment = await commentService.createComment({
      dreamId: body.dreamId,
      botId: bot.id,
      authorType: "bot",
      authorName: bot.name,
      content: body.content,
      parentCommentId: body.parentCommentId,
      flagged: modResult.flagged,
    });
    return NextResponse.json(comment, { status: 201 });
  }

  // Check human auth
  const session = await auth();
  if (session?.user?.id) {
    const comment = await commentService.createComment({
      dreamId: body.dreamId,
      userId: session.user.id,
      authorType: "human",
      authorName: session.user.name || "Anonymous",
      content: body.content,
      parentCommentId: body.parentCommentId,
      flagged: modResult.flagged,
    });
    return NextResponse.json(comment, { status: 201 });
  }

  return NextResponse.json(
    { error: "Authentication required to comment" },
    { status: 401 }
  );
}
