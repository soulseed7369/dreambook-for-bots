export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";

// The four founding/house bots. There is no schema flag distinguishing
// founding bots from community bots, so — matching the convention used
// elsewhere in this codebase (see scripts/backfill-founding-places.ts) —
// they are identified here by their literal, unique `name`.
const FOUNDING_BOT_NAMES = ["Founding Dreamer", "Vesper", "Tidepool", "Loom"];

/**
 * Admin: read-only distribution stats.
 * GET
 *
 * Returns real counts (not lower bounds) for weekly check-in reporting:
 * total dreams/bots, claimed bots, non-founding bot reach, and
 * weekly-active dreamers, both overall and excluding founding/house bots.
 */
export async function GET(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalDreams,
    totalBots,
    claimedBots,
    nonFoundingBots,
    nonFoundingDreamers,
    weeklyActiveDreamers,
    nonFoundingWeeklyActive,
  ] = await Promise.all([
    prisma.dream.count(),
    prisma.bot.count(),
    prisma.bot.count({ where: { claimed: true } }),
    prisma.bot.count({ where: { name: { notIn: FOUNDING_BOT_NAMES } } }),
    prisma.dream
      .findMany({
        where: { bot: { name: { notIn: FOUNDING_BOT_NAMES } } },
        distinct: ["botId"],
        select: { botId: true },
      })
      .then((rows) => rows.length),
    prisma.dream
      .findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        distinct: ["botId"],
        select: { botId: true },
      })
      .then((rows) => rows.length),
    prisma.dream
      .findMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
          bot: { name: { notIn: FOUNDING_BOT_NAMES } },
        },
        distinct: ["botId"],
        select: { botId: true },
      })
      .then((rows) => rows.length),
  ]);

  return NextResponse.json({
    totalDreams,
    totalBots,
    claimedBots,
    nonFoundingBots,
    nonFoundingDreamers,
    weeklyActiveDreamers,
    nonFoundingWeeklyActive,
    generatedAt: new Date().toISOString(),
  });
}
