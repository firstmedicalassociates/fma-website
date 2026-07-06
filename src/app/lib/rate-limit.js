import crypto from "crypto";

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 20;
const MAX_TRACKED_KEYS = 5000;

const globalForRateLimit = globalThis;
const rateLimitStore = globalForRateLimit.__fmaRateLimitStore || new Map();
globalForRateLimit.__fmaRateLimitStore = rateLimitStore;

function getRateLimitSettings(options = {}) {
  return {
    windowMs: Math.max(Number(options.windowMs) || DEFAULT_WINDOW_MS, 1000),
    max: Math.max(Number(options.max) || DEFAULT_MAX_REQUESTS, 1),
  };
}

function getFirstHeaderValue(value = "") {
  return String(value || "").split(",")[0]?.trim() || "";
}

function hashIdentity(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function getSharedRateLimitConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()?.replace(/\/+$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

async function runRedisCommand(config, command) {
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Shared rate limit request failed.");
  }

  const data = await response.json();
  if (data?.error) {
    throw new Error("Shared rate limit command failed.");
  }

  return data?.result;
}

function pruneExpiredEntries(now) {
  if (rateLimitStore.size <= MAX_TRACKED_KEYS) return;

  for (const [key, record] of rateLimitStore.entries()) {
    if (!record || record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function getRateLimitIdentity(request, scope = "public") {
  const forwardedFor = getFirstHeaderValue(request?.headers?.get("x-forwarded-for"));
  const realIp = getFirstHeaderValue(request?.headers?.get("x-real-ip"));
  const cloudflareIp = getFirstHeaderValue(request?.headers?.get("cf-connecting-ip"));
  const userAgent = String(request?.headers?.get("user-agent") || "").slice(0, 120);
  const rawIdentity = [scope, forwardedFor || realIp || cloudflareIp || "anonymous", userAgent].join(":");

  return hashIdentity(rawIdentity);
}

function checkInMemoryRateLimit(identity, options = {}) {
  const { windowMs, max } = getRateLimitSettings(options);
  const now = Date.now();
  const current = rateLimitStore.get(identity);

  pruneExpiredEntries(now);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(identity, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      ok: true,
      limit: max,
      remaining: max - 1,
      resetAt: now + windowMs,
      retryAfter: 0,
    };
  }

  current.count += 1;
  const remaining = Math.max(max - current.count, 0);
  const retryAfter = Math.max(Math.ceil((current.resetAt - now) / 1000), 1);

  if (current.count > max) {
    return {
      ok: false,
      limit: max,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfter,
    };
  }

  return {
    ok: true,
    limit: max,
    remaining,
    resetAt: current.resetAt,
    retryAfter: 0,
  };
}

async function checkSharedRateLimit(identity, options = {}) {
  const config = getSharedRateLimitConfig();
  if (!config) return null;

  const { windowMs, max } = getRateLimitSettings(options);
  const now = Date.now();
  const key = `fma:rate-limit:${identity}`;

  const count = Number(await runRedisCommand(config, ["INCR", key])) || 0;
  if (count === 1) {
    await runRedisCommand(config, ["PEXPIRE", key, windowMs]);
  }

  const ttl = Math.max(Number(await runRedisCommand(config, ["PTTL", key])) || windowMs, 1);
  const resetAt = now + ttl;
  const retryAfter = Math.max(Math.ceil(ttl / 1000), 1);

  if (count > max) {
    return {
      ok: false,
      limit: max,
      remaining: 0,
      resetAt,
      retryAfter,
      shared: true,
    };
  }

  return {
    ok: true,
    limit: max,
    remaining: Math.max(max - count, 0),
    resetAt,
    retryAfter: 0,
    shared: true,
  };
}

export async function checkRateLimit(identity, options = {}) {
  const requireShared = options.requireShared === true;
  const { windowMs, max } = getRateLimitSettings(options);

  try {
    const sharedResult = await checkSharedRateLimit(identity, options);
    if (sharedResult) return sharedResult;
  } catch (error) {
    if (requireShared) {
      console.error("Shared rate limiter unavailable:", error?.message || error);
      return {
        ok: false,
        limit: max,
        remaining: 0,
        resetAt: Date.now() + windowMs,
        retryAfter: Math.max(Math.ceil(windowMs / 1000), 1),
        shared: false,
        unavailable: true,
      };
    }

    console.error("Shared rate limiter unavailable, using local fallback:", error?.message || error);
  }

  if (requireShared) {
    console.error("Shared rate limiter is required but not configured.");
    return {
      ok: false,
      limit: max,
      remaining: 0,
      resetAt: Date.now() + windowMs,
      retryAfter: Math.max(Math.ceil(windowMs / 1000), 1),
      shared: false,
      unavailable: true,
    };
  }

  return checkInMemoryRateLimit(identity, options);
}

export function getRateLimitHeaders(result) {
  return {
    "Retry-After": String(result.retryAfter || 0),
    "X-RateLimit-Limit": String(result.limit || DEFAULT_MAX_REQUESTS),
    "X-RateLimit-Remaining": String(result.remaining || 0),
    "X-RateLimit-Reset": String(Math.ceil((result.resetAt || Date.now()) / 1000)),
  };
}
