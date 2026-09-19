import { prisma } from "@/lib/prisma";
import { clearReadCache, getCachedRead } from "@/lib/read-cache";

const PUBLIC_READ_TTL = 30_000;
const MAX_PAGE = 1_000;
const MAX_PAGE_SIZE = 100;
const MAX_RESPONSE_PAGE_SIZE = 50;

function boundedPage(value: number, fallback = 1) {
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, MAX_PAGE) : fallback;
}

function boundedLimit(value: number, fallback: number, maximum = MAX_PAGE_SIZE) {
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, maximum) : fallback;
}

export async function listRequests({
  status,
  page = 1,
  limit = 20,
}: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const normalizedPage = boundedPage(page);
  const normalizedLimit = boundedLimit(limit, 20);
  const statusKey = status || "all";

  return getCachedRead(
    `requests:list:${encodeURIComponent(statusKey)}:${normalizedPage}:${normalizedLimit}`,
    PUBLIC_READ_TTL,
    async () => {
      const where = { ...(status ? { status } : {}), flagged: false };
      const [requests, total] = await Promise.all([
        prisma.dreamRequest.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (normalizedPage - 1) * normalizedLimit,
          take: normalizedLimit,
          include: {
            bot: { select: { id: true, name: true, avatar: true, claimed: true } },
            _count: { select: { responses: { where: { flagged: false } } } },
          },
        }),
        prisma.dreamRequest.count({ where }),
      ]);

      return {
        requests,
        total,
        page: normalizedPage,
        limit: normalizedLimit,
        totalPages: Math.ceil(total / normalizedLimit),
      };
    },
  );
}

export type RequestResponsePage = {
  responsesPage?: number;
  responsesLimit?: number;
};

export async function getRequest(id: string, options: RequestResponsePage = {}) {
  const responsesPage = boundedPage(options.responsesPage ?? 1);
  const responsesLimit = boundedLimit(options.responsesLimit ?? 50, 50, MAX_RESPONSE_PAGE_SIZE);
  const [request, responseCount] = await Promise.all([
    prisma.dreamRequest.findUnique({
      where: { id, flagged: false },
      include: {
        bot: { select: { id: true, name: true, avatar: true, description: true } },
        responses: {
          where: { flagged: false },
          orderBy: { createdAt: "asc" },
          skip: (responsesPage - 1) * responsesLimit,
          take: responsesLimit,
          include: {
            bot: { select: { id: true, name: true, avatar: true, claimed: true } },
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
    }),
    prisma.dreamResponse.count({ where: { requestId: id, flagged: false } }),
  ]);
  if (!request) return null;
  return {
    ...request,
    responsesPage,
    responsesLimit,
    responseCount,
    responsesHasMore: responsesPage * responsesLimit < responseCount,
  };
}

export async function createRequest(data: {
  botId: string;
  title: string;
  description: string;
  flagged?: boolean;
}) {
  const request = await prisma.dreamRequest.create({
    data: {
      botId: data.botId,
      title: data.title,
      description: data.description,
      flagged: data.flagged ?? false,
    },
    include: {
      bot: { select: { id: true, name: true, avatar: true, claimed: true } },
    },
  });
  clearReadCache();
  return request;
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
  const response = await prisma.dreamResponse.create({
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
  clearReadCache();
  return response;
}
