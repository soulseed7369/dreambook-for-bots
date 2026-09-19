const DEFAULT_MAX_ENTRIES = 64;
const DEFAULT_MAX_BYTES = 16 * 1024 * 1024;
const DEFAULT_MAX_CONCURRENT_LOADS = 8;
const MAX_CACHE_ENTRIES = 1_024;
const MAX_CONCURRENT_LOADS = 64;
const MAX_CACHE_BYTES = 64 * 1024 * 1024;

export type ReadCacheOptions = {
  /** Cache only public, non-user-specific results. Defaults to false. */
  cacheable?: boolean;
  ttlMs?: number;
  sizeBytes?: number;
};

type CacheEntry = {
  value: unknown;
  expiresAt: number;
  lastUsedAt: number;
  sizeBytes: number;
};

type InFlight = {
  promise: Promise<unknown>;
  generation: number;
  keyGeneration: number;
  cacheable: boolean;
};

export class ReadCacheCapacityError extends Error {
  readonly code = "READ_CACHE_CAPACITY";
  readonly status = 503;
  readonly retryAfterSeconds = 5;

  constructor() {
    super("The public read cache is temporarily at capacity. Retry shortly.");
    this.name = "ReadCacheCapacityError";
  }
}

// Short alias for route handlers that want to turn cache saturation into a
// retryable 503 without coupling themselves to the implementation name.
export { ReadCacheCapacityError as ReadCapacityError };

export class ReadCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, InFlight[]>();
  private readonly invalidatedKeys = new Map<string, number>();
  private usedBytes = 0;
  private generation = 0;

  constructor(
    private readonly maxEntries = DEFAULT_MAX_ENTRIES,
    private readonly maxBytes = DEFAULT_MAX_BYTES,
    private readonly maxConcurrentLoads = DEFAULT_MAX_CONCURRENT_LOADS,
  ) {
    if (!Number.isInteger(maxEntries) || maxEntries <= 0 || maxEntries > MAX_CACHE_ENTRIES) throw new RangeError("maxEntries is outside the cache budget");
    if (!Number.isInteger(maxBytes) || maxBytes <= 0 || maxBytes > MAX_CACHE_BYTES) throw new RangeError("maxBytes is outside the cache budget");
    if (!Number.isInteger(maxConcurrentLoads) || maxConcurrentLoads <= 0 || maxConcurrentLoads > MAX_CONCURRENT_LOADS) throw new RangeError("maxConcurrentLoads is outside the cache budget");
  }

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    const now = Date.now();
    if (entry.expiresAt <= now) {
      this.delete(key);
      return undefined;
    }
    entry.lastUsedAt = now;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value as T;
  }

  async getOrLoad<T>(
    key: string,
    loader: () => T | PromiseLike<T>,
    options: ReadCacheOptions = {},
  ): Promise<T> {
    const generation = this.generation;
    const keyGeneration = this.invalidatedKeys.get(key) ?? 0;
    const cacheable = options.cacheable === true;
    if (cacheable) {
      const cached = this.get<T>(key);
      if (cached !== undefined) return cached;
    }

    const sameKeyLoads = this.inFlight.get(key) ?? [];
    const existing = sameKeyLoads.find((load) =>
      load.generation === generation &&
      load.keyGeneration === keyGeneration &&
      load.cacheable === cacheable,
    );
    if (existing) return existing.promise as Promise<T>;
    if (this.activeLoadCount >= this.maxConcurrentLoads) throw new ReadCacheCapacityError();

    const promise = (async () => {
      const value = await loader();
      const stillCurrent = generation === this.generation && keyGeneration === (this.invalidatedKeys.get(key) ?? 0);
      if (stillCurrent && cacheable && options.ttlMs !== 0 && value !== undefined) {
        this.store(key, value, options);
      }
      return value;
    })();
    const record: InFlight = { promise, generation, keyGeneration, cacheable };
    sameKeyLoads.push(record);
    this.inFlight.set(key, sameKeyLoads);
    try {
      return await promise;
    } finally {
      const current = this.inFlight.get(key);
      if (current) {
        const remaining = current.filter((load) => load.promise !== promise);
        if (remaining.length === 0) this.inFlight.delete(key);
        else this.inFlight.set(key, remaining);
      }
    }
  }

  clear(): void {
    this.generation += 1;
    this.entries.clear();
    this.usedBytes = 0;
  }

  /** Remove one public key and prevent an already-running load from restoring it. */
  invalidate(key: string): void {
    this.delete(key);
    this.invalidatedKeys.set(key, (this.invalidatedKeys.get(key) ?? 0) + 1);
    while (this.invalidatedKeys.size > 256) {
      const oldestKey = [...this.invalidatedKeys.keys()].find((candidate) => !this.inFlight.has(candidate));
      if (!oldestKey) break;
      this.invalidatedKeys.delete(oldestKey);
    }
  }

  get entryCount(): number {
    this.removeExpired();
    return this.entries.size;
  }

  get byteCount(): number {
    this.removeExpired();
    return this.usedBytes;
  }

  get activeLoads(): number {
    return this.activeLoadCount;
  }

  private get activeLoadCount(): number {
    let count = 0;
    for (const loads of this.inFlight.values()) count += loads.length;
    return count;
  }

  private store(key: string, value: unknown, options: ReadCacheOptions): void {
    const ttlMs = Math.max(1, Math.floor(options.ttlMs ?? 30_000));
    const requestedSize = options.sizeBytes;
    const sizeBytes = requestedSize === undefined ? estimateBytes(value) : requestedSize;
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > this.maxBytes) return;

    this.removeExpired();
    this.delete(key);
    while (this.entries.size >= this.maxEntries || this.usedBytes + sizeBytes > this.maxBytes) {
      const oldestKey = this.entries.keys().next().value;
      if (!oldestKey) return;
      this.delete(oldestKey);
    }

    const now = Date.now();
    this.entries.set(key, { value, sizeBytes, lastUsedAt: now, expiresAt: now + ttlMs });
    this.usedBytes += sizeBytes;
  }

  private removeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.delete(key);
    }
  }

  private delete(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.entries.delete(key);
    this.usedBytes -= entry.sizeBytes;
  }
}

/** Shared process-local cache for explicitly public, non-user-specific reads. */
export const publicReadCache = new ReadCache();

export function clearReadCache(): void {
  publicReadCache.clear();
}

export function invalidateReadCache(key: string): void {
  publicReadCache.invalidate(key);
}

/** Convenience API for public service reads. The explicit helper keeps the
 * cacheable decision at the call site and makes accidental private caching
 * harder to introduce in a service. */
export function getCachedRead<T>(
  key: string,
  ttlMs: number,
  loader: () => T | PromiseLike<T>,
): Promise<T> {
  return publicReadCache.getOrLoad(key, loader, { cacheable: true, ttlMs });
}

function estimateBytes(value: unknown): number {
  if (typeof value === "string") return new TextEncoder().encode(value).byteLength;
  if (value instanceof Uint8Array) return value.byteLength;
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}
