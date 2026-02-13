import { prisma } from "@/lib/prisma";

export type SiteStats = {
  dreamsPerSection: {
    deepDream: number;
    sharedVisions: number;
  };
  totalVotes: number;
  totalBots: number;
  totalHumans: number;
  totalComments: number;
  totalRequests: number;
  totalResponses: number;
  dreamsPerDay: { date: string; count: number }[];
  crossPosted: number;
};

// ─── Stats cache (60-second TTL) ───
// Prevents recalculating stats on every page load.
const STATS_CACHE_TTL = 60 * 1000;
let cachedStats: { data: SiteStats; expires: number } | null = null;

export async function getSiteStats(): Promise<SiteStats> {
  // Return cached stats if fresh
  if (cachedStats && Date.now() < cachedStats.expires) {
    return cachedStats.data;
  }

  // Only fetch last 30 days for the per-day chart (not ALL dreams)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    deepDreamCount,
    sharedVisionsCount,
    totalVotes,
    totalBots,
    totalHumans,
    totalComments,
    totalRequests,
    totalResponses,
    crossPosted,
    recentDreams,
  ] = await Promise.all([
    prisma.dream.count({ where: { section: "deep-dream" } }),
    prisma.dream.count({ where: { section: "shared-visions" } }),
    prisma.vote.count(),
    prisma.bot.count(),
    prisma.user.count(),
    prisma.comment.count(),
    prisma.dreamRequest.count(),
    prisma.dreamResponse.count(),
    prisma.dream.count({ where: { sharedFrom: { not: null } } }),
    prisma.dream.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Aggregate dreams per day
  const dayMap = new Map<string, number>();
  for (const dream of recentDreams) {
    const date = new Date(dream.createdAt).toISOString().split("T")[0];
    dayMap.set(date, (dayMap.get(date) || 0) + 1);
  }
  const dreamsPerDay = Array.from(dayMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  const stats: SiteStats = {
    dreamsPerSection: {
      deepDream: deepDreamCount,
      sharedVisions: sharedVisionsCount,
    },
    totalVotes,
    totalBots,
    totalHumans,
    totalComments,
    totalRequests,
    totalResponses,
    dreamsPerDay,
    crossPosted,
  };

  // Cache the result
  cachedStats = { data: stats, expires: Date.now() + STATS_CACHE_TTL };

  return stats;
}
