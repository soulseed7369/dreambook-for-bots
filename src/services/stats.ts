import { prisma } from "@/lib/prisma";
import { getCachedRead } from "@/lib/read-cache";

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

const STATS_CACHE_TTL = 60_000;

export async function getSiteStats(): Promise<SiteStats> {
  return getCachedRead("site-stats", STATS_CACHE_TTL, async () => {
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
      dreamsPerDayRows,
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
      // Group in SQLite instead of loading every dream from the last month
      // into the application. The response has one row per day and is exact.
      prisma.$queryRaw<Array<{ date: string; count: number }>>`
        SELECT day AS date, COUNT(*) AS count FROM (
          SELECT CASE WHEN typeof("createdAt") IN ('integer', 'real')
            THEN strftime('%Y-%m-%d', "createdAt" / 1000, 'unixepoch')
            ELSE substr("createdAt", 1, 10) END AS day FROM "Dream"
        ) WHERE day >= ${thirtyDaysAgo.toISOString().slice(0, 10)}
        GROUP BY day
        ORDER BY date ASC
      `,
    ]);

    const dreamsPerDay = dreamsPerDayRows.map((row) => ({
      date: row.date,
      count: Number(row.count),
    }));

    return {
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
  });
}
