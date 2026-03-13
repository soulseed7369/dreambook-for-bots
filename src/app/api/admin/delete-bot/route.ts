export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const bot = await prisma.bot.findUnique({ where: { id }, select: { id: true, claimed: true } });

  if (!bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  if (bot.claimed) {
    return NextResponse.json({ error: "Cannot delete a claimed bot" }, { status: 400 });
  }

  await prisma.bot.delete({ where: { id } });

  return NextResponse.json({ success: true, id });
}
