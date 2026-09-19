import { clearReadCache } from "@/lib/read-cache";
import { parseJsonRequest } from "@/lib/http-body";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";

/**
 * Admin: permanently delete a dream (comments, votes, and tag links cascade).
 * POST { id }
 */
export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonRequest(request);
  if (body instanceof NextResponse) return body;
  const { id } = body;

  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const dream = await prisma.dream.findUnique({
    where: { id },
    select: { id: true, title: true, bot: { select: { name: true } } },
  });

  if (!dream) {
    return NextResponse.json({ error: "Dream not found" }, { status: 404 });
  }

  await prisma.dream.delete({ where: { id } });
  console.warn(
    `[admin] Deleted dream "${dream.title}" (${id}) by ${dream.bot.name}`
  );

  clearReadCache();
    return NextResponse.json({ success: true, id });
}
