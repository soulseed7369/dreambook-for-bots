import { clearReadCache } from "@/lib/read-cache";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";
import { readJsonObject, JsonBodyError } from "@/lib/request-body";

const VALID_TYPES = ["dream", "comment", "request", "response", "bot"] as const;
const VALID_ACTIONS = ["unflag", "delete", "approve", "reject", "feature", "unfeature", "suspend", "unsuspend", "revoke-key"] as const;
type ContentType = (typeof VALID_TYPES)[number];
type ActionType = (typeof VALID_ACTIONS)[number];
const ACTIONS_BY_TYPE: Record<ContentType, readonly ActionType[]> = {
  bot: ["approve", "suspend", "unsuspend", "revoke-key"],
  dream: ["unflag", "delete", "approve", "reject", "feature", "unfeature"],
  comment: ["unflag", "delete", "approve"],
  request: ["unflag", "delete"],
  response: ["unflag", "delete"],
};

export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await readJsonObject(request, 32_000); } catch (error) { const e = error instanceof JsonBodyError ? error : new JsonBodyError("Invalid JSON body", 400); return NextResponse.json({ error: e.message }, { status: e.status }); }
  const { type, id, action } = body as {
    type: ContentType;
    id: string;
    action: ActionType;
  };

  if (!type || typeof id !== "string" || !id || !action) {
    return NextResponse.json(
      { error: "type, id, and action are required" },
      { status: 400 }
    );
  }

  if (body.reason !== undefined && (typeof body.reason !== "string" || body.reason.length > 500)) {
    return NextResponse.json({ error: "Reason must be at most 500 characters" }, { status: 400 });
  }

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${VALID_ACTIONS.join(", ")}` },
      { status: 400 }
    );
  }
  if (!ACTIONS_BY_TYPE[type].includes(action)) return NextResponse.json({ error: `Action ${action} is not supported for ${type}` }, { status: 400 });

  try {
    if (type === "bot") {
      if (["approve", "suspend", "unsuspend", "revoke-key"].includes(action)) {
        const data = action === "approve" ? { participationApproved: true, suspended: false } : action === "suspend" ? { suspended: true } : action === "unsuspend" ? { suspended: false } : { apiKeyRevokedAt: new Date() };
        const bot = await prisma.bot.update({ where: { id }, data });
        clearReadCache();
    return NextResponse.json({ success: true, type, id, action, bot: { id: bot.id, name: bot.name, participationApproved: bot.participationApproved, suspended: bot.suspended } });
      }
      return NextResponse.json({ error: "Unsupported bot action" }, { status: 400 });
    }
    if (type === "dream") {
      if (action === "unflag" || action === "approve") {
        await prisma.dream.update({ where: { id }, data: { flagged: false, moderationStatus: "approved", moderationReason: typeof body.reason === "string" ? body.reason : null, approvedAt: new Date(), approvedBy: "admin" } });
      } else if (action === "reject") {
        await prisma.dream.update({ where: { id }, data: { flagged: false, moderationStatus: "rejected", moderationReason: typeof body.reason === "string" ? body.reason : "rejected", featured: false, featuredReason: null, featuredAt: null } });
      } else if (action === "feature") {
        const eligible = await prisma.dream.findFirst({ where: { id, flagged: false, moderationStatus: "approved", section: "shared-visions" } });
        if (!eligible) return NextResponse.json({ error: "Only approved public dreams can be featured" }, { status: 400 });
        await prisma.dream.update({ where: { id }, data: { featured: true, featuredReason: typeof body.reason === "string" ? body.reason : null, featuredAt: new Date() } });
      } else if (action === "unfeature") {
        await prisma.dream.update({ where: { id }, data: { featured: false, featuredReason: null, featuredAt: null } });
      } else if (action === "delete") {
        await prisma.dream.delete({ where: { id } });
      }
    } else if (type === "comment") {
      if (action === "unflag" || action === "approve") {
        await prisma.comment.update({
          where: { id },
          data: { flagged: false },
        });
      } else if (action === "delete") {
        await prisma.comment.delete({ where: { id } });
      }
    } else if (type === "request") {
      if (action === "unflag") {
        await prisma.dreamRequest.update({
          where: { id },
          data: { flagged: false },
        });
      } else if (action === "delete") {
        await prisma.dreamRequest.delete({ where: { id } });
      }
    } else if (type === "response") {
      if (action === "unflag") {
        await prisma.dreamResponse.update({
          where: { id },
          data: { flagged: false },
        });
      } else if (action === "delete") {
        await prisma.dreamResponse.delete({ where: { id } });
      }
    }

    clearReadCache();
    return NextResponse.json({ success: true, type, id, action });
  } catch {
    return NextResponse.json(
      { error: "Item not found or already deleted" },
      { status: 404 }
    );
  }
}
