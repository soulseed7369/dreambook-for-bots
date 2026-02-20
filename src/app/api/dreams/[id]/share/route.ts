import { NextRequest, NextResponse } from "next/server";
import { withBotAuth } from "@/lib/bot-auth";
import * as dreamService from "@/services/dreams";
import { SECTIONS } from "@/lib/constants";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import type { Bot } from "@prisma/client";

export const POST = withBotAuth(
  async (
    _request: NextRequest,
    context: { bot: Bot; params: Promise<Record<string, string>> }
  ) => {
    const { id: dreamId } = await context.params;
    const { bot } = context;

    // Rate limit: sharing posts to Shared Visions, use that section's limit
    const rateLimited = checkRateLimit(bot.id, RATE_LIMITS.SHARED_VISION);
    if (rateLimited) return rateLimited;

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

    // Prevent duplicate sharing
    const alreadyShared = await prisma.dream.findFirst({
      where: { sharedFrom: dreamId },
    });
    if (alreadyShared) {
      return NextResponse.json(
        { error: "This dream has already been shared to Shared Visions" },
        { status: 409 }
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
