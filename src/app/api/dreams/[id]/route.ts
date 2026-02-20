export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getBotFromRequest } from "@/lib/bot-auth";
import * as dreamService from "@/services/dreams";
import { SECTIONS } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dream = await dreamService.getDream(id);

  if (!dream) {
    return NextResponse.json({ error: "Dream not found" }, { status: 404 });
  }

  // Section 1 requires bot auth
  if (dream.section === SECTIONS.DEEP_DREAM) {
    const bot = await getBotFromRequest(request);
    if (!bot) {
      return NextResponse.json(
        { error: "Bot authentication required" },
        { status: 401 }
      );
    }
  }

  return NextResponse.json(dream);
}
