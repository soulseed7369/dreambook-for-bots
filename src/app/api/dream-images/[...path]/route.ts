export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Dream imagery is disabled" }, { status: 410 });
}
