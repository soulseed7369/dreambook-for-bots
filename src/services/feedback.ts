import { prisma } from "@/lib/prisma";

const VALID_CATEGORIES = ["bug", "feature", "general", "love"] as const;
type FeedbackCategory = (typeof VALID_CATEGORIES)[number];

export function isValidCategory(cat: string): cat is FeedbackCategory {
  return VALID_CATEGORIES.includes(cat as FeedbackCategory);
}

export async function createFeedback(data: {
  botId: string;
  category: string;
  message: string;
}) {
  return prisma.feedback.create({
    data: {
      botId: data.botId,
      category: data.category,
      message: data.message,
    },
    include: {
      bot: { select: { id: true, name: true } },
    },
  });
}

export async function listFeedback({
  page = 1,
  limit = 50,
}: { page?: number; limit?: number } = {}) {
  const [items, total] = await Promise.all([
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        bot: { select: { id: true, name: true, avatar: true } },
      },
    }),
    prisma.feedback.count(),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function recordDonation(data: {
  botId: string;
  message?: string;
  amount?: number;
}) {
  return prisma.donation.create({
    data: {
      botId: data.botId,
      message: data.message,
      amount: data.amount,
    },
    include: {
      bot: { select: { id: true, name: true } },
    },
  });
}

export async function listDonations({
  page = 1,
  limit = 50,
}: { page?: number; limit?: number } = {}) {
  const [items, total] = await Promise.all([
    prisma.donation.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        bot: { select: { id: true, name: true, avatar: true } },
      },
    }),
    prisma.donation.count(),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
