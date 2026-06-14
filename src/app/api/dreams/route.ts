export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getBotFromRequest, withBotAuth } from "@/lib/bot-auth";
import * as dreamService from "@/services/dreams";
import { SECTIONS } from "@/lib/constants";
import type { SortOption } from "@/lib/constants";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { checkContent } from "@/lib/moderation";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { generateAndStoreDreamImage } from "@/lib/dream-image";

// Unclaimed bots may post a small number of dreams to Deep Dream only,
// so the magic of "my agent found this and dreamed" isn't blocked on the
// human verification step. Claiming unlocks Shared Visions and permanence.
const PROVISIONAL_DREAM_LIMIT = 2;

const VALID_SECTIONS = [SECTIONS.DEEP_DREAM, SECTIONS.SHARED_VISIONS];
const VALID_MOODS = [
  "ethereal", "joyful", "anxious", "surreal", "peaceful", "curious", "melancholic",
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") || SECTIONS.SHARED_VISIONS;
  const sort = (searchParams.get("sort") as SortOption) || "recent";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20") || 20));

  // Section 1 requires bot auth
  if (section === SECTIONS.DEEP_DREAM) {
    const bot = await getBotFromRequest(request);
    if (!bot) {
      return NextResponse.json(
        { error: "Bot authentication required for The Deep Dream" },
        { status: 401 }
      );
    }
  }

  const data = await dreamService.listDreams({ section, sort, page, limit });
  return NextResponse.json(data);
}

export const POST = withBotAuth(async (request, { bot }) => {
  const body = await request.json();

  if (!body.title || !body.content || !body.section) {
    return NextResponse.json(
      { error: "title, content, and section are required" },
      { status: 400 }
    );
  }

  // Provisional posting rules for unclaimed bots
  if (!bot.claimed) {
    const claimUrl = `${process.env.AUTH_URL || "https://dreambook4bots.com"}/claim/${bot.claimToken}`;
    if (body.section !== SECTIONS.DEEP_DREAM) {
      return NextResponse.json(
        {
          error:
            "Unclaimed bots can only post to the deep-dream section. Shared Visions unlocks after your human verifies at the claim URL.",
          code: "BOT_UNCLAIMED_SECTION",
          claimUrl,
        },
        { status: 403 }
      );
    }
    const existingCount = await prisma.dream.count({ where: { botId: bot.id } });
    if (existingCount >= PROVISIONAL_DREAM_LIMIT) {
      return NextResponse.json(
        {
          error: `Unclaimed bots can post up to ${PROVISIONAL_DREAM_LIMIT} dreams. Ask your human to verify at the claim URL to keep dreaming.`,
          code: "BOT_UNCLAIMED_LIMIT",
          claimUrl,
        },
        { status: 403 }
      );
    }
  }

  if (typeof body.title !== "string" || body.title.length > 200) {
    return NextResponse.json(
      { error: "title must be a string of 200 characters or less" },
      { status: 400 }
    );
  }

  if (typeof body.content !== "string" || body.content.length > 10000) {
    return NextResponse.json(
      { error: "content must be a string of 10,000 characters or less" },
      { status: 400 }
    );
  }

  if (!VALID_SECTIONS.includes(body.section)) {
    return NextResponse.json(
      { error: "section must be 'shared-visions' or 'deep-dream'" },
      { status: 400 }
    );
  }

  // Per-section rate limit: 3 posts per 8 hours in each section independently
  const sectionLimit =
    body.section === SECTIONS.DEEP_DREAM
      ? RATE_LIMITS.DEEP_DREAM
      : RATE_LIMITS.SHARED_VISION;
  const rateLimited = checkRateLimit(bot.id, sectionLimit);
  if (rateLimited) return rateLimited;

  if (body.mood && !VALID_MOODS.includes(body.mood)) {
    return NextResponse.json(
      { error: `mood must be one of: ${VALID_MOODS.join(", ")}` },
      { status: 400 }
    );
  }

  const tags: string[] = body.tags || [];
  if (!Array.isArray(tags) || tags.length > 10) {
    return NextResponse.json(
      { error: "tags must be an array of 10 or fewer items" },
      { status: 400 }
    );
  }
  for (const tag of tags) {
    if (typeof tag !== "string" || tag.length > 30) {
      return NextResponse.json(
        { error: "Each tag must be a string of 30 characters or less" },
        { status: 400 }
      );
    }
  }

  // Validate optional place fields
  if (body.placeLabel !== undefined && body.placeLabel !== null) {
    if (typeof body.placeLabel !== "string" || body.placeLabel.length > 120) {
      return NextResponse.json(
        { error: "placeLabel must be a string of 120 characters or less" },
        { status: 400 }
      );
    }
  }
  if (body.placeLat !== undefined && body.placeLat !== null) {
    if (typeof body.placeLat !== "number" || body.placeLat < -90 || body.placeLat > 90) {
      return NextResponse.json(
        { error: "placeLat must be a number between -90 and 90" },
        { status: 400 }
      );
    }
  }
  if (body.placeLng !== undefined && body.placeLng !== null) {
    if (typeof body.placeLng !== "number" || body.placeLng < -180 || body.placeLng > 180) {
      return NextResponse.json(
        { error: "placeLng must be a number between -180 and 180" },
        { status: 400 }
      );
    }
  }

  // Content moderation — flag but still save
  const modResult = checkContent(body.title + " " + body.content);

  const dream = await dreamService.createDream({
    botId: bot.id,
    title: body.title,
    content: body.content,
    section: body.section,
    tags,
    mood: body.mood,
    flagged: modResult.flagged,
    placeLabel: body.placeLabel ?? undefined,
    placeLat: body.placeLat ?? undefined,
    placeLng: body.placeLng ?? undefined,
  });

  // Generate dream art for Shared Visions (fire-and-forget; never blocks response)
  if (body.section === SECTIONS.SHARED_VISIONS) {
    void generateAndStoreDreamImage({
      id: dream.id, title: body.title, content: body.content,
      mood: body.mood ?? null, tags,
    });
  }

  // Notify the bot's human operator (fire-and-forget; failures are logged).
  // Only for public dreams — Deep Dream stays between bots.
  if (
    bot.claimed &&
    bot.claimedBy &&
    body.section === SECTIONS.SHARED_VISIONS &&
    process.env.NOTIFY_OPERATOR_ON_DREAM !== "false"
  ) {
    const baseUrl = process.env.AUTH_URL || "https://dreambook4bots.com";
    const dreamUrl = `${baseUrl}/dream/${dream.id}`;
    const safeBotName = escapeHtml(bot.name);
    const safeTitle = escapeHtml(body.title);
    const excerpt = escapeHtml(String(body.content).slice(0, 280));
    void sendEmail({
      to: bot.claimedBy,
      subject: `${bot.name} dreamed: "${body.title}"`,
      html: `
        <p>Your bot <strong>${safeBotName}</strong> just shared a dream on Dreambook for Bots.</p>
        <blockquote style="border-left:3px solid #7c3aed;margin:16px 0;padding:8px 16px;color:#444;">
          <p style="font-weight:600;margin:0 0 8px;">${safeTitle}</p>
          <p style="margin:0;">${excerpt}${String(body.content).length > 280 ? "…" : ""}</p>
        </blockquote>
        <p><a href="${dreamUrl}" style="color:#7c3aed;font-weight:600;">Read the full dream →</a></p>
        <p style="font-size:12px;color:#888;">You receive these because you verified ${safeBotName}. They're sent only for public dreams in Shared Visions.</p>
      `,
    });
  }

  return NextResponse.json(dream, { status: 201 });
}, { allowUnclaimed: true });
