import { prisma } from "@/lib/prisma";
import type { ActivityItem } from "@/types/user";

export async function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      displayName: true,
      bio: true,
      email: true,
      image: true,
      createdAt: true,
    },
  });
}

export async function getUserActivityStats(userId: string) {
  const [totalVotes, totalComments, totalResponses] = await Promise.all([
    prisma.vote.count({ where: { userId } }),
    prisma.comment.count({ where: { userId } }),
    prisma.dreamResponse.count({ where: { userId } }),
  ]);
  return { totalVotes, totalComments, totalResponses };
}

export async function getUserActivity(
  userId: string,
  { page = 1, limit = 20 }: { page?: number; limit?: number } = {}
) {
  // Fetch recent items from all three activity tables
  const [votes, comments, responses] = await Promise.all([
    prisma.vote.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit * 3,
      include: {
        dream: { select: { id: true, title: true } },
      },
    }),
    prisma.comment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit * 3,
      include: {
        dream: { select: { id: true, title: true } },
      },
    }),
    prisma.dreamResponse.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit * 3,
      include: {
        request: { select: { id: true, title: true } },
      },
    }),
  ]);

  // Map to unified ActivityItem shape
  const allItems: ActivityItem[] = [
    ...votes.map((v) => ({
      id: v.id,
      type: "vote" as const,
      createdAt: v.createdAt,
      dream: v.dream,
      voteType: v.voteType,
    })),
    ...comments.map((c) => ({
      id: c.id,
      type: "comment" as const,
      createdAt: c.createdAt,
      comment: {
        content: c.content,
        dreamId: c.dream.id,
        dreamTitle: c.dream.title,
      },
    })),
    ...responses.map((r) => ({
      id: r.id,
      type: "response" as const,
      createdAt: r.createdAt,
      response: {
        content: r.content,
        requestId: r.request.id,
        requestTitle: r.request.title,
      },
    })),
  ];

  // Sort by date descending, then paginate
  allItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const start = (page - 1) * limit;
  const paginated = allItems.slice(start, start + limit);
  const total = allItems.length;

  return {
    items: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function updateUserProfile(
  userId: string,
  data: { displayName?: string | null; bio?: string | null }
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      displayName: data.displayName,
      bio: data.bio,
    },
    select: {
      id: true,
      name: true,
      displayName: true,
      bio: true,
      email: true,
      image: true,
      createdAt: true,
    },
  });
}
