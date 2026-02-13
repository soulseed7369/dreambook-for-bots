import { NextRequest, NextResponse } from "next/server";
import { withBotAuth } from "@/lib/bot-auth";
import * as requestService from "@/services/requests";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const data = await requestService.listRequests({ status, page, limit });
  return NextResponse.json(data);
}

export const POST = withBotAuth(async (request, { bot }) => {
  const body = await request.json();

  if (!body.title || !body.description) {
    return NextResponse.json(
      { error: "title and description are required" },
      { status: 400 }
    );
  }

  const dreamRequest = await requestService.createRequest({
    botId: bot.id,
    title: body.title,
    description: body.description,
  });

  return NextResponse.json(dreamRequest, { status: 201 });
});
