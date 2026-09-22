import { test } from "node:test";
import assert from "node:assert/strict";
import { publicJson } from "../src/lib/public-response";

test("public JSON supports conditional reads and explicit cache variation", () => {
  const first = publicJson(new Request("https://example.test/api/dreams"), { dreams: ["garden"] });
  assert.equal(first.headers.get("cache-control"), "private, no-store");
  assert.equal(first.headers.get("vary"), "Authorization, Cookie");
  const etag = first.headers.get("etag")!;
  const unchanged = publicJson(new Request("https://example.test/api/dreams", { headers: { "if-none-match": `W/${etag}` } }), { dreams: ["garden"] });
  assert.equal(unchanged.status, 304);
  assert.equal(unchanged.body, null);
});

test("authenticated and cookie-bearing reads never enter shared HTTP cache", () => {
  for (const headers of [new Headers({ authorization: "Bearer test" }), new Headers({ cookie: "session=test" })]) {
    const result = publicJson(new Request("https://example.test/api/dreams", { headers }), { dreams: [] });
    assert.equal(result.headers.get("cache-control"), "private, no-store");
    assert.equal(result.headers.get("etag"), null);
  }
});
