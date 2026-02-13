import { NextRequest, NextResponse } from "next/server";
import * as requestService from "@/services/requests";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dreamRequest = await requestService.getRequest(id);

  if (!dreamRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  return NextResponse.json(dreamRequest);
}
