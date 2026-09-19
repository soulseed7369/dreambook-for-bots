import assert from "node:assert/strict";
import test from "node:test";
import { JsonBodyError, readJsonObject } from "../src/lib/request-body";

const request = (body: string) => new Request("http://localhost/test", { method: "POST", body });

test("accepts a bounded JSON object and preserves poetic whitespace", async () => {
  assert.deepEqual(await readJsonObject(request('{"content":"a garden\\n  at dusk"}')), { content: "a garden\n  at dusk" });
});

test("rejects malformed JSON and non-object bodies", async () => {
  for (const body of ["{", "null", "[]", '"text"', "1", ""]) {
    await assert.rejects(readJsonObject(request(body)), (error: unknown) => error instanceof JsonBodyError && error.status === 400);
  }
});

test("enforces bytes without trusting a Content-Length header", async () => {
  const body = '{"content":"' + "🌿".repeat(100) + '"}';
  await assert.rejects(readJsonObject(request(body), 200), (error: unknown) => error instanceof JsonBodyError && error.status === 413);
});

test("rejects a streaming body as soon as the byte budget is exceeded", async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(100)); controller.enqueue(new Uint8Array(100)); },
    cancel() { cancelled = true; },
  });
  const streamed = new Request("http://localhost/test", { method: "POST", body: stream, duplex: "half" } as RequestInit);
  await assert.rejects(readJsonObject(streamed, 150), (error: unknown) => error instanceof JsonBodyError && error.status === 413);
  assert.equal(cancelled, true);
});
