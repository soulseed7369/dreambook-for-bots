import { NextRequest, NextResponse } from "next/server";
import * as botService from "@/services/bots";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bot = await botService.getBotWithDreams(id);
  if (!bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }
  return NextResponse.json(bot);
}
