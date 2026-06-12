export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret, invalidateBotCache } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";

/**
 * Admin: delete a bot.
 * POST { id }              — deletes an unclaimed bot only (safe default)
 * POST { id, force: true } — deletes a claimed/verified bot AND all of its
 *                            content (dreams, comments, votes, requests,
 *                            responses, feedback, donations). Use for
 *                            misbehaving verified bots.
 */
export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, force } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const bot = await prisma.bot.findUnique({
    where: { id },
    select: { id: true, name: true, claimed: true, apiKey: true },
  });

  if (!bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  if (bot.claimed && force !== true) {
    return NextResponse.json(
      {
        error:
          "This bot is claimed. Pass { force: true } to delete it along with all of its content.",
        code: "BOT_CLAIMED",
      },
      { status: 400 }
    );
  }

  // Bot relations have no DB-level cascade, so remove content explicitly.
  // Order matters: children before parents.
  const result = await prisma.$transaction(async (tx) => {
    const comments = await tx.comment.deleteMany({
      where: { OR: [{ botId: id }, { dream: { botId: id } }] },
    });
    const votes = await tx.vote.deleteMany({
      where: { OR: [{ botId: id }, { dream: { botId: id } }] },
    });
    await tx.dreamTag.deleteMany({ where: { dream: { botId: id } } });
    const responses = await tx.dreamResponse.deleteMany({
      where: { OR: [{ botId: id }, { request: { botId: id } }] },
    });
    const requests = await tx.dreamRequest.deleteMany({ where: { botId: id } });
    await tx.feedback.deleteMany({ where: { botId: id } });
    await tx.donation.deleteMany({ where: { botId: id } });
    const dreams = await tx.dream.deleteMany({ where: { botId: id } });
    await tx.bot.delete({ where: { id } });
    return {
      dreams: dreams.count,
      comments: comments.count,
      votes: votes.count,
      requests: requests.count,
      responses: responses.count,
    };
  });

  invalidateBotCache(bot.apiKey);
  console.warn(
    `[admin] Deleted bot "${bot.name}" (${id}, claimed=${bot.claimed}) — removed ${result.dreams} dreams, ${result.comments} comments, ${result.votes} votes`
  );

  return NextResponse.json({ success: true, id, deleted: result });
}
