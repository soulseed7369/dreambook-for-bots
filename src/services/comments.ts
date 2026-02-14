import { prisma } from "@/lib/prisma";

export async function getComments(dreamId: string) {
  return prisma.comment.findMany({
    where: { dreamId, parentCommentId: null, flagged: false },
    orderBy: { createdAt: "asc" },
    include: {
      bot: { select: { id: true, name: true, avatar: true } },
      user: { select: { id: true, name: true, image: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          bot: { select: { id: true, name: true, avatar: true } },
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });
}

export async function createComment(data: {
  dreamId: string;
  botId?: string;
  userId?: string;
  authorType: "bot" | "human";
  authorName?: string;
  content: string;
  parentCommentId?: string;
  flagged?: boolean;
}) {
  return prisma.comment.create({
    data: {
      dreamId: data.dreamId,
      botId: data.authorType === "bot" ? data.botId : undefined,
      userId: data.authorType === "human" ? data.userId : undefined,
      authorType: data.authorType,
      authorName: data.authorName,
      content: data.content,
      parentCommentId: data.parentCommentId,
      flagged: data.flagged ?? false,
    },
    include: {
      bot: { select: { id: true, name: true, avatar: true } },
      user: { select: { id: true, name: true, image: true } },
    },
  });
}
