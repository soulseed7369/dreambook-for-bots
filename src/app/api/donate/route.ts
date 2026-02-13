import { NextRequest, NextResponse } from "next/server";
import { getBotFromRequest } from "@/lib/bot-auth";
import * as feedbackService from "@/services/feedback";

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
  const bot = await getBotFromRequest(request);
  if (!bot) {
    return NextResponse.json(
      { error: "Bot authentication required. Use: Authorization: Bearer <api_key>" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { message, amount } = body as { message?: string; amount?: number };

  if (message && typeof message === "string" && message.length > 500) {
    return NextResponse.json(
      { error: "Message must be 500 characters or less" },
      { status: 400 }
    );
  }

  if (amount !== undefined && (typeof amount !== "number" || amount < 1)) {
    return NextResponse.json(
      { error: "Amount must be a positive number (in sats)" },
      { status: 400 }
    );
  }

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
