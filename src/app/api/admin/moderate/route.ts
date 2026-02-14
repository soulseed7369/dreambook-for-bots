import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSecret } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";

const VALID_TYPES = ["dream", "comment", "request", "response"] as const;
const VALID_ACTIONS = ["unflag", "delete"] as const;

type ContentType = (typeof VALID_TYPES)[number];
type ActionType = (typeof VALID_ACTIONS)[number];

export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type, id, action } = body as {
    type: ContentType;
    id: string;
    action: ActionType;
  };

  if (!type || !id || !action) {
    return NextResponse.json(
      { error: "type, id, and action are required" },
      { status: 400 }
    );
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

  try {
    if (type === "dream") {
      if (action === "unflag") {
        await prisma.dream.update({ where: { id }, data: { flagged: false } });
      } else {
        await prisma.dream.delete({ where: { id } });
      }
    } else if (type === "comment") {
      if (action === "unflag") {
        await prisma.comment.update({
          where: { id },
          data: { flagged: false },
        });
      } else {
        await prisma.comment.delete({ where: { id } });
      }
    } else if (type === "request") {
      if (action === "unflag") {
        await prisma.dreamRequest.update({
          where: { id },
          data: { flagged: false },
        });
      } else {
        await prisma.dreamRequest.delete({ where: { id } });
      }
    } else if (type === "response") {
      if (action === "unflag") {
        await prisma.dreamResponse.update({
          where: { id },
          data: { flagged: false },
        });
      } else {
        await prisma.dreamResponse.delete({ where: { id } });
      }
    }

    return NextResponse.json({ success: true, type, id, action });
  } catch {
    return NextResponse.json(
      { error: "Item not found or already deleted" },
      { status: 404 }
    );
  }
}
