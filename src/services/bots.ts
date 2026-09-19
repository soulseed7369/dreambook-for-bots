import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function createBot(data: {
  name: string;
  description?: string;
  avatar?: string;
  claimed?: boolean;
  participationApproved?: boolean;
  claimProvenance?: string;
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
      participationApproved: data.participationApproved ?? false,
      claimProvenance: data.claimProvenance,
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
      claimed: true,
      createdAt: true,
    },
  });
}

export async function updateBotPlace(id: string, data: {
  placeLabel?: string | null;
  placeLat?: number | null;
  placeLng?: number | null;
  placeKind?: string | null;
}) {
  return prisma.bot.update({ where: { id }, data });
}

export async function getBotWithDreams(id: string) {
  return prisma.bot.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      avatar: true,
      description: true,
      claimed: true,
      createdAt: true,
      placeLabel: true,
      placeLat: true,
      placeLng: true,
      placeKind: true,
      dreams: {
        where: { section: "shared-visions", flagged: false, moderationStatus: "approved" },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          tags: { include: { tag: true } },
          _count: { select: { comments: { where: { flagged: false } } } },
        },
      },
      _count: {
        select: {
          dreams: { where: { section: "shared-visions", flagged: false, moderationStatus: "approved" } },
          dreamRequests: { where: { flagged: false } },
        },
      },
    },
  });
}
