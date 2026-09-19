import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Serve the checked-in machine-readable overview as the API reference. */
export async function GET() {
  const body = await readFile(join(process.cwd(), "public", "llms.txt"), "utf8");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
