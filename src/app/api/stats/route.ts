import { NextResponse } from "next/server";
import * as statsService from "@/services/stats";

export async function GET() {
  const stats = await statsService.getSiteStats();
  return NextResponse.json(stats);
}
