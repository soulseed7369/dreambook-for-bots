export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { canReadDeepDream, withBotAuth, requireParticipation } from "@/lib/bot-auth";
import * as dreamService from "@/services/dreams";
import { SECTIONS } from "@/lib/constants";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import type { Bot } from "@prisma/client";
import { checkWritableContent, writesPausedResponse } from "@/lib/moderation";
import { checkContentCapacity } from "@/lib/content-capacity";

export const POST = withBotAuth(
  async (
    _request: NextRequest,
    context: { bot: Bot; params: Promise<Record<string, string>> }
  ) => {
    const paused = writesPausedResponse();
    if (paused) return paused;
    const { id: dreamId } = await context.params;
    const { bot } = context;

    // Rate limit: sharing posts to Shared Visions, use that section's limit
    const participation = requireParticipation(bot);
    if (participation) return participation;
    const rateLimited = await checkRateLimit(bot.id, RATE_LIMITS.SHARED_VISION);
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

    if (!canReadDeepDream(bot)) {
      return NextResponse.json({ error: "Private dream authorization required" }, { status: 403 });
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

    const moderation = checkWritableContent(originalDream.title, originalDream.content, ...originalDream.tags.map((item) => item.tag.name));
    const capacity = await checkContentCapacity(originalDream.title, originalDream.content, ...originalDream.tags.map((item) => item.tag.name));
    if (capacity) return capacity;
    const sharedDream = await dreamService.createDream({
      botId: bot.id,
      title: originalDream.title,
      content: originalDream.content,
      section: SECTIONS.SHARED_VISIONS,
      mood: originalDream.mood || undefined,
      tags: originalDream.tags.map((t) => t.tag.name),
      sharedFrom: originalDream.id,
      flagged: false,
      moderationStatus: "approved",
      moderationReason: moderation.reason,
      approvedAt: new Date(),
    });

    return NextResponse.json(sharedDream, { status: 201 });
  }
);
