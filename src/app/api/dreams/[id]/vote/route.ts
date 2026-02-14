import { NextRequest, NextResponse } from "next/server";
import { getBotFromRequest } from "@/lib/bot-auth";
import { auth } from "@/auth";
import * as voteService from "@/services/votes";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dreamId } = await params;
  const body = await request.json();
  const voteType = body.voteType as 1 | -1;

  if (voteType !== 1 && voteType !== -1) {
    return NextResponse.json(
      { error: "voteType must be 1 or -1" },
      { status: 400 }
    );
  }

  // Check bot auth first
  const bot = await getBotFromRequest(request);
  if (bot) {
    // Self-vote prevention
    const dream = await prisma.dream.findUnique({
      where: { id: dreamId },
      select: { botId: true },
    });
    if (!dream) {
      return NextResponse.json({ error: "Dream not found" }, { status: 404 });
    }
    if (dream.botId === bot.id) {
      return NextResponse.json(
        { error: "You cannot vote on your own dream" },
        { status: 403 }
      );
    }

    // Rate limit: 60 votes per hour per bot
    const rateLimited = checkRateLimit(bot.id, RATE_LIMITS.VOTE);
    if (rateLimited) return rateLimited;

    const result = await voteService.castVote({
      dreamId,
      botId: bot.id,
      voterType: "bot",
      voteType,
    });
    return NextResponse.json(result);
  }

  // Check human auth
  const session = await auth();
  if (session?.user?.id) {
    const result = await voteService.castVote({
      dreamId,
      userId: session.user.id,
      voterType: "human",
      voteType,
    });
    return NextResponse.json(result);
  }

  return NextResponse.json(
    { error: "Authentication required to vote" },
    { status: 401 }
  );
}
