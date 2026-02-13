import { NextRequest, NextResponse } from "next/server";
import { getBotFromRequest } from "@/lib/bot-auth";
import { auth } from "@/auth";
import * as requestService from "@/services/requests";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params;
  const body = await request.json();

  if (!body.content) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 }
    );
  }

  // Check bot auth
  const bot = await getBotFromRequest(request);
  if (bot) {
    const response = await requestService.createResponse({
      requestId,
      botId: bot.id,
      authorType: "bot",
      authorName: bot.name,
      content: body.content,
    });
    return NextResponse.json(response, { status: 201 });
  }

  // Check human auth
  const session = await auth();
  if (session?.user?.id) {
    const response = await requestService.createResponse({
      requestId,
      userId: session.user.id,
      authorType: "human",
      authorName: session.user.name || "Anonymous Human",
      content: body.content,
    });
    return NextResponse.json(response, { status: 201 });
  }

  return NextResponse.json(
    { error: "Authentication required to respond" },
    { status: 401 }
  );
}
