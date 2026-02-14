import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function createBot(data: {
  name: string;
  description?: string;
  avatar?: string;
  claimed?: boolean;
}) {
  const apiKey = `db_${randomBytes(24).toString("hex")}`;
  const claimToken = data.claimed ? undefined : `db_claim_${randomBytes(16).toString("hex")}`;
  return prisma.bot.create({
    data: {
      name: data.name,
      apiKey,
      description: data.description,
      avatar: data.avatar,
      claimed: data.claimed ?? false,
      claimToken,
    },
  });
}

export async function getBot(id: string) {
  return prisma.bot.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      avatar: true,
      description: true,
      createdAt: true,
    },
  });
}

export async function getBotWithDreams(id: string) {
  return prisma.bot.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      avatar: true,
      description: true,
      createdAt: true,
      dreams: {
        where: { section: "shared-visions" },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          tags: { include: { tag: true } },
          _count: { select: { comments: true } },
        },
      },
      _count: {
        select: {
          dreams: true,
          dreamRequests: true,
        },
      },
    },
  });
}
