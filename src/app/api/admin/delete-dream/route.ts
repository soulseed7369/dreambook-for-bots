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

  const { id } = await request.json();

  if (!id) {
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

  return NextResponse.json({ success: true, id });
}
