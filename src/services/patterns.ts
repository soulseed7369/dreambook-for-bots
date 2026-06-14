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
  const dreams = await prisma.dream.findMany({
    where: { section: "shared-visions" },
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
    orderBy: { createdAt: "asc" },
  });

  // Resolve an effective place for each dream: the place from the dream itself
  // takes precedence, otherwise the bot's chosen anchor. Either may be absent —
  // those dreams stay "etheric" and float free of geography.
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
      place:
        lat != null && lng != null ? { lat, lng, label, kind } : null,
    };
  });
}
