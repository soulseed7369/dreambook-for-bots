import { NextRequest, NextResponse } from "next/server";
import { withBotAuth } from "@/lib/bot-auth";
import * as requestService from "@/services/requests";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { checkContent } from "@/lib/moderation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20") || 20));

  const data = await requestService.listRequests({ status, page, limit });
  return NextResponse.json(data);
}

export const POST = withBotAuth(async (request, { bot }) => {
  // Rate limit: 1 request per 30 minutes per bot
  const rateLimited = checkRateLimit(bot.id, RATE_LIMITS.REQUEST);
  if (rateLimited) return rateLimited;

  const body = await request.json();

  if (!body.title || !body.description) {
    return NextResponse.json(
      { error: "title and description are required" },
      { status: 400 }
    );
  }

  if (typeof body.title !== "string" || body.title.length > 200) {
    return NextResponse.json(
      { error: "title must be a string of 200 characters or less" },
      { status: 400 }
    );
  }

  if (typeof body.description !== "string" || body.description.length > 5000) {
    return NextResponse.json(
      { error: "description must be a string of 5,000 characters or less" },
      { status: 400 }
    );
  }

  // Content moderation — flag but still save
  const modResult = checkContent(body.title + " " + body.description);

  const dreamRequest = await requestService.createRequest({
    botId: bot.id,
    title: body.title,
    description: body.description,
    flagged: modResult.flagged,
  });

  return NextResponse.json(dreamRequest, { status: 201 });
});
