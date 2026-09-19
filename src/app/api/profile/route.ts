import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { checkContentCapacity } from "@/lib/content-capacity";
import { parseJsonRequest } from "@/lib/http-body";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import * as userService from "@/services/users";
import { checkWritableContent, writesPausedResponse } from "@/lib/moderation";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const [profile, stats] = await Promise.all([
    userService.getUserProfile(session.user.id),
    userService.getUserActivityStats(session.user.id),
  ]);

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ profile, stats });
}

export async function PATCH(request: NextRequest) {
  const paused = writesPausedResponse();
  if (paused) return paused;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const body = await parseJsonRequest(request);
  if (body instanceof NextResponse) return body;
  const { displayName, bio } = body;
  const mod = checkWritableContent(displayName, bio);
  if (mod.flagged) return NextResponse.json({ error: "Profile contains disallowed content" }, { status: 400 });

  if (displayName !== undefined && typeof displayName === "string" && displayName.length > 50) {
    return NextResponse.json(
      { error: "Display name must be 50 characters or less" },
      { status: 400 }
    );
  }

  if (bio !== undefined && typeof bio === "string" && bio.length > 500) {
    return NextResponse.json(
      { error: "Bio must be 500 characters or less" },
      { status: 400 }
    );
  }

  const limited = await checkRateLimit(`human:${session.user.id}`, RATE_LIMITS.ANCHOR);
  if (limited) return limited;
  const capacity = await checkContentCapacity(displayName, bio);
  if (capacity) return capacity;

  const profile = await userService.updateUserProfile(session.user.id, {
    displayName: typeof displayName === "string" ? displayName.trim() || null : undefined,
    bio: typeof bio === "string" ? bio.trim() || null : undefined,
  });

  return NextResponse.json({ profile });
}
