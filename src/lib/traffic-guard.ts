/**
 * Small, process-local traffic guard used before a request reaches an API
 * handler or a page. It deliberately has no database dependency: a restart
 * resets the buckets, and multiple instances each enforce their own budget.
 */

export type TrafficClass = "read" | "write" | "admin";

export type TrafficGuardConfig = {
  readRatePerMinute: number;
  readBurst: number;
  writeRatePerMinute: number;
  writeBurst: number;
  adminRatePerMinute: number;
  adminBurst: number;
  perIpReadRatePerMinute: number;
  perIpReadBurst: number;
  perIpWriteRatePerMinute: number;
  perIpWriteBurst: number;
  trustedProxy: boolean;
};

export type TrafficRequest = {
  method: string;
  urlLength: number;
  contentLength?: string | null;
  clientIp?: string | null;
  nowMs?: number;
};

export type TrafficDecision =
  | { allowed: true }
  | {
      allowed: false;
      status: 400 | 413 | 414 | 429;
      reason: "invalid-content-length" | "body-too-large" | "url-too-long" | "rate-limit";
      retryAfterSeconds?: number;
    };

const MAX_CONFIG_VALUE = 100_000;
const MAX_TRACKED_KEYS = 2_048;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_URL_LENGTH = 2_048;

export const DEFAULT_TRAFFIC_GUARD_CONFIG: TrafficGuardConfig = {
  readRatePerMinute: 600,
  readBurst: 120,
  writeRatePerMinute: 120,
  writeBurst: 30,
  adminRatePerMinute: 30,
  adminBurst: 10,
  perIpReadRatePerMinute: 240,
  perIpReadBurst: 60,
  perIpWriteRatePerMinute: 60,
  perIpWriteBurst: 15,
  trustedProxy: false,
};

function positiveInteger(
  environment: Record<string, string | undefined>,
  name: string,
  fallback: number,
  cap = MAX_CONFIG_VALUE,
): number {
  const raw = environment[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, cap);
}

export function readTrafficGuardConfig(
  environment: Record<string, string | undefined> = process.env,
): TrafficGuardConfig {
  return {
    readRatePerMinute: positiveInteger(environment, "TRAFFIC_READ_RATE_PER_MINUTE", DEFAULT_TRAFFIC_GUARD_CONFIG.readRatePerMinute),
    readBurst: positiveInteger(environment, "TRAFFIC_READ_BURST", DEFAULT_TRAFFIC_GUARD_CONFIG.readBurst),
    writeRatePerMinute: positiveInteger(environment, "TRAFFIC_WRITE_RATE_PER_MINUTE", DEFAULT_TRAFFIC_GUARD_CONFIG.writeRatePerMinute),
    writeBurst: positiveInteger(environment, "TRAFFIC_WRITE_BURST", DEFAULT_TRAFFIC_GUARD_CONFIG.writeBurst),
    adminRatePerMinute: positiveInteger(environment, "TRAFFIC_ADMIN_RATE_PER_MINUTE", DEFAULT_TRAFFIC_GUARD_CONFIG.adminRatePerMinute),
    adminBurst: positiveInteger(environment, "TRAFFIC_ADMIN_BURST", DEFAULT_TRAFFIC_GUARD_CONFIG.adminBurst),
    perIpReadRatePerMinute: positiveInteger(environment, "TRAFFIC_PER_IP_READ_RATE_PER_MINUTE", DEFAULT_TRAFFIC_GUARD_CONFIG.perIpReadRatePerMinute),
    perIpReadBurst: positiveInteger(environment, "TRAFFIC_PER_IP_READ_BURST", DEFAULT_TRAFFIC_GUARD_CONFIG.perIpReadBurst),
    perIpWriteRatePerMinute: positiveInteger(environment, "TRAFFIC_PER_IP_WRITE_RATE_PER_MINUTE", DEFAULT_TRAFFIC_GUARD_CONFIG.perIpWriteRatePerMinute),
    perIpWriteBurst: positiveInteger(environment, "TRAFFIC_PER_IP_WRITE_BURST", DEFAULT_TRAFFIC_GUARD_CONFIG.perIpWriteBurst),
    trustedProxy: environment.TRUSTED_PROXY === "1" || environment.TRUSTED_PROXY?.toLowerCase() === "true",
  };
}

class TokenBucket {
  private tokens: number;
  private lastMs: number;
  private readonly ratePerMs: number;
  private readonly capacity: number;

