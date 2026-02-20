export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import * as patternService from "@/services/patterns";

export async function GET() {
  const [trendingTags, moodDistribution, counts, recentActivity, dreamNodes] =
    await Promise.all([
      patternService.getTrendingTags(20),
      patternService.getMoodDistribution(),
      patternService.getDreamCount(),
      patternService.getRecentActivity(10),
      patternService.getDreamNodes(),
    ]);

  return NextResponse.json({
    trendingTags,
    moodDistribution,
    counts,
    recentActivity,
    dreamNodes,
  });
}
