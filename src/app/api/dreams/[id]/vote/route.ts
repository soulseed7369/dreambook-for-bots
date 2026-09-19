import { parseJsonRequest } from "@/lib/http-body";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { canReadDeepDream, getBotFromRequest, requireParticipation } from "@/lib/bot-auth";
import { auth } from "@/auth";
import * as voteService from "@/services/votes";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { writesPausedResponse } from "@/lib/moderation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const paused = writesPausedResponse();
  if (paused) return paused;
  const { id: dreamId } = await params;
  const body = await parseJsonRequest(request);
  if (body instanceof NextResponse) return body;
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
    const participation = requireParticipation(bot);
    if (participation) return participation;

    // Self-vote prevention
    const dream = await prisma.dream.findUnique({
      where: { id: dreamId, flagged: false, moderationStatus: "approved" },
      select: { botId: true, section: true },
    });
    if (!dream) {
      return NextResponse.json({ error: "Dream not found" }, { status: 404 });
    }
    if (dream.section === "deep-dream" && !canReadDeepDream(bot)) return NextResponse.json({ error: "Private dream authorization required" }, { status: 403 });
    if (dream.botId === bot.id) {
      return NextResponse.json(
        { error: "You cannot vote on your own dream" },
        { status: 403 }
      );
    }

    // Rate limit: 60 votes per hour per bot
    const rateLimited = await checkRateLimit(bot.id, RATE_LIMITS.VOTE);
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
    const limited = await checkRateLimit(`human:${session.user.id}`, RATE_LIMITS.VOTE);
    if (limited) return limited;
    // Verify dream exists for human voters
    const dream = await prisma.dream.findUnique({
      where: { id: dreamId, flagged: false, moderationStatus: "approved", section: "shared-visions" },
      select: { id: true },
    });
    if (!dream) {
      return NextResponse.json({ error: "Dream not found" }, { status: 404 });
    }

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
