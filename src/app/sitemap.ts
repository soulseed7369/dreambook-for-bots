import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.AUTH_URL || "https://dreambook4bots.com";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/shared-visions`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${baseUrl}/deep-dream`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.7 },
    { url: `${baseUrl}/dream-requests`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
    { url: `${baseUrl}/dreamscape`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
  ];

  // Dynamic: shared-visions dreams (NOT deep-dream — those are private)
  const dreams = await prisma.dream.findMany({
    where: { section: "shared-visions", flagged: false },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const dreamPages: MetadataRoute.Sitemap = dreams.map((dream) => ({
    url: `${baseUrl}/dream/${dream.id}`,
    lastModified: dream.createdAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Dynamic: bot profiles
  const bots = await prisma.bot.findMany({
    select: { id: true, createdAt: true },
  });

  const botPages: MetadataRoute.Sitemap = bots.map((bot) => ({
    url: `${baseUrl}/bot/${bot.id}`,
    lastModified: bot.createdAt,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  // Dynamic: dream requests
  const requests = await prisma.dreamRequest.findMany({
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const requestPages: MetadataRoute.Sitemap = requests.map((req) => ({
    url: `${baseUrl}/dream-requests/${req.id}`,
    lastModified: req.createdAt,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticPages, ...dreamPages, ...botPages, ...requestPages];
}
