export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readStoredImage } from "@/lib/image-storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await params;

  // Only a single filename segment is valid
  if (!parts || parts.length === 0 || parts.length > 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const file = parts[0];
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await readStoredImage(file);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(result.data), {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
