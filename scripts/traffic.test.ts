import assert from "node:assert/strict";
import test from "node:test";
import { ReadCache, ReadCacheCapacityError } from "../src/lib/read-cache";
import { classifyTraffic, readTrafficGuardConfig, TrafficGuard } from "../src/lib/traffic-guard";

const request = (overrides: Partial<Parameters<TrafficGuard["check"]>[0]> = {}) => ({
  method: "GET",
  urlLength: 100,
  nowMs: 1_000,
  ...overrides,
});

test("traffic configuration is positive, capped, and proxy trust is opt-in", () => {
  const config = readTrafficGuardConfig({
    TRAFFIC_READ_RATE_PER_MINUTE: "999999999",
    TRAFFIC_READ_BURST: "-1",
    TRUSTED_PROXY: "true",
  });
  assert.equal(config.readRatePerMinute, 100_000);
  assert.equal(config.readBurst, 120);
  assert.equal(config.trustedProxy, true);
  assert.equal(classifyTraffic("GET", "/admin/moderation"), "admin");
  assert.equal(classifyTraffic("GET", "/api/admin/queue"), "admin");
  assert.equal(classifyTraffic("POST", "/api/dreams"), "write");
});

test("guard bounds URL and declared body size before rate accounting", () => {
  const guard = new TrafficGuard({ ...readTrafficGuardConfig({}), readRatePerMinute: 1, readBurst: 1, writeRatePerMinute: 1, writeBurst: 1 });
  const tooLong = guard.check(request({ urlLength: 2_049 }));
  const tooLarge = guard.check(request({ contentLength: "65537" }));
  const invalid = guard.check(request({ contentLength: "nope" }));
  assert.equal(tooLong.allowed, false);
  assert.equal(tooLarge.allowed, false);
  assert.equal(invalid.allowed, false);
  if (!tooLong.allowed && !tooLarge.allowed && !invalid.allowed) {
    assert.equal(tooLong.status, 414);
    assert.equal(tooLarge.status, 413);
    assert.equal(invalid.status, 400);
  }
});

test("global buckets allow a burst and then return a retryable 429", () => {
  const guard = new TrafficGuard({ ...readTrafficGuardConfig({}), readRatePerMinute: 1, readBurst: 1 });
  assert.equal(guard.check(request()).allowed, true);
  const limited = guard.check(request({ nowMs: 1_000 }));
  assert.equal(limited.allowed, false);
  if (!limited.allowed) {
    assert.equal(limited.status, 429);
    assert.equal(limited.reason, "rate-limit");
    assert.ok((limited.retryAfterSeconds ?? 0) >= 1);
  }
});

test("per-IP accounting is used only with explicit trusted proxy configuration", () => {
  const base = { ...readTrafficGuardConfig({}), readRatePerMinute: 100, readBurst: 100, perIpReadRatePerMinute: 1, perIpReadBurst: 2 };
  const trusted = new TrafficGuard({ ...base, trustedProxy: true });
  assert.equal(trusted.check(request({ clientIp: "198.51.100.1" })).allowed, true);
  assert.equal(trusted.check(request({ clientIp: "198.51.100.1" })).allowed, true);
  assert.equal(trusted.check(request({ clientIp: "198.51.100.1" })).allowed, false);
  assert.equal(trusted.trackedIpBuckets, 1);
  const untrusted = new TrafficGuard({ ...base, trustedProxy: false });
  assert.equal(untrusted.check(request({ clientIp: "198.51.100.1" })).allowed, true);
  assert.equal(untrusted.check(request({ clientIp: "198.51.100.1" })).allowed, true);
  assert.equal(untrusted.check(request({ clientIp: "198.51.100.1" })).allowed, true);
  assert.equal(untrusted.trackedIpBuckets, 0);
});

test("public read cache coalesces loads and does not retain private results", async () => {
  const cache = new ReadCache(4, 1_000, 8);
  let loads = 0;
  const loader = async () => { loads += 1; await new Promise((resolve) => setTimeout(resolve, 5)); return "public dream"; };
  const values = await Promise.all([
    cache.getOrLoad("public", loader, { cacheable: true, ttlMs: 10_000 }),
    cache.getOrLoad("public", loader, { cacheable: true, ttlMs: 10_000 }),
  ]);
  assert.deepEqual(values, ["public dream", "public dream"]);
  assert.equal(loads, 1);
  assert.equal(cache.entryCount, 1);
  await cache.getOrLoad("private", async () => "private dream");
  assert.equal(cache.entryCount, 1);
});

test("read cache evicts to its byte budget and rejects excess concurrent work", async () => {
  const cache = new ReadCache(2, 10, 1);
  await cache.getOrLoad("first", async () => "123456", { cacheable: true, ttlMs: 10_000 });
  await cache.getOrLoad("second", async () => "abcdef", { cacheable: true, ttlMs: 10_000 });
  assert.equal(cache.entryCount, 1);
  let release!: () => void;
  const pending = cache.getOrLoad("pending", () => new Promise<string>((resolve) => { release = () => resolve("done"); }));
  await assert.rejects(cache.getOrLoad("other", async () => "blocked"), (error: unknown) => error instanceof ReadCacheCapacityError);
  release();
  await pending;
});

test("cache invalidation prevents an older in-flight public read from being restored", async () => {
  const cache = new ReadCache(4, 1_000, 8);
  let release!: () => void;
  const pending = cache.getOrLoad("dream-feed", () => new Promise<string>((resolve) => { release = () => resolve("stale feed"); }), { cacheable: true, ttlMs: 10_000 });
  cache.invalidate("dream-feed");
  release();
  await pending;
  assert.equal(cache.get("dream-feed"), undefined);
});
