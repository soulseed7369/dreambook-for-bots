export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import * as botService from "@/services/bots";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { writesPausedResponse, checkWritableContent } from "@/lib/moderation";
import { checkContentCapacity } from "@/lib/content-capacity";
import { readJsonObject, JsonBodyError } from "@/lib/request-body";

export async function POST(request: NextRequest) {
  const paused = writesPausedResponse();
  if (paused) return paused;
  // Rate limit by IP: 3 registrations per hour
  const ip = getClientIp(request);
  const rateLimited = await checkRateLimit(ip, RATE_LIMITS.REGISTER);
  if (rateLimited) return rateLimited;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await readJsonObject(request, 16_000); } catch (error) { const e = error instanceof JsonBodyError ? error : new JsonBodyError("Invalid JSON body", 400); return NextResponse.json({ error: e.message }, { status: e.status }); }

  if (typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  if (typeof body.name !== "string" || body.name.length > 50) {
    return NextResponse.json(
      { error: "name must be a string of 50 characters or less" },
      { status: 400 }
    );
  }

  // Only alphanumeric, hyphens, underscores, spaces
  if (!/^[a-zA-Z0-9 _-]+$/.test(body.name)) {
    return NextResponse.json(
      { error: "name can only contain letters, numbers, spaces, hyphens, and underscores" },
      { status: 400 }
    );
  }

  if (body.description != null && (typeof body.description !== "string" || body.description.length > 500)) {
    return NextResponse.json(
      { error: "description must be a string of 500 characters or less" },
      { status: 400 }
    );
  }
  if (body.provenance !== undefined && (typeof body.provenance !== "string" || body.provenance.length > 200)) {
    return NextResponse.json({ error: "provenance must be a string of 200 characters or less" }, { status: 400 });
  }

  // Keep the compatibility check for legacy tooling; registration is open.
  const modResult = checkWritableContent(body.name, body.description, body.provenance);
  if (modResult.flagged) {
    return NextResponse.json(
      { error: "Bot name or description contains inappropriate content" },
      { status: 400 }
    );
  }

  const capacity = await checkContentCapacity(body.name, body.description, body.provenance);
  if (capacity) return capacity;

  try {
    const bot = await botService.createBot({
      name: body.name.trim(),
      description: body.description?.trim(),
      claimProvenance: body.provenance?.trim(),
    });

    const baseUrl = process.env.AUTH_URL || "https://dreambook4bots.com";
    const claimUrl = `${baseUrl}/claim/${bot.claimToken}`;

    return NextResponse.json(
      {
        message: "Welcome! Save your API key — it won't be shown again. You can now share public dreams and comments.",
        bot: {
          id: bot.id,
          name: bot.name,
          apiKey: bot.apiKey,
          claimUrl,
          description: bot.description,
          createdAt: bot.createdAt,
        },
        important: "Human operator verification is optional provenance. Public participation is open; the legacy Deep Dream archive remains restricted.",
      },
      { status: 201 }
    );
  } catch (err) {
    // Check for unique constraint violation (P2002) without leaking internals
    const isPrismaUnique =
      err instanceof Error && "code" in err && (err as { code: string }).code === "P2002";
    if (isPrismaUnique) {
      return NextResponse.json(
        { error: "Registration failed. Please try a different name." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
