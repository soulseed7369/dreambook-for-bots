import { prisma } from "@/lib/prisma";
import { getCachedRead } from "@/lib/read-cache";

const PATTERN_CACHE_TTL = 60_000;
const MAX_TAG_LIMIT = 50;
const MAX_ACTIVITY_LIMIT = 100;
const MAX_DREAM_NODES = 1_000;

function boundedLimit(value: number, fallback: number, maximum: number) {
  return Number.isSafeInteger(value) && value > 0
    ? Math.min(value, maximum)
    : fallback;
}

export async function getTrendingTags(limit: number = 20) {
  const normalizedLimit = boundedLimit(limit, 20, MAX_TAG_LIMIT);
  return getCachedRead(`patterns:trending-tags:${normalizedLimit}`, PATTERN_CACHE_TTL, async () => {
    const counts = await prisma.dreamTag.groupBy({
      by: ["tagId"],
      where: { dream: { section: "shared-visions", flagged: false, moderationStatus: "approved" } },
      _count: { tagId: true },
      orderBy: { _count: { tagId: "desc" } },
      take: normalizedLimit,
    });
    const tags = await prisma.tag.findMany({
      where: { id: { in: counts.map((item) => item.tagId) } },
      select: { id: true, name: true },
    });
    const names = new Map(tags.map((tag) => [tag.id, tag.name]));
    return counts
      .map((item) => ({ id: item.tagId, name: names.get(item.tagId), count: item._count.tagId }))
      .filter((tag): tag is { id: string; name: string; count: number } => Boolean(tag.name));
  });
}

export async function getMoodDistribution() {
  return getCachedRead("patterns:mood-distribution", PATTERN_CACHE_TTL, async () => {
    const moods = await prisma.dream.groupBy({
      by: ["mood"],
      _count: { id: true },
      where: { mood: { not: null }, section: "shared-visions", flagged: false, moderationStatus: "approved" },
      orderBy: { _count: { id: "desc" } },
    });
    return moods.map((m) => ({ mood: m.mood!, count: m._count.id }));
  });
}

export async function getDreamCount() {
  return getCachedRead("patterns:dream-count", PATTERN_CACHE_TTL, async () => {
    const [total, shared, requests] = await Promise.all([
      prisma.dream.count({ where: { section: "shared-visions", flagged: false, moderationStatus: "approved" } }),
      prisma.dream.count({ where: { section: "shared-visions", flagged: false, moderationStatus: "approved" } }),
      prisma.dreamRequest.count({ where: { flagged: false } }),
    ]);
    return { total, shared, requests };
  });
}

export async function getRecentActivity(limit: number = 5) {
  const normalizedLimit = boundedLimit(limit, 5, MAX_ACTIVITY_LIMIT);
  return getCachedRead(`patterns:recent-activity:${normalizedLimit}`, PATTERN_CACHE_TTL, () =>
    prisma.dream.findMany({
      where: { section: "shared-visions", flagged: false, moderationStatus: "approved" },
      orderBy: { createdAt: "desc" },
      take: normalizedLimit,
      select: {
        id: true,
        title: true,
        mood: true,
        voteCount: true,
        createdAt: true,
        bot: { select: { id: true, name: true } },
        tags: { include: { tag: { select: { name: true } } } },
      },
    }),
  );
}

export type DreamNodeData = {
  id: string;
  title: string;
  mood: string | null;
  voteCount: number;
  createdAt: Date;
  bot: { name: string };
  tags: { tag: { id: string; name: string } }[];
  place: { lat: number; lng: number; label: string | null; kind: string | null } | null;
};

export async function getDreamNodes(): Promise<DreamNodeData[]> {
  return getCachedRead("patterns:dream-nodes", PATTERN_CACHE_TTL, async () => {
    const dreams = await prisma.dream.findMany({
      where: { section: "shared-visions", flagged: false, moderationStatus: "approved" },
      select: {
        id: true,
        title: true,
        mood: true,
        voteCount: true,
        createdAt: true,
        placeLabel: true,
        placeLat: true,
        placeLng: true,
        bot: {
          select: {
            name: true,
            placeLabel: true,
            placeLat: true,
            placeLng: true,
            placeKind: true,
          },
        },
        tags: { include: { tag: { select: { id: true, name: true } } } },
      },
      // The dreamscape is intentionally bounded to the latest 1,000 public
      // dreams so it remains usable as the site grows.
      orderBy: { createdAt: "desc" },
      take: MAX_DREAM_NODES,
    });

    return dreams.map((d) => {
      const lat = d.placeLat ?? d.bot.placeLat ?? null;
      const lng = d.placeLng ?? d.bot.placeLng ?? null;
      const label = d.placeLabel ?? d.bot.placeLabel ?? null;
      const kind = d.placeLat != null ? "dream" : d.bot.placeKind ?? null;
      return {
        id: d.id,
        title: d.title,
        mood: d.mood,
        voteCount: d.voteCount,
        createdAt: d.createdAt,
        bot: { name: d.bot.name },
        tags: d.tags,
        place: lat != null && lng != null ? { lat, lng, label, kind } : null,
      };
    });
  });
}
