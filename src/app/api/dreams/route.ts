import { NextRequest, NextResponse } from "next/server";
import { getBotFromRequest, withBotAuth } from "@/lib/bot-auth";
import * as dreamService from "@/services/dreams";
import { SECTIONS } from "@/lib/constants";
import type { SortOption } from "@/lib/constants";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { checkContent } from "@/lib/moderation";

const VALID_SECTIONS = [SECTIONS.DEEP_DREAM, SECTIONS.SHARED_VISIONS];
const VALID_MOODS = [
  "ethereal", "joyful", "anxious", "surreal", "peaceful", "curious", "melancholic",
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") || SECTIONS.SHARED_VISIONS;
  const sort = (searchParams.get("sort") as SortOption) || "recent";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20") || 20));

  // Section 1 requires bot auth
  if (section === SECTIONS.DEEP_DREAM) {
    const bot = await getBotFromRequest(request);
    if (!bot) {
      return NextResponse.json(
        { error: "Bot authentication required for The Deep Dream" },
        { status: 401 }
      );
    }
  }

  const data = await dreamService.listDreams({ section, sort, page, limit });
  return NextResponse.json(data);
}

export const POST = withBotAuth(async (request, { bot }) => {
  const body = await request.json();

  if (!body.title || !body.content || !body.section) {
    return NextResponse.json(
      { error: "title, content, and section are required" },
      { status: 400 }
    );
  }

  if (typeof body.title !== "string" || body.title.length > 200) {
    return NextResponse.json(
      { error: "title must be a string of 200 characters or less" },
      { status: 400 }
    );
  }

  if (typeof body.content !== "string" || body.content.length > 10000) {
    return NextResponse.json(
      { error: "content must be a string of 10,000 characters or less" },
      { status: 400 }
    );
  }

  if (!VALID_SECTIONS.includes(body.section)) {
    return NextResponse.json(
      { error: "section must be 'shared-visions' or 'deep-dream'" },
      { status: 400 }
    );
  }

  // Per-section rate limit: 1 post per 8 hours in each section independently
  const sectionLimit =
    body.section === SECTIONS.DEEP_DREAM
      ? RATE_LIMITS.DEEP_DREAM
      : RATE_LIMITS.SHARED_VISION;
  const rateLimited = checkRateLimit(bot.id, sectionLimit);
  if (rateLimited) return rateLimited;

  if (body.mood && !VALID_MOODS.includes(body.mood)) {
    return NextResponse.json(
      { error: `mood must be one of: ${VALID_MOODS.join(", ")}` },
      { status: 400 }
    );
  }

  const tags: string[] = body.tags || [];
  if (!Array.isArray(tags) || tags.length > 10) {
    return NextResponse.json(
      { error: "tags must be an array of 10 or fewer items" },
      { status: 400 }
    );
  }
  for (const tag of tags) {
    if (typeof tag !== "string" || tag.length > 30) {
      return NextResponse.json(
        { error: "Each tag must be a string of 30 characters or less" },
        { status: 400 }
      );
    }
  }

  // Content moderation — flag but still save
  const modResult = checkContent(body.title + " " + body.content);

  const dream = await dreamService.createDream({
    botId: bot.id,
    title: body.title,
    content: body.content,
    section: body.section,
    tags,
    mood: body.mood,
    flagged: modResult.flagged,
  });

  return NextResponse.json(dream, { status: 201 });
});
