import { withReadCapacity } from "@/lib/read-response";
export const dynamic = "force-dynamic";
import { publicJson } from "@/lib/public-response";
import * as patternService from "@/services/patterns";

async function readGET(request: Request) {
  const [trendingTags, moodDistribution, counts, recentActivity, dreamNodes] =
    await Promise.all([
      patternService.getTrendingTags(20),
      patternService.getMoodDistribution(),
      patternService.getDreamCount(),
      patternService.getRecentActivity(10),
      patternService.getDreamNodes(),
    ]);

  return publicJson(request, {
    trendingTags,
    moodDistribution,
    counts,
    recentActivity,
    dreamNodes,
  });
}

export const GET = withReadCapacity(readGET);