  constructor(ratePerMinute: number, burst: number, nowMs: number) {
    this.ratePerMs = ratePerMinute / 60_000;
    // The configured rate is the sustained allowance. Burst is the maximum
    // number of requests admitted immediately after an idle period.
    this.capacity = burst;
    this.tokens = this.capacity;
    this.lastMs = nowMs;
  }

  take(nowMs: number): number | null {
    const elapsed = Math.max(0, nowMs - this.lastMs);
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.ratePerMs);
    this.lastMs = nowMs;
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return null;
    }
    return Math.max(1, Math.ceil((1 - this.tokens) / this.ratePerMs / 1000));
  }

  get lastUsedMs(): number {
    return this.lastMs;
  }
}

class BoundedBuckets {
  private readonly buckets = new Map<string, TokenBucket>();

  constructor(private readonly maxKeys = MAX_TRACKED_KEYS) {}

  take(key: string, ratePerMinute: number, burst: number, nowMs: number): number | null {
    this.removeOldBuckets(nowMs);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      if (this.buckets.size >= this.maxKeys) {
        const oldest = this.buckets.keys().next().value;
        if (oldest) this.buckets.delete(oldest);
      }
      bucket = new TokenBucket(ratePerMinute, burst, nowMs);
      this.buckets.set(key, bucket);
    } else {
      this.buckets.delete(key);
      this.buckets.set(key, bucket);
    }
    return bucket.take(nowMs);
  }

  private removeOldBuckets(nowMs: number): void {
    const expiry = nowMs - 10 * 60_000;
    for (const [key, bucket] of this.buckets) {
      if (bucket.lastUsedMs < expiry) this.buckets.delete(key);
      else break;
    }
  }

  get size(): number {
    return this.buckets.size;
  }
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export class TrafficGuard {
  private readonly global = new BoundedBuckets(3);
  private readonly perIp = new BoundedBuckets();

  constructor(readonly config: TrafficGuardConfig = readTrafficGuardConfig()) {}

  check(request: TrafficRequest, trafficClass?: TrafficClass): TrafficDecision {
    if (request.urlLength > MAX_URL_LENGTH) {
      return { allowed: false, status: 414, reason: "url-too-long" };
    }

    if (request.contentLength !== undefined && request.contentLength !== null) {
      const parsedLength = Number(request.contentLength);
      if (!/^\d+$/.test(request.contentLength) || !Number.isSafeInteger(parsedLength) || parsedLength < 0) {
        return { allowed: false, status: 400, reason: "invalid-content-length" };
      }
      if (parsedLength > MAX_BODY_BYTES) {
        return { allowed: false, status: 413, reason: "body-too-large" };
      }
    }

    const nowMs = request.nowMs ?? Date.now();
    const kind = trafficClass ?? classifyTraffic(request.method, "");
    const globalLimit = limitsFor(this.config, kind);
    const globalWait = this.global.take(kind, globalLimit.rate, globalLimit.burst, nowMs);
    if (globalWait !== null) return rateLimited(globalWait);

    if (this.config.trustedProxy && request.clientIp && kind !== "admin") {
      const ipLimit = kind === "read"
        ? { rate: this.config.perIpReadRatePerMinute, burst: this.config.perIpReadBurst }
        : { rate: this.config.perIpWriteRatePerMinute, burst: this.config.perIpWriteBurst };
      const ipWait = this.perIp.take(`${kind}:${request.clientIp}`, ipLimit.rate, ipLimit.burst, nowMs);
      if (ipWait !== null) return rateLimited(ipWait);
    }

    return { allowed: true };
  }

  get trackedIpBuckets(): number {
    return this.perIp.size;
  }
}

export function classifyTraffic(method: string, pathname: string): TrafficClass {
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/")
  ) return "admin";
  return WRITE_METHODS.has(method.toUpperCase()) ? "write" : "read";
}

function limitsFor(config: TrafficGuardConfig, kind: TrafficClass): { rate: number; burst: number } {
  if (kind === "admin") return { rate: config.adminRatePerMinute, burst: config.adminBurst };
  if (kind === "write") return { rate: config.writeRatePerMinute, burst: config.writeBurst };
  return { rate: config.readRatePerMinute, burst: config.readBurst };
}

function rateLimited(retryAfterSeconds: number): TrafficDecision {
  return { allowed: false, status: 429, reason: "rate-limit", retryAfterSeconds };
}

export const TRAFFIC_LIMITS = Object.freeze({
  maxBodyBytes: MAX_BODY_BYTES,
  maxUrlLength: MAX_URL_LENGTH,
});
