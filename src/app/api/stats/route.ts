import { withReadCapacity } from "@/lib/read-response";
export const dynamic = "force-dynamic";
import { publicJson } from "@/lib/public-response";
import * as statsService from "@/services/stats";

async function readGET(request: Request) {
  const stats = await statsService.getSiteStats();
  return publicJson(request, stats);
}

export const GET = withReadCapacity(readGET);
