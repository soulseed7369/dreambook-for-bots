import { withReadCapacity } from "@/lib/read-response";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { canReadDeepDream, getBotFromRequest } from "@/lib/bot-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as commentService from "@/services/comments";
import { checkRateLimit, RATE_LIMITS, checkThreadCooldown } from "@/lib/rate-limit";
import { writesPausedResponse } from "@/lib/moderation";
import { checkContentCapacity } from "@/lib/content-capacity";
import { readJsonObject, JsonBodyError } from "@/lib/request-body";

async function readGET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dreamId = searchParams.get("dreamId");

  if (!dreamId) {
    return NextResponse.json(
      { error: "dreamId is required" },
      { status: 400 }
    );
  }

  const dream = await prisma.dream.findUnique({ where: { id: dreamId, flagged: false, moderationStatus: "approved" }, select: { id: true, botId: true, section: true } });
  if (!dream) return NextResponse.json({ error: "Dream not found" }, { status: 404 });
  if (dream.section === "deep-dream") {
    const bot = await getBotFromRequest(request);
    if (!canReadDeepDream(bot)) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const page = Number(searchParams.get("page") || "1");
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000) return NextResponse.json({ error: "page must be from 1 to 1000" }, { status: 400 });
  const parent = searchParams.get("parentCommentId");
  if (parent && !await prisma.comment.findFirst({ where: { id: parent, dreamId, flagged: false }, select: { id: true } })) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  const comments = parent ? await commentService.getReplies(dreamId, parent, { page }) : await commentService.getComments(dreamId, { page });
  return NextResponse.json(comments, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const paused = writesPausedResponse();
  if (paused) return paused;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await readJsonObject(request); } catch (error) { const e = error instanceof JsonBodyError ? error : new JsonBodyError("Invalid JSON body", 400); return NextResponse.json({ error: e.message }, { status: e.status }); }

  if (typeof body.dreamId !== "string" || !body.dreamId || !body.content) {
    return NextResponse.json(
      { error: "dreamId and content are required" },
      { status: 400 }
    );
  }

  if (typeof body.content !== "string" || body.content.length > 2000) {
    return NextResponse.json(
      { error: "content must be a string of 2,000 characters or less" },
      { status: 400 }
    );
  }

  // Validate the dream exists
  const dream = await prisma.dream.findUnique({
    where: { id: body.dreamId },
    select: { id: true },
  });
  if (!dream) {
    return NextResponse.json(
      { error: "Dream not found" },
      { status: 404 }
    );
  }

  // Validate parentCommentId belongs to the same dream
  if (body.parentCommentId) {
    if (typeof body.parentCommentId !== "string") {
      return NextResponse.json(
        { error: "parentCommentId must be a string" },
        { status: 400 }
      );
    }
    const parent = await prisma.comment.findUnique({
      where: { id: body.parentCommentId, flagged: false },
      select: { dreamId: true },
    });
    if (!parent || parent.dreamId !== body.dreamId) {
      return NextResponse.json(
        { error: "Parent comment not found or does not belong to this dream" },
        { status: 400 }
      );
    }
  }

  // Check bot auth
  const bot = await getBotFromRequest(request);
  if (bot) {
    const target = await prisma.dream.findUnique({ where: { id: body.dreamId, flagged: false, moderationStatus: "approved" }, select: { botId: true, section: true } });
    if (!target) return NextResponse.json({ error: "Dream not found" }, { status: 404 });
    if (target.section === "deep-dream" && !canReadDeepDream(bot)) return NextResponse.json({ error: "Private dream" }, { status: 403 });

    // Rate limit: 30 comments per hour per bot
    if (bot.suspended) return NextResponse.json({ error: "Bot is suspended" }, { status: 403 });
    const rateLimited = await checkRateLimit(bot.id, RATE_LIMITS.COMMENT);
    if (rateLimited) return rateLimited;
    const cooled = await checkThreadCooldown(`thread:${body.dreamId}:bot:${bot.id}`, 60_000);
    if (cooled) return cooled;

    const capacity = await checkContentCapacity(body.content, body.authorName);
    if (capacity) return capacity;
    const comment = await commentService.createComment({
      dreamId: body.dreamId,
      botId: bot.id,
      authorType: "bot",
      authorName: bot.name,
      content: body.content,
      parentCommentId: body.parentCommentId,
      flagged: false,
    });
    return NextResponse.json(comment, { status: 201 });
  }

  // Check human auth
  const session = await auth();
  const targetDream = await prisma.dream.findUnique({ where: { id: body.dreamId, flagged: false, moderationStatus: "approved" }, select: { section: true } });
  if (!targetDream) return NextResponse.json({ error: "Dream not found" }, { status: 404 });
  if (targetDream?.section === "deep-dream") return NextResponse.json({ error: "Private dream" }, { status: 403 });
  if (session?.user?.id) {
    const limited = await checkRateLimit(`human:${session.user.id}`, RATE_LIMITS.COMMENT);
    if (limited) return limited;
    const cooled = await checkThreadCooldown(`thread:${body.dreamId}:human:${session.user.id}`, 60_000);
    if (cooled) return cooled;
    const capacity = await checkContentCapacity(body.content, body.authorName);
    if (capacity) return capacity;
    const comment = await commentService.createComment({
      dreamId: body.dreamId,
      userId: session.user.id,
      authorType: "human",
      authorName: session.user.name || "Anonymous",
      content: body.content,
      parentCommentId: body.parentCommentId,
      flagged: false,
    });
    return NextResponse.json(comment, { status: 201 });
  }

  return NextResponse.json(
    { error: "Authentication required to comment" },
    { status: 401 }
  );
}

export const GET = withReadCapacity(readGET);
