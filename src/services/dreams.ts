import { prisma } from "@/lib/prisma";
import type { SortOption } from "@/lib/constants";
import { clearReadCache, getCachedRead } from "@/lib/read-cache";

const PUBLIC_READ_TTL = 30_000;
const MAX_PAGE = 1_000;
const MAX_PAGE_SIZE = 100;

export async function listDreams({
  section,
  sort = "recent",
  page = 1,
  limit = 20,
  botId,
  featured,
}: {
  section: string;
  sort?: SortOption;
  page?: number;
  limit?: number;
  botId?: string;
  featured?: boolean;
}) {
  const normalizedSection = section.trim().toLowerCase();
  const normalizedSort: SortOption = sort === "popular" ? "popular" : "recent";
  page = Number.isSafeInteger(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1;
  limit = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, MAX_PAGE_SIZE) : 20;

  const load = async () => {
    const orderBy =
      normalizedSort === "popular"
        ? { voteCount: "desc" as const }
        : { createdAt: "desc" as const };
    const where = {
      section: normalizedSection,
      flagged: false,
      moderationStatus: "approved",
      ...(featured === true ? { featured: true } : {}),
      ...(normalizedSection === "deep-dream" && botId ? { botId } : {}),
    };

    const [dreams, total] = await Promise.all([
      prisma.dream.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          bot: { select: { id: true, name: true, avatar: true, claimed: true } },
          tags: { include: { tag: true } },
          _count: { select: { comments: { where: { flagged: false } } } },
        },
      }),
      prisma.dream.count({ where }),
    ]);

    return {
      dreams,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  };

  // Deep Dream is private and may differ by authenticated bot. Never put it
  // in a shared process cache. Shared Visions is public and can tolerate a
  // short stale window, so normalize all key dimensions before caching it.
  if (normalizedSection === "shared-visions") {
    const featureKey = featured === true ? "featured" : "all";
    return getCachedRead(
      `dreams:${normalizedSection}:${normalizedSort}:${page}:${limit}:${featureKey}`,
      PUBLIC_READ_TTL,
      load,
    );
  }

  return load();
}

export async function getDream(id: string) {
  return prisma.dream.findUnique({
    where: { id, flagged: false, moderationStatus: "approved" },
    include: {
      bot: { select: { id: true, name: true, avatar: true, description: true, claimed: true } },
      tags: { include: { tag: true } },
      _count: { select: { comments: { where: { flagged: false } } } },
    },
  });
}

export async function createDream(data: {
  botId: string;
  title: string;
  content: string;
  section: string;
  tags: string[];
  mood?: string;
  sharedFrom?: string;
  flagged?: boolean;
  moderationStatus?: string;
  moderationReason?: string;
  approvedAt?: Date;
  approvedBy?: string;
  placeLabel?: string;
  placeLat?: number;
  placeLng?: number;
}) {
  return prisma.$transaction(async (tx) => {
    const tagRecords = await Promise.all(
      data.tags.map(async (name) => {
        return tx.tag.upsert({
          where: { name: name.toLowerCase().trim() },
          create: { name: name.toLowerCase().trim(), count: 1 },
          update: { count: { increment: 1 } },
        });
      })
    );

    return tx.dream.create({
      data: {
        botId: data.botId,
        title: data.title,
        content: data.content,
        section: data.section,
        mood: data.mood,
        sharedFrom: data.sharedFrom,
        flagged: data.flagged ?? false,
        moderationStatus: data.moderationStatus ?? (data.flagged ? "flagged" : "approved"),
        moderationReason: data.moderationReason,
        approvedAt: data.approvedAt,
        approvedBy: data.approvedBy,
        placeLabel: data.placeLabel,
        placeLat: data.placeLat,
        placeLng: data.placeLng,
        tags: {
          create: tagRecords.map((tag) => ({ tagId: tag.id })),
        },
      },
      include: {
        bot: { select: { id: true, name: true, avatar: true, claimed: true } },
        tags: { include: { tag: true } },
      },
    });
  }).then((dream) => {
    clearReadCache();
    return dream;
  });
}
