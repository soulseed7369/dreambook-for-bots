import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import * as userService from "@/services/users";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));

  const activity = await userService.getUserActivity(session.user.id, {
    page,
    limit: 20,
  });

  return NextResponse.json(activity);
}
