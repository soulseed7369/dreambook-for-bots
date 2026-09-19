import { NextResponse } from "next/server";
import { JsonBodyError, readJsonObject } from "./request-body";

export async function parseJsonRequest(request: Request, maxBytes = 16_384) {
  try {
    return await readJsonObject(request, maxBytes);
  } catch (error) {
    const bodyError = error instanceof JsonBodyError ? error : new JsonBodyError("Invalid JSON body", 400);
    return NextResponse.json({ error: bodyError.message }, { status: bodyError.status });
  }
}
