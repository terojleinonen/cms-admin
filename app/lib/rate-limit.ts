import { NextRequest } from 'next/server';

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export const rateLimitConfigs = {
  public: {
    limit: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  sensitive: {
    limit: 10,
    windowMs: 5 * 60 * 1000, // 5 minutes
  },
};

const store = new Map<string, { count: number; expiry: number }>();

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
) {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const now = Date.now();
  const entry = store.get(ip);

  if (entry && now < entry.expiry) {
    if (entry.count >= config.limit) {
      return {
        success: false,
        limit: config.limit,
        remaining: 0,
        reset: entry.expiry,
        retryAfter: Math.ceil((entry.expiry - now) / 1000),
      };
    }
    entry.count++;
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - entry.count,
      reset: entry.expiry,
    };
  } else {
    store.set(ip, { count: 1, expiry: now + config.windowMs });
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: now + config.windowMs,
    };
  }
}

export function createRateLimitHeaders(result: {
  limit: number;
  remaining: number;
  reset: number;
}) {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.reset / 1000).toString(),
  };
}
