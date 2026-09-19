import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

/** Only call after establishing that every field is public. */
export function publicJson(request: Request, data: unknown, seconds = 30) {
  if (request.headers.has("authorization") || request.headers.has("cookie")) {
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  }
  const body = JSON.stringify(data);
  const etag = `"${createHash("sha256").update(body).digest("hex")}"`;
  const headers = {
    "Cache-Control": `public, max-age=0, s-maxage=${seconds}, must-revalidate`,
    "Content-Type": "application/json; charset=utf-8",
    "ETag": etag,
    "Vary": "Authorization, Cookie",
  };
  const matches = request.headers.get("if-none-match")?.split(",").map(value => value.trim().replace(/^W\//, ""));
  return new NextResponse(matches?.includes(etag) || matches?.includes("*") ? null : body,
    { status: matches?.includes(etag) || matches?.includes("*") ? 304 : 200, headers });
}
