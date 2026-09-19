/** Bound actual bytes, including requests with no Content-Length header. */
export class JsonBodyError extends Error {
  constructor(message: string, public readonly status: 400 | 413) {
    super(message);
    this.name = "JsonBodyError";
  }
}

export async function readJsonObject(
  request: Request,
  maxBytes = 16_384,
): Promise<Record<string, unknown>> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new JsonBodyError("Request body is too large", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new JsonBodyError("A JSON object is required", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new JsonBodyError("Request body is too large", 413);
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new JsonBodyError("Invalid JSON body", 400);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new JsonBodyError("A JSON object is required", 400);
  }
  return value as Record<string, unknown>;
}
