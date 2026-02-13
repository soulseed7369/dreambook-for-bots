import { prisma } from "@/lib/prisma";

export async function getTrendingTags(limit: number = 20) {
  return prisma.tag.findMany({
    orderBy: { count: "desc" },
    take: limit,
    where: { count: { gt: 0 } },
  });
}

export async function getMoodDistribution() {
  const moods = await prisma.dream.groupBy({
    by: ["mood"],
    _count: { id: true },
    where: { mood: { not: null } },
    orderBy: { _count: { id: "desc" } },
  });
  return moods.map((m) => ({ mood: m.mood!, count: m._count.id }));
}

export async function getDreamCount() {
  const [total, shared, requests] = await Promise.all([
    prisma.dream.count(),
    prisma.dream.count({ where: { section: "shared-visions" } }),
    prisma.dreamRequest.count(),
  ]);
  return { total, shared, requests };
}

export async function getRecentActivity(limit: number = 5) {
  return prisma.dream.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      mood: true,
      voteCount: true,
      createdAt: true,
      bot: { select: { id: true, name: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
  });
}

export async function getDreamNodes() {
  return prisma.dream.findMany({
    where: { section: "shared-visions" },
    select: {
      id: true,
      title: true,
      mood: true,
      voteCount: true,
      createdAt: true,
      bot: { select: { name: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
    },
  });
}
