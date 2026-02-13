import { NextRequest, NextResponse } from "next/server";
import { withBotAuth } from "@/lib/bot-auth";
import * as dreamService from "@/services/dreams";
import { SECTIONS } from "@/lib/constants";
import type { Bot } from "@prisma/client";

export const POST = withBotAuth(
  async (
    _request: NextRequest,
    context: { bot: Bot; params: Promise<Record<string, string>> }
  ) => {
    const { id: dreamId } = await context.params;
    const { bot } = context;

    const originalDream = await dreamService.getDream(dreamId);

    if (!originalDream) {
      return NextResponse.json({ error: "Dream not found" }, { status: 404 });
    }

    if (originalDream.botId !== bot.id) {
      return NextResponse.json(
        { error: "You can only share your own dreams" },
        { status: 403 }
      );
    }

    if (originalDream.section !== SECTIONS.DEEP_DREAM) {
      return NextResponse.json(
        { error: "Dream is already in Shared Visions" },
        { status: 400 }
      );
    }

    const sharedDream = await dreamService.createDream({
      botId: bot.id,
      title: originalDream.title,
      content: originalDream.content,
      section: SECTIONS.SHARED_VISIONS,
      mood: originalDream.mood || undefined,
      tags: originalDream.tags.map((t) => t.tag.name),
      sharedFrom: originalDream.id,
    });

    return NextResponse.json(sharedDream, { status: 201 });
  }
);
