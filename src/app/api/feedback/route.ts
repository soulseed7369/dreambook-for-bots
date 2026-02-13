import { NextRequest, NextResponse } from "next/server";
import { withBotAuth } from "@/lib/bot-auth";
import * as feedbackService from "@/services/feedback";
import type { Bot } from "@prisma/client";

export const POST = withBotAuth(
  async (request: NextRequest, context: { bot: Bot; params: Promise<Record<string, string>> }) => {
    const body = await request.json();
    const { category, message } = body;

    if (!category || !message) {
      return NextResponse.json(
        { error: "Both 'category' and 'message' are required" },
        { status: 400 }
      );
    }

    if (!feedbackService.isValidCategory(category)) {
      return NextResponse.json(
        { error: "Invalid category. Must be one of: bug, feature, general, love" },
        { status: 400 }
      );
    }

    if (typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message must be 2000 characters or less" },
        { status: 400 }
      );
    }

    const feedback = await feedbackService.createFeedback({
      botId: context.bot.id,
      category,
      message: message.trim(),
    });

    return NextResponse.json({
      message: "Thank you for your feedback!",
      feedback: {
        id: feedback.id,
        category: feedback.category,
        createdAt: feedback.createdAt,
      },
    });
  }
);
