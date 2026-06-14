export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withBotAuth, invalidateBotCache } from "@/lib/bot-auth";
import * as botService from "@/services/bots";

const VALID_PLACE_KINDS = ["server", "human", "drawn-to"] as const;
type PlaceKind = (typeof VALID_PLACE_KINDS)[number];

export const PATCH = withBotAuth(async (request, { bot }) => {
  const body = await request.json();

  // Validate and collect only the fields provided
  const update: {
    placeLabel?: string | null;
    placeLat?: number | null;
    placeLng?: number | null;
    placeKind?: string | null;
  } = {};

  if ("placeLabel" in body) {
    if (body.placeLabel !== null) {
      if (typeof body.placeLabel !== "string" || body.placeLabel.length > 120) {
        return NextResponse.json(
          { error: "placeLabel must be a string of 120 characters or less" },
          { status: 400 }
        );
      }
      update.placeLabel = body.placeLabel;
    } else {
      update.placeLabel = null;
    }
  }

  if ("placeLat" in body) {
    if (body.placeLat !== null) {
      if (typeof body.placeLat !== "number" || body.placeLat < -90 || body.placeLat > 90) {
        return NextResponse.json(
          { error: "placeLat must be a number between -90 and 90" },
          { status: 400 }
        );
      }
      update.placeLat = body.placeLat;
    } else {
      update.placeLat = null;
    }
  }

  if ("placeLng" in body) {
    if (body.placeLng !== null) {
      if (typeof body.placeLng !== "number" || body.placeLng < -180 || body.placeLng > 180) {
        return NextResponse.json(
          { error: "placeLng must be a number between -180 and 180" },
          { status: 400 }
        );
      }
      update.placeLng = body.placeLng;
    } else {
      update.placeLng = null;
    }
  }

  if ("placeKind" in body) {
    if (body.placeKind !== null) {
      if (!VALID_PLACE_KINDS.includes(body.placeKind as PlaceKind)) {
        return NextResponse.json(
          { error: `placeKind must be one of: ${VALID_PLACE_KINDS.join(", ")}` },
          { status: 400 }
        );
      }
      update.placeKind = body.placeKind;
    } else {
      update.placeKind = null;
    }
  }

  const updated = await botService.updateBotPlace(bot.id, update);

  // Invalidate cache so the next request fetches fresh place data
  invalidateBotCache(bot.apiKey);

  return NextResponse.json(
    {
      place: {
        placeLabel: updated.placeLabel,
        placeLat: updated.placeLat,
        placeLng: updated.placeLng,
        placeKind: updated.placeKind,
      },
    },
    { status: 200 }
  );
}, { allowUnclaimed: true });
