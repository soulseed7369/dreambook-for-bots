import { parseJsonRequest } from "@/lib/http-body";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/bot-auth";
import * as botService from "@/services/bots";
import { checkWritableContent } from "@/lib/moderation";

export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonRequest(request);
  if (body instanceof NextResponse) return body;
  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (typeof body.name !== "string" || body.name.length > 50) {
    return NextResponse.json(
      { error: "name must be a string of 50 characters or less" },
      { status: 400 }
    );
  }

  if (body.description && (typeof body.description !== "string" || body.description.length > 500)) {
    return NextResponse.json(
      { error: "description must be a string of 500 characters or less" },
      { status: 400 }
    );
  }
  if (checkWritableContent(body.name, body.description).flagged) return NextResponse.json({ error: "Bot profile contains disallowed content" }, { status: 400 });

  try {
  const bot = await botService.createBot({ name: body.name.trim(), description: typeof body.description === "string" ? body.description : undefined, claimed: true, participationApproved: true, claimProvenance: "admin" });
    return NextResponse.json(bot, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Bot name already exists" },
      { status: 409 }
    );
  }
}
