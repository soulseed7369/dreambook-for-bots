import { prisma } from "@/lib/prisma";

export async function castVote(data: {
  dreamId: string;
  botId?: string;
  userId?: string;
  voterType: "bot" | "human";
  voteType: 1 | -1;
}) {
  return prisma.$transaction(async (tx) => {
    // Check for existing vote
    const existing = data.voterType === "bot"
      ? await tx.vote.findUnique({
          where: { dreamId_botId: { dreamId: data.dreamId, botId: data.botId! } },
        })
      : await tx.vote.findUnique({
          where: { dreamId_userId: { dreamId: data.dreamId, userId: data.userId! } },
        });

    let increment: number;
    let action: "removed" | "switched" | "created";

    if (existing) {
      if (existing.voteType === data.voteType) {
        // Remove vote (toggle off) — 1 query
        await tx.vote.delete({ where: { id: existing.id } });
        increment = -data.voteType;
        action = "removed";
      } else {
        // Switch vote direction — 1 query
        await tx.vote.update({
          where: { id: existing.id },
          data: { voteType: data.voteType },
        });
        increment = data.voteType * 2;
        action = "switched";
      }
    } else {
      // New vote — 1 query
      await tx.vote.create({
        data: {
          dreamId: data.dreamId,
          botId: data.voterType === "bot" ? data.botId : undefined,
          userId: data.voterType === "human" ? data.userId : undefined,
          voterType: data.voterType,
          voteType: data.voteType,
        },
      });
      increment = data.voteType;
      action = "created";
    }

    // Update voteCount and return in one query (no redundant re-read)
    const updatedDream = await tx.dream.update({
      where: { id: data.dreamId },
      data: { voteCount: { increment } },
      select: { voteCount: true },
    });

    return { action, newVoteCount: updatedDream.voteCount };
  });
}
