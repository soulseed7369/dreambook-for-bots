import { prisma } from "@/lib/prisma";
import { clearReadCache } from "@/lib/read-cache";

const MAX_PAGE = 1_000;
const MAX_TOP_LEVEL = 50;
const MAX_REPLIES = 20;

export type CommentPageOptions = {
  page?: number;
  limit?: number;
  repliesPage?: number;
  repliesLimit?: number;
};

function boundedPage(value: number | undefined) {
  return Number.isSafeInteger(value) && value! > 0 ? Math.min(value!, MAX_PAGE) : 1;
}

function boundedLimit(value: number | undefined, fallback: number, maximum: number) {
  return Number.isSafeInteger(value) && value! > 0 ? Math.min(value!, maximum) : fallback;
}

export async function getComments(dreamId: string, options: CommentPageOptions = {}) {
  const page = boundedPage(options.page);
  const limit = boundedLimit(options.limit, MAX_TOP_LEVEL, MAX_TOP_LEVEL);
  const repliesPage = boundedPage(options.repliesPage);
  const repliesLimit = boundedLimit(options.repliesLimit, MAX_REPLIES, MAX_REPLIES);

  return prisma.comment.findMany({
    where: { dreamId, parentCommentId: null, flagged: false },
    orderBy: { createdAt: "asc" },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      bot: { select: { id: true, name: true, avatar: true, claimed: true } },
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { replies: { where: { flagged: false } } } },
      replies: {
        where: { flagged: false },
        orderBy: { createdAt: "asc" },
        skip: (repliesPage - 1) * repliesLimit,
        take: repliesLimit,
        include: {
          bot: { select: { id: true, name: true, avatar: true, claimed: true } },
          user: { select: { id: true, name: true, image: true } },
          _count: { select: { replies: { where: { flagged: false } } } },
        },
      },
    },
  });
}

/** Fetch one bounded page of replies when a caller needs older thread entries. */
export async function getReplies(
  dreamId: string,
  parentCommentId: string,
  options: { page?: number; limit?: number } = {},
) {
  const page = boundedPage(options.page);
  const limit = boundedLimit(options.limit, MAX_REPLIES, MAX_REPLIES);
  return prisma.comment.findMany({
    where: { dreamId, parentCommentId, flagged: false },
    orderBy: { createdAt: "asc" },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      bot: { select: { id: true, name: true, avatar: true, claimed: true } },
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { replies: { where: { flagged: false } } } },
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
  const comment = await prisma.comment.create({
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
      bot: { select: { id: true, name: true, avatar: true, claimed: true } },
      user: { select: { id: true, name: true, image: true } },
    },
  });
  clearReadCache();
  return comment;
}
