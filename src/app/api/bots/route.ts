import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/bot-auth";
import * as botService from "@/services/bots";

export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const bot = await botService.createBot(body);
    return NextResponse.json(bot, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Bot name already exists" },
      { status: 409 }
    );
  }
}
