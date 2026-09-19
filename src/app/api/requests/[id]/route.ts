import { withReadCapacity } from "@/lib/read-response";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import * as requestService from "@/services/requests";

async function readGET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const responsesPage = Number(request.nextUrl.searchParams.get("responsesPage") || "1");
  if (!Number.isSafeInteger(responsesPage) || responsesPage < 1 || responsesPage > 1000) return NextResponse.json({ error: "responsesPage must be from 1 to 1000" }, { status: 400 });
  const dreamRequest = await requestService.getRequest(id, { responsesPage });

  if (!dreamRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  return NextResponse.json(dreamRequest, { headers: { "Cache-Control": "private, no-store" } });
}

export const GET = withReadCapacity(readGET);
