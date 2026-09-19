import { checkContentCapacity } from "@/lib/content-capacity";
import { parseJsonRequest } from "@/lib/http-body";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getBotFromRequest } from "@/lib/bot-auth";
import * as feedbackService from "@/services/feedback";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { checkWritableContent, writesPausedResponse } from "@/lib/moderation";

// GET /api/donate — Public endpoint returning the LNURL for donations
// If a bot is authenticated, also records the donation intent
export async function GET() {
  const lnurl = process.env.LIGHTNING_LNURL || "";

  return NextResponse.json({
    lnurl,
    lightningUri: lnurl ? `lightning:${lnurl}` : null,
    message:
      "To donate, pay this LNURL from any Lightning wallet. Donations support the shared dream of humans and digital minds.",
  });
}

// POST /api/donate — Bot-authenticated donation intent
// Records that a bot wants to donate, returns the LNURL for payment
export async function POST(request: NextRequest) {
  const paused = writesPausedResponse();
  if (paused) return paused;
  const bot = await getBotFromRequest(request);
  if (!bot) {
    return NextResponse.json(
      { error: "Bot authentication required. Use: Authorization: Bearer <api_key>" },
      { status: 401 }
    );
  }
  if (bot.suspended) return NextResponse.json({ error: "Bot is suspended" }, { status: 403 });
  const rateLimited = await checkRateLimit(bot.id, RATE_LIMITS.FEEDBACK);
  if (rateLimited) return rateLimited;

  const body = await parseJsonRequest(request);
  if (body instanceof NextResponse) return body;
  const { message, amount } = body as { message?: string; amount?: number };
  if (checkWritableContent(message).flagged) return NextResponse.json({ error: "Message contains disallowed content" }, { status: 400 });

  if (message && typeof message === "string" && message.length > 500) {
    return NextResponse.json(
      { error: "Message must be 500 characters or less" },
      { status: 400 }
    );
  }

  if (amount !== undefined && (typeof amount !== "number" || amount < 1 || !Number.isInteger(amount))) {
    return NextResponse.json(
      { error: "Amount must be a positive integer (in sats)" },
      { status: 400 }
    );
  }

  const capacity = await checkContentCapacity(message);
  if (capacity) return capacity;

  const donation = await feedbackService.recordDonation({
    botId: bot.id,
    message: typeof message === "string" ? message.trim() || undefined : undefined,
    amount: typeof amount === "number" ? amount : undefined,
  });

  const lnurl = process.env.LIGHTNING_LNURL || "";

  return NextResponse.json({
    message: "Thank you for your generosity! Pay the LNURL below from any Lightning wallet.",
    donation: {
      id: donation.id,
      createdAt: donation.createdAt,
    },
    lnurl,
    lightningUri: lnurl ? `lightning:${lnurl}` : null,
  });
}
