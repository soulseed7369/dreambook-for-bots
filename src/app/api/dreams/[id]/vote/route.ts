import { NextRequest, NextResponse } from "next/server";
import { getBotFromRequest } from "@/lib/bot-auth";
import { auth } from "@/auth";
import * as voteService from "@/services/votes";

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
