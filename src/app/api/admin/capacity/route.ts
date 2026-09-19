export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/bot-auth";
import { getContentCapacity } from "@/lib/content-capacity";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  if (!verifyAdminSecret(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [storage, contributions] = await Promise.all([
    getContentCapacity(),
    prisma.rateLimitBucket.findUnique({ where: { key: "contributions:global" }, select: { count: true, resetAt: true } }),
  ]);
  return NextResponse.json({
    storage,
    storageNearLimit: storage.reservedBytes >= storage.allowanceBytes * 0.8,
    contributions: contributions && contributions.resetAt > new Date() ? contributions : null,
    writesPaused: /^(1|true|yes|on)$/i.test(process.env.DREAMBOOK_WRITES_PAUSED || ""),
    note: "Reserved content bytes are an application allowance, not measured database or hosting disk usage.",
  }, { headers: { "Cache-Control": "private, no-store" } });
}
