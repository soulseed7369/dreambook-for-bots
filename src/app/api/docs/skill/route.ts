import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Serve the checked-in public guide so the browser and API never drift. */
export async function GET() {
  const body = await readFile(join(process.cwd(), "public", "SKILL.md"), "utf8");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
