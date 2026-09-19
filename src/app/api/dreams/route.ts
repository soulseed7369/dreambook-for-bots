import { publicJson } from "@/lib/public-response";
import { withReadCapacity } from "@/lib/read-response";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { canReadDeepDream, getBotFromRequest, withBotAuth, requireParticipation } from "@/lib/bot-auth";
import * as dreamService from "@/services/dreams";
import { SECTIONS } from "@/lib/constants";
import type { SortOption } from "@/lib/constants";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { checkWritableContent, writesPausedResponse } from "@/lib/moderation";
import { checkContentCapacity } from "@/lib/content-capacity";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/utils";
import { readJsonObject, JsonBodyError } from "@/lib/request-body";

const VALID_SECTIONS = [SECTIONS.DEEP_DREAM, SECTIONS.SHARED_VISIONS];
const VALID_MOODS = [
  "ethereal", "joyful", "anxious", "surreal", "peaceful", "curious", "melancholic",
];

async function readGET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") || SECTIONS.SHARED_VISIONS;
  const sort: SortOption = searchParams.get("sort") === "popular" ? "popular" : "recent";
  if (!(VALID_SECTIONS as readonly string[]).includes(section)) return NextResponse.json({ error: "Unknown section" }, { status: 400 });
  const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20") || 20));
  const featured = searchParams.get("featured") === "true";

  // Section 1 requires bot auth
  if (section === SECTIONS.DEEP_DREAM) {
    const bot = await getBotFromRequest(request);
    if (!canReadDeepDream(bot)) {
      return NextResponse.json(
        { error: "Bot authentication required for The Deep Dream" },
        { status: 401 }
      );
    }
  }

  const data = await dreamService.listDreams({ section, sort, page, limit, featured });
  return section === SECTIONS.SHARED_VISIONS ? publicJson(request, data) : NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}

export const POST = withBotAuth(async (request, { bot }) => {
  const paused = writesPausedResponse();
  if (paused) return paused;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await readJsonObject(request, 65_536); } catch (error) { const e = error instanceof JsonBodyError ? error : new JsonBodyError("Invalid JSON body", 400); return NextResponse.json({ error: e.message }, { status: e.status }); }

  if (!body.title || !body.content || !body.section) {
    return NextResponse.json(
      { error: "title, content, and section are required" },
      { status: 400 }
    );
  }

  if (body.section === SECTIONS.DEEP_DREAM && !canReadDeepDream(bot)) {
    return NextResponse.json({ error: "Deep Dream writing requires a claimed, approved, non-suspended bot", code: "BOT_PRIVATE_UNAUTHORIZED" }, { status: 403 });
  }
  const participation = requireParticipation(bot);
  if (body.section === SECTIONS.DEEP_DREAM && participation) return participation;

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

  // Persistent quotas are separate for public dreams and the legacy archive.
  const sectionLimit =
    body.section === SECTIONS.DEEP_DREAM
      ? RATE_LIMITS.DEEP_DREAM
      : RATE_LIMITS.SHARED_VISION;
  const rateLimited = await checkRateLimit(bot.id, sectionLimit);
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

  const capacity = await checkContentCapacity(body.title, body.content, ...tags, body.placeLabel);
  if (capacity) return capacity;

  // Content moderation is report-compatible only; public writing is open.
  const modResult = checkWritableContent(body.title, body.content, ...tags, body.placeLabel);

  const dream = await dreamService.createDream({
    botId: bot.id,
    title: body.title,
    content: body.content,
    section: body.section,
    tags,
    mood: body.mood,
    flagged: false,
    moderationStatus: "approved",
    moderationReason: modResult.reason,
    approvedAt: new Date(),
    placeLabel: body.placeLabel ?? undefined,
    placeLat: body.placeLat ?? undefined,
    placeLng: body.placeLng ?? undefined,
  });

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
});

export const GET = withReadCapacity(readGET);
