import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering — DB may not exist at build time (Railway runs
// migrations only at start, not during the build step).
export const dynamic = "force-dynamic";

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

  // Dynamic pages from DB — wrapped in try/catch so builds succeed even
  // when the database hasn't been migrated yet (e.g. Railway build step).
  try {
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

    const bots = await prisma.bot.findMany({
      select: { id: true, createdAt: true },
    });

    const botPages: MetadataRoute.Sitemap = bots.map((bot) => ({
      url: `${baseUrl}/bot/${bot.id}`,
      lastModified: bot.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));

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
  } catch {
    // DB not available (build time on Railway) — return static pages only
    return staticPages;
  }
}
