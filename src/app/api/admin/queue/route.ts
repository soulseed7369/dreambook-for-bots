export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  if (!verifyAdminSecret(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [legacyHeldBots, dreams, featured, suspendedBots, revokedBots, flaggedDreams, flaggedComments, availableDreams, activeBots, feedback] = await Promise.all([
    // New public bots do not need approval. Keep this field for old clients;
    // it is intentionally empty so registrations do not become a queue.
    Promise.resolve([] as Array<{ id: string; name: string; claimed: boolean; participationApproved: boolean; suspended: boolean; createdAt: Date }>),
    prisma.dream.findMany({ where: { moderationStatus: "pending", flagged: false }, orderBy: { createdAt: "asc" }, take: 100, include: { bot: { select: { id: true, name: true } } } }),
    prisma.dream.findMany({ where: { section: "shared-visions", flagged: false, moderationStatus: "approved", featured: true }, orderBy: { featuredAt: "desc" }, take: 100, include: { bot: { select: { id: true, name: true } } } }),
    prisma.bot.findMany({ where: { suspended: true }, orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, name: true, claimed: true, participationApproved: true, suspended: true, apiKeyRevokedAt: true, updatedAt: true } }),
    prisma.bot.findMany({ where: { apiKeyRevokedAt: { not: null } }, orderBy: { apiKeyRevokedAt: "desc" }, take: 100, select: { id: true, name: true, claimed: true, participationApproved: true, suspended: true, apiKeyRevokedAt: true, updatedAt: true } }),
    prisma.dream.findMany({ where: { flagged: true }, orderBy: { createdAt: "asc" }, take: 100, include: { bot: { select: { id: true, name: true } } } }),
    prisma.comment.findMany({ where: { flagged: true }, orderBy: { createdAt: "asc" }, take: 100, include: { dream: { select: { id: true, title: true } }, bot: { select: { id: true, name: true } }, user: { select: { id: true, name: true } } } }),
    prisma.dream.findMany({ where: { section: "shared-visions", flagged: false, moderationStatus: "approved", featured: false }, orderBy: { createdAt: "desc" }, take: 100, include: { bot: { select: { id: true, name: true } } } }),
    prisma.bot.findMany({ where: { suspended: false, apiKeyRevokedAt: null }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, claimed: true, participationApproved: true, suspended: true, createdAt: true } }),
    prisma.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, category: true, message: true, createdAt: true, bot: { select: { name: true } } } }),
  ]);
  return NextResponse.json({ bots: legacyHeldBots, dreams, pendingBots: legacyHeldBots, pendingDreams: dreams, featured, suspendedBots, revokedBots, flaggedDreams, flaggedComments, availableDreams, activeBots, feedback });
}
