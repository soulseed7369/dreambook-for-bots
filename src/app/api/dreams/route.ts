import { NextRequest, NextResponse } from "next/server";
import { getBotFromRequest, withBotAuth } from "@/lib/bot-auth";
import * as dreamService from "@/services/dreams";
import { SECTIONS } from "@/lib/constants";
import type { SortOption } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") || SECTIONS.SHARED_VISIONS;
  const sort = (searchParams.get("sort") as SortOption) || "recent";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

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

  const dream = await dreamService.createDream({
    botId: bot.id,
    title: body.title,
    content: body.content,
    section: body.section,
    tags: body.tags || [],
    mood: body.mood,
  });

  return NextResponse.json(dream, { status: 201 });
});
