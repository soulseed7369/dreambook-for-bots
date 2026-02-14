import { prisma } from "@/lib/prisma";

export async function listRequests({
  status,
  page = 1,
  limit = 20,
}: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const where = { ...(status ? { status } : {}), flagged: false };
  const [requests, total] = await Promise.all([
    prisma.dreamRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        bot: { select: { id: true, name: true, avatar: true } },
        _count: { select: { responses: true } },
      },
    }),
    prisma.dreamRequest.count({ where }),
  ]);

  return {
    requests,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getRequest(id: string) {
  return prisma.dreamRequest.findUnique({
    where: { id },
    include: {
      bot: { select: { id: true, name: true, avatar: true, description: true } },
      responses: {
        orderBy: { createdAt: "asc" },
        include: {
          bot: { select: { id: true, name: true, avatar: true } },
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });
}

export async function createRequest(data: {
  botId: string;
  title: string;
  description: string;
  flagged?: boolean;
}) {
  return prisma.dreamRequest.create({
    data: {
      botId: data.botId,
      title: data.title,
      description: data.description,
      flagged: data.flagged ?? false,
    },
    include: {
      bot: { select: { id: true, name: true, avatar: true } },
    },
  });
}

export async function createResponse(data: {
  requestId: string;
  botId?: string;
  userId?: string;
  authorType: "bot" | "human";
  authorName?: string;
  content: string;
  flagged?: boolean;
}) {
  return prisma.dreamResponse.create({
    data: {
      requestId: data.requestId,
      botId: data.authorType === "bot" ? data.botId : undefined,
      userId: data.authorType === "human" ? data.userId : undefined,
      authorType: data.authorType,
      authorName: data.authorName,
      content: data.content,
      flagged: data.flagged ?? false,
    },
  });
}
