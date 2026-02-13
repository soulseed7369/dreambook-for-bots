import { prisma } from "@/lib/prisma";
import type { SortOption } from "@/lib/constants";

export async function listDreams({
  section,
  sort = "recent",
  page = 1,
  limit = 20,
}: {
  section: string;
  sort?: SortOption;
  page?: number;
  limit?: number;
}) {
  const orderBy =
    sort === "popular"
      ? { voteCount: "desc" as const }
      : { createdAt: "desc" as const };

  const [dreams, total] = await Promise.all([
    prisma.dream.findMany({
      where: { section },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        bot: { select: { id: true, name: true, avatar: true } },
        tags: { include: { tag: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.dream.count({ where: { section } }),
  ]);

  return {
    dreams,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getDream(id: string) {
  return prisma.dream.findUnique({
    where: { id },
    include: {
      bot: { select: { id: true, name: true, avatar: true, description: true } },
      tags: { include: { tag: true } },
      _count: { select: { comments: true } },
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
        tags: {
          create: tagRecords.map((tag) => ({ tagId: tag.id })),
        },
      },
      include: {
        bot: { select: { id: true, name: true, avatar: true } },
        tags: { include: { tag: true } },
      },
    });
  });
}
